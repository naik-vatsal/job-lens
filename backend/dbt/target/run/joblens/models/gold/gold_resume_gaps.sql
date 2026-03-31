
  create view "joblens"."public"."gold_resume_gaps__dbt_tmp"
    
    
  as (
    

SELECT
    resume_id,
    skill_name,
    COUNT(*) AS missing_count
FROM "joblens"."public"."silver_matches",
     jsonb_array_elements_text(missing_skills::jsonb) AS skill_name
GROUP BY resume_id, skill_name
  );