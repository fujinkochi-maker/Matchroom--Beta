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

-- Social Feed: posts
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  author_type TEXT NOT NULL DEFAULT 'admin' CHECK (author_type IN ('admin', 'fighter')),
  author_username TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS post_tags (
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  fighter_username TEXT NOT NULL REFERENCES fighters(username) ON DELETE CASCADE,
  PRIMARY KEY (post_id, fighter_username)
);

CREATE TABLE IF NOT EXISTS post_likes (
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_discord_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_discord_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fighter_username TEXT NOT NULL REFERENCES fighters(username) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('tag', 'like')),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  actor_discord_id TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes (IF NOT EXISTS for indexes requires PG 9.5+)
CREATE INDEX IF NOT EXISTS idx_fighters_division ON fighters(division);
CREATE INDEX IF NOT EXISTS idx_fighters_rank ON fighters(rank);
CREATE INDEX IF NOT EXISTS idx_articles_featured ON articles(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

-- Storage buckets (create if not exist)
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('fighter-images', 'fighter-images', true),
  ('event-images', 'event-images', true),
  ('article-images', 'article-images', true),
  ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: allow anon uploads
DROP POLICY IF EXISTS "anon insert fighter-images" ON storage.objects;
CREATE POLICY "anon insert fighter-images" ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'fighter-images');

DROP POLICY IF EXISTS "anon insert event-images" ON storage.objects;
CREATE POLICY "anon insert event-images" ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'event-images');

DROP POLICY IF EXISTS "anon insert article-images" ON storage.objects;
CREATE POLICY "anon insert article-images" ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'article-images');

DROP POLICY IF EXISTS "anon insert product-images" ON storage.objects;
CREATE POLICY "anon insert product-images" ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'product-images');

-- Storage RLS: allow anon reads (required to serve images)
DROP POLICY IF EXISTS "anon select fighter-images" ON storage.objects;
CREATE POLICY "anon select fighter-images" ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'fighter-images');

DROP POLICY IF EXISTS "anon select event-images" ON storage.objects;
CREATE POLICY "anon select event-images" ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'event-images');

DROP POLICY IF EXISTS "anon select article-images" ON storage.objects;
CREATE POLICY "anon select article-images" ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'article-images');

DROP POLICY IF EXISTS "anon select product-images" ON storage.objects;
CREATE POLICY "anon select product-images" ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'product-images');

-- Indexes for posts
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_tags_fighter ON post_tags(fighter_username);
CREATE INDEX IF NOT EXISTS idx_notifications_fighter ON notifications(fighter_username, read);
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);

-- Allow anon reads on social feed tables
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon select posts" ON posts;
CREATE POLICY "anon select posts" ON posts FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon select post_tags" ON post_tags;
CREATE POLICY "anon select post_tags" ON post_tags FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon select post_likes" ON post_likes;
CREATE POLICY "anon select post_likes" ON post_likes FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon select notifications" ON notifications;
CREATE POLICY "anon select notifications" ON notifications FOR SELECT TO anon USING (true);

-- Storage bucket for post images
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "anon insert post-images" ON storage.objects;
CREATE POLICY "anon insert post-images" ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'post-images');

DROP POLICY IF EXISTS "anon select post-images" ON storage.objects;
CREATE POLICY "anon select post-images" ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'post-images');

-- Migrate existing tables: add columns that may be missing from older schema
ALTER TABLE fighters ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE fighters ADD COLUMN IF NOT EXISTS belts_held TEXT NOT NULL DEFAULT '';
ALTER TABLE fighters ADD COLUMN IF NOT EXISTS discord_id TEXT UNIQUE;
ALTER TABLE fighters DROP COLUMN IF EXISTS hue;

ALTER TABLE events ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE events DROP COLUMN IF EXISTS hue;

ALTER TABLE articles ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE articles DROP COLUMN IF EXISTS hue;

ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE products DROP COLUMN IF EXISTS hue;

ALTER TABLE fighters ADD COLUMN IF NOT EXISTS guild_id TEXT NOT NULL DEFAULT '';
ALTER TABLE fighters ADD COLUMN IF NOT EXISTS region TEXT NOT NULL DEFAULT '';
ALTER TABLE rankings ADD COLUMN IF NOT EXISTS region TEXT NOT NULL DEFAULT '';
