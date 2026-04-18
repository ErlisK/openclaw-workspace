-- Migration 006: UTM attribution events table
-- Stores UTM attribution data for marketing analytics
-- No PII stored — just source, medium, campaign, content, term, and a session_id

CREATE TABLE IF NOT EXISTS utm_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  text NOT NULL,             -- anonymous session identifier
  user_id     uuid REFERENCES auth.users ON DELETE SET NULL,
  utm_source  text,
  utm_medium  text,
  utm_campaign text,
  utm_content text,
  utm_term    text,
  landing_path text,
  referrer    text,
  captured_at timestamptz NOT NULL DEFAULT now()
);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS utm_events_source_idx ON utm_events (utm_source, captured_at);
CREATE INDEX IF NOT EXISTS utm_events_campaign_idx ON utm_events (utm_campaign, captured_at);
CREATE INDEX IF NOT EXISTS utm_events_user_idx ON utm_events (user_id) WHERE user_id IS NOT NULL;

-- RLS
ALTER TABLE utm_events ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public landing pages)
CREATE POLICY "public_insert_utm" ON utm_events
  FOR INSERT WITH CHECK (true);

-- Only service role can read (admin analytics)
CREATE POLICY "service_read_utm" ON utm_events
  FOR SELECT USING (auth.role() = 'service_role');
