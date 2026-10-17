"""
Document text extraction and OCR fallback module.
Uses PyMuPDF (fitz) for digital text, falling back to EasyOCR (zoom=2, CPU)
for pages containing fewer than 50 characters.
"""

import os
from typing import Callable, Dict, List, Optional
import pymupdf as fitz
import easyocr
from backend.chunking import clean_text

# Singleton EasyOCR reader instance (loaded on first use or startup)
_ocr_reader: Optional[easyocr.Reader] = None


def get_ocr_reader() -> easyocr.Reader:
    """
    Returns the singleton EasyOCR Reader configured for English on CPU.
    """
    global _ocr_reader
    if _ocr_reader is None:
        _ocr_reader = easyocr.Reader(['en'], gpu=False)
    return _ocr_reader


def ocr_page(pdf_page, zoom: int = 2) -> str:
    """
    Extracts text from a rendered PDF page image using EasyOCR.
    """
    reader = get_ocr_reader()
    pix = pdf_page.get_pixmap(matrix=fitz.Matrix(zoom, zoom))
    return " ".join(reader.readtext(pix.tobytes("png"), detail=0, paragraph=True))


def extract_pages(
    pdf_path: str,
    progress_callback: Optional[Callable[[int, int, str], None]] = None
) -> List[Dict]:
    """
    Extracts text for all pages of a PDF.
    If a page has fewer than 50 characters of digital text, applies EasyOCR.

    Returns:
        List of dicts: [{"doc": filename, "page_number": int, "text": str}]
    """
    out = []
    filename = os.path.basename(pdf_path)

    with fitz.open(pdf_path) as pdf:
        total_pages = len(pdf)
        for n, p in enumerate(pdf):
            if progress_callback:
                progress_callback(n + 1, total_pages, f"Page {n + 1}/{total_pages}")

            text = p.get_text().strip()
            if len(text) < 50:  # OCR only scanned or sparse pages
                text = ocr_page(p)

            out.append({
                "doc": filename,
                "page_number": n,
                "text": clean_text(text)
            })

    return out
