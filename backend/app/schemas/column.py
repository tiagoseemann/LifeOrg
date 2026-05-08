from typing import Optional
from pydantic import BaseModel, field_validator


class ColumnCreate(BaseModel):
    title: str

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("title cannot be empty")
        return v


class ColumnUpdate(BaseModel):
    title: Optional[str] = None

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("title cannot be empty")
        return v


class ColumnOut(BaseModel):
    id: str
    title: str
    position: int

    model_config = {"from_attributes": True}


class ReorderColumnsPayload(BaseModel):
    ordered_ids: list[str]
