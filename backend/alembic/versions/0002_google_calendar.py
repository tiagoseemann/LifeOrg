"""google calendar sync

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-12
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "calendar_blocks",
        sa.Column("google_event_id", sa.String(), nullable=True),
    )
    op.create_unique_constraint(
        "uq_calendar_blocks_google_event_id",
        "calendar_blocks",
        ["google_event_id"],
    )
    op.add_column(
        "calendar_blocks",
        sa.Column(
            "is_google_event",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.add_column(
        "calendar_blocks",
        sa.Column(
            "sync_status",
            sa.String(16),
            nullable=False,
            server_default="local",
        ),
    )

    op.create_table(
        "oauth_tokens",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("access_token", sa.Text(), nullable=False),
        sa.Column("refresh_token", sa.Text(), nullable=True),
        sa.Column("token_expiry", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("provider"),
    )


def downgrade() -> None:
    op.drop_table("oauth_tokens")
    op.drop_column("calendar_blocks", "sync_status")
    op.drop_column("calendar_blocks", "is_google_event")
    op.drop_constraint(
        "uq_calendar_blocks_google_event_id",
        "calendar_blocks",
        type_="unique",
    )
    op.drop_column("calendar_blocks", "google_event_id")
