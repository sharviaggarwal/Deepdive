import re
from typing import Any, Dict, List, Optional, Tuple
import ollama
from backend.utils.formatting import build_youtube_timestamp_url, format_timestamp, timestamp_to_seconds


def generate_summary_and_notes(
    chunks: List[Dict[str, Any]],
    title: str = "Video Content",
    source_url: Optional[str] = None
) -> Tuple[Dict[str, Any], List[str]]:
    """
    Generate an overview, key points, important moments, and study notes
    using local Llama 3.1 8B without rigid JSON schema constraints.
    """
    if not chunks:
        return {
            "overview": "No content available to summarize.",
            "key_points": [],
            "important_moments": []
        }, []

    # Pick 4 representative snippets across the content
    if len(chunks) <= 4:
        sample_chunks = chunks
    else:
        indices = [0, len(chunks) // 3, (2 * len(chunks)) // 3, len(chunks) - 1]
        sample_chunks = [chunks[i] for i in sorted(set(indices))]

    digest_lines = []
    for c in sample_chunks:
        start_ts = format_timestamp(c["start"])
        snippet = c["text"][:160].strip()
        digest_lines.append(f"[{start_ts}] {snippet}")

    digest_text = "\n".join(digest_lines)

    prompt = f"""You are DeepDive, an expert AI video research assistant.
Provide a clear analysis of this transcript from "{title}".

Transcript Excerpts:
{digest_text}

Output format:
## Overview
(2-3 clear sentences summarizing the core topic)

## Key Points
- (Key point 1)
- (Key point 2)
- (Key point 3)

## Important Moments
- [00:00] (What happens at this moment)
- [01:30] (Next key moment)

## Notes
- (Useful takeaway or study note)
- (Another takeaway)
"""

    try:
        response = ollama.chat(
            model="llama3.1:8b",
            messages=[{"role": "user", "content": prompt}],
            options={"num_gpu": 0, "num_predict": 180}
        )
        raw_text = response["message"]["content"].strip()
    except Exception as e:
        print(f"Ollama generation warning in summary: {e}")
        raw_text = ""

    overview = ""
    key_points = []
    important_moments = []
    notes = []

    # Parse sections from generated output
    current_section = None
    for line in raw_text.splitlines():
        line_clean = line.strip()
        if not line_clean:
            continue

        lower_line = line_clean.lower()
        if "overview" in lower_line and ("##" in line_clean or "**" in line_clean):
            current_section = "overview"
            continue
        elif "key points" in lower_line and ("##" in line_clean or "**" in line_clean):
            current_section = "key_points"
            continue
        elif "important moments" in lower_line and ("##" in line_clean or "**" in line_clean):
            current_section = "important_moments"
            continue
        elif "notes" in lower_line and ("##" in line_clean or "**" in line_clean):
            current_section = "notes"
            continue

        if current_section == "overview":
            if not line_clean.startswith("#"):
                overview += (" " + line_clean if overview else line_clean)
        elif current_section == "key_points":
            bullet = re.sub(r"^[-*•\d.]+\s*", "", line_clean)
            if bullet:
                key_points.append(bullet)
        elif current_section == "important_moments":
            # Extract [MM:SS] or MM:SS
            ts_match = re.search(r"\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*(.*)", line_clean)
            if ts_match:
                ts_str = ts_match.group(1)
                label = ts_match.group(2).strip().lstrip("-: ") or "Key discussion point"
                sec = timestamp_to_seconds(ts_str)
                yt_link = None
                if source_url and ("youtube.com" in source_url or "youtu.be" in source_url):
                    yt_link = build_youtube_timestamp_url(source_url, sec)

                important_moments.append({
                    "start": float(sec),
                    "end": float(sec + 30),
                    "start_formatted": ts_str,
                    "end_formatted": format_timestamp(sec + 30),
                    "label": label,
                    "url": yt_link
                })
        elif current_section == "notes":
            bullet = re.sub(r"^[-*•\d.]+\s*", "", line_clean)
            if bullet:
                notes.append(bullet)

    # High quality fallbacks if model output was sparse
    if not overview:
        first_chunk = chunks[0]["text"] if chunks else ""
        overview = f"In-depth analysis of {title}, discussing: {first_chunk[:140]}..."

    if not key_points:
        key_points = [
            f"Key concept: {c['text'][:90]}..." for c in chunks[:3]
        ]

    if not important_moments:
        for c in chunks[:3]:
            sec = c["start"]
            ts_str = format_timestamp(sec)
            yt_link = None
            if source_url and ("youtube.com" in source_url or "youtu.be" in source_url):
                yt_link = build_youtube_timestamp_url(source_url, sec)
            important_moments.append({
                "start": float(sec),
                "end": float(c["end"]),
                "start_formatted": ts_str,
                "end_formatted": format_timestamp(c["end"]),
                "label": c["text"][:75].strip() + "...",
                "url": yt_link
            })

    if not notes:
        notes = [
            f"Grounded takeaway: {c['text'][:110]}..." for c in chunks[:3]
        ]

    summary_payload = {
        "overview": overview,
        "key_points": key_points,
        "important_moments": important_moments
    }

    return summary_payload, notes
