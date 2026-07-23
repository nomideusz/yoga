-- Applied to prod manually 2026-07-23 (surgical ALTER — do NOT db:push, it drops FTS5 tables)
ALTER TABLE school_translations ADD COLUMN pricing_json TEXT DEFAULT '';
ALTER TABLE school_translations ADD COLUMN source_hash TEXT DEFAULT '';
