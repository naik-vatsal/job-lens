# JobLens

[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql&logoColor=white)](https://postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose)
[![CI](https://img.shields.io/github/actions/workflow/status/your-org/job-lens/ci.yml?branch=main&label=CI&logo=github-actions&logoColor=white)](https://github.com/your-org/job-lens/actions)

---

JobLens is a full-stack job intelligence platform that scores your resume against a curated set of job postings using a three-component AI pipeline: semantic similarity via sentence-transformers, keyword overlap via spaCy NER, and zero-shot fit classification via a BART model. Results are cached in Redis, persisted to PostgreSQL, and surfaced through a React dashboard that shows per-job match breakdowns, missing skill gaps, and market-wide analytics built on a dbt bronze/silver/gold data layer.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  Browser                                                             │
│  React 18 + Vite  :5173  ──── axios ──→  /api/*  ──proxy──┐        │
└───────────────────────────────────────────────────────────┼────────┘
                                                            │
                          ┌─────────────────────────────────▼────────┐
                          │  FastAPI  :8000                           │
                          │                                           │
                          │  POST /resume            skill extract    │
                          │  POST /resume/{id}/match-all  → Celery   │
                          │  GET  /tasks/{task_id}   poll progress    │
                          │  GET  /jobs              paginated+scored │
                          │  GET  /jobs/{id}         full breakdown   │
                          │  GET  /matches           match history    │
                          │  GET  /analytics/market  gold layer       │
                          │  GET  /analytics/resume/{id}  personal   │
                          │  POST /jobs/seed         generate mocks   │
                          │  GET  /health                             │
                          │  GET  /metrics           Prometheus       │
                          └──────────┬──────────────────┬────────────┘
                                     │                  │
               ┌─────────────────────▼──┐   ┌──────────▼───────────┐
               │  PostgreSQL  :5432      │   │  Redis  :6379         │
               │                        │   │                       │
               │  resumes               │   │  Celery broker        │
               │  jobs                  │   │  match result cache   │
               │  matches               │   │  SHA-256 key, 1h TTL  │
               │                        │   └───────────────────────┘
               │  dbt views (public.*)  │
               │  ├─ bronze_jobs        │   ┌───────────────────────┐
               │  ├─ bronze_resumes     │   │  Celery Worker        │
               │  ├─ bronze_matches     │   │                       │
               │  ├─ silver_jobs        │   │  score_match()        │
               │  ├─ silver_matches     │   │  ├─ sentence-         │
               │  ├─ gold_market_skills │◄──┤  │   transformers     │
               │  ├─ gold_resume_gaps   │   │  ├─ spaCy en_core_    │
               │  ├─ gold_score_dist    │   │  │   web_sm           │
               │  ├─ gold_top_roles     │   │  └─ BART zero-shot    │
               │  └─ gold_company_      │   │     classifier        │
               │     insights           │   └───────────────────────┘
               └────────────────────────┘
                                            ┌───────────────────────┐
                                            │  Prometheus  :9090    │
                                            │  scrapes /metrics     │
                                            │  every 15 s           │
                                            │                       │
                                            │  Grafana  :3000       │
                                            │  request rate         │
                                            │  p95 latency          │
                                            │  error rate           │
                                            │                       │
                                            │  Flower  :5555        │
                                            │  Celery task monitor  │
                                            └───────────────────────┘
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
| Zero-shot classifier | Hugging Face `facebook/bart-large-mnli` | transformers 4.41.0 |
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
| Observability | Prometheus + Grafana | latest |
| CI | GitHub Actions | — |

---

## Quick Start

### Prerequisites

- Docker and Docker Compose v2
- 8 GB RAM minimum (ML models load into the Celery worker at runtime)
- No other local dependencies required

### Start everything

```bash
git clone https://github.com/your-org/job-lens.git
cd job-lens
docker compose up --build
```

The first build takes 10–15 minutes while Docker pulls base images and downloads the sentence-transformer and BART models into the image layers. Subsequent starts are fast.

On first boot the API container automatically:
1. Runs Alembic migrations (`alembic upgrade head`)
2. Seeds 50 realistic mock jobs across five role types
3. Runs dbt to materialise all bronze / silver / gold views

### Service URLs

| Service | URL | Notes |
|---|---|---|
| Frontend | http://localhost:5173 | React + Vite dev server |
| API (interactive docs) | http://localhost:8000/docs | Swagger UI |
| API (ReDoc) | http://localhost:8000/redoc | Alternative docs |
| Prometheus | http://localhost:9090 | Metrics scraper |
| Grafana | http://localhost:3000 | Dashboards (admin / admin) |
| Flower | http://localhost:5555 | Celery task monitor |

---

## Usage

### Seed the job database

```bash
curl -s -X POST http://localhost:8000/jobs/seed | jq
```

```json
{
  "seeded": 50,
  "total_jobs": 50
}
```

### Analyse a resume

```bash
# 1. Submit resume text — returns resume_id and detected skills
curl -s -X POST http://localhost:8000/resume \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Senior software engineer with 5 years of Python experience. Built high-throughput APIs with FastAPI and PostgreSQL. Deployed containerised services on Kubernetes using Terraform and AWS. Familiar with Redis caching, Kafka event streaming, and Docker."
  }' | jq
```

```json
{
  "resume_id": 1,
  "parsed_skills": ["AWS", "Docker", "FastAPI", "Kafka", "Kubernetes", "PostgreSQL", "Python", "Redis", "Terraform"],
  "skill_count": 9
}
```

```bash
# 2. Kick off scoring against all jobs — returns a Celery task_id
curl -s -X POST http://localhost:8000/resume/1/match-all | jq
```

```json
{
  "task_id": "a3f2c1d0-8b4e-4f9a-bc12-1234567890ab",
  "job_count": 50
}
```

```bash
# 3. Poll task progress every 2 seconds until percent reaches 100
curl -s http://localhost:8000/tasks/a3f2c1d0-8b4e-4f9a-bc12-1234567890ab | jq
```

```json
{
  "task_id": "a3f2c1d0-8b4e-4f9a-bc12-1234567890ab",
  "status": "running",
  "percent": 64,
  "current": 32,
  "total": 50
}
```

```bash
# 4. Browse scored jobs sorted by match quality
curl -s "http://localhost:8000/jobs?resume_id=1&sort_by=score&limit=5" | jq '.jobs[] | {title, company, overall_score, fit_label}'
```

```bash
# 5. View full breakdown for a single job
curl -s "http://localhost:8000/jobs/7?resume_id=1" | jq
```

```bash
# 6. Personal analytics — skill gaps and best-fit roles
curl -s http://localhost:8000/analytics/resume/1 | jq
```

---

## Scoring Algorithm

Each resume–job pair is scored with three independent signals and combined into a single 0–100 score:

```
overall_score = (semantic × 0.45) + (keyword × 0.35) + (classifier × 0.20) × 100
```

| Signal | Model | What it measures |
|---|---|---|
| Semantic (45%) | `all-mpnet-base-v2` | Cosine similarity of 768-dim embeddings of the full resume and JD |
| Keyword (35%) | spaCy + regex against a 60-skill pool | `matched_skills / total_jd_skills` |
| Classifier (20%) | `facebook/bart-large-mnli` | Zero-shot confidence for labels: *strong fit*, *partial fit*, *weak fit* |

Score interpretation:

| Range | Label | UI colour |
|---|---|---|
| 71 – 100 | Strong fit | Green `#22c55e` |
| 41 – 70 | Partial fit | Amber `#f59e0b` |
| 0 – 40 | Weak fit | Red `#ef4444` |

Match results are cached in Redis under a SHA-256 key of `job_description:resume_text` with a one-hour TTL, so re-scoring the same pair is instant.

---

## dbt Data Layers

All dbt models materialise as views in the `public` schema of the PostgreSQL database and are refreshed automatically after each `match-all` task completes.

| Layer | Model | Description |
|---|---|---|
| Bronze | `bronze_jobs` | Raw mirror of the `jobs` table |
| Bronze | `bronze_resumes` | Raw mirror of the `resumes` table |
| Bronze | `bronze_matches` | Raw mirror of the `matches` table |
| Silver | `silver_jobs` | Deduplicated; location and salary normalised |
| Silver | `silver_matches` | Validated scores (0–100 range enforced) |
| Gold | `gold_market_skills` | Skill demand frequency across all job postings |
| Gold | `gold_resume_gaps` | Per-resume skills most frequently missing |
| Gold | `gold_score_distribution` | Match count per score bucket (0-30, 31-50, 51-70, 71-85, 86-100) |
| Gold | `gold_top_roles` | Average match score per role type per resume |
| Gold | `gold_company_insights` | Average score and skill overlap per company |

---

## API Reference

| Method | Path | Description |
|---|---|---|
| `POST` | `/resume` | Parse resume, extract skills, store embedding |
| `POST` | `/resume/{id}/match-all` | Enqueue Celery task to score against all jobs |
| `GET` | `/tasks/{task_id}` | Poll task status and percent complete |
| `GET` | `/jobs` | Paginated job list; filterable by score, role, location |
| `GET` | `/jobs/{id}` | Full job detail with optional match breakdown |
| `GET` | `/matches` | Match history for a resume |
| `GET` | `/analytics/market` | Market-wide skill demand, score distribution, top companies |
| `GET` | `/analytics/resume/{id}` | Personal skill gaps, best-fit roles, score percentile |
| `POST` | `/jobs/seed` | Generate and insert 50 mock jobs |
| `GET` | `/health` | DB, Redis, Celery, and model status |
| `GET` | `/metrics` | Prometheus metrics endpoint |

Full interactive documentation: **http://localhost:8000/docs**

---

## Screenshots

> _Run `docker compose up --build`, open the app, analyse a resume, and replace these placeholders with real screenshots._

**Resume page** (`/resume`) — paste your resume, view extracted skills as chips, trigger match-all with a live progress bar.

**Job Board** (`/jobs`) — grid of job cards each showing a coloured score circle, fit label badge, and top three matched skills. Filter by minimum score, role type, location, and sort order.

**Job Detail** (`/jobs/:id`) — full match breakdown with three score progress bars (semantic / keyword / classifier), side-by-side matched and missing skill columns, experience gap indicator, and an AI-generated summary sentence.

**Analytics Dashboard** (`/analytics`) — horizontal bar charts for top 20 in-demand skills and best-fit role types, score distribution histogram, company fit rankings, and a personal skill-gap chip list with frequency counts.

---

## Project Structure

```
job-lens/
├── backend/
│   ├── main.py              # FastAPI app, all endpoints, startup lifecycle
│   ├── models.py            # SQLAlchemy ORM models
│   ├── database.py          # Async engine and session factory
│   ├── scorer.py            # Three-component scoring pipeline + Redis cache
│   ├── crawler.py           # Mock job generator (50 jobs, 5 role types)
│   ├── analytics.py         # Gold-layer queries with direct SQL fallbacks
│   ├── tasks.py             # Celery match-all task
│   ├── celery_app.py        # Celery application factory
│   ├── alembic/             # Database migrations
│   ├── dbt/                 # dbt project (bronze / silver / gold models)
│   ├── tests/               # pytest test suite
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/           # Resume, JobBoard, JobDetail, Analytics
│   │   └── components/      # Navbar, JobCard, ScoreCard, SkillChip
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── prometheus.yml
├── grafana/
│   ├── dashboard.json
│   └── provisioning/
└── .github/workflows/ci.yml
```

---

## CI

GitHub Actions runs four jobs on every push and pull request to `main`:

| Job | Tool | What it checks |
|---|---|---|
| `lint` | ruff | Style and unused imports across `backend/` |
| `typecheck` | mypy | Type correctness (`--ignore-missing-imports --no-strict-optional`) |
| `test` | pytest + pytest-asyncio | API endpoint tests with mocked DB and scorer |
| `frontend-build` | Vite | `npm run build` succeeds |

---

## Railway Deployment

Railway deploys each process as an independent service. The recommended setup uses four services: **API**, **Frontend**, **PostgreSQL**, and **Redis**.

### 1. Add backing services

In your Railway project dashboard, click **New** and add:
- **PostgreSQL** — Railway provisions `DATABASE_URL` automatically.
- **Redis** — Railway provisions `REDIS_URL` automatically.

### 2. Deploy the API service

1. Click **New → GitHub Repo**, select this repository.
2. Railway detects `railway.json` at the root and uses `Dockerfile` (the backend build).
3. Set environment variables on the API service:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Change scheme to `postgresql+asyncpg://…` (Railway provides `postgresql://…` by default) |
| `REDIS_URL` | Provided automatically by the Redis service |
| `SECRET_KEY` | A random secret string |
| `ENVIRONMENT` | `production` |

> **Note:** Railway's PostgreSQL plugin sets `DATABASE_URL` with the `postgresql://` scheme. FastAPI uses asyncpg, so you must override it to `postgresql+asyncpg://` in the API service's variable panel.

### 3. Deploy the frontend service

1. In the same project, click **New → GitHub Repo** again (same repo).
2. In the service settings, set **Dockerfile path** to `frontend/Dockerfile`.
3. Set environment variables on the frontend service:

| Variable | Value |
|---|---|
| `VITE_API_URL` | The public URL of your Railway API service, e.g. `https://api-xyz.up.railway.app` |

### 4. Link services via Railway networking

Railway services within the same project can communicate over a private network using internal hostnames. For the Celery worker (if deployed as a separate service) point `REDIS_URL` and `DATABASE_URL` to the same values as the API service.

### 5. Environment variable reference

See `.env.example` at the repository root for a full list of required variables with descriptions.

### Service URLs after deployment

| Service | URL |
|---|---|
| API | `https://<api-service>.up.railway.app` |
| API docs | `https://<api-service>.up.railway.app/docs` |
| Frontend | `https://<frontend-service>.up.railway.app` |
