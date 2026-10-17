import React from 'react';
import { useApp } from '../../context/AppContext';
import { X, User, Shield, Cpu, Database, LogOut, CheckCircle2 } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, backendHealth, logout } = useApp();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md bg-[#FFFDF9] rounded-3xl p-6 sm:p-7 shadow-xl border border-[#4A1525]/10 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#4A1525]/10">
          <div>
            <h3 className="font-serif text-lg font-bold text-[#4A1525]">Settings</h3>
            <p className="text-xs text-[#4A1525]/50">Account and local system status</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#4A1525]/50 hover:text-[#4A1525] hover:bg-[#FAF7F2] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="py-5 space-y-4 text-xs">
          {/* Account Card */}
          <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#4A1525]/5 space-y-1">
            <div className="flex items-center gap-2 text-[#4A1525]/60 font-semibold text-[11px] uppercase tracking-wider">
              <User className="w-3.5 h-3.5 text-[#8E1735]" />
              <span>Signed In Account</span>
            </div>
            <p className="text-sm font-semibold text-[#4A1525] pt-0.5">
              {currentUser?.email || 'Logged in user'}
            </p>
            <p className="text-[11px] text-[#4A1525]/50 font-mono">
              ID: {currentUser?.id?.slice(0, 16)}...
            </p>
          </div>

          {/* Local AI Architecture Status */}
          <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#4A1525]/5 space-y-2.5">
            <div className="flex items-center gap-2 text-[#4A1525]/60 font-semibold text-[11px] uppercase tracking-wider">
              <Cpu className="w-3.5 h-3.5 text-[#8E1735]" />
              <span>DeepDive Local AI Engine</span>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[#4A1525]/70">Ollama Model:</span>
                <span className="font-mono font-semibold text-[#8E1735]">
                  {backendHealth?.model || 'llama3.1:8b'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#4A1525]/70">Embedding Engine:</span>
                <span className="font-mono font-medium text-[#4A1525]">
                  {backendHealth?.embedding_model || 'all-MiniLM-L6-v2'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#4A1525]/70">Transcription:</span>
                <span className="font-mono font-medium text-[#4A1525]">
                  Whisper ({backendHealth?.whisper_model || 'base'})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#4A1525]/70">Vector Retrieval:</span>
                <span className="font-mono font-medium text-[#4A1525]">
                  ChromaDB
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex items-center justify-between border-t border-[#4A1525]/10">
          <button
            type="button"
            onClick={async () => {
              await logout();
              onClose();
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#9F1239] hover:bg-[#FFF1F2] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log out</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#8E1735] hover:bg-[#6E1129] text-white text-xs font-semibold transition-all cursor-pointer shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
