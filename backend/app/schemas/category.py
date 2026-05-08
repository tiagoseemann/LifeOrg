from pydantic import BaseModel, field_validator


class CategoryCreate(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("name cannot be empty")
        return v


class CategoryOut(BaseModel):
    id: str
    name: str
    slug: str
    is_default: bool

    model_config = {"from_attributes": True}
