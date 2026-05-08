"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-05-08
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "categories",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False),
        sa.Column("is_default", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
        sa.UniqueConstraint("slug"),
    )

    op.create_table(
        "kanban_columns",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "kanban_cards",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category_id", sa.String(), nullable=True),
        sa.Column("column_id", sa.String(), nullable=False),
        sa.Column("priority", sa.String(10), nullable=True),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("time_estimate", sa.Integer(), nullable=True),
        sa.Column("total_focus_time", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("checklist", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["column_id"], ["kanban_columns.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "calendar_blocks",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("start_datetime", sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("end_datetime", sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("category_id", sa.String(), nullable=True),
        sa.Column("card_id", sa.String(), nullable=True),
        sa.Column("recurrence", sa.String(20), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["card_id"], ["kanban_cards.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "focus_sessions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("card_id", sa.String(), nullable=True),
        sa.Column("card_title_snapshot", sa.Text(), nullable=False),
        sa.Column("card_cat_snapshot", sa.Text(), nullable=True),
        sa.Column("mode", sa.String(10), nullable=False),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("elapsed_seconds", sa.Integer(), nullable=True),
        sa.Column("last_heartbeat_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("started_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("ended_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["card_id"], ["kanban_cards.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )

    # Unique index: enforces only one active session at a time
    # Uses constant expression (true) so at most one row can satisfy ended_at IS NULL
    op.execute(
        "CREATE UNIQUE INDEX uq_active_session ON focus_sessions ((true)) WHERE ended_at IS NULL"
    )

    # Seed default categories: Pessoal, Trabalho, Estudo (NOT Faculdade)
    op.execute(
        """
        INSERT INTO categories (id, name, slug, is_default) VALUES
        (gen_random_uuid()::text, 'Pessoal', 'pessoal', true),
        (gen_random_uuid()::text, 'Trabalho', 'trabalho', true),
        (gen_random_uuid()::text, 'Estudo', 'estudo', true)
        """
    )

    # Seed default Kanban columns
    op.execute(
        """
        INSERT INTO kanban_columns (id, title, position) VALUES
        (gen_random_uuid()::text, 'A fazer', 0),
        (gen_random_uuid()::text, 'Em progresso', 1),
        (gen_random_uuid()::text, 'Concluído', 2)
        """
    )


def downgrade() -> None:
    op.drop_table("focus_sessions")
    op.drop_table("calendar_blocks")
    op.drop_table("kanban_cards")
    op.drop_table("kanban_columns")
    op.drop_table("categories")
