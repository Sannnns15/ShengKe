from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import String, Integer, BigInteger, DateTime, Text, ForeignKey, SmallInteger
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models import Base
from app.utils import uuid_v7


class Media(Base):
    __tablename__ = "media"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid_v7
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    moment_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("moments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    media_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default="image"
    )
    object_key: Mapped[str] = mapped_column(
        String(500), nullable=False, unique=True
    )
    thumbnail_key: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )
    mime_type: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )
    file_size: Mapped[Optional[int]] = mapped_column(
        BigInteger, nullable=True
    )
    width: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )
    height: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )
    blurhash: Mapped[Optional[str]] = mapped_column(
        String(120), nullable=True
    )
    status: Mapped[int] = mapped_column(
        SmallInteger, default=0, nullable=False, comment="0=pending, 1=uploaded, 2=failed"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<Media(id={self.id}, key={self.object_key!r}, status={self.status})>"
