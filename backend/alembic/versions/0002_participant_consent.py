"""add versioned participant consent

Revision ID: 0002_participant_consent
Revises: 0001_initial
"""
from alembic import op
import sqlalchemy as sa

revision = "0002_participant_consent"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("participants", sa.Column("consented_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("participants", sa.Column("consent_version", sa.String(length=100), nullable=True))


def downgrade():
    op.drop_column("participants", "consent_version")
    op.drop_column("participants", "consented_at")
