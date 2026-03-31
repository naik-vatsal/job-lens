"""
API tests for JobLens.

Heavy dependencies (ML models, Celery, Redis, real Postgres) are patched at
module level — before main.py is imported — so nothing tries to connect to
external services during the test run.
"""
import sys
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock

# ── Pre-import patches ────────────────────────────────────────────────────────
# These must happen before `from main import ...` so that main.py picks up the
# mocks instead of the real heavy modules.

_fake_scorer = MagicMock()
_fake_scorer.extract_skills.return_value = ["Python", "FastAPI", "PostgreSQL"]
_fake_scorer.get_embedding.return_value = [0.0] * 768
_fake_scorer._sentence_model = None
_fake_scorer._nlp = None
sys.modules.setdefault("scorer", _fake_scorer)

_fake_celery_module = MagicMock()
sys.modules.setdefault("celery_app", _fake_celery_module)

_fake_tasks = MagicMock()
_fake_tasks.match_resume_all_jobs = MagicMock()
sys.modules.setdefault("tasks", _fake_tasks)

_fake_crawler = MagicMock()
_fake_crawler.generate_mock_jobs.return_value = []
sys.modules.setdefault("crawler", _fake_crawler)

_fake_analytics = MagicMock()
_fake_analytics.get_market_analytics = AsyncMock(return_value={})
_fake_analytics.get_resume_analytics = AsyncMock(return_value={})
sys.modules.setdefault("analytics", _fake_analytics)

# ── Stdlib / third-party imports (after patching) ────────────────────────────
import pytest  # noqa: E402
from httpx import AsyncClient, ASGITransport  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession  # noqa: E402
from unittest.mock import patch  # noqa: E402

from main import app, get_db  # noqa: E402 — must come after sys.modules setup


# ── Disable the startup lifespan so tests don't need Postgres/Redis/dbt ──────
@asynccontextmanager
async def _noop_lifespan(application):  # type: ignore[type-arg]
    yield


app.router.lifespan_context = _noop_lifespan  # type: ignore[assignment]


# ── DB session mock factory ───────────────────────────────────────────────────

def _make_db_mock() -> AsyncMock:
    """Return an AsyncMock that satisfies AsyncSession's interface."""
    db = AsyncMock(spec=AsyncSession)
    # Default scalar() → 0 (used for count queries)
    db.scalar.return_value = 0
    # Default execute() → empty result
    empty_result = MagicMock()
    empty_result.scalars.return_value.all.return_value = []
    empty_result.all.return_value = []
    db.execute.return_value = empty_result
    return db


# ── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def db_mock() -> AsyncMock:
    return _make_db_mock()


@pytest.fixture
async def client(db_mock: AsyncMock) -> AsyncClient:
    """AsyncClient with the DB dependency overridden and lifespan disabled."""
    app.dependency_overrides[get_db] = lambda: db_mock
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as c:
        yield c
    app.dependency_overrides.clear()


# ── Tests ─────────────────────────────────────────────────────────────────────

class TestHealth:
    async def test_returns_200(self, client: AsyncClient) -> None:
        # Patch Redis and Celery so health doesn't need real infra
        mock_redis = AsyncMock()
        mock_redis.ping = AsyncMock()
        mock_redis.aclose = AsyncMock()

        with (
            patch("main.aioredis.from_url", return_value=mock_redis),
            patch("main.celery_app") as mock_celery,
        ):
            mock_celery.control.inspect.return_value.ping.return_value = {"worker@host": {}}
            response = await client.get("/health")

        assert response.status_code == 200

    async def test_response_has_status_field(self, client: AsyncClient) -> None:
        mock_redis = AsyncMock()
        mock_redis.ping = AsyncMock()
        mock_redis.aclose = AsyncMock()

        with (
            patch("main.aioredis.from_url", return_value=mock_redis),
            patch("main.celery_app") as mock_celery,
        ):
            mock_celery.control.inspect.return_value.ping.return_value = {"worker@host": {}}
            response = await client.get("/health")

        body = response.json()
        assert "status" in body
        assert body["status"] in ("ok", "degraded")

    async def test_db_ok_when_scalar_succeeds(self, client: AsyncClient, db_mock: AsyncMock) -> None:
        db_mock.scalar.return_value = 50  # 50 jobs in DB
        mock_redis = AsyncMock()
        mock_redis.ping = AsyncMock()
        mock_redis.aclose = AsyncMock()

        with (
            patch("main.aioredis.from_url", return_value=mock_redis),
            patch("main.celery_app") as mock_celery,
        ):
            mock_celery.control.inspect.return_value.ping.return_value = {"worker@host": {}}
            response = await client.get("/health")

        assert response.json()["db"] == "ok"


class TestGetJobs:
    async def test_returns_200(self, client: AsyncClient) -> None:
        response = await client.get("/jobs")
        assert response.status_code == 200

    async def test_response_contains_jobs_list(self, client: AsyncClient) -> None:
        response = await client.get("/jobs")
        body = response.json()
        assert "jobs" in body
        assert isinstance(body["jobs"], list)

    async def test_response_contains_pagination_fields(self, client: AsyncClient) -> None:
        response = await client.get("/jobs")
        body = response.json()
        assert "total" in body
        assert "page" in body
        assert "limit" in body

    async def test_empty_db_returns_empty_list(self, client: AsyncClient, db_mock: AsyncMock) -> None:
        # scalar() for count returns 0, execute() returns empty rows
        db_mock.scalar.return_value = 0
        response = await client.get("/jobs")
        assert response.json()["jobs"] == []
        assert response.json()["total"] == 0

    async def test_pagination_defaults(self, client: AsyncClient) -> None:
        response = await client.get("/jobs")
        body = response.json()
        assert body["page"] == 1
        assert body["limit"] == 20


class TestPostResume:
    async def test_returns_200(self, client: AsyncClient, db_mock: AsyncMock) -> None:
        async def _set_id(obj: object) -> None:
            obj.id = 1  # type: ignore[attr-defined]

        db_mock.refresh.side_effect = _set_id
        response = await client.post("/resume", json={"text": "Python developer with 5 years experience"})
        assert response.status_code == 200

    async def test_response_contains_resume_id(self, client: AsyncClient, db_mock: AsyncMock) -> None:
        async def _set_id(obj: object) -> None:
            obj.id = 42  # type: ignore[attr-defined]

        db_mock.refresh.side_effect = _set_id
        response = await client.post("/resume", json={"text": "Senior Python engineer, FastAPI, PostgreSQL"})
        body = response.json()
        assert "resume_id" in body
        assert body["resume_id"] == 42

    async def test_response_contains_parsed_skills(self, client: AsyncClient, db_mock: AsyncMock) -> None:
        async def _set_id(obj: object) -> None:
            obj.id = 1  # type: ignore[attr-defined]

        db_mock.refresh.side_effect = _set_id
        response = await client.post("/resume", json={"text": "Python FastAPI PostgreSQL developer"})
        body = response.json()
        assert "parsed_skills" in body
        # The mock scorer returns ["Python", "FastAPI", "PostgreSQL"]
        assert isinstance(body["parsed_skills"], list)
        assert len(body["parsed_skills"]) > 0

    async def test_response_contains_skill_count(self, client: AsyncClient, db_mock: AsyncMock) -> None:
        async def _set_id(obj: object) -> None:
            obj.id = 1  # type: ignore[attr-defined]

        db_mock.refresh.side_effect = _set_id
        response = await client.post("/resume", json={"text": "Python developer"})
        body = response.json()
        assert "skill_count" in body
        assert body["skill_count"] == len(body["parsed_skills"])

    async def test_calls_extract_skills_and_get_embedding(
        self, client: AsyncClient, db_mock: AsyncMock
    ) -> None:
        async def _set_id(obj: object) -> None:
            obj.id = 1  # type: ignore[attr-defined]

        db_mock.refresh.side_effect = _set_id
        resume_text = "Python FastAPI PostgreSQL Redis Docker"
        await client.post("/resume", json={"text": resume_text})

        # Verify the scorer functions were called with the submitted text
        _fake_scorer.extract_skills.assert_called_with(resume_text)
        _fake_scorer.get_embedding.assert_called_with(resume_text)
