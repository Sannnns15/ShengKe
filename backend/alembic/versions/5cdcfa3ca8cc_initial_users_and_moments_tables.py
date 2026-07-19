"""initial: users and moments tables

Revision ID: 5cdcfa3ca8cc
Revises:
Create Date: 2026-07-19 19:55:31.905524
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "5cdcfa3ca8cc"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── users table ──
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("phone", sa.String(20), unique=True, nullable=False),
        sa.Column("email", sa.String(255), unique=True, nullable=True),
        sa.Column("nickname", sa.String(50), nullable=False),
        sa.Column("avatar_url", sa.String(500), nullable=True),
        sa.Column("bio", sa.String(300), nullable=True),
        sa.Column("gender", sa.SmallInteger(), server_default="0", nullable=False),
        sa.Column("birthday", sa.Date(), nullable=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("status", sa.SmallInteger(), server_default="1", nullable=False),
        sa.Column(
            "settings_json",
            postgresql.JSONB(),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_users_created_at", "users", ["created_at"])
    op.create_index("ix_users_phone_deleted", "users", ["phone", "deleted_at"])

    # ── moments table ──
    op.create_table(
        "moments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(200), nullable=True),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("mood", sa.String(20), nullable=True),
        sa.Column("weather", sa.String(50), nullable=True),
        sa.Column("location_name", sa.String(200), nullable=True),
        sa.Column("location_lat", sa.Float(), nullable=True),
        sa.Column("location_lng", sa.Float(), nullable=True),
        sa.Column("privacy_level", sa.SmallInteger(), server_default="0", nullable=False),
        sa.Column(
            "visibility_group",
            postgresql.ARRAY(postgresql.UUID(as_uuid=True)),
            nullable=True,
        ),
        sa.Column("is_archived", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("ai_tags", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("ai_summary", sa.Text(), nullable=True),
        sa.Column("ai_emotion", sa.String(20), nullable=True),
        sa.Column("comment_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("like_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("view_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    # Indexes
    op.create_index(
        "ix_moments_user_created",
        "moments",
        ["user_id", sa.text("created_at DESC")],
    )
    op.create_index(
        "ix_moments_privacy_created",
        "moments",
        ["privacy_level", sa.text("created_at DESC")],
    )
    op.create_index(
        "ix_moments_ai_tags",
        "moments",
        ["ai_tags"],
        postgresql_using="gin",
    )
    op.create_index(
        "ix_moments_created_at",
        "moments",
        [sa.text("created_at DESC")],
    )
    # FK
    op.create_foreign_key(
        "fk_moments_user_id",
        "moments",
        "users",
        ["user_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_table("moments")
    op.drop_table("users")
