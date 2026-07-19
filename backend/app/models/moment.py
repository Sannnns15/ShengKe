import uuid
from datetime import datetime, timezone
from typing import Optional, List

from sqlalchemy import (
    String,
    SmallInteger,
    Boolean,
    Integer,
    Float,
    Text,
    DateTime,
    ARRAY,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base
from app.utils import uuid_v7


class Moment(Base):
    __tablename__ = "moments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid_v7
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )
    title: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    mood: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    weather: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    location_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    location_lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    location_lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    privacy_level: Mapped[int] = mapped_column(
        SmallInteger, default=0, nullable=False
    )
    visibility_group: Mapped[Optional[List[uuid.UUID]]] = mapped_column(
        ARRAY(UUID(as_uuid=True)), nullable=True
    )
    is_archived: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    ai_tags: Mapped[Optional[List[str]]] = mapped_column(
        ARRAY(Text), nullable=True
    )
    ai_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_emotion: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    comment_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    like_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    view_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
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
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    def __repr__(self) -> str:
        return f"<Moment(id={self.id}, user_id={self.user_id})>"
