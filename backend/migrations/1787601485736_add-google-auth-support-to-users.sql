-- Up Migration

-- Google-authenticated users won't have a local password.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- DEFAULT 'local' is permanent, not scaffolding to be dropped later
-- (contrast with price_history.volume's temporary DEFAULT 0 in an
-- earlier migration): register.ts's existing INSERT deliberately isn't
-- being touched by this migration and doesn't specify auth_provider, so
-- it needs this default to keep working unchanged.
ALTER TABLE users ADD COLUMN auth_provider text NOT NULL DEFAULT 'local';

ALTER TABLE users ADD COLUMN google_id text;

-- A plain UNIQUE constraint would already behave correctly here -
-- Postgres treats NULLs as distinct from each other for uniqueness
-- purposes, so multiple NULL google_id rows wouldn't violate it - but a
-- partial index makes the "unique only when present" intent explicit
-- and self-documenting rather than relying on the reader already
-- knowing that NULL-handling detail.
CREATE UNIQUE INDEX users_google_id_unique_idx ON users (google_id) WHERE google_id IS NOT NULL;

-- Restricts auth_provider to known values - the same defensive pattern
-- already used for `role` on this table. Without this, the cross-column
-- check below would silently accept any unrecognized auth_provider
-- value: both of its OR-implication clauses become vacuously true
-- whenever auth_provider isn't literally 'local' or 'google', so a
-- garbage value with null password_hash AND null google_id would
-- otherwise pass.
ALTER TABLE users ADD CONSTRAINT users_auth_provider_valid
  CHECK (auth_provider IN ('local', 'google'));

-- Cross-column integrity: a 'local' row must have a password, a
-- 'google' row must have a google_id. Written as implications
-- (NOT condition OR requirement), not "(local AND password) OR (google
-- AND google_id)" - the OR-of-ANDs form would incorrectly reject a
-- 'local' row that also happens to have a google_id set (e.g. a future
-- linked-account case), since it demands BOTH conditions of one branch
-- hold rather than just the one relevant to that row's own provider.
ALTER TABLE users ADD CONSTRAINT users_auth_provider_credentials_check
  CHECK (
    (auth_provider <> 'local' OR password_hash IS NOT NULL) AND
    (auth_provider <> 'google' OR google_id IS NOT NULL)
  );

-- Down Migration

ALTER TABLE users DROP CONSTRAINT users_auth_provider_credentials_check;
ALTER TABLE users DROP CONSTRAINT users_auth_provider_valid;
DROP INDEX users_google_id_unique_idx;
ALTER TABLE users DROP COLUMN google_id;
ALTER TABLE users DROP COLUMN auth_provider;
ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
