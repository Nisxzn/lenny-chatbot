import uuid
from typing import List, Optional, Literal
from pydantic import BaseModel, Field
from app.schemas.artifact import ArtifactResponse

class Citation(BaseModel):
    episode_title: Optional[str] = None
    url: Optional[str] = None
    speaker: Optional[str] = None
    timestamp: Optional[str] = None
    content: str

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=10000)
    conversation_id: Optional[uuid.UUID] = None
    provider: Literal["local", "cloud"] = Field("local")
    model: Optional[str] = None
    stream: bool = False

class ChatResponse(BaseModel):
    conversation_id: uuid.UUID
    conversation_title: Optional[str] = None
    user_message_id: uuid.UUID
    assistant_message_id: uuid.UUID
    response_text: str
    citations: List[Citation] = []
    artifacts: List[ArtifactResponse] = []
    provider: str
    model: str
