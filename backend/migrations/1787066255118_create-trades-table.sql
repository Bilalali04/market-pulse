-- Up Migration

CREATE TABLE trades (
  id bigserial PRIMARY KEY,
  symbol text NOT NULL,
  price numeric NOT NULL,
  volume integer NOT NULL,
  condition_codes text[],
  traded_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX trades_symbol_traded_at_idx ON trades (symbol, traded_at);

-- Down Migration

DROP TABLE trades;