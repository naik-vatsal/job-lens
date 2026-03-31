# JobLens

> AI-powered job intelligence platform — match your resume against 50+ job postings using semantic embeddings, keyword scoring, and zero-shot classification.

![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)
![Celery](https://img.shields.io/badge/Celery-5.4-37814A?logo=celery&logoColor=white)
![dbt](https://img.shields.io/badge/dbt-1.8-FF694B?logo=dbt&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser  :5173                                          │
│  React + Vite  ──── axios ──→  /api  ──proxy──→ FastAPI │
└────────────────────────────────────┬────────────────────┘
                                     │
             ┌───────────────────────▼──────────────────────┐
             │  FastAPI  :8000                               │
             │  • POST /resume          (skill extraction)   │
             │  • POST /resume/match-all (Celery task)       │
             │  • GET  /jobs            (paginated + scored) │
             │  • GET  /analytics/market                     │
             │  • GET  /analytics/resume/{id}               │
             │  • GET  /metrics         (Prometheus)         │
             └──────┬──────────────────────┬────────────────┘
                    │                      │
         ┌──────────▼──────┐    ┌──────────▼──────────┐
         │  PostgreSQL :5432│    │  Redis :6379         │
         │  ├ resumes       │    │  ├ Celery broker     │
         │  ├ jobs          │    │  └ match cache SHA256│
         │  └ matches       │    └─────────────────────┘
         │                  │
         │  dbt gold layer  │         ┌──────────────────┐
         │  ├ gold_market_  │         │  Celery Worker   │
         │  │  skills       │◄────────│  • score_match   │
         │  ├ gold_resume_  │         │  • sentence-     │
         │  │  gaps         │         │    transformers  │
         │  ├ gold_score_   │         │  • BART zero-shot│
         │  │  distribution │         │  • spaCy NER     │
         │  ├ gold_top_roles│         └──────────────────┘
         │  └ gold_company_ │
         │    insights      │    ┌──────────────────────┐
         └──────────────────┘    │  Prometheus :9090    │
                                 │  Grafana    :3000    │
                                 │  Flower     :5555    │
                                 └──────────────────────┘
```

---

## Quick Start

### Prerequisites
- Docker & Docker Compose
- 8 GB RAM recommended (ML models are large)

### Start the platform

```bash
git clone <repo>
cd job-lens
docker compose up --build
```

Services come up in order. On first boot:
1. Alembic migrations run automatically
2. 50 mock jobs are seeded across 5 role types
3. dbt models create the gold layer analytics views
4. All services become healthy

| Service    | URL                        |
|------------|----------------------------|
| Frontend   | http://localhost:5173      |
| API docs   | http://localhost:8000/docs |
| Prometheus | http://localhost:9090      |
| Grafana    | http://localhost:3000      |
| Flower     | http://localhost:5555      |

### Seed jobs manually

```bash
curl -X POST http://localhost:8000/jobs/seed
```

### Analyze a resume via API

```bash
# 1. Upload resume
curl -X POST http://localhost:8000/resume \
  -H "Content-Type: application/json" \
  -d '{"text": "5 years Python experience. Built FastAPI services with PostgreSQL and Redis. Deployed on Kubernetes with Terraform."}'

# 2. Match against all jobs (returns task_id)
curl -X POST http://localhost:8000/resume/1/match-all

# 3. Poll task status
curl http://localhost:8000/tasks/<task_id>

# 4. View results
curl "http://localhost:8000/jobs?resume_id=1&sort_by=score"
```

---

## Scoring Algorithm

```
overall_score = (semantic × 0.45) + (keyword × 0.35) + (classifier × 0.20)  ×  100
```

| Component   | Model                         | Description                              |
|-------------|-------------------------------|------------------------------------------|
| Semantic    | all-mpnet-base-v2             | Cosine similarity of resume ↔ JD embeddings |
| Keyword     | spaCy + regex                 | Matched skills / total JD skills         |
| Classifier  | facebook/bart-large-mnli      | Zero-shot: strong / partial / weak fit   |

Results are cached in Redis (SHA-256 key, TTL 1 hour).

---

## dbt Data Layers

| Layer  | Models                    | Purpose                            |
|--------|---------------------------|------------------------------------|
| Bronze | bronze_jobs/resumes/matches | Raw mirrors of source tables      |
| Silver | silver_jobs, silver_matches | Cleaned, normalized, validated    |
| Gold   | gold_market_skills        | Top skill demand across all jobs   |
|        | gold_resume_gaps          | Per-resume most missing skills     |
|        | gold_score_distribution   | Score bucket histograms            |
|        | gold_top_roles            | Avg score per role type per resume |
|        | gold_company_insights     | Avg fit score per company          |

---

## Screenshots

> _Add screenshots here after running the app_

- `/resume` — Resume paste + skill extraction
- `/jobs` — Filtered job board with match scores
- `/jobs/:id` — Full match breakdown with progress bars
- `/analytics` — Market + personal analytics dashboard

---

## Tech Stack

**Backend:** Python 3.11, FastAPI, SQLAlchemy (async), Alembic, Celery, Redis, PostgreSQL
**ML:** sentence-transformers (all-mpnet-base-v2), spaCy (en_core_web_sm), Hugging Face BART
**Analytics:** dbt-postgres (bronze/silver/gold layers)
**Frontend:** React 18, Vite, react-router-dom, recharts, axios
**Infra:** Docker Compose, Prometheus, Grafana, GitHub Actions CI
