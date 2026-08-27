"""initial study schema"""
from alembic import op
import sqlalchemy as sa

revision="0001_initial"; down_revision=None; branch_labels=None; depends_on=None

def upgrade():
    op.create_table("allocation_state",sa.Column("id",sa.Integer(),primary_key=True),sa.Column("block_json",sa.Text(),nullable=False),sa.Column("next_index",sa.Integer(),nullable=False))
    op.execute("INSERT INTO allocation_state (id, block_json, next_index) VALUES (1, '[]', 6)")
    op.create_table("participants",sa.Column("id",sa.Uuid(),primary_key=True),sa.Column("token_hash",sa.String(64),nullable=False),sa.Column("assigned_version",sa.String(2)),sa.Column("status",sa.String(24),nullable=False),sa.Column("created_at",sa.DateTime(timezone=True),server_default=sa.func.now(),nullable=False),sa.Column("started_at",sa.DateTime(timezone=True)),sa.Column("completed_at",sa.DateTime(timezone=True)),sa.Column("age",sa.Integer()),sa.Column("gender",sa.String(24)),sa.Column("cartographic_background",sa.Boolean()),sa.Column("preference",sa.String(24)),sa.Column("screen_width",sa.Integer()),sa.Column("screen_height",sa.Integer()),sa.Column("viewport_width",sa.Integer()),sa.Column("viewport_height",sa.Integer()),sa.Column("device_pixel_ratio",sa.Float()),sa.Column("user_agent",sa.Text()),sa.UniqueConstraint("token_hash"))
    op.create_index("ix_participants_token_hash","participants",["token_hash"],unique=True)
    op.create_table("trial_responses",sa.Column("id",sa.Uuid(),primary_key=True),sa.Column("participant_id",sa.Uuid(),sa.ForeignKey("participants.id",ondelete="CASCADE"),nullable=False),sa.Column("trial_position",sa.Integer(),nullable=False),sa.Column("task_id",sa.String(12),nullable=False),sa.Column("task_family",sa.String(4),nullable=False),sa.Column("geography",sa.String(2),nullable=False),sa.Column("pair",sa.String(2),nullable=False),sa.Column("method",sa.String(2),nullable=False),sa.Column("stimulus_filename",sa.String(100),nullable=False),sa.Column("selected_answer",sa.String(40),nullable=False),sa.Column("correct_answer",sa.String(40),nullable=False),sa.Column("is_correct",sa.Boolean(),nullable=False),sa.Column("rt_selection_ms",sa.Float(),nullable=False),sa.Column("rt_submit_ms",sa.Float(),nullable=False),sa.Column("answer_changes",sa.Integer(),nullable=False),sa.Column("zoom_used",sa.Boolean(),nullable=False),sa.Column("zoom_count",sa.Integer(),nullable=False),sa.Column("zoom_duration_ms",sa.Float()),sa.Column("trial_restarted",sa.Boolean(),nullable=False),sa.Column("restart_count",sa.Integer(),nullable=False),sa.Column("trial_started_at",sa.DateTime(timezone=True)),sa.Column("submitted_at",sa.DateTime(timezone=True),server_default=sa.func.now(),nullable=False),sa.UniqueConstraint("participant_id","trial_position"))
    op.create_index("ix_trial_responses_participant_id","trial_responses",["participant_id"])
def downgrade():
    op.drop_table("trial_responses"); op.drop_table("participants"); op.drop_table("allocation_state")
