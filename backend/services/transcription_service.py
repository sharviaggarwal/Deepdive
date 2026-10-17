import os
import re
from typing import Dict, List, Optional, Tuple
import whisper

_whisper_model: Optional[whisper.Whisper] = None


def get_whisper_model(model_name: str = "base") -> whisper.Whisper:
    """Lazy-load and cache the Whisper model in memory."""
    global _whisper_model
    if _whisper_model is None:
        print(f"Loading Whisper model ({model_name})...")
        _whisper_model = whisper.load_model(model_name)
        print("Whisper model loaded and ready.")
    return _whisper_model


def transcribe_media_file(file_path: str) -> Tuple[List[Dict[str, float | str]], float]:
    """
    Transcribe an audio or video file using local Whisper.
    Produces segment-level timestamps matching the format in DeepDive.
    
    Returns:
        (segments, total_duration_seconds)
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Media file not found at: {file_path}")

    model = get_whisper_model("base")
    
    # Run transcription with fp16=False for robust CPU/GPU cross-compatibility
    result = model.transcribe(file_path, fp16=False)

    raw_segments = result.get("segments", [])
    segments: List[Dict[str, float | str]] = []
    total_duration = 0.0

    for seg in raw_segments:
        start_t = float(seg.get("start", 0.0))
        end_t = float(seg.get("end", 0.0))
        text = re.sub(r"\s+", " ", str(seg.get("text", "")).strip())

        if text:
            segments.append({
                "start": round(start_t, 2),
                "end": round(end_t, 2),
                "text": text
            })
            if end_t > total_duration:
                total_duration = end_t

    # Fallback if no segments but full text exists
    if not segments and result.get("text"):
        clean_text = result["text"].strip()
        if clean_text:
            segments.append({
                "start": 0.0,
                "end": 10.0,
                "text": clean_text
            })
            total_duration = 10.0

    return segments, round(total_duration, 2)
