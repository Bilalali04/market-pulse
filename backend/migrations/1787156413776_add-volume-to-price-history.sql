-- Up Migration

-- DEFAULT 0 then DROP DEFAULT: adding a NOT NULL column to a table that
-- already has rows requires a value for those existing rows. The default
-- is temporary scaffolding, not a real "no volume = 0" business rule -
-- every row that survives past this migration gets replaced by the new
-- sp500 import (see importSp500History.ts), which always supplies a real
-- volume. Dropping the default afterward means any future insert must
-- specify volume explicitly instead of silently defaulting to 0 forever.
ALTER TABLE price_history ADD COLUMN volume bigint NOT NULL DEFAULT 0;
ALTER TABLE price_history ALTER COLUMN volume DROP DEFAULT;

-- Down Migration

ALTER TABLE price_history DROP COLUMN volume;
