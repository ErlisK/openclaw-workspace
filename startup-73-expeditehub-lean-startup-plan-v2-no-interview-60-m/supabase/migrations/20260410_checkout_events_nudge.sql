-- Migration: checkout_events and nudge_log tables for abandoned checkout nudging

CREATE TABLE IF NOT EXISTS checkout_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  email text,
  event_type text NOT NULL CHECK (event_type IN ('checkout_view','checkout_success','checkout_abandon')),
  stripe_session_id text,
  price_id text,
  amount_cents integer,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS checkout_events_session ON checkout_events(session_id);
CREATE INDEX IF NOT EXISTS checkout_events_email ON checkout_events(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS checkout_events_type_time ON checkout_events(event_type, created_at);

CREATE TABLE IF NOT EXISTS nudge_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  email text NOT NULL,
  nudge_type text NOT NULL DEFAULT 'checkout_abandon_30m',
  sent_at timestamptz DEFAULT now(),
  agentmail_msg_id text,
  UNIQUE(session_id, nudge_type)
);

ALTER TABLE checkout_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE nudge_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "anon_insert_checkout_events" ON checkout_events
  FOR INSERT WITH CHECK (true);
