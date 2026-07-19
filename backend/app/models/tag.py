from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models import Base
from app.utils import uuid_v7


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid_v7
    )
    name: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    moment_tags: Mapped[list["MomentTag"]] = relationship(
        "MomentTag", back_populates="tag", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Tag(id={self.id}, name={self.name!r})>"


class MomentTag(Base):
    __tablename__ = "moment_tags"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid_v7
    )
    moment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("moments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tag_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tags.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("moment_id", "tag_id", name="uq_moment_tag"),
    )

    # Relationships
    moment: Mapped["Moment"] = relationship("Moment")
    tag: Mapped["Tag"] = relationship("Tag", back_populates="moment_tags")

    def __repr__(self) -> str:
        return f"<MomentTag(moment_id={self.moment_id}, tag_id={self.tag_id})>"
