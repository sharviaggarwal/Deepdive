import { BackendHealth, DeepDiveSession, SummaryPayload, TimestampItem } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number = 500) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const checkHealth = async (): Promise<BackendHealth> => {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) {
      throw new ApiError(`Health check failed (${res.status})`, res.status);
    }
    return await res.json();
  } catch (err: any) {
    throw new ApiError(
      err.message || 'Cannot reach DeepDive backend at http://localhost:8000. Is FastAPI running?',
      err.status || 503
    );
  }
};

export const analyzeYouTube = async (url: string, title?: string): Promise<DeepDiveSession> => {
  try {
    const res = await fetch(`${API_BASE_URL}/analyze/youtube`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, title }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const message = errorData.detail || `Analysis failed (${res.status})`;
      throw new ApiError(message, res.status);
    }

    const data = await res.json();
    return {
      ...data,
      messages: [],
      created_at: new Date().toISOString(),
    };
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(err.message || 'Network error while analyzing YouTube video.', 500);
  }
};

export const analyzeUpload = async (file: File): Promise<DeepDiveSession> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE_URL}/analyze/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const message = errorData.detail || `File upload & analysis failed (${res.status})`;
      throw new ApiError(message, res.status);
    }

    const data = await res.json();
    return {
      ...data,
      messages: [],
      created_at: new Date().toISOString(),
    };
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(err.message || 'Network error while uploading and transcribing media file.', 500);
  }
};

export const askQuestion = async (
  sessionId: string,
  question: string,
  nResults = 5
): Promise<{
  question: string;
  answer: string;
  timestamps: TimestampItem[];
  sources: any[];
}> => {
  try {
    const res = await fetch(`${API_BASE_URL}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        question,
        n_results: nResults,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const message = errorData.detail || `Failed to generate answer (${res.status})`;
      throw new ApiError(message, res.status);
    }

    return await res.json();
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(err.message || 'Network error while querying DeepDive.', 500);
  }
};

export const fetchSummary = async (sessionId: string): Promise<SummaryPayload> => {
  const res = await fetch(`${API_BASE_URL}/summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!res.ok) {
    throw new ApiError('Failed to fetch summary', res.status);
  }
  return await res.json();
};

export const fetchNotes = async (sessionId: string): Promise<string[]> => {
  const res = await fetch(`${API_BASE_URL}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!res.ok) {
    throw new ApiError('Failed to fetch notes', res.status);
  }
  const data = await res.json();
  return data.notes || [];
};
