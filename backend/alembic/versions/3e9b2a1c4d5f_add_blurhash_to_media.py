"""add blurhash to media table

Revision ID: 3e9b2a1c4d5f
Revises: d3273232b9b9
Create Date: 2026-07-22 00:54:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3e9b2a1c4d5f'
down_revision: Union[str, Sequence[str], None] = 'd3273232b9b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'media',
        sa.Column('blurhash', sa.String(120), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('media', 'blurhash')
