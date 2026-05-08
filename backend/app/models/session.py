import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class FocusSession(Base):
    __tablename__ = "focus_sessions"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    card_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("kanban_cards.id", ondelete="SET NULL"), nullable=True
    )
    card_title_snapshot: Mapped[str] = mapped_column(Text, nullable=False)
    card_cat_snapshot: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    mode: Mapped[str] = mapped_column(String(10), nullable=False)
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    elapsed_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    last_heartbeat_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    started_at: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())
    ended_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
