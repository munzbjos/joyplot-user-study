from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field, model_validator

Gender = Literal["man", "woman", "another_gender", "prefer_not_to_say"]
Preference = Literal["joy_plot", "bivariate_choropleth", "no_preference"]

class SessionCreate(BaseModel):
    screen_width: int | None = Field(None, ge=1, le=20000)
    screen_height: int | None = Field(None, ge=1, le=20000)
    viewport_width: int | None = Field(None, ge=1, le=20000)
    viewport_height: int | None = Field(None, ge=1, le=20000)
    device_pixel_ratio: float | None = Field(None, gt=0, le=20)

class Demographics(BaseModel):
    age: int = Field(ge=18, le=120)
    gender: Gender
    cartographic_background: bool

class TrialSubmission(BaseModel):
    selected_answer: str = Field(min_length=1, max_length=40)
    rt_selection_ms: float = Field(ge=0, le=86_400_000)
    rt_submit_ms: float = Field(ge=0, le=86_400_000)
    answer_changes: int = Field(ge=0, le=1000)
    zoom_used: bool
    zoom_count: int = Field(ge=0, le=1000)
    zoom_duration_ms: float | None = Field(None, ge=0, le=86_400_000)
    max_zoom_pct: float = Field(100, ge=100, le=250)
    trial_restarted: bool = False
    restart_count: int = Field(0, ge=0, le=1000)
    trial_started_at: datetime | None = None

    @model_validator(mode="after")
    def consistent(self):
        if self.rt_selection_ms > self.rt_submit_ms: raise ValueError("selection time cannot exceed submit time")
        if self.zoom_used != (self.zoom_count > 0): raise ValueError("zoom fields are inconsistent")
        if self.zoom_used != (self.max_zoom_pct > 100): raise ValueError("maximum zoom is inconsistent")
        if self.trial_restarted != (self.restart_count > 0): raise ValueError("restart fields are inconsistent")
        return self

class PreferenceSubmission(BaseModel): preference: Preference

class ConsentSubmission(BaseModel):
    consented: Literal[True]
    consent_version: str = Field(min_length=1, max_length=100)
