import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, Copy, Bookmark, Lightbulb } from 'lucide-react';

export const NotesTab: React.FC = () => {
  const { activeSession } = useApp();
  const [copied, setCopied] = useState(false);

  if (!activeSession) return null;

  const notes = activeSession.notes || [];

  const handleCopyNotes = () => {
    const text = notes.map((n, i) => `${i + 1}. ${n}`).join('\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full overflow-y-auto p-6 sm:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#4A1525]/10">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#4A1525]">Notes & Takeaways</h2>
          <p className="text-xs text-[#4A1525]/60 mt-0.5">
            Key concepts and structured takeaways for quick review.
          </p>
        </div>

        {notes.length > 0 && (
          <button
            type="button"
            onClick={handleCopyNotes}
            className="px-3 py-1.5 rounded-xl bg-white border border-[#4A1525]/15 hover:border-[#8E1735]/30 text-xs font-semibold text-[#4A1525] hover:text-[#8E1735] flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#4A1525]/60" />
                <span>Copy notes</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Notes Cards Stream */}
      {notes.length === 0 ? (
        <div className="bg-[#FFFDF9] rounded-3xl p-12 text-center border border-[#4A1525]/10">
          <Bookmark className="w-8 h-8 text-[#4A1525]/30 mx-auto mb-2" />
          <p className="text-sm font-semibold text-[#4A1525]/60">No notes available</p>
          <p className="text-xs text-[#4A1525]/40 mt-1">
            Notes will appear here after video transcription and synthesis.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notes.map((note, idx) => (
            <div
              key={idx}
              className="bg-[#FFFDF9] rounded-3xl p-6 shadow-[0_4px_20px_rgb(74,21,37,0.04)] border border-[#4A1525]/10 hover:border-[#8E1735]/25 transition-all relative overflow-hidden group"
            >
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-[#FBE3E8] text-[#8E1735] flex items-center justify-center shrink-0 mt-0.5 font-mono text-xs font-bold">
                  {idx + 1}
                </div>
                <p className="font-sans text-xs sm:text-sm text-[#4A1525]/90 leading-relaxed">
                  {note}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
