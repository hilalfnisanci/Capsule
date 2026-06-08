CREATE TABLE capsules (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 120),
  body TEXT NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 10000),
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
  open_at TIMESTAMPTZ NOT NULL,
  opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  media_count INTEGER NOT NULL DEFAULT 0 CHECK (media_count BETWEEN 0 AND 12),
  media_total_bytes INTEGER NOT NULL DEFAULT 0 CHECK (media_total_bytes BETWEEN 0 AND 104857600),
  CONSTRAINT capsules_opened_after_open_at CHECK (opened_at IS NULL OR opened_at >= open_at),
  CONSTRAINT capsules_open_at_after_created_at CHECK (open_at > created_at)
);

CREATE INDEX capsules_owner_id_created_at_idx ON capsules (owner_id, created_at DESC);
CREATE INDEX capsules_public_opened_idx ON capsules (visibility, opened_at)
  WHERE visibility = 'public' AND opened_at IS NOT NULL;
CREATE INDEX capsules_open_at_locked_idx ON capsules (open_at)
  WHERE opened_at IS NULL;

CREATE TABLE capsule_media (
  id TEXT PRIMARY KEY,
  capsule_id TEXT NOT NULL REFERENCES capsules (id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'audio')),
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL CHECK (byte_size > 0 AND byte_size <= 104857600),
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX capsule_media_capsule_id_position_idx ON capsule_media (capsule_id, position);
