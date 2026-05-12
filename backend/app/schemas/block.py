from datetime import datetime
from typing import Optional
from pydantic import BaseModel, field_validator, model_validator


class BlockCreate(BaseModel):
    title: str
    start_datetime: datetime
    end_datetime: datetime
    category_id: Optional[str] = None
    card_id: Optional[str] = None
    recurrence: Optional[str] = None

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("title cannot be empty")
        return v

    @model_validator(mode="after")
    def end_after_start(self) -> "BlockCreate":
        if self.end_datetime <= self.start_datetime:
            raise ValueError("end_datetime must be strictly after start_datetime")
        return self


class BlockUpdate(BaseModel):
    title: Optional[str] = None
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None
    category_id: Optional[str] = None
    card_id: Optional[str] = None
    recurrence: Optional[str] = None

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("title cannot be empty")
        return v

    @model_validator(mode="after")
    def end_after_start(self) -> "BlockUpdate":
        if self.start_datetime and self.end_datetime:
            if self.end_datetime <= self.start_datetime:
                raise ValueError("end_datetime must be strictly after start_datetime")
        return self


class BlockOut(BaseModel):
    id: str
    title: str
    start_datetime: datetime
    end_datetime: datetime
    category_id: Optional[str]
    card_id: Optional[str]
    recurrence: Optional[str]
    google_event_id: Optional[str] = None
    is_google_event: bool = False
    sync_status: str = "local"

    model_config = {"from_attributes": True}
