"""Career Coach AI agent — Anthropic tool-use agentic loop."""
import json
import logging
import os

import anthropic
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

_client: anthropic.AsyncAnthropic | None = None


def _get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    return _client


TOOLS: list[dict] = [
    {
        "name": "get_resume_gaps",
        "description": (
            "Fetch the skills most frequently missing from the user's resume relative to "
            "job requirements. Use this to identify what the user should learn next."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "resume_id": {"type": "integer", "description": "The user's resume ID"},
            },
            "required": ["resume_id"],
        },
    },
    {
        "name": "get_top_jobs",
        "description": (
            "Fetch the top 5 highest-scoring job matches for the user's resume, "
            "including overall score, fit label, matched skills, and missing skills per job."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "resume_id": {"type": "integer", "description": "The user's resume ID"},
            },
            "required": ["resume_id"],
        },
    },
    {
        "name": "get_market_demand",
        "description": "Fetch the top 20 most in-demand skills across all job postings in the market.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
]

SYSTEM_PROMPT = """\
You are a Career Coach AI embedded in JobLens, a job-matching platform.
Your role: give specific, actionable career advice based on real data about the \
user's resume, their job match scores, and market skill demand.

Rules:
- Always call the relevant tools first to fetch live data before answering.
- Never invent job titles, company names, scores, or skill names.
- Prioritise skills that are high market-demand AND missing from the resume.
- When comparing jobs, reference actual scores and specific missing skills.
- If the user has no job matches yet, tell them to run "Find Matching Jobs" first.
- Keep answers under 300 words. Use bullet points for lists.
"""


async def _execute_tool(name: str, inputs: dict, db: AsyncSession) -> dict:
    if name == "get_resume_gaps":
        from analytics import get_resume_analytics
        resume_id: int = inputs["resume_id"]
        try:
            data = await get_resume_analytics(resume_id, db)
            return {"skill_gaps": data.get("skill_gaps", [])}
        except Exception as exc:
            return {"error": str(exc)}

    if name == "get_top_jobs":
        from models import Job, Match
        resume_id = inputs["resume_id"]
        rows = (
            await db.execute(
                select(Match, Job)
                .join(Job, Match.job_id == Job.id)
                .where(Match.resume_id == resume_id)
                .order_by(desc(Match.overall_score))
                .limit(5)
            )
        ).all()
        return {
            "top_jobs": [
                {
                    "id": job.id,
                    "title": job.title,
                    "company": job.company,
                    "overall_score": match.overall_score,
                    "fit_label": match.fit_label,
                    "matched_skills": list(match.matched_skills or []),
                    "missing_skills": list((match.missing_skills or [])[:6]),
                }
                for match, job in rows
            ],
            "count": len(rows),
        }

    if name == "get_market_demand":
        from analytics import get_market_analytics
        try:
            data = await get_market_analytics(db)
            return {"top_skills": data.get("top_skills", [])[:20]}
        except Exception as exc:
            return {"error": str(exc)}

    return {"error": f"Unknown tool: {name}"}


async def run_agent(question: str, resume_id: int, db: AsyncSession) -> str:
    client = _get_client()
    messages: list[dict] = [{"role": "user", "content": question}]

    for _ in range(8):  # guard against runaway loops
        response = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            tools=TOOLS,  # type: ignore[arg-type]
            messages=messages,  # type: ignore[arg-type]
        )

        if response.stop_reason == "end_turn":
            for block in response.content:
                if hasattr(block, "text"):
                    return block.text  # type: ignore[attr-defined]
            return "I couldn't generate a response. Please try again."

        if response.stop_reason == "tool_use":
            messages.append({"role": "assistant", "content": response.content})  # type: ignore[arg-type]

            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    logger.info("Agent tool: %s %s", block.name, block.input)
                    result = await _execute_tool(block.name, block.input, db)  # type: ignore[attr-defined]
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps(result),
                    })
            messages.append({"role": "user", "content": tool_results})
        else:
            break

    return "I wasn't able to complete your request. Please try again."
