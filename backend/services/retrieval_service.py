import os
from typing import Any, Dict, List, Optional
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer

# Singleton instances
_embedding_model: Optional[SentenceTransformer] = None
_chroma_client: Optional[chromadb.ClientAPI] = None

CHROMA_PERSIST_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "data",
    "chroma_db"
)


def get_embedding_model() -> SentenceTransformer:
    """Load and cache all-MiniLM-L6-v2 model."""
    global _embedding_model
    if _embedding_model is None:
        print("Loading SentenceTransformer ('all-MiniLM-L6-v2')...")
        _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
        print("SentenceTransformer loaded and ready.")
    return _embedding_model


def get_chroma_client() -> chromadb.ClientAPI:
    """Get ChromaDB client (in-memory for speed and isolation, exactly as in user's notebook)."""
    global _chroma_client
    if _chroma_client is None:
        _chroma_client = chromadb.Client(
            settings=Settings(anonymized_telemetry=False)
        )
        print("ChromaDB in-memory client initialized.")
    return _chroma_client


def _get_collection_name(session_id: str) -> str:
    """Chroma collection names must be 3-63 characters, start and end with alphanumeric."""
    safe_id = "".join(c if c.isalnum() else "_" for c in session_id).strip("_")
    return f"deepdive_{safe_id}"[:63]


def index_chunks(session_id: str, chunks: List[Dict[str, Any]]) -> int:
    """
    Encode chunks and index them into ChromaDB with timestamp metadata.
    From DeepDive notebook Cells 11, 13, 14.
    """
    if not chunks:
        return 0

    client = get_chroma_client()
    collection_name = _get_collection_name(session_id)

    # Delete existing if reprocessing
    try:
        client.delete_collection(name=collection_name)
    except Exception:
        pass

    collection = client.create_collection(
        name=collection_name,
        metadata={"session_id": session_id}
    )

    model = get_embedding_model()
    texts = [str(chunk["text"]) for chunk in chunks]
    embeddings = model.encode(texts, show_progress_bar=False)

    ids = [f"{session_id}_chunk_{i}" for i in range(len(chunks))]
    metadatas = [
        {
            "start": float(chunk["start"]),
            "end": float(chunk["end"])
        }
        for chunk in chunks
    ]

    collection.add(
        ids=ids,
        documents=texts,
        embeddings=embeddings.tolist(),
        metadatas=metadatas
    )

    print(f"Successfully stored {collection.count()} chunks in ChromaDB for session '{session_id}'")
    return collection.count()


def retrieve_chunks(session_id: str, question: str, n_results: int = 5) -> Dict[str, Any]:
    """
    Vector similarity search in ChromaDB.
    From DeepDive notebook Cell 15.
    """
    client = get_chroma_client()
    collection_name = _get_collection_name(session_id)

    try:
        collection = client.get_collection(name=collection_name)
    except Exception:
        raise ValueError(f"Session '{session_id}' not found or has not been indexed in ChromaDB.")

    count = collection.count()
    if count == 0:
        return {"documents": [[]], "metadatas": [[]], "distances": [[]]}

    actual_k = min(n_results, count)
    model = get_embedding_model()
    query_embedding = model.encode([question], show_progress_bar=False)

    results = collection.query(
        query_embeddings=query_embedding.tolist(),
        n_results=actual_k
    )

    return results
