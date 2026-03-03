-- Migration: Add Mobs module tables
-- Date: 2026-03-03

-- Mob type reference table (normal, elite, boss, rare, ...)
CREATE TABLE IF NOT EXISTS mob_type (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  CONSTRAINT uq_mob_type_slug UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS ix_mob_type_slug ON mob_type (slug);

-- Seed default mob types
INSERT INTO mob_type (name, slug) VALUES
  ('Normal', 'normal'),
  ('Elite', 'elite'),
  ('Boss', 'boss'),
  ('Rare', 'rare'),
  ('Champion', 'champion')
ON CONFLICT DO NOTHING;

-- Main mob table
CREATE TABLE IF NOT EXISTS mob (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  slug VARCHAR(50),
  level INTEGER NOT NULL DEFAULT 1,
  race_id INTEGER NOT NULL DEFAULT 1 REFERENCES race(id),
  mob_type_id INTEGER NOT NULL DEFAULT 1 REFERENCES mob_type(id),
  max_health INTEGER NOT NULL DEFAULT 100,
  max_mana INTEGER NOT NULL DEFAULT 0,
  exp_reward INTEGER NOT NULL DEFAULT 0,
  is_aggressive BOOLEAN NOT NULL DEFAULT TRUE,
  aggro_range INTEGER NOT NULL DEFAULT 500,
  leash_range INTEGER NOT NULL DEFAULT 2000,
  respawn_time_sec INTEGER NOT NULL DEFAULT 60,
  is_boss BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT uq_mob_slug UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS ix_mob_name  ON mob (name);
CREATE INDEX IF NOT EXISTS ix_mob_slug  ON mob (slug);
CREATE INDEX IF NOT EXISTS ix_mob_level ON mob (level);

COMMENT ON TABLE mob IS 'Боевые существа (мобы) — враждебные сущности с возможностью атаки, дропом лута и настройками спавна';
COMMENT ON COLUMN mob.aggro_range      IS 'Расстояние (uu), на котором моб агрируется на игрока';
COMMENT ON COLUMN mob.leash_range      IS 'Максимальное расстояние от точки спавна, после которого моб возвращается';
COMMENT ON COLUMN mob.respawn_time_sec IS 'Время респауна в секундах';
COMMENT ON COLUMN mob.exp_reward       IS 'Количество опыта, получаемого игроком при убийстве';

-- Spawn position for mob
CREATE TABLE IF NOT EXISTS mob_position (
  id BIGSERIAL PRIMARY KEY,
  mob_id INTEGER NOT NULL REFERENCES mob(id) ON DELETE CASCADE,
  x DOUBLE PRECISION NOT NULL DEFAULT 0,
  y DOUBLE PRECISION NOT NULL DEFAULT 0,
  z DOUBLE PRECISION NOT NULL DEFAULT 0,
  rot_z DOUBLE PRECISION NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS ix_mob_position_mob ON mob_position (mob_id);

-- Mob entity attributes (reuses entity_attributes reference table)
CREATE TABLE IF NOT EXISTS mob_attributes (
  id BIGSERIAL PRIMARY KEY,
  mob_id INTEGER NOT NULL REFERENCES mob(id) ON DELETE CASCADE,
  attribute_id INTEGER NOT NULL REFERENCES entity_attributes(id),
  value INTEGER NOT NULL,
  CONSTRAINT uq_mob_attribute UNIQUE (mob_id, attribute_id)
);

CREATE INDEX IF NOT EXISTS ix_mob_attributes_mob ON mob_attributes (mob_id);

-- Mob skills (reuses skills reference table)
CREATE TABLE IF NOT EXISTS mob_skills (
  id SERIAL PRIMARY KEY,
  mob_id INTEGER NOT NULL REFERENCES mob(id) ON DELETE CASCADE,
  skill_id INTEGER NOT NULL REFERENCES skills(id),
  current_level INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT uq_mob_skill UNIQUE (mob_id, skill_id)
);

CREATE INDEX IF NOT EXISTS ix_mob_skills_mob ON mob_skills (mob_id);

-- Mob loot table — defines what items can drop and with what probability
CREATE TABLE IF NOT EXISTS mob_loot (
  id BIGSERIAL PRIMARY KEY,
  mob_id INTEGER NOT NULL REFERENCES mob(id) ON DELETE CASCADE,
  item_id BIGINT NOT NULL REFERENCES items(id),
  drop_chance_pct DOUBLE PRECISION NOT NULL DEFAULT 10 CHECK (drop_chance_pct >= 0 AND drop_chance_pct <= 100),
  min_quantity INTEGER NOT NULL DEFAULT 1,
  max_quantity INTEGER NOT NULL DEFAULT 1,
  is_guaranteed BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT uq_mob_loot UNIQUE (mob_id, item_id)
);

CREATE INDEX IF NOT EXISTS ix_mob_loot_mob ON mob_loot (mob_id);

COMMENT ON TABLE mob_loot IS 'Таблица лута мобов — предметы, вероятность выпадения и количество';
COMMENT ON COLUMN mob_loot.drop_chance_pct IS 'Шанс выпадения в процентах (0-100). Игнорируется если is_guaranteed = TRUE';
