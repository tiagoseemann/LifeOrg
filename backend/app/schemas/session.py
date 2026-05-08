from datetime import datetime
from typing import Optional
from pydantic import BaseModel, field_validator


class SessionCreate(BaseModel):
    card_id: str
    card_title_snapshot: str
    card_cat_snapshot: Optional[str] = None
    mode: str
    duration_seconds: Optional[int] = None

    @field_validator("mode")
    @classmethod
    def mode_valid(cls, v: str) -> str:
        if v not in ("fixed", "free"):
            raise ValueError("mode must be 'fixed' or 'free'")
        return v


class SessionEnd(BaseModel):
    elapsed_seconds: int


class SessionOut(BaseModel):
    id: str
    card_id: Optional[str]
    card_title_snapshot: str
    card_cat_snapshot: Optional[str]
    mode: str
    duration_seconds: Optional[int]
    elapsed_seconds: Optional[int]
    last_heartbeat_at: Optional[datetime]
    started_at: datetime
    ended_at: Optional[datetime]

    model_config = {"from_attributes": True}
