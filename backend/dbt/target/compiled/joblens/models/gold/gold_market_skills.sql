

SELECT
    skill_name,
    COUNT(*) AS demand_count
FROM "joblens"."public"."bronze_jobs",
     jsonb_array_elements_text(required_skills::jsonb) AS skill_name
GROUP BY skill_name
ORDER BY demand_count DESC