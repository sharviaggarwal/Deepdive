import re
from typing import Optional


def format_timestamp(seconds: float) -> str:
    """
    Format seconds into MM:SS or HH:MM:SS format.
    From DeepDive notebook Cell 12.
    """
    seconds = int(max(0, seconds))
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60

    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    else:
        return f"{minutes:02d}:{secs:02d}"


def timestamp_to_seconds(ts_str: str) -> int:
    """Parse MM:SS or HH:MM:SS timestamp into total seconds."""
    parts = ts_str.strip().split(":")
    try:
        if len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
        elif len(parts) == 2:
            return int(parts[0]) * 60 + int(parts[1])
        elif len(parts) == 1:
            return int(parts[0])
    except (ValueError, TypeError):
        pass
    return 0


def extract_youtube_id(url: str) -> Optional[str]:
    """
    Extract 11-character YouTube video ID from various URL patterns:
    - https://www.youtube.com/watch?v=VIDEO_ID
    - https://youtu.be/VIDEO_ID?si=...
    - https://www.youtube.com/embed/VIDEO_ID
    - https://www.youtube.com/v/VIDEO_ID
    - https://youtube.com/shorts/VIDEO_ID
    - Raw 11-char ID
    """
    if not url:
        return None

    url = url.strip()
    if re.fullmatch(r"[A-Za-z0-9_-]{11}", url):
        return url

    patterns = [
        r"(?:v=|\/v\/|youtu\.be\/|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})",
        r"[?&]v=([A-Za-z0-9_-]{11})",
    ]

    for pat in patterns:
        match = re.search(pat, url)
        if match:
            return match.group(1)

    return None


def build_youtube_timestamp_url(url_or_id: str, seconds: float) -> str:
    """Build a direct YouTube link seeking to the specified seconds."""
    vid = extract_youtube_id(url_or_id) or url_or_id
    sec_int = int(max(0, seconds))
    return f"https://www.youtube.com/watch?v={vid}&t={sec_int}s"
