import os
import shutil
import threading
import uuid
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
import ollama

from backend.models.schemas import (
    AnalyzeResponse,
    AnalyzeYoutubeRequest,
    AskRequest,
    AskResponse,
    NotesRequest,
    SessionDetails,
    SummaryPayload,
    SummaryRequest,
    TimestampItem,
)
from backend.services.chunking_service import create_chunks
from backend.services.llm_service import ask_video_rag
from backend.services.retrieval_service import (
    get_chroma_client,
    get_embedding_model,
    index_chunks,
)
from backend.services.summary_service import generate_summary_and_notes
from backend.services.transcription_service import (
    get_whisper_model,
    transcribe_media_file,
)
from backend.services.youtube_service import fetch_youtube_transcript
from backend.utils.formatting import format_timestamp

UPLOADS_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "data",
    "uploads"
)
os.makedirs(UPLOADS_DIR, exist_ok=True)

# In-memory storage for active sessions
sessions_cache: Dict[str, Dict[str, Any]] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan: Initialize ChromaDB and pre-warm models in background.
    """
    print("Initializing DeepDive RAG backend...")
    get_chroma_client()

    def warm_models():
        try:
            print("Pre-warming SentenceTransformer ('all-MiniLM-L6-v2')...")
            get_embedding_model()
            print("Pre-warming Whisper model ('base')...")
            get_whisper_model()
            print("Checking Ollama llama3.1:8b connection...")
            try:
                models = ollama.list()
                model_names = [m.get("name", m.get("model", "")) for m in models.get("models", [])]
                print(f"Ollama connected. Available models: {model_names}")
            except Exception as e:
                print(f"Warning: Could not connect to Ollama at startup: {e}")
            print("DeepDive models pre-warmed and ready.")
        except Exception as e:
            print(f"Error during model pre-warming: {e}")

    threading.Thread(target=warm_models, daemon=True).start()
    print("DeepDive Backend is running.")
    yield


app = FastAPI(
    title="DeepDive AI Backend",
    description="Video and audio research assistant powered by local Ollama (Llama 3.1 8B), Whisper, and ChromaDB.",
    version="2.0.0",
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


@app.get("/health")
def health_check():
    """Health check endpoint to test connection from frontend."""
    ollama_ok = False
    try:
        ollama.list()
        ollama_ok = True
    except Exception:
        pass

    return {
        "status": "healthy",
        "app": "DeepDive",
        "ollama_connected": ollama_ok,
        "model": "llama3.1:8b",
        "embedding_model": "all-MiniLM-L6-v2",
        "whisper_model": "base"
    }


@app.post("/analyze/youtube", response_model=AnalyzeResponse)
def analyze_youtube(payload: AnalyzeYoutubeRequest):
    """
    Analyze a YouTube video: fetch transcript, chunk, embed in ChromaDB,
    and generate structured summary & notes using Llama 3.1 8B.
    """
    url = payload.url.strip()
    if not url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="YouTube URL cannot be empty."
        )

    try:
        video_id, title, segments = fetch_youtube_transcript(url)
    except ValueError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(err)
        )
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch YouTube transcript: {str(err)}"
        )

    if payload.title and payload.title.strip():
        title = payload.title.strip()

    # Create chunks preserving timestamps
    chunks = create_chunks(segments, max_words=150)
    session_id = str(uuid.uuid4())

    # Index into ChromaDB
    try:
        index_chunks(session_id, chunks)
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to index transcript chunks into vector database: {str(err)}"
        )

    duration_sec = segments[-1]["end"] if segments else 0.0

    # Generate initial summary and notes
    try:
        summary_dict, notes_list = generate_summary_and_notes(chunks, title=title, source_url=url)
    except Exception as err:
        print(f"Summary generation warning: {err}")
        summary_dict = {
            "overview": f"Discussion about {title}.",
            "key_points": [str(c["text"])[:100] for c in chunks[:3]],
            "important_moments": []
        }
        notes_list = []

    summary_payload = SummaryPayload(**summary_dict)

    # Save to session cache
    sessions_cache[session_id] = {
        "session_id": session_id,
        "title": title,
        "input_type": "youtube",
        "source_url": url,
        "duration_seconds": duration_sec,
        "duration_formatted": format_timestamp(duration_sec),
        "total_segments": len(segments),
        "total_chunks": len(chunks),
        "chunks": chunks,
        "summary": summary_payload,
        "notes": notes_list,
    }

    return AnalyzeResponse(
        session_id=session_id,
        title=title,
        input_type="youtube",
        source_url=url,
        duration_seconds=duration_sec,
        duration_formatted=format_timestamp(duration_sec),
        total_segments=len(segments),
        total_chunks=len(chunks),
        summary=summary_payload,
        notes=notes_list
    )


@app.post("/analyze/upload", response_model=AnalyzeResponse)
async def analyze_upload(file: UploadFile = File(...)):
    """
    Analyze an uploaded audio or video file: transcribe with Whisper,
    chunk, embed in ChromaDB, and generate summary & notes with Llama 3.1 8B.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must have a filename."
        )

    allowed_exts = {
        ".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac", ".wma",
        ".mp4", ".mov", ".mkv", ".webm", ".avi"
    }
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{ext}'. Supported formats: audio ({', '.join(allowed_exts)})"
        )

    # Detect whether it is audio or video
    video_exts = {".mp4", ".mov", ".mkv", ".webm", ".avi"}
    input_type = "video" if ext in video_exts else "audio"

    # Save uploaded file
    file_id = str(uuid.uuid4())[:8]
    safe_filename = f"{file_id}_{file.filename}"
    saved_path = os.path.join(UPLOADS_DIR, safe_filename)

    try:
        with open(saved_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save uploaded file: {str(err)}"
        )

    # Transcribe with Whisper
    try:
        segments, duration_sec = transcribe_media_file(saved_path)
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to transcribe media file: {str(err)}"
        )

    if not segments:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No speech could be recognized in the uploaded audio/video file."
        )

    chunks = create_chunks(segments, max_words=150)
    session_id = str(uuid.uuid4())

    # Store in ChromaDB
    try:
        index_chunks(session_id, chunks)
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to index transcript chunks into vector database: {str(err)}"
        )

    clean_title = os.path.splitext(file.filename)[0].replace("_", " ").title()

    # Generate summary & notes
    try:
        summary_dict, notes_list = generate_summary_and_notes(chunks, title=clean_title, source_url=None)
    except Exception as err:
        print(f"Summary generation warning: {err}")
        summary_dict = {
            "overview": f"Audio transcription for {clean_title}.",
            "key_points": [str(c["text"])[:100] for c in chunks[:3]],
            "important_moments": []
        }
        notes_list = []

    summary_payload = SummaryPayload(**summary_dict)

    sessions_cache[session_id] = {
        "session_id": session_id,
        "title": clean_title,
        "input_type": input_type,
        "source_url": file.filename,
        "duration_seconds": duration_sec,
        "duration_formatted": format_timestamp(duration_sec),
        "total_segments": len(segments),
        "total_chunks": len(chunks),
        "chunks": chunks,
        "summary": summary_payload,
        "notes": notes_list,
    }

    return AnalyzeResponse(
        session_id=session_id,
        title=clean_title,
        input_type=input_type,
        source_url=file.filename,
        duration_seconds=duration_sec,
        duration_formatted=format_timestamp(duration_sec),
        total_segments=len(segments),
        total_chunks=len(chunks),
        summary=summary_payload,
        notes=notes_list
    )


@app.post("/ask", response_model=AskResponse)
def ask_question(payload: AskRequest):
    """
    Ask a question about the analyzed content. Retrieves relevant chunks
    from ChromaDB and generates an answer using local Llama 3.1 8B with timestamps.
    """
    session = sessions_cache.get(payload.session_id)
    source_url = session.get("source_url") if session else None

    try:
        answer, timestamps, sources = ask_video_rag(
            session_id=payload.session_id,
            question=payload.question,
            n_results=payload.n_results,
            source_url=source_url
        )
    except ValueError as err:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(err)
        )
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating answer: {str(err)}"
        )

    ts_items = [TimestampItem(**ts) for ts in timestamps]

    return AskResponse(
        question=payload.question,
        answer=answer,
        timestamps=ts_items,
        sources=sources
    )


@app.post("/summary", response_model=SummaryPayload)
def get_summary(payload: SummaryRequest):
    """Fetch or re-generate summary for an active session."""
    session = sessions_cache.get(payload.session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found."
        )

    return session["summary"]


@app.post("/notes")
def get_notes(payload: NotesRequest):
    """Fetch notes for an active session."""
    session = sessions_cache.get(payload.session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found."
        )

    return {"notes": session.get("notes", [])}


@app.get("/session/{session_id}")
def get_session_info(session_id: str):
    """Retrieve full details for an analyzed session."""
    session = sessions_cache.get(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found in active cache."
        )

    return {
        "session_id": session["session_id"],
        "title": session["title"],
        "input_type": session["input_type"],
        "source_url": session["source_url"],
        "duration_formatted": session["duration_formatted"],
        "total_segments": session["total_segments"],
        "total_chunks": session["total_chunks"],
        "summary": session["summary"],
        "notes": session["notes"]
    }
