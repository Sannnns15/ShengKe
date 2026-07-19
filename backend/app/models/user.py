import uuid
from datetime import date, datetime, timezone
from typing import Optional

from sqlalchemy import String, SmallInteger, Date, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base
from app.utils import uuid_v7


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid_v7
    )
    phone: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    email: Mapped[Optional[str]] = mapped_column(
        String(255), unique=True, nullable=True
    )
    nickname: Mapped[str] = mapped_column(String(50), nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    bio: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    gender: Mapped[int] = mapped_column(SmallInteger, default=0, nullable=False)
    birthday: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[int] = mapped_column(SmallInteger, default=1, nullable=False)
    settings_json: Mapped[dict] = mapped_column(
        JSONB, default=dict, nullable=False
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
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, phone={self.phone}, nickname={self.nickname!r})>"
