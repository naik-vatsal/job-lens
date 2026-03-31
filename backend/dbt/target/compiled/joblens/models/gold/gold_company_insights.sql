

SELECT
    j.company,
    ROUND(AVG(m.overall_score)::numeric,  1) AS avg_score,
    ROUND(AVG(m.keyword_score)::numeric,  1) AS avg_skill_overlap,
    COUNT(*)                                  AS match_count
FROM "joblens"."public"."silver_matches" m
JOIN "joblens"."public"."silver_jobs" j ON m.job_id = j.id
GROUP BY j.company
ORDER BY avg_score DESC