import hashlib
import json
import logging
import os
import re
from typing import Optional

import numpy as np
import redis.asyncio as aioredis

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
CACHE_TTL = 3600

SKILL_POOL = [
    # SWE
    "Python", "Go", "Java", "Node.js", "FastAPI", "PostgreSQL", "Redis",
    "AWS", "Docker", "Kubernetes", "Kafka", "GraphQL", "TypeScript", "React",
    # DE
    "Apache Airflow", "dbt", "Apache Spark", "Snowflake", "BigQuery",
    "Terraform", "Great Expectations", "Trino", "Iceberg",
    # ML
    "PyTorch", "TensorFlow", "scikit-learn", "AWS SageMaker", "MLflow",
    "Hugging Face", "spaCy", "LangChain", "RAG", "FAISS",
    # Infra
    "GCP", "Ansible", "Prometheus", "Grafana", "Jenkins",
    "GitHub Actions", "Linux", "Helm", "ArgoCD",
    # DS
    "R", "SQL", "pandas", "Tableau", "Power BI", "Statistics",
    "A/B Testing", "Jupyter",
]

SKILL_POOL_LOWER = {s.lower(): s for s in SKILL_POOL}

_sentence_model = None
_classifier = None
_nlp = None


def get_nlp():
    global _nlp
    if _nlp is None:
        import spacy
        _nlp = spacy.load("en_core_web_sm")
    return _nlp


def get_sentence_model():
    global _sentence_model
    if _sentence_model is None:
        from sentence_transformers import SentenceTransformer
        _sentence_model = SentenceTransformer("all-mpnet-base-v2")
    return _sentence_model


def get_classifier():
    global _classifier
    if _classifier is None:
        from transformers import pipeline
        _classifier = pipeline(
            "zero-shot-classification",
            model="facebook/bart-large-mnli",
            device=-1,
        )
    return _classifier


def classify_batch(
    texts: list[str],
    batch_size: int = 8,
) -> list[tuple[str, float]]:
    """Run BART zero-shot classification on all texts in one batched call.

    Returns a list of (fit_label, confidence) tuples in the same order as *texts*.
    Falls back to empty strings / 0.0 on error so callers can degrade gracefully.
    """
    if not texts:
        return []
    try:
        clf = get_classifier()
        results = clf(
            texts,
            candidate_labels=["strong fit", "partial fit", "weak fit"],
            batch_size=batch_size,
        )
        # When a single string is passed, the pipeline returns a dict; a list
        # of strings returns a list of dicts.  Normalise to always be a list.
        if isinstance(results, dict):
            results = [results]
        return [(r["labels"][0], float(r["scores"][0])) for r in results]
    except Exception as exc:
        logger.error("classify_batch error: %s", exc)
        return [("", 0.0)] * len(texts)


def extract_skills(text: str) -> list[str]:
    text_lower = text.lower()
    found = set()
    for skill_lower, skill_original in SKILL_POOL_LOWER.items():
        pattern = r"(?<!\w)" + re.escape(skill_lower) + r"(?!\w)"
        if re.search(pattern, text_lower):
            found.add(skill_original)
    return sorted(found)


def get_embedding(text: str) -> list[float]:
    model = get_sentence_model()
    embedding = model.encode(text[:1024], normalize_embeddings=True)
    return embedding.tolist()


def cosine_similarity(a: list[float], b: list[float]) -> float:
    a_arr = np.array(a, dtype=np.float32)
    b_arr = np.array(b, dtype=np.float32)
    norm_a = np.linalg.norm(a_arr)
    norm_b = np.linalg.norm(b_arr)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a_arr, b_arr) / (norm_a * norm_b))


def extract_years_experience(text: str) -> float:
    patterns = [
        r"(\d+)\+?\s*years?\s+(?:of\s+)?(?:professional\s+)?(?:work\s+)?experience",
        r"(\d+)\+?\s*years?\s+(?:of\s+)?experience",
        r"experience\s+of\s+(\d+)\+?\s*years?",
        r"minimum\s+(\d+)\+?\s*years?",
        r"at\s+least\s+(\d+)\+?\s*years?",
    ]
    for pattern in patterns:
        match = re.search(pattern, text.lower())
        if match:
            return float(match.group(1))
    return 0.0


async def score_match(
    resume_text: str,
    job_description: str,
    resume_skills: Optional[list[str]] = None,
) -> dict:
    cache_key = "match:" + hashlib.sha256(
        f"{job_description}:{resume_text}".encode()
    ).hexdigest()

    try:
        r = aioredis.from_url(REDIS_URL)
        cached = await r.get(cache_key)
        await r.aclose()
        if cached:
            return json.loads(cached)
    except Exception as e:
        logger.warning(f"Redis read error: {e}")

    jd_skills = extract_skills(job_description)
    resume_skills_used = resume_skills or extract_skills(resume_text)

    matched_skills = sorted(set(resume_skills_used) & set(jd_skills))
    missing_skills = sorted(set(jd_skills) - set(resume_skills_used))

    keyword_score = len(matched_skills) / len(jd_skills) if jd_skills else 0.0

    try:
        resume_embedding = get_embedding(resume_text)
        jd_embedding = get_embedding(job_description)
        semantic_score = max(0.0, min(1.0, cosine_similarity(resume_embedding, jd_embedding)))
    except Exception as e:
        logger.error(f"Embedding error: {e}")
        semantic_score = 0.5
        resume_embedding = []
        jd_embedding = []

    try:
        clf = get_classifier()
        combined = f"Job requirements: {job_description[:400]} Candidate resume: {resume_text[:400]}"
        clf_result = clf(
            combined,
            candidate_labels=["strong fit", "partial fit", "weak fit"],
        )
        fit_label = clf_result["labels"][0]
        confidence = float(clf_result["scores"][0])
    except Exception as e:
        logger.error(f"Classifier error: {e}")
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
            + confidence * 0.20
        ) * 100)),
        1,
    )

    years_required = extract_years_experience(job_description)
    years_in_resume = extract_years_experience(resume_text)
    experience_gap = round(years_required - years_in_resume, 1)

    if overall_score >= 70:
        summary = (
            f"Strong match with {len(matched_skills)} overlapping skills including "
            f"{', '.join(matched_skills[:3])}. "
            "Your background aligns well with this role's technical requirements."
        )
    elif overall_score >= 40:
        gap_hint = f" Consider building expertise in {', '.join(missing_skills[:2])}." if missing_skills else ""
        summary = (
            f"Partial match with {len(matched_skills)} overlapping skills.{gap_hint} "
            "Strengthening key missing areas would meaningfully improve your fit."
        )
    else:
        gap_hint = f" Key gaps include {', '.join(missing_skills[:3])}." if missing_skills else ""
        summary = (
            f"Limited overlap with only {len(matched_skills)} matching skills.{gap_hint} "
            "This role requires significant additional experience to be a competitive candidate."
        )

    result = {
        "overall_score": overall_score,
        "semantic_score": round(semantic_score * 100, 1),
        "keyword_score": round(keyword_score * 100, 1),
        "classifier_score": round(confidence * 100, 1),
        "fit_label": fit_label,
        "confidence": round(confidence, 3),
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "experience_gap": experience_gap,
        "summary": summary,
        "resume_embedding": resume_embedding,
        "jd_embedding": jd_embedding,
    }

    try:
        r = aioredis.from_url(REDIS_URL)
        cacheable = {k: v for k, v in result.items() if k not in ("resume_embedding", "jd_embedding")}
        await r.setex(cache_key, CACHE_TTL, json.dumps(cacheable))
        await r.aclose()
    except Exception as e:
        logger.warning(f"Redis write error: {e}")

    return result
