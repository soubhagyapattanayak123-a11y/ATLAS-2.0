from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime
from .database import Base


def utc_now():
    return datetime.now(timezone.utc)


class AtlasItem(Base):
    """SQLAlchemy model for ATLAS 2.0 items/nodes."""

    __tablename__ = "atlas_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True, default="")
    category = Column(String(50), nullable=False, default="General", index=True)
    priority = Column(String(20), nullable=False, default="medium", index=True)  # low, medium, high, critical
    status = Column(String(20), nullable=False, default="todo", index=True)       # todo, in_progress, done
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
