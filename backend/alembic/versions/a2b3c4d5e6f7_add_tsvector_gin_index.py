"""add tsvector gin index for full-text search

Revision ID: a2b3c4d5e6f7
Revises: 3e9b2a1c4d5f
Create Date: 2026-07-22 01:56:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a2b3c4d5e6f7"
down_revision: Union[str, None] = "3e9b2a1c4d5f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_moments_search
        ON moments USING GIN (
            to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, ''))
        );
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_moments_search;")
