{{ config(materialized='view') }}

SELECT
    id,
    title,
    company,
    location,
    salary_range,
    job_description,
    required_skills,
    embedding,
    source,
    posted_at,
    created_at
FROM jobs
