"""
DocuMind FastAPI Main Application.
Provides REST endpoints:
- POST /upload: multi-PDF file upload with async background processing
- GET /upload/{job_id}: upload and OCR processing status & per-file page progress
- GET /documents: list indexed documents with page and chunk metrics
- DELETE /documents/{doc_id}: remove document and update indices
- POST /ask: hybrid search + cross-encoder rerank + Ollama generation
"""

import os
import shutil
import uuid
from contextlib import asynccontextmanager
from typing import Dict, List, Optional
from fastapi import BackgroundTasks, FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import backend.indexing as idx_mod
from backend.extract import get_ocr_reader
from backend.generation import generate_answer
from backend.indexing import (
    UPLOADS_DIR,
    add_documents,
    get_embedding_model,
    initialize_store,
    list_documents,
    remove_document,
)
from backend.retrieval import get_reranker, hybrid_search_and_rerank

# Job tracking store
upload_jobs: Dict[str, Dict] = {}


def process_upload_job(job_id: str, file_paths: List[str]) -> None:
    """
    Background worker that runs text extraction, EasyOCR fallback,
    chunking, embedding generation, and index synchronization.
    """
    job = upload_jobs.get(job_id)
    if not job:
        return

    try:
        def on_progress(filename: str, current_page: int, total_pages: int, message: str):
            if filename in job["files"]:
                job["files"][filename]["pages_done"] = current_page
                job["files"][filename]["total_pages"] = total_pages
                job["files"][filename]["message"] = message
                job["files"][filename]["status"] = "processing"

        add_documents(file_paths, progress_callback=on_progress)

        for filename in job["files"]:
            job["files"][filename]["status"] = "ready"
            job["files"][filename]["message"] = "Completed indexing"

        job["status"] = "completed"

    except Exception as exc:
        job["status"] = "failed"
        job["error"] = str(exc)
        print(f"Error processing upload job {job_id}: {exc}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup & shutdown lifespan event handler.
    Initializes disk-backed indices and pre-warms neural models in a background thread
    so the server binds and begins accepting requests immediately.
    """
    print("Initializing DocuMind RAG store and indices...")
    initialize_store()

    import threading
    def warm_models():
        try:
            print("Warming embedding model (all-MiniLM-L6-v2)...")
            get_embedding_model()
            print("Warming cross-encoder reranker (ms-marco-MiniLM-L-6-v2)...")
            get_reranker()
            print("DocuMind neural models warmed and ready.")
        except Exception as e:
            print(f"Error warming models: {e}")

    threading.Thread(target=warm_models, daemon=True).start()
    print("DocuMind Backend is live and listening on port 8000.")
    yield


app = FastAPI(
    title="DocuMind RAG Backend",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request & Response Models
class AskRequest(BaseModel):
    question: str
    doc_ids: Optional[List[str]] = None
    top_k: Optional[int] = 3


class SourceItem(BaseModel):
    doc: str
    page: int
    snippet: str


class AskResponse(BaseModel):
    answer: str
    sources: List[SourceItem]


@app.get("/")
def root():
    return {
        "status": "online",
        "service": "DocuMind RAG Backend",
        "indexed_chunks": len(idx_mod.chunks)
    }


@app.post("/upload")
async def upload_files(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...)
):
    """
    Accepts one or more PDFs, saves them to disk, and schedules background processing.
    """
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files provided"
        )

    saved_paths = []
    job_id = str(uuid.uuid4())
    job_files_state = {}

    for file in files:
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Only PDF files are supported: {file.filename}"
            )

        destination_path = UPLOADS_DIR / file.filename
        with open(destination_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        saved_paths.append(str(destination_path))
        job_files_state[file.filename] = {
            "status": "pending",
            "pages_done": 0,
            "total_pages": 0,
            "message": "Queued for extraction and OCR"
        }

    upload_jobs[job_id] = {
        "job_id": job_id,
        "status": "processing",
        "files": job_files_state,
        "error": None
    }

    # Run heavy processing in background task
    background_tasks.add_task(process_upload_job, job_id, saved_paths)

    return {
        "job_id": job_id,
        "status": "processing",
        "files": [f.filename for f in files]
    }


@app.get("/upload/{job_id}")
def get_upload_status(job_id: str):
    """
    Returns the real-time processing status and per-file page progress.
    """
    job = upload_jobs.get(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    return job


@app.get("/documents")
def get_documents():
    """
    Lists all indexed documents with page and chunk counts.
    """
    return list_documents()


@app.delete("/documents/{doc_id}")
def delete_document(doc_id: str):
    """
    Removes a document and its chunks, updating FAISS and BM25 indices.
    """
    success = remove_document(doc_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{doc_id}' not found"
        )
    return {
        "success": True,
        "message": f"Document '{doc_id}' removed and indices updated"
    }


@app.post("/ask", response_model=AskResponse)
def ask_question(request: AskRequest):
    """
    Answers a question using hybrid vector/keyword retrieval,
    neural cross-encoder reranking, and Ollama llama3.1:8b generation.
    """
    question = request.question.strip()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question cannot be empty"
        )

    # Hybrid search + cross encoder reranking
    retrieved = hybrid_search_and_rerank(
        question=question,
        top_k=request.top_k or 3,
        doc_filter=request.doc_ids
    )

    # Generation via Ollama
    answer = generate_answer(question=question, retrieved_chunks=retrieved)

    sources = [
        SourceItem(
            doc=chunk["doc"],
            page=chunk["page_number"],
            snippet=chunk["snippet"]
        )
        for chunk in retrieved
    ]

    return AskResponse(
        answer=answer,
        sources=sources
    )
