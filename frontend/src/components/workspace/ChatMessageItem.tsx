import React, { useState } from 'react';
import { ChatMessage, TimestampItem } from '../../types';
import { Compass, User, Clock, Copy, CheckCircle2, ExternalLink } from 'lucide-react';

interface ChatMessageItemProps {
  message: ChatMessage;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message }) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.sender === 'user';

  const handleCopyAnswer = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="flex justify-end mb-4 animate-in fade-in slide-in-from-bottom-2">
        <div className="max-w-xl bg-[#8E1735] text-white rounded-3xl rounded-tr-md px-5 py-3.5 shadow-xs">
          <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
            {message.text}
          </p>
          <span className="block text-[10px] text-white/60 text-right mt-1.5 font-mono">
            {message.timestamp}
          </span>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex items-start gap-3 mb-6 animate-in fade-in slide-in-from-bottom-2">
      <div className="w-8 h-8 rounded-xl bg-[#FBE3E8] text-[#8E1735] flex items-center justify-center shrink-0 border border-[#8E1735]/15 mt-1 shadow-2xs">
        <Compass className="w-4 h-4 stroke-[1.8]" />
      </div>

      <div className="flex-1 max-w-2xl bg-[#FFFDF9] rounded-3xl rounded-tl-md p-5 sm:p-6 shadow-[0_4px_20px_rgb(74,21,37,0.04)] border border-[#4A1525]/10">
        {/* Answer text */}
        <div className="font-sans text-xs sm:text-sm text-[#4A1525]/90 leading-relaxed whitespace-pre-wrap">
          {message.text}
        </div>

        {/* Clickable Timestamps Section */}
        {message.timestamps && message.timestamps.length > 0 && (
          <div className="mt-4 pt-3.5 border-t border-[#4A1525]/10">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#4A1525]/50 mb-2.5 flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-[#8E1735]" />
              <span>Referenced Moments</span>
            </p>

            <div className="flex flex-wrap gap-2">
              {message.timestamps.map((ts, idx) => {
                const hasUrl = Boolean(ts.url);
                return hasUrl ? (
                  <a
                    key={idx}
                    href={ts.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF7F2] hover:bg-[#FBE3E8] border border-[#4A1525]/10 hover:border-[#8E1735]/25 text-[#4A1525] hover:text-[#8E1735] text-xs font-mono font-medium transition-all shadow-2xs group"
                  >
                    <span className="font-bold text-[#8E1735]">{ts.start_formatted}</span>
                    <span className="text-[11px] text-[#4A1525]/50">→ {ts.end_formatted}</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
                  </a>
                ) : (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#4A1525]/10 text-[#4A1525] text-xs font-mono font-medium shadow-2xs"
                  >
                    <span className="font-bold text-[#8E1735]">{ts.start_formatted}</span>
                    <span className="text-[11px] text-[#4A1525]/50">→ {ts.end_formatted}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer with copy button */}
        <div className="mt-4 pt-2.5 flex items-center justify-between text-[11px] text-[#4A1525]/45">
          <span className="font-mono">{message.timestamp}</span>

          <button
            type="button"
            onClick={handleCopyAnswer}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-[#FAF7F2] text-[#4A1525]/60 hover:text-[#8E1735] transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span className="text-emerald-700 font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy answer</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
