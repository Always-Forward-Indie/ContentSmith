-- ============================================================
-- Migration 07: Spawn Zones Refactor + NPC Placements
--
-- Сохраняет все данные из старой spawn_zones!
--
-- Старая структура (spawn_zones_v1 после rename):
--   id        bigint PK (generated always as identity)
--   zone_id   integer (generated always as identity) — группирует геометрию
--   zone_name varchar(50)
--   coords    numeric(11,2) x6
--   mob_id    FK → mob
--   spawn_count integer
--   respawn_time time
--   respawn_time_sec integer
--
-- Новая структура:
--   spawn_zones     — только геометрия зоны, zone_id serial PK
--   spawn_zone_mobs — N:N связь зон с мобами (spawn_count, respawn_time text)
--   npc_placements  — статичное размещение NPC в мире
-- ============================================================

-- ============================================================
-- 1. Сохраняем старую таблицу
-- ============================================================

ALTER TABLE spawn_zones RENAME TO spawn_zones_v1;

-- ============================================================
-- 2. Создаём новую spawn_zones
-- ============================================================

CREATE TABLE spawn_zones (
    zone_id      serial           PRIMARY KEY,
    zone_name    varchar(100)     NOT NULL,
    min_spawn_x  double precision NOT NULL DEFAULT 0,
    min_spawn_y  double precision NOT NULL DEFAULT 0,
    min_spawn_z  double precision NOT NULL DEFAULT 0,
    max_spawn_x  double precision NOT NULL DEFAULT 0,
    max_spawn_y  double precision NOT NULL DEFAULT 0,
    max_spawn_z  double precision NOT NULL DEFAULT 0,
    game_zone_id integer          REFERENCES zones(id) ON DELETE SET NULL
);

-- ============================================================
-- 3. Мигрируем геометрию зон
--    Каждый уникальный zone_id из старой таблицы = одна спавн-зона.
--    Если один zone_id встречался несколько раз (разные мобы) —
--    берём первую строку (координаты у них одинаковые).
-- ============================================================

INSERT INTO spawn_zones (zone_id, zone_name,
    min_spawn_x, min_spawn_y, min_spawn_z,
    max_spawn_x, max_spawn_y, max_spawn_z)
SELECT DISTINCT ON (zone_id)
    zone_id,
    zone_name,
    min_spawn_x::double precision,
    min_spawn_y::double precision,
    min_spawn_z::double precision,
    max_spawn_x::double precision,
    max_spawn_y::double precision,
    max_spawn_z::double precision
FROM spawn_zones_v1
ORDER BY zone_id;

-- Сдвигаем sequence чтобы следующий INSERT не конфликтовал с уже вставленными ID
SELECT setval('spawn_zones_zone_id_seq', (SELECT MAX(zone_id) FROM spawn_zones));

CREATE INDEX idx_spawn_zones_game_zone ON spawn_zones (game_zone_id);

COMMENT ON TABLE spawn_zones IS
    'Геометрия зоны спавна (прямоугольник координат). '
    'Принадлежит игровому региону (zones). '
    'Мобы настраиваются в spawn_zone_mobs.';

COMMENT ON COLUMN spawn_zones.game_zone_id IS
    'Игровой регион (zones), которому принадлежит точка спавна';

-- ============================================================
-- 4. Создаём spawn_zone_mobs и мигрируем данные мобов
-- ============================================================

CREATE TABLE spawn_zone_mobs (
    id            bigserial    PRIMARY KEY,
    spawn_zone_id integer      NOT NULL
                       REFERENCES spawn_zones(zone_id) ON DELETE CASCADE,
    mob_id        integer      NOT NULL
                       REFERENCES mob(id)              ON DELETE CASCADE,
    spawn_count   integer      NOT NULL DEFAULT 1
                       CHECK (spawn_count > 0),
    respawn_time  text         NOT NULL DEFAULT '00:05:00'
                       CHECK (respawn_time ~ '^\d{2}:\d{2}:\d{2}$'),

    UNIQUE (spawn_zone_id, mob_id)
);

-- Переносим mob_id / spawn_count / respawn_time из старой таблицы.
-- respawn_time (тип time) → text HH:MM:SS через TO_CHAR.
INSERT INTO spawn_zone_mobs (spawn_zone_id, mob_id, spawn_count, respawn_time)
SELECT
    zone_id,
    mob_id,
    spawn_count,
    TO_CHAR(respawn_time, 'HH24:MI:SS')
FROM spawn_zones_v1;

CREATE INDEX idx_spawn_zone_mobs_zone ON spawn_zone_mobs (spawn_zone_id);
CREATE INDEX idx_spawn_zone_mobs_mob  ON spawn_zone_mobs (mob_id);

COMMENT ON TABLE spawn_zone_mobs IS
    'Какие мобы спавнятся в зоне, в каком количестве и с каким интервалом. '
    'Одна зона может содержать несколько разных мобов.';

COMMENT ON COLUMN spawn_zone_mobs.respawn_time IS
    'Интервал до следующего спавна в формате HH:MM:SS';

-- ============================================================
-- 5. Удаляем старую таблицу (данные уже в новых)
-- ============================================================

DROP TABLE spawn_zones_v1;

-- ============================================================
-- 6. Создаём npc_placements
-- ============================================================

CREATE TABLE npc_placements (
    id      bigserial        PRIMARY KEY,
    npc_id  bigint           NOT NULL REFERENCES npc(id) ON DELETE CASCADE,
    zone_id integer          REFERENCES zones(id) ON DELETE SET NULL,
    x       double precision NOT NULL DEFAULT 0,
    y       double precision NOT NULL DEFAULT 0,
    z       double precision NOT NULL DEFAULT 0,
    rot_z   double precision NOT NULL DEFAULT 0
);

CREATE INDEX idx_npc_placements_npc  ON npc_placements (npc_id);
CREATE INDEX idx_npc_placements_zone ON npc_placements (zone_id);

COMMENT ON TABLE npc_placements IS
    'Статичное размещение NPC в игровом мире. '
    'Используется gameserver при инициализации локации.';
