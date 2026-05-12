import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import Boolean, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class CalendarBlock(Base):
    __tablename__ = "calendar_blocks"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    start_datetime: Mapped[datetime] = mapped_column(nullable=False)
    end_datetime: Mapped[datetime] = mapped_column(nullable=False)
    category_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), nullable=True
    )
    card_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("kanban_cards.id", ondelete="SET NULL"), nullable=True
    )
    recurrence: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    google_event_id: Mapped[Optional[str]] = mapped_column(
        String, nullable=True, unique=True
    )
    is_google_event: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    sync_status: Mapped[str] = mapped_column(
        String(16), nullable=False, default="local", server_default="local"
    )
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=func.now(), onupdate=func.now()
    )
