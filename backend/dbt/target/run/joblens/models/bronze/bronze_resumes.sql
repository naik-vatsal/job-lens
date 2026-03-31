
  create view "joblens"."public"."bronze_resumes__dbt_tmp"
    
    
  as (
    

SELECT
    id,
    raw_text,
    parsed_skills,
    embedding,
    created_at
FROM resumes
  );