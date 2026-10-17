# DeepDive — AI Video & Audio Research Assistant

DeepDive is an aesthetic, minimal, Pinterest-style research tool powered by local Ollama (`llama3.1:8b`), Whisper, SentenceTransformers, ChromaDB, and Supabase.

---

## Architecture

```
Frontend (React 19 + TypeScript + Vite + Tailwind CSS)
    ↓  (HTTP REST / JSON / Multipart)
FastAPI Backend (port 8000)
    ↓
DeepDive Processing Services:
  - YouTubeTranscriptApi (Captions)
  - OpenAI Whisper (Local Audio & Video Transcription)
  - SentenceTransformers (all-MiniLM-L6-v2)
  - ChromaDB (In-Memory Vector Search)
  - Ollama (Local Llama 3.1 8B Q&A, Summary & Takeaways)
    ↓
Supabase (Authentication & Row Level Security Session History)
```

---

## Getting Started

### 1. Prerequisites
- **Python 3.10+** (with `fastapi`, `uvicorn`, `ollama`, `sentence-transformers`, `chromadb`, `youtube-transcript-api`, `whisper`)
- **Node.js 18+** & `npm`
- **Ollama** running locally with `llama3.1:8b`:
  ```bash
  ollama run llama3.1:8b
  ```
- **FFmpeg** installed and accessible in your system PATH.

### 2. Environment Variables
Your `.env` file is already configured with your Supabase credentials:

```ini
VITE_SUPABASE_URL=https://klackxmutngozlvnfhfa.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_URL=http://localhost:8000
```

### 3. Supabase Database Migration
Open your [Supabase Dashboard](https://supabase.com/dashboard) → **SQL Editor**, and paste the contents of `supabase_schema.sql` to create the `deepdive_sessions` table and Row Level Security (RLS) policies:

```sql
create table if not exists public.deepdive_sessions (
    id text primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    input_type text not null check (input_type in ('youtube', 'audio', 'video')),
    source_url text not null,
    title text not null,
    duration_formatted text,
    summary jsonb not null default '{}'::jsonb,
    notes jsonb not null default '[]'::jsonb,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists deepdive_sessions_user_id_idx on public.deepdive_sessions (user_id, created_at desc);

alter table public.deepdive_sessions enable row level security;

create policy "Users can view their own deepdive sessions"
    on public.deepdive_sessions for select
    using (auth.uid() = user_id);

create policy "Users can insert their own deepdive sessions"
    on public.deepdive_sessions for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own deepdive sessions"
    on public.deepdive_sessions for update
    using (auth.uid() = user_id);

create policy "Users can delete their own deepdive sessions"
    on public.deepdive_sessions for delete
    using (auth.uid() = user_id);
```

---

## Running the Application

### Start the FastAPI Backend
In your project directory, run:
```bash
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation will be live at: `http://localhost:8000/docs`

### Start the Frontend
In another terminal window:
```bash
npm run dev
```
Open your browser at: `http://localhost:5173`

---

## API Endpoints

- `GET /health` — Check backend connection, Ollama availability, and models status
- `POST /analyze/youtube` — Fetch transcript, chunk, embed into ChromaDB, and synthesize overview
- `POST /analyze/upload` — Transcribe uploaded MP3/WAV/MP4 with Whisper, chunk, embed, and synthesize
- `POST /ask` — Vector retrieval + grounded Llama 3.1 8B answering with clickable timestamps
- `POST /summary` — Retrieve structured overview, key points, and important moments
- `POST /notes` — Retrieve structured study takeaways
