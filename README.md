# JobLens

[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql&logoColor=white)](https://postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose)
[![CI](https://img.shields.io/github/actions/workflow/status/vatsaln/job-lens/ci.yml?branch=main&label=CI&logo=github-actions&logoColor=white)](https://github.com/vatsaln/job-lens/actions)

---

**Live demo:** [job-lens-rho.vercel.app](https://job-lens-rho.vercel.app) &nbsp;·&nbsp; **API docs:** [job-lens-production.up.railway.app/docs](https://job-lens-production.up.railway.app/docs)

JobLens is a full-stack job intelligence platform that scores your resume against a curated set of job postings using a three-component AI pipeline: semantic similarity via sentence-transformers, keyword overlap via spaCy NER, and zero-shot fit classification via a BART model run in batched inference mode. Results are persisted to PostgreSQL and surfaced through a React dashboard that shows per-job match breakdowns, missing skill gaps, and market-wide analytics built on a dbt bronze/silver/gold data layer.

---

## Architecture

```
┌─────────────────────────────────┐
│  Vercel                         │
│  React 18 + Vite                │
│  job-lens-rho.vercel.app        │
└────────────────┬────────────────┘
                 │ HTTPS (axios, VITE_API_URL)
                 ▼
┌─────────────────────────────────────────────────────┐
│  Railway — FastAPI (Uvicorn)                         │
│  job-lens-production.up.railway.app                  │
│                                                      │
│  POST /resume              extract skills + embed    │
│  POST /resume/{id}/match-all  enqueue Celery task   │
│  GET  /tasks/{task_id}     poll progress             │
│  GET  /jobs                paginated + scored        │
│  GET  /jobs/{id}           full breakdown            │
│  GET  /analytics/market    gold layer                │
│  GET  /analytics/resume/{id}  personal              │
│  GET  /health                                        │
└──────────┬──────────────────────┬───────────────────┘
           │                      │
┌──────────▼──────────┐  ┌────────▼────────────────────┐
│  Railway            │  │  Railway                     │
│  PostgreSQL         │  │  Redis                       │
│                     │  │                              │
│  resumes            │  │  Celery broker               │
│  jobs               │  │  task result backend         │
│  matches            │  └──────────────────────────────┘
│                     │           │
│  dbt views          │  ┌────────▼────────────────────┐
│  bronze / silver /  │  │  Celery Worker               │
│  gold               │◄─┤                              │
└─────────────────────┘  │  1. Batch embeddings →       │
                         │     one numpy dot product    │
                         │  2. Keyword set intersection │
                         │  3. BART zero-shot           │
                         │     batch_size=8 (~7 passes  │
                         │     for 50 jobs)             │
                         │  4. Bulk DB insert           │
                         └──────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| API | FastAPI | 0.110.3 |
| API server | Uvicorn | 0.30.1 |
| ORM | SQLAlchemy (async) | 2.0.30 |
| Migrations | Alembic | 1.13.1 |
| Validation | Pydantic | 2.7.1 |
| Task queue | Celery + Redis broker | 5.4.0 |
| Semantic embeddings | sentence-transformers `all-mpnet-base-v2` | 2.7.0 |
| NER / skill extraction | spaCy `en_core_web_sm` | 3.7.4 |
| Zero-shot classifier | `facebook/bart-large-mnli` (batched) | transformers 4.41.0 |
| Analytics transforms | dbt-postgres | 1.8.2 |
| Database | PostgreSQL | 15 |
| Cache / broker | Redis | 7 |
| Rate limiting | slowapi | 0.1.9 |
| Metrics | prometheus-fastapi-instrumentator | 6.1.0 |
| Frontend framework | React | 18.3.1 |
| Build tool | Vite | 5.3.1 |
| Routing | react-router-dom | 6.23.1 |
| Charts | recharts | 2.12.7 |
| HTTP client | axios | 1.7.2 |
| Containerisation | Docker Compose | v2 |
| Hosting (API) | Railway | — |
| Hosting (Frontend) | Vercel | — |
| CI | GitHub Actions | — |

---

## Scoring Algorithm

Each resume–job pair is scored with three signals combined into a single 0–100 score:

```
overall_score = (semantic × 0.45 + keyword × 0.35 + classifier × 0.20) × 100
```

| Signal | Model | What it measures |
|---|---|---|
| Semantic (45%) | `all-mpnet-base-v2` | Cosine similarity of 768-dim normalised embeddings — computed as a single batched matrix multiply across all jobs |
| Keyword (35%) | spaCy + regex, 60-skill pool | `matched_skills / total_jd_skills` |
| Classifier (20%) | `facebook/bart-large-mnli` | Zero-shot confidence for *strong fit / partial fit / weak fit* — run once per match-all with `batch_size=8` (~7 forward passes for 50 jobs instead of 50 sequential calls) |

| Score | Label | Colour |
|---|---|---|
| 71 – 100 | Strong fit | Green |
| 41 – 70 | Partial fit | Amber |
| 0 – 40 | Weak fit | Red |

---

## Quick Start (local)

**Prerequisites:** Docker + Docker Compose v2, 8 GB RAM minimum.

```bash
git clone https://github.com/vatsaln/job-lens.git
cd job-lens
docker compose up --build
```

The first build downloads the sentence-transformer and BART model weights into image layers (~10–15 min). Subsequent starts are fast.

On first boot the API container automatically runs Alembic migrations, seeds 50 mock jobs across five role types in a background task (so `/health` is reachable immediately), and materialises all dbt views.

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API docs | http://localhost:8000/docs |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3000 (admin / admin) |
| Flower | http://localhost:5555 |

---

## Usage

```bash
# 1. Submit resume — returns resume_id and detected skills
curl -s -X POST http://localhost:8000/resume \
  -H "Content-Type: application/json" \
  -d '{"text": "Senior software engineer with 5 years Python. FastAPI, PostgreSQL, Kubernetes, AWS, Redis, Kafka, Docker, Terraform."}' | jq

# 2. Score against all 50 jobs — returns Celery task_id
curl -s -X POST http://localhost:8000/resume/1/match-all | jq

# 3. Poll progress
curl -s http://localhost:8000/tasks/<task_id> | jq

# 4. Browse results sorted by score
curl -s "http://localhost:8000/jobs?resume_id=1&sort_by=score&limit=5" | jq

# 5. Personal analytics — skill gaps and best-fit roles
curl -s http://localhost:8000/analytics/resume/1 | jq
```

---

## dbt Data Layers

| Layer | Model | Description |
|---|---|---|
| Bronze | `bronze_jobs` / `bronze_resumes` / `bronze_matches` | Raw mirrors of ORM tables |
| Silver | `silver_jobs` / `silver_matches` | Deduplicated; scores range-enforced |
| Gold | `gold_market_skills` | Skill demand frequency across all postings |
| Gold | `gold_resume_gaps` | Per-resume most-missing skills |
| Gold | `gold_score_distribution` | Match counts per score bucket |
| Gold | `gold_top_roles` | Average score per role type |
| Gold | `gold_company_insights` | Average score and skill overlap per company |

---

## API Reference

| Method | Path | Description |
|---|---|---|
| `POST` | `/resume` | Parse resume, extract skills, store embedding |
| `POST` | `/resume/{id}/match-all` | Enqueue batch scoring task |
| `GET` | `/tasks/{task_id}` | Poll task status and percent complete |
| `GET` | `/jobs` | Paginated job list; filter by score, role, location |
| `GET` | `/jobs/{id}` | Full job detail with match breakdown |
| `GET` | `/matches` | Match history for a resume |
| `GET` | `/analytics/market` | Market-wide skill demand and score distribution |
| `GET` | `/analytics/resume/{id}` | Personal skill gaps, best-fit roles, percentile |
| `POST` | `/jobs/seed` | Generate and insert 50 mock jobs |
| `GET` | `/health` | DB, Redis, Celery, model status, seeding progress |
| `GET` | `/metrics` | Prometheus metrics |

---

## CI

GitHub Actions runs on every push and pull request to `main`:

| Job | Tool | What it checks |
|---|---|---|
| `lint` | ruff | Style and unused imports across `backend/` |
| `typecheck` | mypy | Type correctness (`--ignore-missing-imports --no-strict-optional`) |
| `test` | pytest + pytest-asyncio | API endpoint tests with mocked DB and scorer |
| `frontend-build` | Vite | `npm run build` succeeds |

---

## Railway Deployment

Railway deploys each process as an independent service. Four services are required: **API**, **Frontend**, **PostgreSQL**, and **Redis**.

### 1. Add backing services

In your Railway project dashboard add a **PostgreSQL** plugin and a **Redis** plugin. Railway injects `DATABASE_URL` and `REDIS_URL` automatically.

### 2. Deploy the API service

1. **New → GitHub Repo** → select this repository.
2. Railway detects `railway.json` and builds with the root `Dockerfile`.
3. Set environment variables:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Change scheme from `postgresql://` to `postgresql+asyncpg://` |
| `REDIS_URL` | Injected automatically |
| `FRONTEND_URL` | Your Vercel frontend URL (for CORS) |

### 3. Deploy the frontend service

1. **New → GitHub Repo** → same repository, set Dockerfile path to `frontend/Dockerfile`.
2. Set `VITE_API_URL` to your Railway API public URL.

See `.env.example` for the full variable reference.

### Live URLs

| Service | URL |
|---|---|
| Frontend | https://job-lens-rho.vercel.app |
| API | https://job-lens-production.up.railway.app |
| API docs | https://job-lens-production.up.railway.app/docs |
