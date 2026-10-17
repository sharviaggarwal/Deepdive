from typing import Any, Dict, List, Optional, Tuple
import ollama
from backend.services.retrieval_service import retrieve_chunks
from backend.utils.formatting import (
    build_youtube_timestamp_url,
    format_timestamp,
)


def ask_video_rag(
    session_id: str,
    question: str,
    n_results: int = 5,
    source_url: Optional[str] = None
) -> Tuple[str, List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    RAG generation pipeline using local Ollama llama3.1:8b.
    Direct implementation from DeepDive notebook Cell 17.
    
    Returns:
        (answer_text, timestamps_list, sources_list)
    """
    if not question.strip():
        return "Please ask a question.", [], []

    # 1. Retrieve relevant chunks from ChromaDB
    results = retrieve_chunks(session_id, question, n_results=n_results)

    docs = results.get("documents", [[]])[0]
    metas = results.get("metadatas", [[]])[0]

    if not docs:
        return "I couldn't find any relevant transcript information for this query.", [], []

    # 2. Build context for Llama exactly matching Cell 17
    context_parts = []
    timestamps_list = []
    sources_list = []

    for i, document in enumerate(docs):
        metadata = metas[i]
        start_sec = float(metadata.get("start", 0.0))
        end_sec = float(metadata.get("end", 0.0))

        start_time = format_timestamp(start_sec)
        end_time = format_timestamp(end_sec)

        context_parts.append(
            f"""
SOURCE {i + 1}
TIMESTAMP: {start_time} - {end_time}

{document}
"""
        )

        yt_link = None
        if source_url and ("youtube.com" in source_url or "youtu.be" in source_url):
            yt_link = build_youtube_timestamp_url(source_url, start_sec)

        ts_item = {
            "start": start_sec,
            "end": end_sec,
            "start_formatted": start_time,
            "end_formatted": end_time,
            "label": f"{start_time} - {end_time}",
            "url": yt_link
        }
        timestamps_list.append(ts_item)

        sources_list.append({
            "source_id": i + 1,
            "start": start_sec,
            "end": end_sec,
            "start_formatted": start_time,
            "end_formatted": end_time,
            "text": document,
            "url": yt_link
        })

    context = "\n".join(context_parts)

    # 3. Ask Llama using only retrieved context
    prompt = f"""
You are DeepDive, an AI assistant that answers questions
about a video.

Answer the user's question using ONLY the transcript
context provided below.

If the answer cannot be found in the context,
say: "I couldn't find this information in the video."

Keep the answer concise and accurate.

USER QUESTION:
{question}

VIDEO CONTEXT:
{context}
"""

    # 4. Generate answer using local Llama 3.1 8B via Ollama
    response = ollama.chat(
        model="llama3.1:8b",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        options={
            "num_gpu": 0,
            "num_predict": 400
        }
    )

    answer = response["message"]["content"].strip()
    return answer, timestamps_list, sources_list
