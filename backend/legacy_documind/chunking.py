"""
Text cleaning and character chunking module for DocuMind.
Preserves original notebook logic and parameters (chunk_size=2000, overlap=200).
"""

from typing import List


def clean_text(text: str) -> str:
    """
    Remove newlines and extra spaces from text.
    """
    text = text.replace('\n', ' ')
    text = ' '.join(text.split())
    return text


def chunk_code(text: str, chunk_size: int = 2000, overlap: int = 200) -> List[str]:
    """
    Splits the text into chunks of specified size with a specified overlap.

    Parameters:
    - text (str): The input text to be chunked.
    - chunk_size (int): The maximum size of each chunk.
    - overlap (int): The number of overlapping characters between chunks.

    Returns:
    - List[str]: A list of text chunks.
    """
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunks.append(text[start:end])
        start += chunk_size - overlap  # Move start forward by chunk_size minus overlap
    return chunks
