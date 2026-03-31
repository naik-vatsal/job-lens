import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, func
from models import Match, Job, Resume

logger = logging.getLogger(__name__)


async def _try_view(session: AsyncSession, view_sql: str, fallback_sql: str, params: dict = None):
    try:
        result = await session.execute(text(view_sql), params or {})
        return result.mappings().all()
    except Exception as e:
        logger.warning(f"View query failed ({e}), using fallback")
        await session.rollback()
        result = await session.execute(text(fallback_sql), params or {})
        return result.mappings().all()


async def get_market_analytics(session: AsyncSession) -> dict:
    # Top 20 in-demand skills
    top_skills_rows = await _try_view(
        session,
        "SELECT skill_name, demand_count FROM gold_market_skills ORDER BY demand_count DESC LIMIT 20",
        """
        SELECT skill_name, COUNT(*) AS demand_count
        FROM jobs,
             jsonb_array_elements_text(required_skills::jsonb) AS skill_name
        GROUP BY skill_name
        ORDER BY demand_count DESC
        LIMIT 20
        """,
    )
    top_skills = [{"skill": r["skill_name"], "count": r["demand_count"]} for r in top_skills_rows]

    # Score distribution
    score_dist_rows = await _try_view(
        session,
        "SELECT score_bucket, job_count FROM gold_score_distribution ORDER BY score_bucket",
        """
        SELECT
            CASE
                WHEN overall_score <= 30 THEN '0-30'
                WHEN overall_score <= 50 THEN '31-50'
                WHEN overall_score <= 70 THEN '51-70'
                WHEN overall_score <= 85 THEN '71-85'
                ELSE '86-100'
            END AS score_bucket,
            COUNT(*) AS job_count
        FROM matches
        WHERE overall_score IS NOT NULL
        GROUP BY score_bucket
        ORDER BY score_bucket
        """,
    )
    score_distribution = [{"bucket": r["score_bucket"], "count": r["job_count"]} for r in score_dist_rows]

    # Top roles
    top_roles_rows = await _try_view(
        session,
        """
        SELECT role_type, AVG(avg_score) AS avg_score, SUM(job_count) AS job_count
        FROM gold_top_roles
        GROUP BY role_type
        ORDER BY avg_score DESC
        LIMIT 10
        """,
        """
        SELECT
            TRIM(REGEXP_REPLACE(j.title, '\\s*[–-].*$', '')) AS role_type,
            ROUND(AVG(m.overall_score)::numeric, 1) AS avg_score,
            COUNT(*) AS job_count
        FROM matches m
        JOIN jobs j ON m.job_id = j.id
        GROUP BY role_type
        ORDER BY avg_score DESC
        LIMIT 10
        """,
    )
    top_roles = [
        {"role": r["role_type"], "avg_score": float(r["avg_score"]), "count": r["job_count"]}
        for r in top_roles_rows
    ]

    # Company insights
    company_rows = await _try_view(
        session,
        "SELECT company, avg_score, avg_skill_overlap, match_count FROM gold_company_insights ORDER BY avg_score DESC LIMIT 10",
        """
        SELECT
            j.company,
            ROUND(AVG(m.overall_score)::numeric, 1) AS avg_score,
            ROUND(AVG(m.keyword_score)::numeric, 1) AS avg_skill_overlap,
            COUNT(*) AS match_count
        FROM matches m
        JOIN jobs j ON m.job_id = j.id
        GROUP BY j.company
        ORDER BY avg_score DESC
        LIMIT 10
        """,
    )
    company_insights = [
        {
            "company": r["company"],
            "avg_score": float(r["avg_score"]),
            "avg_skill_overlap": float(r["avg_skill_overlap"]),
            "count": r["match_count"],
        }
        for r in company_rows
    ]

    return {
        "top_skills": top_skills,
        "score_distribution": score_distribution,
        "top_roles": top_roles,
        "company_insights": company_insights,
    }


async def get_resume_analytics(resume_id: int, session: AsyncSession) -> dict:
    # Skill gaps for this resume
    gaps_rows = await _try_view(
        session,
        """
        SELECT skill_name, missing_count
        FROM gold_resume_gaps
        WHERE resume_id = :resume_id
        ORDER BY missing_count DESC
        LIMIT 10
        """,
        """
        SELECT skill_name, COUNT(*) AS missing_count
        FROM matches,
             jsonb_array_elements_text(missing_skills::jsonb) AS skill_name
        WHERE resume_id = :resume_id
        GROUP BY skill_name
        ORDER BY missing_count DESC
        LIMIT 10
        """,
        {"resume_id": resume_id},
    )
    skill_gaps = [{"skill": r["skill_name"], "count": r["missing_count"]} for r in gaps_rows]

    # Best matching roles for this resume
    roles_rows = await _try_view(
        session,
        """
        SELECT role_type, avg_score, job_count
        FROM gold_top_roles
        WHERE resume_id = :resume_id
        ORDER BY avg_score DESC
        LIMIT 8
        """,
        """
        SELECT
            TRIM(REGEXP_REPLACE(j.title, '\\s*[–-].*$', '')) AS role_type,
            ROUND(AVG(m.overall_score)::numeric, 1) AS avg_score,
            COUNT(*) AS job_count
        FROM matches m
        JOIN jobs j ON m.job_id = j.id
        WHERE m.resume_id = :resume_id
        GROUP BY role_type
        ORDER BY avg_score DESC
        LIMIT 8
        """,
        {"resume_id": resume_id},
    )
    best_roles = [
        {"role": r["role_type"], "avg_score": float(r["avg_score"]), "count": r["job_count"]}
        for r in roles_rows
    ]

    # Average match score and percentile
    avg_result = await session.execute(
        text("""
        SELECT
            ROUND(AVG(overall_score)::numeric, 1) AS my_avg,
            COUNT(*) AS my_count
        FROM matches
        WHERE resume_id = :resume_id AND overall_score IS NOT NULL
        """),
        {"resume_id": resume_id},
    )
    avg_row = avg_result.mappings().first()
    my_avg = float(avg_row["my_avg"]) if avg_row and avg_row["my_avg"] else 0.0
    my_count = avg_row["my_count"] if avg_row else 0

    # Percentile vs other resumes
    percentile_result = await session.execute(
        text("""
        WITH resume_avgs AS (
            SELECT resume_id, AVG(overall_score) AS avg_score
            FROM matches
            WHERE overall_score IS NOT NULL
            GROUP BY resume_id
        )
        SELECT
            ROUND(
                (COUNT(*) FILTER (WHERE avg_score < :my_avg) * 100.0 / NULLIF(COUNT(*), 0))::numeric,
                1
            ) AS percentile
        FROM resume_avgs
        """),
        {"my_avg": my_avg},
    )
    perc_row = percentile_result.mappings().first()
    percentile = float(perc_row["percentile"]) if perc_row and perc_row["percentile"] else 0.0

    return {
        "skill_gaps": skill_gaps,
        "best_roles": best_roles,
        "avg_match_score": my_avg,
        "jobs_analyzed": my_count,
        "score_percentile": percentile,
    }
