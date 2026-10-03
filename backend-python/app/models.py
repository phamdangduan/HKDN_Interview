from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    company = Column(String(255), nullable=False)
    location = Column(String(255), nullable=True)
    stipend = Column(String(100), nullable=True)
    perks = Column(Text, nullable=True)
    job_description = Column(Text, nullable=False)
    cutoff_score = Column(Integer, default=80, nullable=False)
    target_level = Column(String(50), default="fresher", nullable=True) # intern, fresher, junior, mid_level
    track = Column(String(100), default="backend", nullable=True) # backend, frontend, fullstack, mobile, devops, ai_data
    status = Column(String(50), default="active", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    candidates = relationship("Candidate", back_populates="campaign")
    interview_sessions = relationship("InterviewSession", back_populates="campaign")


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    phone = Column(String(50), nullable=True)
    cv_filename = Column(String(255), nullable=True)
    cv_text = Column(Text, nullable=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True)
    target_level = Column(String(50), default="fresher", nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    campaign = relationship("Campaign", back_populates="candidates")
    interview_sessions = relationship("InterviewSession", back_populates="candidate")


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(String(64), primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True)
    mode = Column(String(50), default="self_practice", nullable=False) # self_practice, campaign_screening
    role_target = Column(String(255), nullable=False)
    target_level = Column(String(50), default="fresher", nullable=True) # intern, fresher, junior, mid_level
    track = Column(String(100), default="backend", nullable=True)
    requirement_text = Column(Text, nullable=True)
    persona = Column(String(100), default="Alex Chen", nullable=False)
    difficulty_level = Column(Integer, default=4, nullable=False)
    duration_minutes = Column(Integer, default=30, nullable=False)
    status = Column(String(50), default="in_progress", nullable=False) # in_progress, completed, abandoned
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    candidate = relationship("Candidate", back_populates="interview_sessions")
    campaign = relationship("Campaign", back_populates="interview_sessions")
    turns = relationship("InterviewTurn", back_populates="session", cascade="all, delete-orphan")
    evaluation = relationship("StarEvaluation", back_populates="session", uselist=False, cascade="all, delete-orphan")


class InterviewTurn(Base):
    __tablename__ = "interview_turns"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(String(64), ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False)
    turn_number = Column(Integer, nullable=False)
    question_text = Column(Text, nullable=False)
    answer_transcript = Column(Text, nullable=True)
    audio_url = Column(String(500), nullable=True)
    probed_aspect = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("InterviewSession", back_populates="turns")


class StarEvaluation(Base):
    __tablename__ = "star_evaluations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(String(64), ForeignKey("interview_sessions.id", ondelete="CASCADE"), unique=True, nullable=False)
    situation_score = Column(Float, default=0.0)
    task_score = Column(Float, default=0.0)
    action_score = Column(Float, default=0.0)
    result_score = Column(Float, default=0.0)
    total_score = Column(Float, default=0.0)
    is_passed = Column(Boolean, default=False)
    strengths = Column(Text, nullable=True)
    weaknesses = Column(Text, nullable=True)
    ai_recommendations = Column(Text, nullable=True)
    dossier_summary = Column(Text, nullable=True)
    turn_evaluations = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("InterviewSession", back_populates="evaluation")

