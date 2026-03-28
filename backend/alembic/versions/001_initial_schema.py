"""Initial schema

Revision ID: 001
Revises:
Create Date: 2026-03-26
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Users
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.String(), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("firstname", sa.String(), nullable=True),
        sa.Column("lastname", sa.String(), nullable=True),
        sa.Column("picture", sa.String(), nullable=True),
        sa.Column("credits", sa.BigInteger(), server_default="10"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"])

    # Interviews
    op.create_table(
        "interviews",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("interview_id", sa.Text(), nullable=False, unique=True),
        sa.Column("user_email", sa.Text(), nullable=False),
        sa.Column("job_position", sa.Text()),
        sa.Column("job_description", sa.Text()),
        sa.Column("company_name", sa.Text()),
        sa.Column("company_details", sa.Text()),
        sa.Column("duration", sa.Text()),
        sa.Column("type", sa.Text()),
        sa.Column("question_list", postgresql.JSON()),
        sa.Column("company_summary", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_interviews_interview_id", "interviews", ["interview_id"])
    op.create_index("ix_interviews_user_email", "interviews", ["user_email"])

    # Interview Feedback
    op.create_table(
        "interview_feedback",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("interview_id", sa.Text(), nullable=False),
        sa.Column("user_email", sa.String(), nullable=False),
        sa.Column("user_name", sa.Text()),
        sa.Column("feedback", postgresql.JSON()),
        sa.Column("transcript", postgresql.JSON()),
        sa.Column("call_id", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_interview_feedback_interview_id", "interview_feedback", ["interview_id"])

    # Resumes
    op.create_table(
        "resumes",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("user_email", sa.String(), nullable=False),
        sa.Column("candidate_name", sa.Text()),
        sa.Column("candidate_email", sa.Text()),
        sa.Column("file_url", sa.Text()),
        sa.Column("parsed_data", postgresql.JSONB()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_resumes_user_email", "resumes", ["user_email"])

    # Job Descriptions
    op.create_table(
        "job_descriptions",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("user_email", sa.String(), nullable=False),
        sa.Column("role_title", sa.Text()),
        sa.Column("raw_text", sa.Text()),
        sa.Column("file_url", sa.Text()),
        sa.Column("parsed_data", postgresql.JSONB()),
        sa.Column("interview_id", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_job_descriptions_user_email", "job_descriptions", ["user_email"])

    # Candidate Job Matches
    op.create_table(
        "candidate_job_matches",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("user_email", sa.String(), nullable=False),
        sa.Column("resume_id", sa.BigInteger(), nullable=False),
        sa.Column("jd_id", sa.BigInteger(), nullable=False),
        sa.Column("confidence_score", sa.Numeric()),
        sa.Column("skills_score", sa.Numeric()),
        sa.Column("experience_score", sa.Numeric()),
        sa.Column("semantic_score", sa.Numeric()),
        sa.Column("matched_skills", postgresql.JSONB()),
        sa.Column("missing_skills", postgresql.JSONB()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_candidate_job_matches_user_email", "candidate_job_matches", ["user_email"])

    # Call Logs
    op.create_table(
        "call_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("call_id", sa.Text()),
        sa.Column("status", sa.Text()),
        sa.Column("start_time", sa.DateTime(timezone=True)),
        sa.Column("end_time", sa.DateTime(timezone=True)),
        sa.Column("duration", sa.Integer()),
        sa.Column("log_data", postgresql.JSONB()),
        sa.Column("transcript", postgresql.JSONB()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("call_logs")
    op.drop_table("candidate_job_matches")
    op.drop_table("job_descriptions")
    op.drop_table("resumes")
    op.drop_table("interview_feedback")
    op.drop_table("interviews")
    op.drop_table("users")
