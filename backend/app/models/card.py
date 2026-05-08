import uuid
from datetime import date, datetime
from typing import Optional
from sqlalchemy import Date, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class KanbanCard(Base):
    __tablename__ = "kanban_cards"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), nullable=True
    )
    column_id: Mapped[str] = mapped_column(
        ForeignKey("kanban_columns.id", ondelete="CASCADE"), nullable=False
    )
    priority: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    time_estimate: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    total_focus_time: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    checklist: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=func.now(), onupdate=func.now()
    )
