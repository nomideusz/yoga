-- ============================================================
-- TURSO/LIBSQL SCHEMA — Yoga School Directory
-- ============================================================
-- Every text column has a `_n` normalized shadow for search.
-- FTS5 indexes only normalized columns.
-- Trigrams table enables fuzzy matching when FTS5 misses.

-- ── MAIN TABLE ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS schools (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  name_n        TEXT NOT NULL,           -- lowercase, no diacritics
  slug          TEXT NOT NULL UNIQUE,
  styles        TEXT NOT NULL DEFAULT '[]',  -- JSON array: ["hatha","vinyasa"]
  styles_n      TEXT NOT NULL DEFAULT '',    -- space-separated normalized
  street        TEXT,
  street_n      TEXT,
  district      TEXT,
  district_n    TEXT,
  city          TEXT NOT NULL,
  city_n        TEXT NOT NULL,
  city_slug     TEXT NOT NULL,           -- for city page scoping
  voivodeship   TEXT,
  voivodeship_n TEXT,
  postcode      TEXT,                    -- "00-001"
  lat           REAL,
  lng           REAL,
  phone         TEXT,
  email         TEXT,
  website       TEXT,
  description   TEXT,
  description_n TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_schools_geo ON schools(lat, lng);
CREATE INDEX IF NOT EXISTS idx_schools_city ON schools(city_slug);
CREATE INDEX IF NOT EXISTS idx_schools_city_n ON schools(city_n);
CREATE INDEX IF NOT EXISTS idx_schools_postcode ON schools(postcode);

-- ── CITIES TABLE ───────────────────────────────────────────
-- Pre-populated. Used for routing + "does this city exist?" checks.

CREATE TABLE IF NOT EXISTS cities (
  slug          TEXT PRIMARY KEY,        -- "krakow"
  name          TEXT NOT NULL,           -- "Kraków"
  name_n        TEXT NOT NULL,           -- "krakow"
  lat           REAL NOT NULL,           -- city center
  lng           REAL NOT NULL,
  school_count  INTEGER NOT NULL DEFAULT 0,
  districts     TEXT NOT NULL DEFAULT '[]'  -- JSON array of district names
);

CREATE INDEX IF NOT EXISTS idx_cities_name_n ON cities(name_n);

-- ── STYLES TABLE ───────────────────────────────────────────
-- Pre-populated. Used for routing + category pages.

CREATE TABLE IF NOT EXISTS styles (
  slug          TEXT PRIMARY KEY,        -- "hatha-yoga"
  name          TEXT NOT NULL,           -- "Hatha Yoga"
  name_n        TEXT NOT NULL,           -- "hatha yoga"
  aliases_n     TEXT NOT NULL DEFAULT '',-- "hatha hata hatha joga"
  description   TEXT,
  school_count  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_styles_name_n ON styles(name_n);

-- ── FTS5 VIRTUAL TABLE ─────────────────────────────────────

CREATE VIRTUAL TABLE IF NOT EXISTS schools_fts USING fts5(
  name_n,
  styles_n,
  city_n,
  district_n,
  street_n,
  postcode,
  voivodeship_n,
  description_n,
  content='schools',
  content_rowid='id',
  tokenize='unicode61 remove_diacritics 2'
);

-- Keep FTS in sync
CREATE TRIGGER IF NOT EXISTS schools_ai AFTER INSERT ON schools BEGIN
  INSERT INTO schools_fts(rowid, name_n, styles_n, city_n, district_n, street_n, postcode, voivodeship_n, description_n)
  VALUES (new.id, new.name_n, new.styles_n, new.city_n, new.district_n, new.street_n, new.postcode, new.voivodeship_n, new.description_n);
END;

CREATE TRIGGER IF NOT EXISTS schools_ad AFTER DELETE ON schools BEGIN
  INSERT INTO schools_fts(schools_fts, rowid, name_n, styles_n, city_n, district_n, street_n, postcode, voivodeship_n, description_n)
  VALUES ('delete', old.id, old.name_n, old.styles_n, old.city_n, old.district_n, old.street_n, old.postcode, old.voivodeship_n, old.description_n);
END;

CREATE TRIGGER IF NOT EXISTS schools_au AFTER UPDATE ON schools BEGIN
  INSERT INTO schools_fts(schools_fts, rowid, name_n, styles_n, city_n, district_n, street_n, postcode, voivodeship_n, description_n)
  VALUES ('delete', old.id, old.name_n, old.styles_n, old.city_n, old.district_n, old.street_n, old.postcode, old.voivodeship_n, old.description_n);
  INSERT INTO schools_fts(rowid, name_n, styles_n, city_n, district_n, street_n, postcode, voivodeship_n, description_n)
  VALUES (new.id, new.name_n, new.styles_n, new.city_n, new.district_n, new.street_n, new.postcode, new.voivodeship_n, new.description_n);
END;

-- ── TRIGRAMS TABLE ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS school_trigrams (
  trigram    TEXT    NOT NULL,
  school_id  INTEGER NOT NULL,
  field      TEXT    NOT NULL,  -- 'name','city','style','district'
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_trigrams_lookup ON school_trigrams(trigram, field);

-- ── SYNONYMS TABLE ─────────────────────────────────────────
-- Maps misspellings + alternate names → canonical terms.

CREATE TABLE IF NOT EXISTS search_synonyms (
  alias     TEXT NOT NULL,
  canonical TEXT NOT NULL,
  category  TEXT NOT NULL,  -- 'style', 'city', 'general'
  PRIMARY KEY (alias, canonical)
);

CREATE INDEX IF NOT EXISTS idx_synonyms_alias ON search_synonyms(alias);

-- Seed essential synonyms
INSERT OR IGNORE INTO search_synonyms (alias, canonical, category) VALUES
  -- Yoga ↔ Joga
  ('joga', 'yoga', 'style'), ('jodga', 'yoga', 'style'), ('jogga', 'yoga', 'style'),
  -- Vinyasa misspellings
  ('wiynasa', 'vinyasa', 'style'), ('winjasa', 'vinyasa', 'style'),
  ('vinjasa', 'vinyasa', 'style'), ('wynasa', 'vinyasa', 'style'),
  -- Other styles
  ('hata', 'hatha', 'style'), ('astanga', 'ashtanga', 'style'),
  ('asztanga', 'ashtanga', 'style'), ('jin', 'yin', 'style'),
  -- Polish compound style names
  ('hatha joga', 'hatha yoga', 'style'), ('ashtanga joga', 'ashtanga yoga', 'style'),
  ('iyengar joga', 'iyengar yoga', 'style'), ('kundalini joga', 'kundalini yoga', 'style'),
  ('jin joga', 'yin yoga', 'style'), ('bikram joga', 'bikram yoga', 'style'),
  ('power joga', 'power yoga', 'style'),
  -- City misspellings & English names
  ('warsawa', 'warszawa', 'city'), ('warsaw', 'warszawa', 'city'),
  ('warshawa', 'warszawa', 'city'), ('varsava', 'warszawa', 'city'),
  ('cracow', 'krakow', 'city'), ('lodz', 'lodz', 'city'),
  ('breslau', 'wroclaw', 'city'),
  -- General terms
  ('szkola', 'szkola', 'general'), ('centrum', 'centrum', 'general'),
  ('blisko', 'near', 'general'), ('niedaleko', 'near', 'general'),
  ('w poblizu', 'near', 'general');
