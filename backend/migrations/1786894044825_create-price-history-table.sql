-- Up Migration

CREATE TABLE price_history (
  symbol text NOT NULL,
  date date NOT NULL,
  close_price numeric NOT NULL,
  source text NOT NULL,
  UNIQUE (symbol, date)
);

-- Down Migration

DROP TABLE price_history;