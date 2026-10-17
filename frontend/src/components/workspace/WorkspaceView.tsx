import React from 'react';
import { useApp } from '../../context/AppContext';
import { ChatInterface } from './ChatInterface';
import { SummaryTab } from './SummaryTab';
import { NotesTab } from './NotesTab';
import {
  FileAudio,
  FileVideo,
  Clock,
  ArrowLeft,
  MessageSquare,
  FileText,
  Bookmark,
  ExternalLink,
} from 'lucide-react';
import { YoutubeIcon } from '../common/Icons';

export const WorkspaceView: React.FC = () => {
  const { activeSession, activeTab, setActiveTab, resetToHome } = useApp();

  if (!activeSession) return null;

  const isYouTube = activeSession.input_type === 'youtube';

  return (
    <div className="h-full flex flex-col bg-[#FAF7F2] overflow-hidden">
      {/* Top Workspace Header Bar */}
      <header className="bg-[#FFFDF9] border-b border-[#4A1525]/10 px-4 sm:px-8 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 shadow-xs">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={resetToHome}
            title="Back to home"
            className="p-2 rounded-xl text-[#4A1525]/60 hover:text-[#4A1525] hover:bg-[#FAF7F2] transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="w-8 h-8 rounded-xl bg-[#FBE3E8] text-[#8E1735] flex items-center justify-center shrink-0 border border-[#8E1735]/15">
            {isYouTube ? (
              <YoutubeIcon className="w-4 h-4 text-[#E11D48]" />
            ) : activeSession.input_type === 'video' ? (
              <FileVideo className="w-4 h-4 text-[#8E1735]" />
            ) : (
              <FileAudio className="w-4 h-4 text-[#B85A65]" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-sm sm:text-base font-bold text-[#4A1525] truncate">
                {activeSession.title}
              </h1>
              {isYouTube && (
                <a
                  href={activeSession.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#4A1525]/40 hover:text-[#E11D48] transition-colors shrink-0"
                  title="Open on YouTube"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-[#4A1525]/50 mt-0.5">
              {activeSession.duration_formatted && (
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3 text-[#8E1735]" />
                  {activeSession.duration_formatted}
                </span>
              )}
              {activeSession.total_chunks > 0 && (
                <>
                  <span>•</span>
                  <span>{activeSession.total_chunks} index chunks</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Compact Segmented Tab Navigation: [ Ask ] [ Summary ] [ Notes ] */}
        <div className="flex p-1 bg-[#FAF7F2] rounded-2xl border border-[#4A1525]/10 self-center sm:self-auto shrink-0 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('ask')}
            className={`py-1.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'ask'
                ? 'bg-white text-[#8E1735] shadow-xs'
                : 'text-[#4A1525]/60 hover:text-[#4A1525]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Ask</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`py-1.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'summary'
                ? 'bg-white text-[#8E1735] shadow-xs'
                : 'text-[#4A1525]/60 hover:text-[#4A1525]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Summary</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`py-1.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'notes'
                ? 'bg-white text-[#8E1735] shadow-xs'
                : 'text-[#4A1525]/60 hover:text-[#4A1525]'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Notes</span>
          </button>
        </div>
      </header>

      {/* Main Tab Content View */}
      <main className="flex-1 overflow-hidden relative">
        {activeTab === 'ask' && <ChatInterface />}
        {activeTab === 'summary' && <SummaryTab />}
        {activeTab === 'notes' && <NotesTab />}
      </main>
    </div>
  );
};
