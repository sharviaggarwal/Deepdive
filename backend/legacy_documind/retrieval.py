"""
Hybrid retrieval and cross-encoder neural reranking module for DocuMind.
Preserves notebook logic:
- FAISS vector search
- BM25Okapi keyword search
- Reciprocal Rank Fusion (k=60)
- Cross-encoder reranker ('cross-encoder/ms-marco-MiniLM-L-6-v2')
"""

from typing import Dict, List, Optional
import numpy as np
from sentence_transformers import CrossEncoder

import backend.indexing as idx_mod
from backend.indexing import get_embedding_model, tokenize

# Singleton Cross-Encoder instance
_reranker: Optional[CrossEncoder] = None


def get_reranker() -> CrossEncoder:
    """
    Returns the singleton CrossEncoder instance.
    """
    global _reranker
    if _reranker is None:
        _reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
    return _reranker


def semantic_search(query: str, top_k: int = 5) -> List[Dict]:
    """
    Perform semantic search using the FAISS index.
    """
    if not query or not query.strip():
        raise ValueError("Query cannot be empty.")

    chunks = idx_mod.chunks
    index = idx_mod.index
    model = get_embedding_model()

    if not chunks or index is None:
        return []

    query_embedding = model.encode([query], convert_to_numpy=True).astype("float32")
    actual_k = min(top_k, len(chunks))

    distances, indices = index.search(query_embedding, actual_k)
    results = []

    for idx, distance in zip(indices[0], distances[0]):
        if idx < 0 or idx >= len(chunks):
            continue

        results.append({
            "chunk_index": int(idx),
            "page_number": chunks[idx]["page_number"] + 1,
            "chunk": chunks[idx]["chunk"],
            "distance": float(distance)
        })

    return results


def hybrid_search_and_rerank(
    question: str,
    top_k: int = 3,
    doc_filter: Optional[List[str]] = None,
    retrieval_k: int = 15
) -> List[Dict]:
    """
    Executes hybrid retrieval (FAISS + BM25Okapi with RRF k=60)
    followed by cross-encoder neural reranking.
    """
    chunks = idx_mod.chunks
    bm25 = idx_mod.bm25
    reranker = get_reranker()

    if not chunks:
        return []

    if doc_filter:
        retrieval_k = max(retrieval_k, 50)
        if isinstance(doc_filter, str):
            doc_filter = [doc_filter]

    # 1. Semantic search
    semantic_results = semantic_search(question, top_k=retrieval_k)
    semantic_rank = {
        item["chunk_index"]: rank
        for rank, item in enumerate(semantic_results, start=1)
    }

    # 2. BM25 keyword search
    tokenized_query = tokenize(question)
    if bm25 is not None:
        bm25_scores = bm25.get_scores(tokenized_query)
        bm25_indices = bm25_scores.argsort()[-retrieval_k:][::-1]
        bm25_rank = {
            int(i): rank
            for rank, i in enumerate(bm25_indices, start=1)
        }
    else:
        bm25_rank = {}

    # 3. Reciprocal Rank Fusion & document filtering
    candidate_indices = set(semantic_rank) | set(bm25_rank)
    if doc_filter:
        candidate_indices = {i for i in candidate_indices if chunks[i].get("doc") in doc_filter}

    if not candidate_indices:
        return []

    final_scores = {
        idx: (
            1 / (60 + semantic_rank.get(idx, 1000))
            + 1 / (60 + bm25_rank.get(idx, 1000))
        )
        for idx in candidate_indices
    }

    candidate_order = sorted(
        candidate_indices,
        key=final_scores.get,
        reverse=True
    )[:15]

    # 4. Neural reranking
    pairs = [
        (question, chunks[idx]["chunk"])
        for idx in candidate_order
    ]

    rerank_scores = reranker.predict(pairs)

    reranked_results = sorted(
        zip(candidate_order, rerank_scores),
        key=lambda item: item[1],
        reverse=True
    )

    # 5. Select the top_k chunks
    top_candidates = reranked_results[:top_k]

    results = []
    for idx, score in top_candidates:
        chunk_obj = chunks[idx]
        results.append({
            "chunk_id": int(idx),
            "doc": chunk_obj.get("doc", "document"),
            "page_number": chunk_obj["page_number"] + 1,
            "snippet": chunk_obj["chunk"],
            "score": float(score)
        })

    return results
