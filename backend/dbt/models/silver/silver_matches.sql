{{ config(materialized='view') }}

SELECT
    id,
    resume_id,
    job_id,
    overall_score,
    semantic_score,
    keyword_score,
    classifier_score,
    fit_label,
    confidence,
    matched_skills,
    missing_skills,
    experience_gap,
    summary,
    created_at
FROM {{ ref('bronze_matches') }}
WHERE overall_score IS NOT NULL
  AND overall_score BETWEEN 0 AND 100
