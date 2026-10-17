import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ChatMessageItem } from './ChatMessageItem';
import { ArrowUp, Sparkles, MessageSquare, Compass, CornerDownLeft } from 'lucide-react';

export const ChatInterface: React.FC = () => {
  const { activeSession, sendChatMessage, isAsking } = useApp();
  const [inputQuestion, setInputQuestion] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeSession?.messages, isAsking]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputQuestion.trim() || isAsking) return;

    const query = inputQuestion.trim();
    setInputQuestion('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    await sendChatMessage(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInputResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputQuestion(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const samplePrompts = [
    'What are the main concepts covered in this video?',
    'Summarize the primary takeaways with timestamps.',
    'Explain the most important example discussed.',
  ];

  return (
    <div className="h-full flex flex-col justify-between max-w-4xl mx-auto p-4 sm:p-6 overflow-hidden">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2 mb-4">
        {(!activeSession?.messages || activeSession.messages.length === 0) && (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center select-none">
            <div className="w-14 h-14 rounded-2xl bg-[#FBE3E8] text-[#8E1735] flex items-center justify-center mb-4 shadow-sm border border-[#8E1735]/15">
              <MessageSquare className="w-7 h-7 stroke-[1.8]" />
            </div>

            <h3 className="font-serif text-xl font-bold text-[#4A1525] mb-1.5">
              Ask DeepDive
            </h3>
            <p className="text-xs text-[#4A1525]/60 max-w-sm mb-6 leading-relaxed">
              Ask any specific question about "{activeSession?.title}". Answers will be strictly grounded in the spoken transcript with timestamps.
            </p>

            {/* Quick suggested prompt pills */}
            <div className="flex flex-col sm:flex-row gap-2 max-w-lg w-full">
              {samplePrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setInputQuestion(prompt)}
                  className="flex-1 p-3 rounded-2xl bg-[#FFFDF9] hover:bg-[#FBE3E8]/50 border border-[#4A1525]/10 hover:border-[#8E1735]/25 text-left text-xs text-[#4A1525]/80 hover:text-[#8E1735] transition-all shadow-xs cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#8E1735] mb-1.5" />
                  <span className="block font-medium line-clamp-2">{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Existing Messages */}
        {activeSession?.messages?.map((msg) => (
          <ChatMessageItem key={msg.id} message={msg} />
        ))}

        {/* Thinking / Asking State */}
        {isAsking && (
          <div className="flex items-start gap-3 mb-6 animate-in fade-in">
            <div className="w-8 h-8 rounded-xl bg-[#FBE3E8] text-[#8E1735] flex items-center justify-center shrink-0 border border-[#8E1735]/15 mt-1 shadow-2xs">
              <Compass className="w-4 h-4 stroke-[1.8] animate-spin" style={{ animationDuration: '4s' }} />
            </div>
            <div className="bg-[#FFFDF9] rounded-3xl rounded-tl-md p-4 sm:p-5 shadow-xs border border-[#4A1525]/10 flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#8E1735] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-[#8E1735] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-[#8E1735] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs text-[#4A1525]/70 font-medium">
                Searching transcript and generating grounded answer with Llama 3.1 8B...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box Bar */}
      <div className="pt-2">
        <form
          onSubmit={handleSubmit}
          className="bg-[#FFFDF9] rounded-3xl p-2 sm:p-2.5 shadow-[0_4px_24px_rgb(74,21,37,0.06)] border border-[#4A1525]/15 flex items-end gap-2 focus-within:border-[#8E1735] focus-within:ring-2 focus-within:ring-[#8E1735]/10 transition-all"
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputQuestion}
            onChange={handleInputResize}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about this content..."
            disabled={isAsking}
            className="flex-1 bg-transparent border-0 resize-none py-2 px-3 text-xs sm:text-sm text-[#4A1525] placeholder-[#4A1525]/40 focus:outline-none min-h-[40px] max-h-[120px] leading-relaxed"
          />

          <button
            type="submit"
            disabled={!inputQuestion.trim() || isAsking}
            title="Send question (Enter)"
            className="w-10 h-10 rounded-2xl bg-[#8E1735] hover:bg-[#6E1129] active:scale-95 text-white flex items-center justify-center shrink-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
          >
            <ArrowUp className="w-4 h-4 stroke-[2.2]" />
          </button>
        </form>

        <p className="text-[10px] text-center text-[#4A1525]/40 mt-2">
          Press <span className="font-mono font-medium">Enter</span> to submit • Answers are derived directly from the video transcript
        </p>
      </div>
    </div>
  );
};
