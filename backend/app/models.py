import enum
import uuid
from datetime import datetime
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase): pass


class Participant(Base):
    __tablename__ = "participants"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    assigned_version: Mapped[str | None] = mapped_column(String(2))
    status: Mapped[str] = mapped_column(String(24), default="created")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    consented_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    consent_version: Mapped[str | None] = mapped_column(String(100))
    age: Mapped[int | None] = mapped_column(Integer)
    gender: Mapped[str | None] = mapped_column(String(24))
    cartographic_background: Mapped[bool | None] = mapped_column(Boolean)
    preference: Mapped[str | None] = mapped_column(String(24))
    screen_width: Mapped[int | None] = mapped_column(Integer)
    screen_height: Mapped[int | None] = mapped_column(Integer)
    viewport_width: Mapped[int | None] = mapped_column(Integer)
    viewport_height: Mapped[int | None] = mapped_column(Integer)
    device_pixel_ratio: Mapped[float | None] = mapped_column(Float)
    user_agent: Mapped[str | None] = mapped_column(Text)
    responses: Mapped[list["TrialResponse"]] = relationship(cascade="all, delete-orphan")


class AllocationState(Base):
    __tablename__ = "allocation_state"
    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    block_json: Mapped[str] = mapped_column(Text, default="[]")
    next_index: Mapped[int] = mapped_column(Integer, default=6)


class TrialResponse(Base):
    __tablename__ = "trial_responses"
    __table_args__ = (UniqueConstraint("participant_id", "trial_position"),)
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    participant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("participants.id", ondelete="CASCADE"), index=True)
    trial_position: Mapped[int] = mapped_column(Integer)
    task_id: Mapped[str] = mapped_column(String(12))
    task_family: Mapped[str] = mapped_column(String(4))
    geography: Mapped[str] = mapped_column(String(2))
    pair: Mapped[str] = mapped_column(String(2))
    method: Mapped[str] = mapped_column(String(2))
    stimulus_filename: Mapped[str] = mapped_column(String(100))
    selected_answer: Mapped[str] = mapped_column(String(40))
    correct_answer: Mapped[str] = mapped_column(String(40))
    is_correct: Mapped[bool] = mapped_column(Boolean)
    rt_selection_ms: Mapped[float] = mapped_column(Float)
    rt_submit_ms: Mapped[float] = mapped_column(Float)
    answer_changes: Mapped[int] = mapped_column(Integer)
    zoom_used: Mapped[bool] = mapped_column(Boolean)
    zoom_count: Mapped[int] = mapped_column(Integer)
    zoom_duration_ms: Mapped[float | None] = mapped_column(Float)
    trial_restarted: Mapped[bool] = mapped_column(Boolean)
    restart_count: Mapped[int] = mapped_column(Integer)
    trial_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
