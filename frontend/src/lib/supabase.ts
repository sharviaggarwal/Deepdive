import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

export const getSupabaseUrl = (): string => {
  return (
    import.meta.env.VITE_SUPABASE_URL ||
    localStorage.getItem('deepdive_supabase_url') ||
    ''
  );
};

export const getSupabaseAnonKey = (): string => {
  return (
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    localStorage.getItem('deepdive_supabase_anon_key') ||
    ''
  );
};

export const setSupabaseCredentials = (url: string, key: string) => {
  if (url) localStorage.setItem('deepdive_supabase_url', url.trim());
  if (key) localStorage.setItem('deepdive_supabase_anon_key', key.trim());
  resetSupabaseClient();
};

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient | null => {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (!url || !anonKey) {
    return null;
  }

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      return null;
    }
  }

  return supabaseInstance;
};

export const resetSupabaseClient = () => {
  supabaseInstance = null;
};

export interface AuthUser {
  id: string;
  email: string;
  created_at?: string;
}

export const getCurrentUser = async (): Promise<AuthUser | null> => {
  const client = getSupabase();
  if (!client) return null;

  try {
    const {
      data: { user },
      error,
    } = await client.auth.getUser();

    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email || '',
      created_at: user.created_at,
    };
  } catch (err) {
    console.error('Error fetching Supabase user:', err);
    return null;
  }
};

export interface DeepDiveHistoryRecord {
  id: string;
  user_id: string;
  input_type: 'youtube' | 'audio' | 'video';
  source_url: string;
  title: string;
  duration_formatted?: string;
  created_at: string;
  summary: {
    overview: string;
    key_points: string[];
    important_moments: Array<{
      start: number;
      end: number;
      start_formatted: string;
      end_formatted: string;
      label?: string;
      url?: string;
    }>;
  };
  notes: string[];
  metadata?: Record<string, any>;
}

// Local storage fallback for history when Supabase table isn't migrated yet
const LOCAL_HISTORY_KEY = 'deepdive_sessions_history';

export const fetchHistoryFromSupabase = async (
  userId: string
): Promise<DeepDiveHistoryRecord[]> => {
  const client = getSupabase();

  if (client && userId) {
    try {
      const { data, error } = await client
        .from('deepdive_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as DeepDiveHistoryRecord[];
      }
    } catch (err) {
      console.warn('Supabase query failed, falling back to local store:', err);
    }
  }

  // Fallback to local storage (partitioned by userId)
  try {
    const raw = localStorage.getItem(`${LOCAL_HISTORY_KEY}_${userId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }

  return [];
};

export const saveHistoryToSupabase = async (
  record: DeepDiveHistoryRecord
): Promise<boolean> => {
  const client = getSupabase();

  // Always save to user-specific localStorage for instant resilience
  try {
    const existing = await fetchHistoryFromSupabase(record.user_id);
    const updated = [record, ...existing.filter((s) => s.id !== record.id)];
    localStorage.setItem(
      `${LOCAL_HISTORY_KEY}_${record.user_id}`,
      JSON.stringify(updated)
    );
  } catch {
    // ignore
  }

  if (client && record.user_id) {
    try {
      const { error } = await client.from('deepdive_sessions').upsert({
        id: record.id,
        user_id: record.user_id,
        input_type: record.input_type,
        source_url: record.source_url,
        title: record.title,
        duration_formatted: record.duration_formatted,
        created_at: record.created_at,
        summary: record.summary,
        notes: record.notes,
        metadata: record.metadata || {},
      });

      if (!error) {
        return true;
      }
      console.warn('Notice: deepdive_sessions table upsert note:', error.message);
    } catch (err) {
      console.warn('Could not save to Supabase table:', err);
    }
  }

  return true;
};
