
  create view "joblens"."public"."silver_jobs__dbt_tmp"
    
    
  as (
    

SELECT
    id,
    title,
    company,
    CASE
        WHEN location ILIKE '%remote%'                          THEN 'Remote'
        WHEN location ILIKE '%new york%' OR location ILIKE '%nyc%' THEN 'New York, NY'
        WHEN location ILIKE '%san francisco%' OR location ILIKE '% sf%' THEN 'San Francisco, CA'
        WHEN location ILIKE '%austin%'                         THEN 'Austin, TX'
        WHEN location ILIKE '%seattle%'                        THEN 'Seattle, WA'
        ELSE location
    END AS location,
    -- Normalize salary to a rough midpoint (numeric) for aggregations
    salary_range,
    job_description,
    required_skills,
    source,
    posted_at,
    created_at
FROM "joblens"."public"."bronze_jobs"
  );