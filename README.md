# DeepDive 🎧

### Understand any video or audio.

DeepDive is an AI-powered video and audio research assistant that lets users understand long-form content without watching or listening to everything from start to finish.

Users can provide a YouTube video, upload an audio/video file, and then ask questions or generate a concise summary of the content.

## 🚀 Live Demo

**[Try DeepDive →](https://deepdives-q2ticni8y-sharvi.vercel.app/)**

## ✨ Features

- 🎥 **YouTube Support** — Analyze content directly from a YouTube link.
- 🎧 **Audio & Video Uploads** — Upload your own audio or video files.
- 📝 **Automatic Transcription** — Convert spoken content into searchable text.
- 🧠 **AI-Powered Q&A** — Ask questions about the content and get contextual answers.
- 📌 **Timestamp-Aware Content** — Connect answers and information back to relevant moments in the source.
- 📚 **Semantic Search** — Retrieve the most relevant parts of a transcript using embeddings.
- 💬 **Context-Aware Responses** — Answers are generated using retrieved content rather than relying only on the language model's general knowledge.
- 📄 **Summarization** — Generate structured summaries from uploaded or linked content.
- 👤 **Authentication** — Secure user authentication using Supabase.
- 🕘 **History** — Keep track of previously analyzed content and conversations.
- 🤖 **Local LLM Support** — Uses Ollama with Llama 3.1 for local AI inference.

## 🛠️ Tech Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS

### Backend / AI
- Python
- Whisper
- Sentence Transformers
- ChromaDB
- Ollama
- Llama 3.1 8B
- PyAnnote Audio

### Authentication & Data
- Supabase

### Deployment
- Vercel

## 🧩 How It Works

```text
YouTube Link / Audio / Video
            ↓
       Content Input
            ↓
       Transcription
            ↓
      Text Processing
            ↓
         Chunking
            ↓
      Embeddings Model
            ↓
     Vector Database
        (ChromaDB)
            ↓
     Semantic Retrieval
            ↓
       Relevant Context
            ↓
       Local LLM
       (Llama 3.1)
            ↓
     Answer / Summary
