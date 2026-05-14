-- Run this in your Supabase SQL Editor to create the auth_tokens table.
-- This table stores one-time tokens for password reset and email verification.

CREATE TABLE IF NOT EXISTS auth_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token       TEXT NOT NULL UNIQUE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('password_reset', 'email_verify')),
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_auth_tokens_token ON auth_tokens(token);
-- Index for cleanup queries by user
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id ON auth_tokens(user_id);

-- Add email_verified column to users table (defaults to false for existing users)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Optional: auto-cleanup expired tokens (run manually or schedule via pg_cron)
-- DELETE FROM auth_tokens WHERE expires_at < NOW() OR used = TRUE;
