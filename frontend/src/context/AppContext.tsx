import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  AuthUser,
  BackendHealth,
  ChatMessage,
  DeepDiveSession,
  HistoryItem,
} from '../types';
import {
  analyzeUpload,
  analyzeYouTube,
  askQuestion,
  checkHealth,
} from '../services/api';
import {
  fetchHistoryFromSupabase,
  getCurrentUser,
  getSupabase,
  saveHistoryToSupabase,
} from '../lib/supabase';

interface AppContextType {
  currentUser: AuthUser | null;
  setCurrentUser: (user: AuthUser | null) => void;
  isAuthChecking: boolean;
  activeSession: DeepDiveSession | null;
  setActiveSession: (session: DeepDiveSession | null) => void;
  history: HistoryItem[];
  isAnalyzing: boolean;
  analyzingStep: string;
  error: string | null;
  setError: (err: string | null) => void;
  backendHealth: BackendHealth | null;
  activeTab: 'ask' | 'summary' | 'notes';
  setActiveTab: (tab: 'ask' | 'summary' | 'notes') => void;
  isAsking: boolean;
  startAnalysisYouTube: (url: string) => Promise<boolean>;
  startAnalysisUpload: (file: File) => Promise<boolean>;
  sendChatMessage: (question: string) => Promise<void>;
  loadHistoryItem: (item: HistoryItem) => void;
  deleteHistoryItem: (id: string) => void;
  resetToHome: () => void;
  logout: () => Promise<void>;
  refreshHistory: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [activeSession, setActiveSession] = useState<DeepDiveSession | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analyzingStep, setAnalyzingStep] = useState<string>('Analyzing your content...');
  const [isAsking, setIsAsking] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [backendHealth, setBackendHealth] = useState<BackendHealth | null>(null);
  const [activeTab, setActiveTab] = useState<'ask' | 'summary' | 'notes'>('ask');

  // Check initial Supabase auth state and subscribe to changes
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const client = getSupabase();
        if (client) {
          const {
            data: { session },
          } = await client.auth.getSession();

          if (session?.user && mounted) {
            setCurrentUser({
              id: session.user.id,
              email: session.user.email || '',
              created_at: session.user.created_at,
            });
          }

          client.auth.onAuthStateChange((_event, session) => {
            if (!mounted) return;
            if (session?.user) {
              setCurrentUser({
                id: session.user.id,
                email: session.user.email || '',
                created_at: session.user.created_at,
              });
            } else {
              setCurrentUser(null);
            }
          });
        }
      } catch (err) {
        console.warn('Auth initialization error:', err);
      } finally {
        if (mounted) setIsAuthChecking(false);
      }
    };

    initAuth();
    return () => {
      mounted = false;
    };
  }, []);

  // Poll backend health periodically
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const health = await checkHealth();
        setBackendHealth(health);
      } catch (err: any) {
        setBackendHealth(null);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  // Load user's history when user logs in
  const refreshHistory = async () => {
    if (!currentUser) {
      setHistory([]);
      return;
    }
    const userHistory = await fetchHistoryFromSupabase(currentUser.id);
    setHistory(userHistory);
  };

  useEffect(() => {
    if (currentUser) {
      refreshHistory();
    } else {
      setHistory([]);
    }
  }, [currentUser]);

  // Stepped progress animation for honest status updates without fake percentages
  const runProgressSteps = () => {
    const steps = [
      'Analyzing your content...',
      'Transcribing',
      'Understanding',
      'Preparing your answers',
    ];
    let idx = 0;
    setAnalyzingStep(steps[0]);

    const interval = setInterval(() => {
      idx = (idx + 1) % steps.length;
      setAnalyzingStep(steps[idx]);
    }, 4500);

    return () => clearInterval(interval);
  };

  const startAnalysisYouTube = async (url: string): Promise<boolean> => {
    setIsAnalyzing(true);
    setError(null);
    const stopSteps = runProgressSteps();

    try {
      const session = await analyzeYouTube(url);
      stopSteps();
      setActiveSession(session);
      setActiveTab('ask');

      // Persist in history
      if (currentUser) {
        const historyItem: HistoryItem = {
          id: session.session_id,
          user_id: currentUser.id,
          input_type: 'youtube',
          source_url: session.source_url,
          title: session.title,
          created_at: session.created_at || new Date().toISOString(),
          duration_formatted: session.duration_formatted,
          summary: session.summary,
          notes: session.notes,
        };
        await saveHistoryToSupabase(historyItem);
        setHistory((prev) => [historyItem, ...prev.filter((h) => h.id !== historyItem.id)]);
      }

      setIsAnalyzing(false);
      return true;
    } catch (err: any) {
      stopSteps();
      setIsAnalyzing(false);
      setError(err.message || 'Failed to analyze YouTube video.');
      return false;
    }
  };

  const startAnalysisUpload = async (file: File): Promise<boolean> => {
    setIsAnalyzing(true);
    setError(null);
    const stopSteps = runProgressSteps();

    try {
      const session = await analyzeUpload(file);
      stopSteps();
      setActiveSession(session);
      setActiveTab('ask');

      // Persist in history
      if (currentUser) {
        const historyItem: HistoryItem = {
          id: session.session_id,
          user_id: currentUser.id,
          input_type: session.input_type,
          source_url: session.source_url,
          title: session.title,
          created_at: session.created_at || new Date().toISOString(),
          duration_formatted: session.duration_formatted,
          summary: session.summary,
          notes: session.notes,
        };
        await saveHistoryToSupabase(historyItem);
        setHistory((prev) => [historyItem, ...prev.filter((h) => h.id !== historyItem.id)]);
      }

      setIsAnalyzing(false);
      return true;
    } catch (err: any) {
      stopSteps();
      setIsAnalyzing(false);
      setError(err.message || 'Failed to analyze uploaded audio/video.');
      return false;
    }
  };

  const sendChatMessage = async (question: string) => {
    if (!activeSession || !question.trim()) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: question.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setActiveSession((prev) => (prev ? { ...prev, messages: [...prev.messages, userMsg] } : prev));
    setIsAsking(true);
    setError(null);

    try {
      const result = await askQuestion(activeSession.session_id, question);

      const aiMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'assistant',
        text: result.answer,
        timestamps: result.timestamps,
        sources: result.sources,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setActiveSession((prev) => (prev ? { ...prev, messages: [...prev.messages, aiMsg] } : prev));
    } catch (err: any) {
      setError(err.message || 'Failed to get answer from DeepDive.');
      const errorAiMsg: ChatMessage = {
        id: `ai_err_${Date.now()}`,
        sender: 'assistant',
        text: "I couldn't process this question right now. Please ensure the local Ollama backend is running.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setActiveSession((prev) => (prev ? { ...prev, messages: [...prev.messages, errorAiMsg] } : prev));
    } finally {
      setIsAsking(false);
    }
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setActiveSession({
      session_id: item.id,
      title: item.title,
      input_type: item.input_type,
      source_url: item.source_url,
      duration_seconds: 0,
      duration_formatted: item.duration_formatted || '00:00',
      total_segments: 0,
      total_chunks: 0,
      summary: item.summary || { overview: '', key_points: [], important_moments: [] },
      notes: item.notes || [],
      messages: [],
      created_at: item.created_at,
    });
    setActiveTab('summary');
  };

  const deleteHistoryItem = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
    if (currentUser) {
      try {
        const client = getSupabase();
        if (client) {
          Promise.resolve(client.from('deepdive_sessions').delete().eq('id', id)).catch(() => {});
        }
        const updated = history.filter((item) => item.id !== id);
        localStorage.setItem(`deepdive_sessions_history_${currentUser.id}`, JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
    if (activeSession?.session_id === id) {
      setActiveSession(null);
    }
  };

  const resetToHome = () => {
    setActiveSession(null);
    setError(null);
  };

  const logout = async () => {
    const client = getSupabase();
    if (client) {
      await client.auth.signOut().catch(() => {});
    }
    setCurrentUser(null);
    setActiveSession(null);
    setHistory([]);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        isAuthChecking,
        activeSession,
        setActiveSession,
        history,
        isAnalyzing,
        analyzingStep,
        error,
        setError,
        backendHealth,
        activeTab,
        setActiveTab,
        isAsking,
        startAnalysisYouTube,
        startAnalysisUpload,
        sendChatMessage,
        loadHistoryItem,
        deleteHistoryItem,
        resetToHome,
        logout,
        refreshHistory,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
