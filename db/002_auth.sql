-- db/002_auth.sql
-- Adds user accounts and scopes people/expenses per user.

-- ⚠️ This deletes existing people and expenses.
-- Fine for test data on a fresh deploy; do NOT run against anything you care about.
TRUNCATE TABLE expenses, people RESTART IDENTITY CASCADE;

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Every person now belongs to a user. Deleting the user cascades.
ALTER TABLE people
  ADD COLUMN user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX people_user_id_idx ON people (user_id);