from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Float, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    raw_text = Column(Text, nullable=False)
    parsed_skills = Column(JSON, default=list)
    embedding = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)

    matches = relationship("Match", back_populates="resume", lazy="select")


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    company = Column(String(200), nullable=False)
    location = Column(String(200))
    salary_range = Column(String(100))
    job_description = Column(Text, nullable=False)
    required_skills = Column(JSON, default=list)
    embedding = Column(JSON, default=list)
    source = Column(String(100), default="mock")
    posted_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    matches = relationship("Match", back_populates="job", lazy="select")


class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id"), nullable=False, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False, index=True)
    overall_score = Column(Float)
    semantic_score = Column(Float)
    keyword_score = Column(Float)
    classifier_score = Column(Float)
    fit_label = Column(String(50))
    confidence = Column(Float)
    matched_skills = Column(JSON, default=list)
    missing_skills = Column(JSON, default=list)
    experience_gap = Column(Float)
    summary = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    resume = relationship("Resume", back_populates="matches")
    job = relationship("Job", back_populates="matches")
