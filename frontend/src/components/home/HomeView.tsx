import React, { useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  UploadCloud,
  FileAudio,
  FileVideo,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Check,
  Compass,
} from 'lucide-react';
import { YoutubeIcon } from '../common/Icons';

export const HomeView: React.FC = () => {
  const {
    startAnalysisYouTube,
    startAnalysisUpload,
    isAnalyzing,
    analyzingStep,
    error,
    setError,
  } = useApp();

  const [mode, setMode] = useState<'youtube' | 'upload'>('youtube');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleYoutubeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl.trim() || isAnalyzing) return;
    setError(null);
    await startAnalysisYouTube(youtubeUrl.trim());
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || isAnalyzing) return;
    setError(null);
    await startAnalysisUpload(selectedFile);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const validExtensions = [
      '.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac',
      '.mp4', '.mov', '.webm', '.mkv', '.avi'
    ];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validExtensions.includes(ext)) {
      setError(`Unsupported file type '${ext}'. Please choose an audio or video file.`);
      setSelectedFile(null);
      return;
    }

    // Limit to 250MB
    if (file.size > 250 * 1024 * 1024) {
      setError('File size exceeds 250MB. Please choose a smaller audio or video file.');
      setSelectedFile(null);
      return;
    }

    setError(null);
    setSelectedFile(file);
  };

  // If currently analyzing, render the calm loading state requested
  if (isAnalyzing) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-6 bg-[#FAF7F2] select-none">
        <div className="w-full max-w-sm text-center">
          {/* Animated calm pulse ring */}
          <div className="relative inline-flex items-center justify-center w-20 h-20 mb-8">
            <div className="absolute inset-0 rounded-full bg-[#F6C8D2] opacity-40 animate-ping" />
            <div className="relative w-16 h-16 rounded-full bg-[#FBE3E8] border border-[#8E1735]/20 flex items-center justify-center text-[#8E1735] shadow-sm">
              <Compass className="w-8 h-8 stroke-[1.8] animate-spin" style={{ animationDuration: '6s' }} />
            </div>
          </div>

          <h2 className="font-serif text-2xl font-bold text-[#4A1525] mb-2 tracking-tight">
            DeepDive is processing
          </h2>

          <div className="h-8 flex items-center justify-center">
            <p className="text-sm text-[#8E1735] font-semibold tracking-wide transition-all duration-300">
              {analyzingStep}
            </p>
          </div>

          <p className="text-xs text-[#4A1525]/45 mt-4 max-w-xs mx-auto leading-relaxed">
            Extracting transcripts, generating embeddings, and preparing grounded answers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto flex flex-col items-center justify-center p-6 sm:p-10 bg-[#FAF7F2]">
      <div className="w-full max-w-xl">
        {/* Main Header / Statement */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FBE3E8] border border-[#8E1735]/15 text-[#8E1735] text-[11px] font-semibold mb-4 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Video & Audio Research</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#4A1525] tracking-tight mb-2">
            Understand any video or audio.
          </h1>
          <p className="text-xs sm:text-sm text-[#4A1525]/60 max-w-md mx-auto">
            Extract grounded answers, clickable timestamps, and concise synthesis.
          </p>
        </div>

        {/* Error notification banner */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-[#FFF1F2] border border-[#F43F5E]/20 text-[#9F1239] text-xs flex items-start gap-3 leading-relaxed shadow-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#E11D48]" />
            <div className="flex-1">
              <p className="font-semibold mb-0.5">Analysis failed</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Input Card Container */}
        <div className="bg-[#FFFDF9] rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(74,21,37,0.06)] border border-[#4A1525]/10">
          {/* Segmented Mode Selector: YouTube vs Upload */}
          <div className="flex p-1 bg-[#FAF7F2] rounded-2xl mb-6 border border-[#4A1525]/5">
            <button
              type="button"
              onClick={() => {
                setMode('youtube');
                setError(null);
              }}
              className={`flex-1 py-2.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                mode === 'youtube'
                  ? 'bg-white text-[#4A1525] shadow-xs'
                  : 'text-[#4A1525]/50 hover:text-[#4A1525]'
              }`}
            >
              <YoutubeIcon className="w-4 h-4 text-[#E11D48]" />
              <span>YouTube URL</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('upload');
                setError(null);
              }}
              className={`flex-1 py-2.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                mode === 'upload'
                  ? 'bg-white text-[#4A1525] shadow-xs'
                  : 'text-[#4A1525]/50 hover:text-[#4A1525]'
              }`}
            >
              <UploadCloud className="w-4 h-4 text-[#8E1735]" />
              <span>Upload Audio/Video</span>
            </button>
          </div>

          {/* Mode 1: YouTube URL */}
          {mode === 'youtube' && (
            <form onSubmit={handleYoutubeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#4A1525]/75 mb-2 pl-1">
                  YouTube Video Link
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#4A1525]/40">
                    <YoutubeIcon className="w-4 h-4 text-[#E11D48]" />
                  </div>
                  <input
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    required
                    className="w-full pl-10 pr-4 py-3 bg-white border border-[#4A1525]/15 rounded-2xl text-xs text-[#4A1525] placeholder-[#4A1525]/35 focus:outline-none focus:border-[#8E1735] focus:ring-2 focus:ring-[#8E1735]/10 transition-all"
                  />
                </div>
              </div>

              {/* Sample suggestion pill */}
              <div className="flex items-center gap-1.5 text-[11px] text-[#4A1525]/50 pt-0.5">
                <span>Try:</span>
                <button
                  type="button"
                  onClick={() =>
                    setYoutubeUrl('https://www.youtube.com/watch?v=AUxCcmXJJzw')
                  }
                  className="text-[#8E1735] hover:underline font-medium truncate max-w-[340px]"
                >
                  XOR and XNOR Gates Explained (Demo)
                </button>
              </div>

              <button
                type="submit"
                disabled={!youtubeUrl.trim() || isAnalyzing}
                className="w-full mt-3 py-3 px-4 bg-[#8E1735] hover:bg-[#6E1129] active:scale-[0.99] text-white text-xs font-semibold rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>Analyze</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          {/* Mode 2: Audio/Video Upload */}
          {mode === 'upload' && (
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,video/*,.mp3,.wav,.m4a,.ogg,.flac,.aac,.mp4,.mov,.webm,.mkv,.avi"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-200 ${
                  isDragging
                    ? 'border-[#8E1735] bg-[#FBE3E8]/50'
                    : selectedFile
                    ? 'border-[#8E1735]/40 bg-[#FBE3E8]/20'
                    : 'border-[#4A1525]/15 hover:border-[#8E1735]/30 hover:bg-[#FAF7F2]'
                }`}
              >
                {selectedFile ? (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-[#FBE3E8] text-[#8E1735] flex items-center justify-center mb-3">
                      {selectedFile.type.startsWith('video') ? (
                        <FileVideo className="w-6 h-6" />
                      ) : (
                        <FileAudio className="w-6 h-6" />
                      )}
                    </div>
                    <p className="text-xs font-semibold text-[#4A1525] truncate max-w-xs">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-[#4A1525]/50 mt-1">
                      {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB • Click to change
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-[#FAF7F2] text-[#4A1525]/60 flex items-center justify-center mb-3 border border-[#4A1525]/10">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-semibold text-[#4A1525] mb-1">
                      Click to choose or drag & drop media file
                    </p>
                    <p className="text-[11px] text-[#4A1525]/45">
                      MP3, WAV, M4A, MP4, MOV, WEBM (up to 250MB)
                    </p>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={!selectedFile || isAnalyzing}
                className="w-full mt-3 py-3 px-4 bg-[#8E1735] hover:bg-[#6E1129] active:scale-[0.99] text-white text-xs font-semibold rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>Analyze</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
