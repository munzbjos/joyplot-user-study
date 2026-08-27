"""add maximum zoom percentage to trial responses

Revision ID: 0003_trial_max_zoom
Revises: 0002_participant_consent
"""
from alembic import op
import sqlalchemy as sa

revision = "0003_trial_max_zoom"
down_revision = "0002_participant_consent"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "trial_responses",
        sa.Column("max_zoom_pct", sa.Float(), server_default="100", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("trial_responses", "max_zoom_pct")
