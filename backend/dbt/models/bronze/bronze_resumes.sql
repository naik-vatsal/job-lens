{{ config(materialized='view') }}

SELECT
    id,
    raw_text,
    parsed_skills,
    embedding,
    created_at
FROM resumes
