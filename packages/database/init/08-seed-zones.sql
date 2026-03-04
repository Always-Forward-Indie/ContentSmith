-- ============================================================
-- Migration 08: Seed initial game zones + link NPC/mob data
--
-- 1. Village zone  — safe zone вокруг позиций всех NPC
-- 2. Wilderness zone — зона для спавн-зон мобов
-- 3. npc_placements — переносим данные из npc_position
-- 4. spawn_zones.game_zone_id — привязываем к зоне мобов
-- ============================================================

-- ============================================================
-- 1. Создаём игровые зоны
-- ============================================================

-- Village: охватывает всех NPC с запасом 500 едениц
--   NPC X range: -720 .. 2200  → zone X: -1250 .. 2750
--   NPC Y range: -3300 .. 2250 → zone Y: -3800 .. 2750
INSERT INTO zones (slug, name, min_level, max_level, is_pvp, is_safe_zone)
VALUES ('village', 'Village', 1, 10, false, true);

-- Wilderness: охватывает обе спавн-зоны мобов с запасом 500 единиц
--   Spawn X range: -5900 .. 1000  → zone X: -6400 .. 1500
--   Spawn Y range:  1000 .. 5000  → zone Y:   500 .. 5500
INSERT INTO zones (slug, name, min_level, max_level, is_pvp, is_safe_zone)
VALUES ('wilderness', 'Wilderness', 1, 20, false, false);

-- ============================================================
-- 2. NPC Placements — берём координаты из npc_position
-- ============================================================

INSERT INTO npc_placements (npc_id, zone_id, x, y, z, rot_z)
SELECT
    np.npc_id,
    (SELECT id FROM zones WHERE slug = 'village'),
    np.x,
    np.y,
    np.z,
    np.rot_z
FROM npc_position np;

-- ============================================================
-- 3. Привязываем спавн-зоны мобов к Wilderness
-- ============================================================

UPDATE spawn_zones
SET game_zone_id = (SELECT id FROM zones WHERE slug = 'wilderness')
WHERE game_zone_id IS NULL;

-- ============================================================
-- Verify
-- ============================================================

SELECT 'zones' AS tbl, id, slug, name, is_safe_zone FROM zones;
SELECT 'npc_placements' AS tbl, np.id, n.name AS npc_name, z.name AS zone_name, np.x, np.y, np.z, np.rot_z
FROM npc_placements np
JOIN npc n ON n.id = np.npc_id
JOIN zones z ON z.id = np.zone_id;
SELECT 'spawn_zones' AS tbl, sz.zone_id, sz.zone_name, z.name AS game_zone
FROM spawn_zones sz
LEFT JOIN zones z ON z.id = sz.game_zone_id;
