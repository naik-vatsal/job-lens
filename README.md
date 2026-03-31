# JobLens ⚡

AI-powered job intelligence that scores every job against your resume and tells you exactly where you stand.

Most job boards show you listings. This one shows you *fit*.

## The Problem

Applying blind is exhausting — you don't know if you're a 90% match or wasting your time until the rejection arrives two weeks later. Job descriptions are vague, skills are scattered across PDFs, and no tool connects your actual background to what the market actually wants. JobLens fixes that.

## How It Works

- Paste your resume → it extracts your skills and builds a semantic profile
- Every job in the board gets scored against your profile in one batch operation
- Each job gets a match score, a fit label, and a breakdown of what you have vs. what's missing
- The Analytics page shows market-wide skill demand so you know what to learn next
- The Career Coach (AI agent) answers questions about your matches, gaps, and next moves — grounded in your actual data, not generic advice

## Under the Hood

```
Vercel (React) → Railway (FastAPI) → PostgreSQL
                                   → Redis → Celery Worker
                                   → Anthropic API
                                   → dbt Pipeline
```

**Backend** · FastAPI, SQLAlchemy, Alembic, Celery, slowapi
**Frontend** · React, Recharts, Vite, Axios
**Infrastructure** · Railway, Vercel, Docker, Redis, PostgreSQL
**Data** · dbt (bronze / silver / gold), spaCy, sentence-transformers
**AI** · Anthropic Claude (Haiku), BART zero-shot classification

## Try It

🔗 Live: https://job-lens-rho.vercel.app
📖 API: https://job-lens-production.up.railway.app/docs

Paste your resume and see where you stand.

## Local Setup

```bash
git clone https://github.com/your-username/job-lens.git
cp .env.example .env          # fill in DATABASE_URL, REDIS_URL, ANTHROPIC_API_KEY
docker compose up --build     # spins up API + Celery worker + Postgres + Redis
cd frontend && npm install && npm run dev
```

## Status

CI passing. Deployed. Built in ~1 week as a portfolio project.
Open to feedback and contributions.
