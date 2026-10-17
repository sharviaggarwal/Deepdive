# DocuMind — Editorial Document Intelligence & RAG System

A full-stack Retrieval-Augmented Generation (RAG) platform with a warm editorial retro-stationery design system, modular FastAPI backend, and local Ollama (`llama3.1:8b`) neural synthesis.

---

## Architecture & Existing Pipeline

* **Document Ingestion**: Multi-file PDF upload with PyMuPDF text extraction and EasyOCR fallback for scanned pages with $< 50$ characters (CPU, zoom=2).
* **Chunking**: Whitespace normalization and character window chunking (`chunk_size=2000`, `overlap=200`).
* **Dense Vector Search**: SentenceTransformer `all-MiniLM-L6-v2` embeddings with a `faiss.IndexFlatL2` vector index.
* **Lexical Keyword Search**: `rank_bm25.BM25Okapi` with tokenized corpus.
* **Hybrid Fusion**: Reciprocal Rank Fusion (RRF with $k=60$):
  $$\text{score} = \frac{1}{60 + \text{rank}_{\text{semantic}}} + \frac{1}{60 + \text{rank}_{\text{BM25}}}$$
* **Neural Reranking**: Cross-Encoder `cross-encoder/ms-marco-MiniLM-L-6-v2` reranking top candidate pairs.
* **Answer Generation**: Local Ollama `llama3.1:8b` (`num_ctx: 4096`, `num_predict: 512`, `temperature: 0.2`) strictly grounded in context chunks with `[doc | Page n]` labels.
* **Disk Persistence**: Chunks and vector embeddings saved to `backend/data/storage/chunks_with_embeddings.json`. FAISS and BM25 indices are automatically synchronized and rebuilt upon document upload or removal.

---

## Directory Structure

```text
documind/
├── backend/
│   ├── __init__.py
│   ├── main.py              # FastAPI endpoints (/upload, /upload/{job_id}, /documents, /ask), CORS & background tasks
│   ├── extract.py           # PyMuPDF text extraction + EasyOCR fallback (reader, ocr_page, extract_pages)
│   ├── chunking.py          # clean_text, chunk_code (chunk_size=2000, overlap=200)
│   ├── indexing.py          # Embedding & index store, build_indices, add_documents, remove_document, persistence
│   ├── retrieval.py         # semantic_search, BM25Okapi, reciprocal rank fusion (k=60), cross-encoder rerank
│   ├── generation.py        # Ollama llama3.1:8b generation, [doc | Page n] context formatting, error handling
│   └── data/
│       ├── uploads/         # Uploaded PDF document storage
│       └── storage/         # Persisted chunks_with_embeddings.json
├── frontend/                # React 19 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/      # Reading notebook, multi-file upload modal, document archive, sources sidebar
│   │   ├── services/        # Live API client (api.ts, documentService.ts, ragService.ts)
│   │   ├── context/         # App state management with live backend synchronization
│   │   └── types/           # Document, Citation, Message, and Job interfaces
│   ├── package.json
│   └── vite.config.ts
├── requirements.txt         # Backend Python dependencies
└── README.md                # Windows run instructions and API specification
```

---

## Prerequisites (Windows)

1. **Python 3.14+** (64-bit) installed and on your `PATH`.
2. **Node.js (v18+) & npm** installed.
3. **Ollama** installed with `llama3.1:8b` model pulled:
   ```powershell
   ollama pull llama3.1:8b
   ```

---

## Run Steps (Windows PowerShell)

### Step 1: Start Ollama
In a dedicated PowerShell window:
```powershell
ollama run llama3.1:8b
```
*(Keep this running in the background).*

---

### Step 2: Set Up and Start the FastAPI Backend
In the project root (`c:\Users\sharv\Desktop\documind`):

```powershell
# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Start the FastAPI server on port 8000
uvicorn backend.main:app --reload --port 8000
```

> **Note**: On startup, the backend automatically warms up the SentenceTransformer embedding model and Cross-Encoder reranker. Models are loaded once at startup and reused across all requests.

Verify the backend is live by opening [http://localhost:8000](http://localhost:8000) or reviewing OpenAPI docs at [http://localhost:8000/docs](http://localhost:8000/docs).

---

### Step 3: Start the React Frontend
In a separate PowerShell window:

```powershell
cd c:\Users\sharv\Desktop\documind\frontend

# Start the Vite development server
npm run dev
```

The DocuMind application will launch at:
👉 **[http://localhost:5173/](http://localhost:5173/)**

---

## Backend API Specification

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/upload` | Accepts `multipart/form-data` with one or more PDF files. Returns `job_id` and schedules extraction/OCR in a background worker. |
| `GET` | `/upload/{job_id}` | Returns real-time processing status and per-file progress (`pages_done`, `total_pages`, stage message). |
| `GET` | `/documents` | Returns all uploaded documents with `doc_id`, `name`, `page_count`, `chunk_count`, and `file_size_bytes`. |
| `DELETE` | `/documents/{doc_id}` | Deletes document and its chunks from disk, updating FAISS and BM25 indices. |
| `POST` | `/ask` | Request body `{ "question": "...", "doc_ids": ["doc.pdf"], "top_k": 3 }`. Returns `{ "answer": "...", "sources": [{ "doc", "page", "snippet" }] }`. |

---

## Troubleshooting

* **Ollama Connection Refused**:
  If a chat query returns `⚠️ Ollama connection error`, ensure Ollama is running (`ollama serve` or `ollama run llama3.1:8b`).
* **Slow Document Ingestion**:
  Scanned PDFs with fewer than 50 digital characters automatically invoke EasyOCR on CPU. The multi-file upload progress bar displays real-time page-by-page progress (`Reading page N of M`).
* **Index State on Restart**:
  Chunks and embeddings are persisted in `backend/data/storage/chunks_with_embeddings.json`. FAISS and BM25 are initialized on server startup without re-running OCR or re-extracting text.
