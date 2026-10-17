import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Clock, CheckCircle2, Copy, Sparkles, ExternalLink } from 'lucide-react';

export const SummaryTab: React.FC = () => {
  const { activeSession } = useApp();
  const [copied, setCopied] = useState(false);

  if (!activeSession) return null;

  const { summary } = activeSession;
  const hasOverview = Boolean(summary?.overview?.trim());
  const hasKeyPoints = Array.isArray(summary?.key_points) && summary.key_points.length > 0;
  const hasMoments = Array.isArray(summary?.important_moments) && summary.important_moments.length > 0;

  const handleCopySummary = () => {
    const lines: string[] = [];
    if (hasOverview) lines.push(`Overview:\n${summary.overview}\n`);
    if (hasKeyPoints) {
      lines.push('Key Points:');
      summary.key_points.forEach((kp) => lines.push(`• ${kp}`));
      lines.push('');
    }
    if (hasMoments) {
      lines.push('Important Moments:');
      summary.important_moments.forEach((m) => lines.push(`[${m.start_formatted}] ${m.label || ''}`));
    }

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full overflow-y-auto p-6 sm:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Top Header with Copy Action */}
      <div className="flex items-center justify-between pb-2 border-b border-[#4A1525]/10">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#4A1525]">Summary</h2>
          <p className="text-xs text-[#4A1525]/60 mt-0.5">
            Key insights synthesized from video transcript.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCopySummary}
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
              <span>Copy summary</span>
            </>
          )}
        </button>
      </div>

      {/* Overview Card */}
      {hasOverview && (
        <div className="bg-[#FFFDF9] rounded-3xl p-6 sm:p-7 shadow-[0_4px_20px_rgb(74,21,37,0.04)] border border-[#4A1525]/10">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-[#8E1735]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A1525]/75">
              Overview
            </h3>
          </div>
          <p className="font-sans text-sm sm:text-base leading-relaxed text-[#4A1525]/90">
            {summary.overview}
          </p>
        </div>
      )}

      {/* Key Points Card */}
      {hasKeyPoints && (
        <div className="bg-[#FFFDF9] rounded-3xl p-6 sm:p-7 shadow-[0_4px_20px_rgb(74,21,37,0.04)] border border-[#4A1525]/10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-[#B85A65]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A1525]/75">
              Key Points
            </h3>
          </div>
          <ul className="space-y-3">
            {summary.key_points.map((point, idx) => (
              <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-[#4A1525]/90 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8E1735] shrink-0 mt-2" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Important Moments Card */}
      {hasMoments && (
        <div className="bg-[#FFFDF9] rounded-3xl p-6 sm:p-7 shadow-[0_4px_20px_rgb(74,21,37,0.04)] border border-[#4A1525]/10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-[#C9C7F5]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A1525]/75">
              Important Moments
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {summary.important_moments.map((moment, idx) => {
              const hasUrl = Boolean(moment.url);
              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#4A1525]/10 flex items-start gap-3 hover:border-[#8E1735]/30 transition-all group"
                >
                  {hasUrl ? (
                    <a
                      href={moment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Jump to video timestamp"
                      className="px-2.5 py-1 rounded-xl bg-[#FBE3E8] hover:bg-[#8E1735] text-[#8E1735] hover:text-white font-mono text-xs font-bold shrink-0 transition-colors flex items-center gap-1 shadow-2xs"
                    >
                      <Clock className="w-3 h-3" />
                      <span>{moment.start_formatted}</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                    </a>
                  ) : (
                    <span className="px-2.5 py-1 rounded-xl bg-[#FBE3E8] text-[#8E1735] font-mono text-xs font-bold shrink-0 flex items-center gap-1 shadow-2xs">
                      <Clock className="w-3 h-3" />
                      <span>{moment.start_formatted}</span>
                    </span>
                  )}
                  <p className="text-xs text-[#4A1525]/85 leading-relaxed pt-0.5">
                    {moment.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
