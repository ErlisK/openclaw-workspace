-- Migration 010: ScIDE metrics RPC — server-side user count queries
CREATE OR REPLACE FUNCTION scide_user_metrics()
RETURNS TABLE(
  total_users       BIGINT,
  new_signups_24h   BIGINT,
  churned_users_24h BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::BIGINT FROM profiles
     WHERE is_test_account IS NOT TRUE
       AND email NOT ILIKE 'test-%'
       AND email NOT ILIKE 'e2e-%'
       AND email NOT ILIKE 'playwright-%'
       AND email NOT ILIKE 'cypress-%'
       AND email NOT ILIKE 'bot-%'
       AND email NOT ILIKE 'qa-%'
       AND email NOT ILIKE '%+test@%'
       AND email NOT ILIKE '%+e2e@%'
       AND email NOT ILIKE '%+bot@%'
       AND email NOT ILIKE '%+qa@%'
       AND email NOT ILIKE '%@example.com'
       AND email NOT ILIKE '%@test.com'
       AND email NOT ILIKE '%@mailinator.com'
       AND email NOT ILIKE '%@guerrillamail.com'
       AND email NOT ILIKE '%@tempmail.com'
       AND email NOT ILIKE '%@agentmail.to'
    ) AS total_users,

    (SELECT COUNT(*)::BIGINT FROM profiles
     WHERE is_test_account IS NOT TRUE
       AND created_at > NOW() - INTERVAL '24 hours'
       AND email NOT ILIKE 'test-%'
       AND email NOT ILIKE 'e2e-%'
       AND email NOT ILIKE 'playwright-%'
       AND email NOT ILIKE 'cypress-%'
       AND email NOT ILIKE 'bot-%'
       AND email NOT ILIKE 'qa-%'
       AND email NOT ILIKE '%+test@%'
       AND email NOT ILIKE '%+e2e@%'
       AND email NOT ILIKE '%+bot@%'
       AND email NOT ILIKE '%+qa@%'
       AND email NOT ILIKE '%@example.com'
       AND email NOT ILIKE '%@test.com'
       AND email NOT ILIKE '%@mailinator.com'
       AND email NOT ILIKE '%@agentmail.to'
    ) AS new_signups_24h,

    (SELECT
      CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'last_login_at'
      )
      THEN (
        SELECT COUNT(*)::BIGINT FROM profiles
        WHERE is_test_account IS NOT TRUE
          AND last_login_at < NOW() - INTERVAL '30 days'
          AND created_at < NOW() - INTERVAL '30 days'
          AND last_login_at IS NOT NULL
          AND email NOT ILIKE 'test-%'
          AND email NOT ILIKE 'e2e-%'
          AND email NOT ILIKE 'playwright-%'
          AND email NOT ILIKE 'cypress-%'
          AND email NOT ILIKE 'bot-%'
          AND email NOT ILIKE 'qa-%'
          AND email NOT ILIKE '%@example.com'
          AND email NOT ILIKE '%@test.com'
          AND email NOT ILIKE '%@mailinator.com'
          AND email NOT ILIKE '%@agentmail.to'
      )
      ELSE NULL
      END
    ) AS churned_users_24h;
END;
$$;

REVOKE EXECUTE ON FUNCTION scide_user_metrics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION scide_user_metrics() TO service_role;
