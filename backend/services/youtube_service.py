import json
import re
import urllib.request
from typing import Dict, List, Optional, Tuple
from youtube_transcript_api import YouTubeTranscriptApi
from backend.utils.formatting import extract_youtube_id


def get_youtube_video_title(video_id: str) -> str:
    """Fetch real YouTube video title via public oEmbed endpoint."""
    try:
        oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
        req = urllib.request.Request(
            oembed_url,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) DeepDive/1.0"}
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
            title = data.get("title")
            if title:
                return title.strip()
    except Exception as e:
        print(f"Could not retrieve title via oEmbed for {video_id}: {e}")

    return f"YouTube Video ({video_id})"


def fetch_youtube_transcript(url_or_id: str) -> Tuple[str, str, List[Dict[str, float | str]]]:
    """
    Fetch YouTube transcript with exact start and end timestamps.
    Logic directly adapted from DeepDive notebook Cells 7-8.
    
    Returns:
        (video_id, title, segments)
    """
    video_id = extract_youtube_id(url_or_id)
    if not video_id:
        raise ValueError(f"Invalid YouTube URL or Video ID: '{url_or_id}'")

    title = get_youtube_video_title(video_id)

    api = YouTubeTranscriptApi()
    
    # Try fetching with preferred language en, then any available transcript
    try:
        transcript = api.fetch(video_id)
    except Exception as err:
        try:
            transcript_list = api.list(video_id)
            # Find an english or first available transcript
            target_t = None
            for t in transcript_list:
                if t.language_code.startswith("en"):
                    target_t = t
                    break
            if not target_t:
                for t in transcript_list:
                    target_t = t
                    break
            if target_t:
                transcript = target_t.fetch()
            else:
                raise err
        except Exception:
            raise ValueError(f"Could not retrieve captions/transcript for YouTube video {video_id}. It may not have captions enabled: {err}")

    segments: List[Dict[str, float | str]] = []
    for item in transcript:
        # Extract start, end, text exactly as in notebook Cell 8
        start_time = float(getattr(item, "start", 0.0))
        duration = float(getattr(item, "duration", 0.0))
        raw_text = getattr(item, "text", "")
        clean_text = re.sub(r"\s+", " ", str(raw_text)).strip()
        
        if clean_text:
            segments.append({
                "start": start_time,
                "end": round(start_time + duration, 2),
                "text": clean_text
            })

    if not segments:
        raise ValueError(f"No spoken text segments found in the transcript for {video_id}.")

    return video_id, title, segments
