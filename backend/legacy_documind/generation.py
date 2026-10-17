"""
Answer generation module via Ollama (llama3.1:8b).
Configured with:
- num_ctx: 4096
- num_predict: 512
- temperature: 0.2
- [doc | Page n] label formatting per chunk
- Graceful error handling for Ollama offline, connection drops, or missing models
"""

from typing import Dict, List
import ollama


def generate_answer(question: str, retrieved_chunks: List[Dict]) -> str:
    """
    Constructs a grounded context prompt with [doc | Page n] labels
    and queries Ollama llama3.1:8b for an answer.
    """
    if not retrieved_chunks:
        return "Information not found in the provided document."

    context_parts = []
    for chunk in retrieved_chunks:
        doc_name = chunk.get("doc", "document")
        page_num = chunk.get("page_number", 1)
        snippet = chunk.get("snippet", "")
        context_parts.append(f"[{doc_name} | Page {page_num}]\n{snippet}")

    context = "\n\n".join(context_parts)

    prompt = f"""You are DocuMind, an AI document intelligence assistant.

Answer the user's question using ONLY the information provided in the context below.

CITATION RULES:
- Ground your claims strictly in the context excerpts provided.
- Whenever you cite information, use the exact document and page label like [document.pdf | Page N].
- If the answer is not contained in the context, answer exactly:
  "Information not found in the provided document."

If the answer is present in the context, answer it directly and concisely.

DOCUMENT CONTEXT:
{context}

QUESTION:
{question}

ANSWER:
"""

    try:
        response = ollama.chat(
            model="llama3.1:8b",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            options={
                "num_ctx": 4096,
                "num_predict": 512,
                "temperature": 0.2
            },
            keep_alive="5m"
        )
        return response["message"]["content"].strip()

    except Exception as exc:
        err_msg = str(exc)
        if "connection" in err_msg.lower() or "refused" in err_msg.lower() or "connecterror" in err_msg.lower():
            return (
                "⚠️ Ollama connection error: Could not reach local Ollama service. "
                "Please make sure Ollama is running ('ollama run llama3.1:8b' or 'ollama serve')."
            )
        if "not found" in err_msg.lower() and "model" in err_msg.lower():
            return (
                "⚠️ Model error: Ollama model 'llama3.1:8b' was not found. "
                "Please run 'ollama pull llama3.1:8b' in your terminal."
            )
        return f"⚠️ Ollama error: {err_msg}"
