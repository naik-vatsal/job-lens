
  create view "joblens"."public"."gold_score_distribution__dbt_tmp"
    
    
  as (
    

SELECT
    CASE
        WHEN overall_score <= 30 THEN '0-30'
        WHEN overall_score <= 50 THEN '31-50'
        WHEN overall_score <= 70 THEN '51-70'
        WHEN overall_score <= 85 THEN '71-85'
        ELSE '86-100'
    END AS score_bucket,
    COUNT(*) AS job_count
FROM "joblens"."public"."silver_matches"
GROUP BY score_bucket
  );