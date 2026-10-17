export type InputType = 'youtube' | 'audio' | 'video';

export interface TimestampItem {
  start: number;
  end: number;
  start_formatted: string;
  end_formatted: string;
  label?: string;
  url?: string;
}

export interface SummaryPayload {
  overview: string;
  key_points: string[];
  important_moments: TimestampItem[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamps?: TimestampItem[];
  sources?: any[];
  timestamp: string;
}

export interface DeepDiveSession {
  session_id: string;
  title: string;
  input_type: InputType;
  source_url: string;
  duration_seconds: number;
  duration_formatted: string;
  total_segments: number;
  total_chunks: number;
  summary: SummaryPayload;
  notes: string[];
  messages: ChatMessage[];
  created_at?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  created_at?: string;
}

export interface BackendHealth {
  status: string;
  app: string;
  ollama_connected: boolean;
  model: string;
  embedding_model: string;
  whisper_model: string;
}

export interface HistoryItem {
  id: string;
  user_id: string;
  input_type: InputType;
  source_url: string;
  title: string;
  created_at: string;
  duration_formatted?: string;
  summary: SummaryPayload;
  notes: string[];
  metadata?: Record<string, any>;
}
