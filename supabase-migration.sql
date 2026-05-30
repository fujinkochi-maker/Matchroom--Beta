-- Run this in Supabase Studio SQL Editor to create all tables
-- Safe to re-run — uses IF NOT EXISTS

CREATE TABLE IF NOT EXISTS fighters (
  username TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  nickname TEXT NOT NULL,
  division TEXT NOT NULL CHECK (division IN (
    'Flyweight','Bantamweight','Featherweight','Lightweight',
    'Welterweight','Middleweight','Light Heavyweight','Cruiserweight','Heavyweight'
  )),
  rank INTEGER NOT NULL,
  wins INTEGER NOT NULL,
  losses INTEGER NOT NULL,
  draws INTEGER NOT NULL,
  kos INTEGER NOT NULL,
  stance TEXT NOT NULL,
  belts INTEGER NOT NULL,
  debut TEXT NOT NULL,
  streak TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  belts_held TEXT NOT NULL DEFAULT '',
  discord_id TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS fight_history (
  id SERIAL PRIMARY KEY,
  fighter_username TEXT NOT NULL REFERENCES fighters(username) ON DELETE CASCADE,
  opponent TEXT NOT NULL,
  result TEXT NOT NULL,
  method TEXT NOT NULL,
  date TEXT NOT NULL,
  event TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  arena TEXT NOT NULL,
  main_event_a TEXT NOT NULL REFERENCES fighters(username),
  main_event_b TEXT NOT NULL REFERENCES fighters(username),
  main_event_title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('upcoming', 'past')),
  tagline TEXT NOT NULL,
  image_url TEXT
);

CREATE TABLE IF NOT EXISTS event_cards (
  id SERIAL PRIMARY KEY,
  event_slug TEXT NOT NULL REFERENCES events(slug) ON DELETE CASCADE,
  fighter_a TEXT NOT NULL REFERENCES fighters(username),
  fighter_b TEXT NOT NULL REFERENCES fighters(username),
  weight TEXT NOT NULL CHECK (weight IN (
    'Flyweight','Bantamweight','Featherweight','Lightweight',
    'Welterweight','Middleweight','Light Heavyweight','Cruiserweight','Heavyweight'
  ))
);

CREATE TABLE IF NOT EXISTS articles (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL,
  author TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  featured BOOLEAN NOT NULL DEFAULT false,
  image_url TEXT
);

CREATE TABLE IF NOT EXISTS article_fighters (
  article_slug TEXT NOT NULL REFERENCES articles(slug) ON DELETE CASCADE,
  fighter_username TEXT NOT NULL REFERENCES fighters(username) ON DELETE CASCADE,
  PRIMARY KEY (article_slug, fighter_username)
);

CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  duration TEXT NOT NULL,
  views TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS video_fighters (
  video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  fighter_username TEXT NOT NULL REFERENCES fighters(username) ON DELETE CASCADE,
  PRIMARY KEY (video_id, fighter_username)
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price INTEGER NOT NULL,
  limited BOOLEAN NOT NULL DEFAULT false,
  stock INTEGER NOT NULL DEFAULT 50,
  image_url TEXT
);

-- Indexes (IF NOT EXISTS for indexes requires PG 9.5+)
CREATE INDEX IF NOT EXISTS idx_fighters_division ON fighters(division);
CREATE INDEX IF NOT EXISTS idx_fighters_rank ON fighters(rank);
CREATE INDEX IF NOT EXISTS idx_articles_featured ON articles(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
