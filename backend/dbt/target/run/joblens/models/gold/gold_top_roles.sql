
  create view "joblens"."public"."gold_top_roles__dbt_tmp"
    
    
  as (
    

SELECT
    m.resume_id,
    TRIM(REGEXP_REPLACE(j.title, '\s*[–\-].*$', '')) AS role_type,
    ROUND(AVG(m.overall_score)::numeric, 1)           AS avg_score,
    COUNT(*)                                           AS job_count
FROM "joblens"."public"."silver_matches" m
JOIN "joblens"."public"."silver_jobs" j ON m.job_id = j.id
GROUP BY m.resume_id, role_type
  );