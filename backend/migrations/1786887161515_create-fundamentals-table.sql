-- Up Migration

CREATE TABLE fundamentals (
  symbol text PRIMARY KEY,
  sector text NOT NULL,
  debt_to_market_cap numeric,
  source text NOT NULL,
  last_updated timestamptz NOT NULL DEFAULT now()
);

-- Down Migration

DROP TABLE fundamentals;