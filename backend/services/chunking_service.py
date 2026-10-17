from typing import Dict, List


def create_chunks(segments: List[Dict[str, float | str]], max_words: int = 150) -> List[Dict[str, float | str]]:
    """
    Groups spoken segments into cohesive chunks with preserved start and end timestamps.
    Direct implementation from DeepDive notebook Cell 9.
    """
    chunks = []
    current_text = []
    current_start = None
    current_end = None
    word_count = 0

    for segment in segments:
        text = str(segment["text"])
        words = len(text.split())

        if current_start is None:
            current_start = segment["start"]

        current_text.append(text)
        current_end = segment["end"]
        word_count += words

        if word_count >= max_words:
            chunks.append({
                "text": " ".join(current_text),
                "start": current_start,
                "end": current_end
            })

            current_text = []
            current_start = None
            current_end = None
            word_count = 0

    # Add remaining text
    if current_text:
        chunks.append({
            "text": " ".join(current_text),
            "start": current_start,
            "end": current_end
        })

    return chunks
