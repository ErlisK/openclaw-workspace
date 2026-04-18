-- Migration 002: Benchmark layer — schema additions, aggregation function, synthetic seed
-- Adapts to the existing benchmark_snapshots schema from migration 001

-- ─── Schema additions ─────────────────────────────────────────────────────────
-- benchmark_snapshots originally has per-user rows; we add aggregate columns

ALTER TABLE benchmark_snapshots
  ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS p25_hourly_rate NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS p50_hourly_rate NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS p75_hourly_rate NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS p90_hourly_rate NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS is_synthetic BOOLEAN DEFAULT false NOT NULL;

-- Make user_id nullable for aggregate/synthetic rows (no PII in aggregate)
ALTER TABLE benchmark_snapshots ALTER COLUMN user_id DROP NOT NULL;

-- ─── Aggregation function ─────────────────────────────────────────────────────
-- k-anonymity: only publish buckets with >= 10 distinct opted-in users.
-- Called via POST /api/benchmark/aggregate (or scheduled cron).

CREATE OR REPLACE FUNCTION aggregate_benchmark_snapshots(p_month TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  k_threshold INT := 10;
  v_month_start DATE := (p_month || '-01')::DATE;
  v_month_end DATE := (v_month_start + INTERVAL '1 month')::DATE;
BEGIN
  DELETE FROM benchmark_snapshots WHERE snapshot_month=v_month_start AND is_synthetic=false AND user_id IS NULL;
  INSERT INTO benchmark_snapshots(snapshot_month,service_category,platform,
    p25_hourly_rate,p50_hourly_rate,p75_hourly_rate,p90_hourly_rate,sample_size,is_synthetic)
  WITH oi AS (SELECT DISTINCT user_id FROM benchmark_opt_ins WHERE opted_in=true),
  rates AS (
    SELECT t.user_id,COALESCE(s.platform,'other') AS platform,
      COALESCE(bo.service_category,'general') AS service_category,
      SUM(t.net_amount) AS total_net,
      COALESCE(NULLIF(SUM(CASE WHEN te.entry_type='billable' THEN te.duration_minutes ELSE 0 END),0),1) AS bill_min
    FROM transactions t JOIN oi ON oi.user_id=t.user_id
    LEFT JOIN streams s ON s.id=t.stream_id AND s.user_id=t.user_id
    LEFT JOIN benchmark_opt_ins bo ON bo.user_id=t.user_id
    LEFT JOIN time_entries te ON te.user_id=t.user_id AND te.stream_id=t.stream_id
      AND te.started_at>=v_month_start AND te.started_at<v_month_end
    WHERE t.transaction_date>=v_month_start::TEXT AND t.transaction_date<v_month_end::TEXT
    GROUP BY t.user_id,s.platform,bo.service_category
  ),
  eff AS (SELECT user_id,platform,service_category,
    ROUND(((total_net/bill_min)*60)::NUMERIC,2) AS ehr FROM rates WHERE total_net>0),
  buckets AS (
    SELECT service_category,platform,COUNT(DISTINCT user_id) AS n,
      PERCENTILE_CONT(0.25) WITHIN GROUP(ORDER BY ehr) AS p25,
      PERCENTILE_CONT(0.50) WITHIN GROUP(ORDER BY ehr) AS p50,
      PERCENTILE_CONT(0.75) WITHIN GROUP(ORDER BY ehr) AS p75,
      PERCENTILE_CONT(0.90) WITHIN GROUP(ORDER BY ehr) AS p90
    FROM eff GROUP BY service_category,platform HAVING COUNT(DISTINCT user_id)>=k_threshold
  )
  SELECT v_month_start,service_category,platform,ROUND(p25::NUMERIC,2),ROUND(p50::NUMERIC,2),
    ROUND(p75::NUMERIC,2),ROUND(p90::NUMERIC,2),n::INT,false FROM buckets;
  RAISE NOTICE 'benchmark_snapshots aggregated for: %', p_month;
END; $$;

-- ─── Public view (no PII) ─────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public_benchmark_snapshots AS
SELECT snapshot_month,service_category,platform,
  p25_hourly_rate,p50_hourly_rate,p75_hourly_rate,p90_hourly_rate,
  sample_size,is_synthetic
FROM benchmark_snapshots
WHERE user_id IS NULL
ORDER BY snapshot_month DESC,service_category,platform;

GRANT SELECT ON public_benchmark_snapshots TO anon,authenticated;

-- ─── Synthetic seed data ─────────────────────────────────────────────────────
-- 12 months × 6 category/platform combos = 72 rows
-- is_synthetic=true, sample_size=0, user_id=NULL — transparent demo data

INSERT INTO benchmark_snapshots(snapshot_month,service_category,platform,
  p25_hourly_rate,p50_hourly_rate,p75_hourly_rate,p90_hourly_rate,sample_size,is_synthetic)
SELECT m::date,sc,pl,
  ROUND((p25 + (random()*10-5))::NUMERIC,2),
  ROUND((p50 + (random()*10-5))::NUMERIC,2),
  ROUND((p75 + (random()*10-5))::NUMERIC,2),
  ROUND((p90 + (random()*10-5))::NUMERIC,2),
  0, true
FROM
  (VALUES ('2024-01-01'),('2024-02-01'),('2024-03-01'),('2024-04-01'),
          ('2024-05-01'),('2024-06-01'),('2024-07-01'),('2024-08-01'),
          ('2024-09-01'),('2024-10-01'),('2024-11-01'),('2024-12-01')) AS months(m),
  (VALUES
    ('design','upwork',35,55,85,120),
    ('design','fiverr',20,40,65,90),
    ('development','upwork',45,70,110,150),
    ('development','toptal',80,110,150,200),
    ('coaching','other',50,80,120,175),
    ('writing','upwork',25,40,60,85)
  ) AS cats(sc,pl,p25,p50,p75,p90)
ON CONFLICT DO NOTHING;
