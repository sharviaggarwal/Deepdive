"""
Document indexing and persistence module.
Manages chunks, SentenceTransformer embeddings, FAISS IndexFlatL2, and BM25Okapi.
Persists chunks and embeddings to disk so no documents are reprocessed on server restart.
"""

import json
import os
import re
from pathlib import Path
from typing import Callable, Dict, List, Optional
import faiss
import numpy as np
from rank_bm25 import BM25Okapi
from sentence_transformers import SentenceTransformer

from backend.chunking import chunk_code
from backend.extract import extract_pages

# Paths
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
STORAGE_DIR = DATA_DIR / "storage"
UPLOADS_DIR = DATA_DIR / "uploads"

STORAGE_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

CHUNKS_FILE = STORAGE_DIR / "chunks_with_embeddings.json"

# In-memory storage & indices
chunks: List[Dict] = []
embedding_matrix: Optional[np.ndarray] = None
index: Optional[faiss.IndexFlatL2] = None
bm25: Optional[BM25Okapi] = None

# Model singleton
_embedding_model: Optional[SentenceTransformer] = None


def get_embedding_model() -> SentenceTransformer:
    """
    Returns the singleton SentenceTransformer embedding model.
    """
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
    return _embedding_model


def tokenize(text: str) -> List[str]:
    """
    Tokenizes text into lowercase alphanumeric words for BM25.
    """
    return re.findall(r"\w+", text.lower())


def build_indices() -> None:
    """
    Builds or rebuilds the FAISS L2 index and BM25Okapi keyword index
    from the current in-memory chunks.
    """
    global index, bm25, embedding_matrix

    if not chunks:
        index = None
        bm25 = None
        embedding_matrix = None
        return

    embedding_matrix = np.array([c["embedding"] for c in chunks], dtype="float32")
    dim = embedding_matrix.shape[1]
    index = faiss.IndexFlatL2(dim)
    index.add(embedding_matrix)

    tokenized_corpus = [tokenize(c["chunk"]) for c in chunks]
    bm25 = BM25Okapi(tokenized_corpus)


def save_chunks() -> None:
    """
    Persists the chunk database with embeddings to disk.
    """
    with open(CHUNKS_FILE, "w", encoding="utf-8") as f:
        json.dump(chunks, f)


def initialize_store() -> None:
    """
    Initializes storage on startup: loads saved chunks if present in storage directory.
    """
    global chunks

    if CHUNKS_FILE.exists():
        try:
            with open(CHUNKS_FILE, "r", encoding="utf-8") as f:
                chunks = json.load(f)

            for c in chunks:
                c.setdefault("doc", "document")

            build_indices()
            print(f"Loaded {len(chunks)} chunks from {CHUNKS_FILE}")
        except Exception as e:
            print(f"Error loading persisted chunks: {e}")
            chunks = []
    else:
        chunks = []


def add_documents(
    pdf_paths: List[str],
    progress_callback: Optional[Callable[[str, int, int, str], None]] = None
) -> Dict[str, int]:
    """
    Extracts, chunks, embeds, and indexes a list of PDF files.

    progress_callback(filename, current_page, total_pages, message)
    """
    global chunks
    model = get_embedding_model()
    indexed_summary = {}

    known_docs = {c.get("doc") for c in chunks}

    for path in pdf_paths:
        filename = os.path.basename(path)
        if filename in known_docs:
            print(f"Document already indexed: {filename}")
            continue

        def on_page_progress(current, total, msg):
            if progress_callback:
                progress_callback(filename, current, total, msg)

        # 1. Text extraction & OCR fallback
        pages = extract_pages(path, progress_callback=on_page_progress)

        # 2. Chunking
        new_chunks = []
        for p in pages:
            for piece in chunk_code(p["text"]):
                new_chunks.append({
                    "doc": filename,
                    "page_number": p["page_number"],
                    "chunk": piece
                })

        if not new_chunks:
            print(f"No text extracted for: {filename}")
            indexed_summary[filename] = 0
            continue

        if progress_callback:
            progress_callback(filename, len(pages), len(pages), "Generating neural embeddings...")

        # 3. Generate embeddings
        embs = model.encode([c["chunk"] for c in new_chunks], show_progress_bar=False)
        for c, e in zip(new_chunks, embs):
            c["embedding"] = e.tolist()

        chunks.extend(new_chunks)
        indexed_summary[filename] = len(new_chunks)
        known_docs.add(filename)

    save_chunks()
    build_indices()
    return indexed_summary


def remove_document(name: str) -> bool:
    """
    Removes a document and all of its chunks from memory and storage,
    then updates indices and disk files.
    """
    global chunks
    initial_count = len(chunks)
    chunks = [c for c in chunks if c.get("doc") != name]

    # Remove physical upload if present
    file_on_disk = UPLOADS_DIR / name
    if file_on_disk.exists():
        try:
            os.remove(file_on_disk)
        except Exception as e:
            print(f"Warning: could not delete {file_on_disk}: {e}")

    save_chunks()
    build_indices()
    return len(chunks) < initial_count


def list_documents() -> List[Dict]:
    """
    Lists all indexed documents with page and chunk metrics.
    """
    docs_map: Dict[str, Dict] = {}

    for c in chunks:
        doc_name = c.get("doc", "unknown")
        if doc_name not in docs_map:
            # Check file size if available
            file_path = UPLOADS_DIR / doc_name
            file_size = file_path.stat().st_size if file_path.exists() else 0

            docs_map[doc_name] = {
                "doc_id": doc_name,
                "name": doc_name,
                "page_count": 0,
                "chunk_count": 0,
                "file_size_bytes": file_size,
                "pages_seen": set()
            }

        docs_map[doc_name]["chunk_count"] += 1
        page_num = c.get("page_number", 0)
        docs_map[doc_name]["pages_seen"].add(page_num)

    results = []
    for doc_name, data in sorted(docs_map.items()):
        results.append({
            "doc_id": data["doc_id"],
            "name": data["name"],
            "page_count": len(data["pages_seen"]),
            "chunk_count": data["chunk_count"],
            "file_size_bytes": data["file_size_bytes"]
        })

    return results
