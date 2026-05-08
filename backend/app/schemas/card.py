from datetime import date
from typing import Any, Optional
from pydantic import BaseModel, field_validator


class CardCreate(BaseModel):
    title: str
    column_id: str
    description: Optional[str] = None
    category_id: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[date] = None
    time_estimate: Optional[int] = None
    checklist: Optional[list[dict[str, Any]]] = None

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("title cannot be empty")
        return v

    @field_validator("priority")
    @classmethod
    def priority_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ("high", "medium", "low"):
            raise ValueError("priority must be 'high', 'medium', or 'low'")
        return v


class CardUpdate(BaseModel):
    title: Optional[str] = None
    column_id: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[date] = None
    time_estimate: Optional[int] = None
    checklist: Optional[list[dict[str, Any]]] = None

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("title cannot be empty")
        return v

    @field_validator("priority")
    @classmethod
    def priority_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ("high", "medium", "low"):
            raise ValueError("priority must be 'high', 'medium', or 'low'")
        return v


class CardOut(BaseModel):
    id: str
    title: str
    column_id: str
    description: Optional[str]
    category_id: Optional[str]
    priority: Optional[str]
    due_date: Optional[date]
    time_estimate: Optional[int]
    total_focus_time: int
    checklist: Optional[list[dict[str, Any]]]
    position: int

    model_config = {"from_attributes": True}


class ReorderCardsPayload(BaseModel):
    column_id: str
    ordered_ids: list[str]
