import logging
import os
import subprocess
import uuid
from contextlib import asynccontextmanager
from typing import Optional

import redis.asyncio as aioredis
from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from analytics import get_market_analytics, get_resume_analytics
from celery_app import celery_app
from crawler import generate_mock_jobs
from database import async_session_maker, get_db
from models import Job, Match, Resume
from scorer import extract_skills, get_embedding
from tasks import match_resume_all_jobs

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='{"time": "%(asctime)s", "level": "%(levelname)s", "logger": "%(name)s", "message": "%(message)s"}',
)
logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

limiter = Limiter(key_func=get_remote_address, default_limits=["20/minute"])


# ── Startup helpers ───────────────────────────────────────────────────────────

async def _seed_jobs(session: AsyncSession) -> None:
    logger.info("Generating 50 mock jobs…")
    jobs_data = generate_mock_jobs()
    for jd in jobs_data:
        embedding = get_embedding(jd["job_description"])
        job = Job(
            title=jd["title"],
            company=jd["company"],
            location=jd["location"],
            salary_range=jd["salary_range"],
            job_description=jd["job_description"],
            required_skills=jd["required_skills"],
            embedding=embedding,
            source="mock",
            posted_at=jd["posted_at"],
        )
        session.add(job)
    await session.commit()
    logger.info(f"Seeded {len(jobs_data)} jobs")


def _run_alembic() -> None:
    try:
        res = subprocess.run(
            ["alembic", "upgrade", "head"],
            cwd="/app",
            capture_output=True,
            text=True,
            timeout=60,
        )
        if res.returncode == 0:
            logger.info(f"Alembic OK: {res.stdout.strip()[-200:]}")
        else:
            logger.error(f"Alembic failed: {res.stderr.strip()[-500:]}")
    except Exception as exc:
        logger.error(f"Alembic error: {exc}")


def _run_dbt() -> None:
    try:
        res = subprocess.run(
            ["dbt", "run", "--project-dir", "/app/dbt", "--profiles-dir", "/app/dbt"],
            capture_output=True,
            text=True,
            timeout=120,
        )
        tail = (res.stdout or "")[-400:]
        logger.info(f"dbt finished (rc={res.returncode}): {tail}")
    except Exception as exc:
        logger.warning(f"dbt run skipped: {exc}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    _run_alembic()

    async with async_session_maker() as session:
        count = await session.scalar(select(func.count(Job.id)))
        if count == 0:
            await _seed_jobs(session)
        else:
            logger.info(f"Jobs table already has {count} rows — skipping seed")

    _run_dbt()
    yield


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="JobLens API", version="1.0.0", lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

Instrumentator().instrument(app).expose(app)


@app.middleware("http")
async def correlation_id_middleware(request: Request, call_next):
    cid = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
    request.state.correlation_id = cid
    response = await call_next(request)
    response.headers["X-Correlation-ID"] = cid
    return response


# ── Schemas ───────────────────────────────────────────────────────────────────

class ResumeCreate(BaseModel):
    text: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.post("/resume")
@limiter.limit("20/minute")
async def create_resume(
    request: Request,
    body: ResumeCreate,
    db: AsyncSession = Depends(get_db),
):
    skills = extract_skills(body.text)
    embedding = get_embedding(body.text)
    resume = Resume(raw_text=body.text, parsed_skills=skills, embedding=embedding)
    db.add(resume)
    await db.commit()
    await db.refresh(resume)
    logger.info(f"Created resume {resume.id} with {len(skills)} skills")
    return {"resume_id": resume.id, "parsed_skills": skills, "skill_count": len(skills)}


@app.post("/resume/{resume_id}/match-all")
@limiter.limit("20/minute")
async def match_all_jobs(
    request: Request,
    resume_id: int,
    db: AsyncSession = Depends(get_db),
):
    resume = await db.get(Resume, resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    job_count = await db.scalar(select(func.count(Job.id)))
    task = match_resume_all_jobs.delay(resume_id)
    logger.info(f"Started match-all task {task.id} for resume {resume_id}")
    return {"task_id": task.id, "job_count": job_count}


@app.get("/tasks/{task_id}")
async def get_task(task_id: str):
    result = celery_app.AsyncResult(task_id)
    state = result.state

    if state == "PENDING":
        return {"task_id": task_id, "status": "pending", "percent": 0}
    if state == "STARTED":
        return {"task_id": task_id, "status": "running", "percent": 0}
    if state == "PROGRESS":
        meta = result.info or {}
        return {
            "task_id": task_id,
            "status": "running",
            "percent": meta.get("percent", 0),
            "current": meta.get("current", 0),
            "total": meta.get("total", 0),
        }
    if state == "SUCCESS":
        return {"task_id": task_id, "status": "complete", "percent": 100, "result": result.result}
    if state == "FAILURE":
        return {"task_id": task_id, "status": "failed", "error": str(result.info)}
    return {"task_id": task_id, "status": state.lower(), "percent": 0}


@app.get("/jobs")
@limiter.limit("20/minute")
async def list_jobs(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    min_score: Optional[float] = Query(None),
    role: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    sort_by: str = Query("date"),
    resume_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * limit

    if resume_id:
        query = (
            select(Job, Match)
            .join(Match, (Match.job_id == Job.id) & (Match.resume_id == resume_id))
        )
        if min_score is not None:
            query = query.where(Match.overall_score >= min_score)
        if role:
            query = query.where(Job.title.ilike(f"%{role}%"))
        if location:
            query = query.where(Job.location.ilike(f"%{location}%"))
        query = query.order_by(
            Match.overall_score.desc() if sort_by == "score" else Job.posted_at.desc()
        )
        total = await db.scalar(select(func.count()).select_from(query.subquery()))  # type: ignore[arg-type]
        rows = (await db.execute(query.offset(offset).limit(limit))).all()
        jobs_out = [
            {
                "id": job.id,
                "title": job.title,
                "company": job.company,
                "location": job.location,
                "salary_range": job.salary_range,
                "posted_at": job.posted_at.isoformat() if job.posted_at else None,
                "required_skills": job.required_skills,
                "overall_score": match.overall_score,
                "fit_label": match.fit_label,
                "matched_skills": (match.matched_skills or [])[:3],
            }
            for job, match in rows
        ]
    else:
        query = select(Job)
        if role:
            query = query.where(Job.title.ilike(f"%{role}%"))
        if location:
            query = query.where(Job.location.ilike(f"%{location}%"))
        query = query.order_by(Job.posted_at.desc())
        total = await db.scalar(select(func.count(Job.id)))
        jobs = (await db.execute(query.offset(offset).limit(limit))).scalars().all()
        jobs_out = [
            {
                "id": j.id,
                "title": j.title,
                "company": j.company,
                "location": j.location,
                "salary_range": j.salary_range,
                "posted_at": j.posted_at.isoformat() if j.posted_at else None,
                "required_skills": j.required_skills,
                "overall_score": None,
                "fit_label": None,
                "matched_skills": [],
            }
            for j in jobs
        ]

    return {
        "jobs": jobs_out,
        "total": total or 0,
        "page": page,
        "limit": limit,
        "pages": max(1, ((total or 0) + limit - 1) // limit),
    }


@app.get("/jobs/{job_id}")
async def get_job(
    job_id: int,
    resume_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    out = {
        "id": job.id,
        "title": job.title,
        "company": job.company,
        "location": job.location,
        "salary_range": job.salary_range,
        "job_description": job.job_description,
        "required_skills": job.required_skills,
        "posted_at": job.posted_at.isoformat() if job.posted_at else None,
        "source": job.source,
        "match": None,
    }

    if resume_id:
        row = (
            await db.execute(
                select(Match).where(Match.resume_id == resume_id, Match.job_id == job_id)
            )
        ).scalar_one_or_none()
        if row:
            out["match"] = {
                "overall_score": row.overall_score,
                "semantic_score": row.semantic_score,
                "keyword_score": row.keyword_score,
                "classifier_score": row.classifier_score,
                "fit_label": row.fit_label,
                "confidence": row.confidence,
                "matched_skills": row.matched_skills,
                "missing_skills": row.missing_skills,
                "experience_gap": row.experience_gap,
                "summary": row.summary,
            }

    return out


@app.get("/matches")
async def list_matches(
    resume_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort_by: str = Query("score"),
    db: AsyncSession = Depends(get_db),
):
    query = select(Match, Job).join(Job, Match.job_id == Job.id)
    if resume_id:
        query = query.where(Match.resume_id == resume_id)
    query = query.order_by(
        Match.overall_score.desc() if sort_by == "score" else Match.created_at.desc()
    )
    offset = (page - 1) * limit

    count_q = select(func.count(Match.id))
    if resume_id:
        count_q = count_q.where(Match.resume_id == resume_id)
    total = await db.scalar(count_q)

    rows = (await db.execute(query.offset(offset).limit(limit))).all()
    matches_out = [
        {
            "id": m.id,
            "resume_id": m.resume_id,
            "job_id": m.job_id,
            "job_title": j.title,
            "company": j.company,
            "overall_score": m.overall_score,
            "fit_label": m.fit_label,
            "matched_skills": m.matched_skills,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m, j in rows
    ]

    return {"matches": matches_out, "total": total or 0, "page": page, "limit": limit}


@app.get("/analytics/market")
@limiter.limit("20/minute")
async def market_analytics(request: Request, db: AsyncSession = Depends(get_db)):
    return await get_market_analytics(db)


@app.get("/analytics/resume/{resume_id}")
@limiter.limit("20/minute")
async def resume_analytics(
    request: Request,
    resume_id: int,
    db: AsyncSession = Depends(get_db),
):
    resume = await db.get(Resume, resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return await get_resume_analytics(resume_id, db)


@app.post("/jobs/seed")
async def seed_jobs_endpoint(db: AsyncSession = Depends(get_db)):
    await _seed_jobs(db)
    total = await db.scalar(select(func.count(Job.id)))
    return {"seeded": 50, "total_jobs": total}


@app.get("/health")
async def health(db: AsyncSession = Depends(get_db)):
    # DB
    try:
        await db.scalar(select(func.count(Job.id)))
        db_status = "ok"
    except Exception as exc:
        db_status = f"error: {exc}"

    # Redis
    try:
        r = aioredis.from_url(REDIS_URL)
        await r.ping()
        await r.aclose()
        redis_status = "ok"
    except Exception as exc:
        redis_status = f"error: {exc}"

    # Celery
    try:
        workers = celery_app.control.inspect(timeout=2).ping()
        celery_status = "ok" if workers else "no workers"
    except Exception as exc:
        celery_status = f"error: {exc}"

    import scorer
    model_loaded = scorer._sentence_model is not None and scorer._nlp is not None

    overall = "ok" if db_status == "ok" and redis_status == "ok" else "degraded"
    return {
        "status": overall,
        "db": db_status,
        "redis": redis_status,
        "celery": celery_status,
        "model_loaded": model_loaded,
    }
