-- Agent API Keys table
-- Allows AI agents (Cursor, Replit Agent, etc.) to authenticate via API key

CREATE TABLE IF NOT EXISTS agent_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,   -- SHA-256 hash of the raw key
  key_prefix TEXT NOT NULL,        -- first 8 chars for display (e.g. "aqk_abc1")
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

ALTER TABLE agent_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own API keys"
  ON agent_api_keys
  FOR ALL
  USING (user_id = auth.uid());

-- Index for fast lookup by hash during auth
CREATE INDEX IF NOT EXISTS idx_agent_api_keys_hash ON agent_api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_agent_api_keys_user ON agent_api_keys(user_id);
