import asyncio
import logging
import os
import subprocess
from urllib.parse import urlparse

import numpy as np

from celery_app import celery_app
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

logger = logging.getLogger(__name__)

DATABASE_URL = os.environ["DATABASE_URL"]
_engine = create_async_engine(DATABASE_URL, pool_pre_ping=True)
_session_maker = async_sessionmaker(_engine, expire_on_commit=False)


@celery_app.task(bind=True)
def match_resume_all_jobs(self, resume_id: int):
    return asyncio.run(_run_matching(self, resume_id))


async def _run_matching(task, resume_id: int) -> dict:
    from models import Job, Match, Resume
    from scorer import classify_batch, extract_skills, extract_years_experience

    async with _session_maker() as session:
        resume = await session.get(Resume, resume_id)
        if not resume:
            return {"error": "Resume not found"}

        jobs = (await session.execute(select(Job))).scalars().all()
        total = len(jobs)

        if total == 0:
            return {"completed": True, "total": 0, "percent": 100}

        # ── 1. Batch cosine similarity (one matrix multiply) ──────────────────
        # Embeddings are stored normalised, so cosine sim == dot product.
        resume_emb = np.array(resume.embedding, dtype=np.float32)             # (d,)
        job_embs   = np.array([j.embedding for j in jobs], dtype=np.float32)  # (n, d)
        semantic_scores = (job_embs @ resume_emb).clip(0.0, 1.0)              # (n,)

        # ── 2. Keyword scores (pure Python set ops, no model) ─────────────────
        resume_skills_set = set(
            str(s) for s in (list(resume.parsed_skills) if resume.parsed_skills else [])
        )
        resume_text = str(resume.raw_text)

        # One query to find already-scored jobs
        already_scored: set[int] = set(
            (await session.execute(
                select(Match.job_id).where(Match.resume_id == resume_id)
            )).scalars().all()
        )

        # Indices and precomputed keyword data for jobs that need scoring
        pending_indices: list[int] = []
        keyword_data: list[tuple[list[str], list[str], float]] = []  # matched, missing, score

        for i, job in enumerate(jobs):
            if job.id in already_scored:
                continue
            jd_skills = extract_skills(str(job.job_description))
            matched = sorted(resume_skills_set & set(jd_skills))
            missing = sorted(set(jd_skills) - resume_skills_set)
            kw_score = len(matched) / len(jd_skills) if jd_skills else 0.0
            pending_indices.append(i)
            keyword_data.append((matched, missing, kw_score))

        # ── 3. Batch BART classification — one call, batch_size=8 ─────────────
        # ~7 forward passes instead of 50 sequential calls.
        batch_texts = [
            f"Job requirements: {str(jobs[i].job_description)[:400]} "
            f"Candidate resume: {resume_text[:400]}"
            for i in pending_indices
        ]
        clf_results = classify_batch(batch_texts, batch_size=8)

        # ── 4. Assemble Match rows and bulk-insert ────────────────────────────
        new_matches: list[Match] = []
        years_in_resume = extract_years_experience(resume_text)

        for order, i in enumerate(pending_indices):
            job = jobs[i]
            matched_skills, missing_skills, keyword_score = keyword_data[order]
            semantic_score = float(semantic_scores[i])
            fit_label, confidence = clf_results[order]

            # Fall back to keyword-derived label if BART failed
            if not fit_label:
                if keyword_score > 0.6:
                    fit_label, confidence = "strong fit", 0.72
                elif keyword_score > 0.3:
                    fit_label, confidence = "partial fit", 0.65
                else:
                    fit_label, confidence = "weak fit", 0.70

            overall_score = round(
                min(100.0, max(0.0, (
                    semantic_score * 0.45
                    + keyword_score * 0.35
                    + confidence   * 0.20
                ) * 100)),
                1,
            )

            years_required = extract_years_experience(str(job.job_description))
            experience_gap = round(years_required - years_in_resume, 1)

            if overall_score >= 70:
                summary = (
                    f"Strong match with {len(matched_skills)} overlapping skills"
                    + (f" including {', '.join(matched_skills[:3])}." if matched_skills else ".")
                    + " Your background aligns well with this role's technical requirements."
                )
            elif overall_score >= 40:
                gap_hint = (
                    f" Consider building expertise in {', '.join(missing_skills[:2])}."
                    if missing_skills else ""
                )
                summary = (
                    f"Partial match with {len(matched_skills)} overlapping skills.{gap_hint} "
                    "Strengthening key missing areas would meaningfully improve your fit."
                )
            else:
                gap_hint = (
                    f" Key gaps include {', '.join(missing_skills[:3])}."
                    if missing_skills else ""
                )
                summary = (
                    f"Limited overlap with only {len(matched_skills)} matching skills.{gap_hint} "
                    "This role requires significant additional experience to be a competitive candidate."
                )

            new_matches.append(Match(
                resume_id=resume_id,
                job_id=job.id,
                overall_score=overall_score,
                semantic_score=round(semantic_score * 100, 1),
                keyword_score=round(keyword_score * 100, 1),
                classifier_score=round(confidence * 100, 1),
                fit_label=fit_label,
                confidence=round(confidence, 3),
                matched_skills=matched_skills,
                missing_skills=missing_skills,
                experience_gap=experience_gap,
                summary=summary,
            ))

            _update_progress(task, i + 1, total)

        # Progress for already-scored jobs (they were skipped in the loop above)
        for i, job in enumerate(jobs):
            if job.id in already_scored:
                _update_progress(task, i + 1, total)

        if new_matches:
            session.add_all(new_matches)
            await session.commit()

        logger.info(
            "Scored %d jobs for resume %d (%d already existed)",
            len(new_matches), resume_id, len(already_scored),
        )

    # Refresh dbt gold layer
    try:
        raw = os.environ["DATABASE_URL"]
        clean = raw.split("+")[0] + "://" + raw.split("://", 1)[1] if "+asyncpg" in raw else raw
        p = urlparse(clean)
        dbt_env = {
            **os.environ,
            "DB_HOST": p.hostname or "localhost",
            "DB_PORT": str(p.port or 5432),
            "DB_USER": p.username or "postgres",
            "DB_PASS": p.password or "",
            "DB_NAME": (p.path or "/joblens").lstrip("/"),
        }
        subprocess.run(
            ["dbt", "run", "--project-dir", "/app/dbt", "--profiles-dir", "/app/dbt"],
            capture_output=True,
            timeout=120,
            env=dbt_env,
        )
    except Exception as e:
        logger.warning("dbt refresh after matching: %s", e)

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
