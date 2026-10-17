from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class TimestampItem(BaseModel):
    start: float
    end: float
    start_formatted: str
    end_formatted: str
    label: Optional[str] = None
    url: Optional[str] = None


class SegmentItem(BaseModel):
    start: float
    end: float
    text: str


class ChunkItem(BaseModel):
    text: str
    start: float
    end: float
    start_formatted: str
    end_formatted: str


class SummaryPayload(BaseModel):
    overview: str = ""
    key_points: List[str] = Field(default_factory=list)
    important_moments: List[TimestampItem] = Field(default_factory=list)


class AnalyzeYoutubeRequest(BaseModel):
    url: str
    title: Optional[str] = None


class AnalyzeResponse(BaseModel):
    session_id: str
    title: str
    input_type: str  # 'youtube', 'audio', 'video'
    source_url: str
    duration_seconds: float
    duration_formatted: str
    total_segments: int
    total_chunks: int
    summary: SummaryPayload
    notes: List[str] = Field(default_factory=list)


class AskRequest(BaseModel):
    session_id: str
    question: str
    n_results: int = 5


class AskResponse(BaseModel):
    question: str
    answer: str
    timestamps: List[TimestampItem] = Field(default_factory=list)
    sources: List[Dict[str, Any]] = Field(default_factory=list)


class SummaryRequest(BaseModel):
    session_id: str


class NotesRequest(BaseModel):
    session_id: str


class SessionDetails(BaseModel):
    session_id: str
    title: str
    input_type: str
    source_url: str
    duration_formatted: str
    created_at: str
    summary: SummaryPayload
    notes: List[str]
