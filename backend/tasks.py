import asyncio
import logging
import os
import subprocess

from celery_app import celery_app
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@postgres:5432/joblens",
)
_engine = create_async_engine(DATABASE_URL, pool_pre_ping=True)
_session_maker = async_sessionmaker(_engine, expire_on_commit=False)


@celery_app.task(bind=True)
def match_resume_all_jobs(self, resume_id: int):
    return asyncio.run(_run_matching(self, resume_id))


async def _run_matching(task, resume_id: int) -> dict:
    from models import Job, Match, Resume
    from scorer import score_match

    async with _session_maker() as session:
        resume = await session.get(Resume, resume_id)
        if not resume:
            return {"error": "Resume not found"}

        result = await session.execute(select(Job))
        jobs = result.scalars().all()
        total = len(jobs)

        for i, job in enumerate(jobs):
            try:
                existing = await session.execute(
                    select(Match).where(
                        Match.resume_id == resume_id,
                        Match.job_id == job.id,
                    )
                )
                if existing.scalar_one_or_none():
                    _update_progress(task, i + 1, total)
                    continue

                score_result = await score_match(
                    str(resume.raw_text),
                    str(job.job_description),
                    resume.parsed_skills,
                )

                match = Match(
                    resume_id=resume_id,
                    job_id=job.id,
                    overall_score=score_result["overall_score"],
                    semantic_score=score_result["semantic_score"],
                    keyword_score=score_result["keyword_score"],
                    classifier_score=score_result["classifier_score"],
                    fit_label=score_result["fit_label"],
                    confidence=score_result["confidence"],
                    matched_skills=score_result["matched_skills"],
                    missing_skills=score_result["missing_skills"],
                    experience_gap=score_result["experience_gap"],
                    summary=score_result["summary"],
                )
                session.add(match)
                await session.commit()

            except Exception as e:
                logger.error(f"Error scoring job {job.id} for resume {resume_id}: {e}")
                await session.rollback()

            _update_progress(task, i + 1, total)

    # Refresh dbt models after scoring
    try:
        subprocess.run(
            ["dbt", "run", "--project-dir", "/app/dbt", "--profiles-dir", "/app/dbt"],
            capture_output=True,
            timeout=120,
        )
    except Exception as e:
        logger.warning(f"dbt refresh after matching: {e}")

    return {"completed": True, "total": total, "percent": 100}


def _update_progress(task, current: int, total: int):
    task.update_state(
        state="PROGRESS",
        meta={
            "current": current,
            "total": total,
            "percent": int(current / total * 100) if total else 0,
        },
    )
