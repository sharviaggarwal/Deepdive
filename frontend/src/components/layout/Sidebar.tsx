import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Compass,
  PlusCircle,
  Clock,
  FileAudio,
  FileVideo,
  LogOut,
  Settings,
  Trash2,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { YoutubeIcon } from '../common/Icons';
import { HistoryItem } from '../../types';

interface SidebarProps {
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenSettings }) => {
  const {
    currentUser,
    history,
    loadHistoryItem,
    deleteHistoryItem,
    resetToHome,
    logout,
    activeSession,
    backendHealth,
  } = useApp();

  // Helper to group history into Today, Yesterday, and Older
  const groupHistory = (items: HistoryItem[]) => {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    const todayItems: HistoryItem[] = [];
    const yesterdayItems: HistoryItem[] = [];
    const olderItems: HistoryItem[] = [];

    items.forEach((item) => {
      const itemDate = new Date(item.created_at).toDateString();
      if (itemDate === today) {
        todayItems.push(item);
      } else if (itemDate === yesterday) {
        yesterdayItems.push(item);
      } else {
        olderItems.push(item);
      }
    });

    return { todayItems, yesterdayItems, olderItems };
  };

  const { todayItems, yesterdayItems, olderItems } = groupHistory(history);

  const renderHistoryList = (items: HistoryItem[], label: string) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-4">
        <h4 className="text-[11px] font-semibold text-[#4A1525]/45 uppercase tracking-wider px-3 mb-1.5">
          {label}
        </h4>
        <div className="space-y-0.5">
          {items.map((item) => {
            const isActive = activeSession?.session_id === item.id;
            return (
              <div
                key={item.id}
                className={`group relative flex items-center justify-between px-3 py-2 rounded-2xl text-xs transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-[#FBE3E8] text-[#8E1735] font-semibold shadow-xs'
                    : 'text-[#4A1525]/80 hover:bg-[#FAF7F2] hover:text-[#4A1525]'
                }`}
                onClick={() => loadHistoryItem(item)}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  {item.input_type === 'youtube' ? (
                    <YoutubeIcon className="w-3.5 h-3.5 text-[#E11D48] shrink-0" />
                  ) : item.input_type === 'video' ? (
                    <FileVideo className="w-3.5 h-3.5 text-[#8E1735] shrink-0" />
                  ) : (
                    <FileAudio className="w-3.5 h-3.5 text-[#B85A65] shrink-0" />
                  )}
                  <span className="truncate">{item.title}</span>
                </div>

                <button
                  type="button"
                  title="Remove from history"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteHistoryItem(item.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-[#4A1525]/40 hover:text-[#9F1239] transition-opacity rounded-lg"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <aside className="w-64 h-full bg-[#FFFDF9] border-r border-[#4A1525]/10 flex flex-col justify-between shrink-0 select-none">
      {/* Top Header & Brand */}
      <div>
        <div className="p-4 border-b border-[#4A1525]/5 flex items-center justify-between">
          <div
            onClick={resetToHome}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-[#FBE3E8] text-[#8E1735] flex items-center justify-center border border-[#8E1735]/15 shadow-xs group-hover:scale-105 transition-transform">
              <Compass className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <h2 className="font-serif text-base font-bold text-[#4A1525] leading-none">
                DeepDive
              </h2>
              <p className="text-[10px] text-[#4A1525]/50 mt-0.5">Research Assistant</p>
            </div>
          </div>
        </div>

        {/* New Analysis Action Button */}
        <div className="p-3">
          <button
            type="button"
            onClick={resetToHome}
            className="w-full py-2.5 px-3.5 rounded-2xl bg-[#FAF7F2] hover:bg-[#FBE3E8] border border-[#4A1525]/10 hover:border-[#8E1735]/20 text-[#4A1525] hover:text-[#8E1735] text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer shadow-xs"
          >
            <PlusCircle className="w-4 h-4 text-[#8E1735]" />
            <span>New Analysis</span>
          </button>
        </div>

        {/* History Stream */}
        <div className="px-2 pt-2 max-h-[calc(100vh-250px)] overflow-y-auto">
          {history.length === 0 ? (
            <div className="py-8 px-4 text-center">
              <Clock className="w-5 h-5 mx-auto text-[#4A1525]/30 mb-2 stroke-[1.5]" />
              <p className="text-xs text-[#4A1525]/50 font-medium">No recent analyses</p>
              <p className="text-[11px] text-[#4A1525]/35 mt-1">
                Your past sessions will appear here
              </p>
            </div>
          ) : (
            <>
              {renderHistoryList(todayItems, 'Today')}
              {renderHistoryList(yesterdayItems, 'Yesterday')}
              {renderHistoryList(olderItems, 'Recent')}
            </>
          )}
        </div>
      </div>

      {/* Bottom Profile & Actions */}
      <div className="p-3 border-t border-[#4A1525]/5 space-y-1 bg-[#FAF7F2]/40">
        {/* Backend health status badge */}
        <div className="px-3 py-1.5 rounded-xl flex items-center justify-between text-[11px] text-[#4A1525]/70 bg-white border border-[#4A1525]/5">
          <div className="flex items-center gap-1.5 truncate">
            <span
              className={`w-2 h-2 rounded-full ${
                backendHealth?.ollama_connected ? 'bg-emerald-500' : 'bg-amber-400'
              }`}
            />
            <span className="truncate">
              {backendHealth?.ollama_connected
                ? 'Llama 3.1 8B Ready'
                : 'Backend Connecting...'}
            </span>
          </div>
          <Activity className="w-3 h-3 text-[#4A1525]/40 shrink-0" />
        </div>

        {/* User Account / Settings */}
        <div className="flex items-center justify-between pt-1 px-1">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <div className="w-6 h-6 rounded-full bg-[#ECAAB8] text-[#8E1735] flex items-center justify-center text-[10px] font-bold uppercase shrink-0">
              {currentUser?.email ? currentUser.email.charAt(0) : 'U'}
            </div>
            <span className="text-xs font-medium text-[#4A1525] truncate">
              {currentUser?.email || 'User'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              title="Settings"
              onClick={onOpenSettings}
              className="p-1.5 rounded-xl text-[#4A1525]/60 hover:text-[#4A1525] hover:bg-white transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Log out"
              onClick={logout}
              className="p-1.5 rounded-xl text-[#4A1525]/60 hover:text-[#9F1239] hover:bg-white transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
