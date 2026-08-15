-- Up Migration

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'free' CHECK (role IN ('free', 'paid', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Down Migration

DROP TABLE users;