-- Migration: 011_rate_limits.sql
-- Persistent rate limiting table to replace in-memory Maps that reset on cold starts.

CREATE TABLE IF NOT EXISTS rate_limits (
  key         TEXT        PRIMARY KEY,
  count       INTEGER     NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only the service role (and postgres) should read/write this table
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON rate_limits FROM anon;
REVOKE ALL ON rate_limits FROM authenticated;

-- Atomic rate-limit check function (SECURITY DEFINER runs as postgres)
CREATE OR REPLACE FUNCTION rate_limit_check(
  p_key      TEXT,
  p_limit    INTEGER,
  p_window_ms BIGINT
)
RETURNS BOOLEAN  -- returns TRUE if rate-limited (over limit)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count       INTEGER;
  v_window_start TIMESTAMPTZ;
  v_window_age_ms BIGINT;
BEGIN
  SELECT count, window_start
    INTO v_count, v_window_start
    FROM rate_limits
   WHERE key = p_key
   FOR UPDATE;           -- row-level lock prevents races

  IF NOT FOUND THEN
    -- First request from this key
    INSERT INTO rate_limits (key, count, window_start)
    VALUES (p_key, 1, NOW());
    RETURN FALSE;
  END IF;

  v_window_age_ms := EXTRACT(EPOCH FROM (NOW() - v_window_start)) * 1000;

  IF v_window_age_ms > p_window_ms THEN
    -- Window expired — reset
    UPDATE rate_limits
       SET count = 1, window_start = NOW()
     WHERE key = p_key;
    RETURN FALSE;
  END IF;

  IF v_count >= p_limit THEN
    -- Over limit within window
    RETURN TRUE;
  END IF;

  -- Increment and allow
  UPDATE rate_limits
     SET count = count + 1
   WHERE key = p_key;
  RETURN FALSE;
END;
$$;

-- Clean up old rate limit entries hourly (prevent table bloat)
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM rate_limits
   WHERE window_start < NOW() - INTERVAL '2 hours';
END;
$$;
