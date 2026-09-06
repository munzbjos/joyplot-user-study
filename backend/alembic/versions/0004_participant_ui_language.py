"""add participant UI language

Revision ID: 0004_participant_ui_language
Revises: 0003_trial_max_zoom
"""
from alembic import op
import sqlalchemy as sa

revision = "0004_participant_ui_language"
down_revision = "0003_trial_max_zoom"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "participants",
        sa.Column("ui_language", sa.String(length=2), nullable=False, server_default="en"),
    )
    op.create_check_constraint(
        "ck_participants_ui_language", "participants", "ui_language IN ('en', 'cs')"
    )


def downgrade() -> None:
    op.drop_constraint("ck_participants_ui_language", "participants", type_="check")
    op.drop_column("participants", "ui_language")
