-- ============================================================
-- Migration 06: Architecture Refactor
-- 
-- Changes:
--   1. CREATE  class_stat_formula          — формула роста статов класса по уровням
--   2. DROP    class_base_stats            — дублирует base_value из class_stat_formula
--   3. RENAME  character_attributes
--          →   character_permanent_modifiers
--              + ADD source_type, source_id — откуда взялся бонус
--   4. SEED    class_stat_formula          — стартовые данные для Mage и Warrior
--   5. SEED    class_skill_tree            — какие скилы доступны каждому классу
-- ============================================================


-- ============================================================
-- 1. CREATE class_stat_formula
-- ============================================================
-- Формула: итоговый_стат = base_value + multiplier * level^exponent
-- Пример HP Warrior lvl30: 150 + 18.0 * 30^1.15 ≈ 895
--
-- exponent = 1.0  → линейный рост (одинаковый прирост каждый уровень)
-- exponent > 1.0  → ускоряющийся рост (на высоких уровнях растёт быстрее)
-- exponent < 1.0  → замедляющийся рост (диминишинг на высоких уровнях)

CREATE TABLE class_stat_formula (
    class_id     integer        NOT NULL
                     REFERENCES character_class(id) ON DELETE CASCADE,
    attribute_id integer        NOT NULL
                     REFERENCES entity_attributes(id) ON DELETE RESTRICT,

    -- Значение на 1-м уровне (старт)
    base_value   numeric(10,2)  NOT NULL DEFAULT 0,

    -- Коэффициент роста (умножается на level^exponent)
    multiplier   numeric(10,4)  NOT NULL DEFAULT 0,

    -- Степень кривой роста
    --   1.0000 = линейный
    --   1.1000..1.2000 = умеренное ускорение (типично для HP/MP)
    exponent     numeric(6,4)   NOT NULL DEFAULT 1.0000
                     CHECK (exponent > 0),

    PRIMARY KEY (class_id, attribute_id)
);

-- Индекс для быстрого получения всех формул класса (при логине игрока)
CREATE INDEX ix_class_stat_formula_class ON class_stat_formula (class_id);

COMMENT ON TABLE class_stat_formula IS
    'Формула роста базовых характеристик класса по уровням. '
    'Итоговый стат = base_value + multiplier * level^exponent. '
    'Заменяет class_base_stats. Используется game server при логине и левел-апе '
    'для пересчёта character_permanent_modifiers.';

COMMENT ON COLUMN class_stat_formula.class_id     IS 'Класс персонажа';
COMMENT ON COLUMN class_stat_formula.attribute_id IS 'Характеристика из entity_attributes';
COMMENT ON COLUMN class_stat_formula.base_value   IS 'Значение характеристики на 1 уровне';
COMMENT ON COLUMN class_stat_formula.multiplier   IS 'Множитель роста: ROUND(base_value + multiplier * level^exponent)';
COMMENT ON COLUMN class_stat_formula.exponent     IS 'Степень кривой: 1.0 = линейный, >1.0 = ускоряется, <1.0 = замедляется';


-- ============================================================
-- 2. DROP class_base_stats
--    base_value переехал в class_stat_formula.base_value
-- ============================================================

DROP TABLE class_base_stats;


-- ============================================================
-- 3. RENAME character_attributes → character_permanent_modifiers
--    + ADD source_type, source_id
-- ============================================================
-- Эта таблица хранит ТОЛЬКО постоянные бонусы к статам, полученные
-- из внешних источников (квест, GM, достижение).
-- НЕ хранит: базовые статы класса, бонусы шмота, временные баффы.
-- При пересчёте статов: final = formula(class,level) + Σequip + Σperma + Σbuffs(mem)

ALTER TABLE character_attributes
    RENAME TO character_permanent_modifiers;

-- Откуда пришёл бонус
ALTER TABLE character_permanent_modifiers
    ADD COLUMN source_type varchar(30) NOT NULL DEFAULT 'gm'
        CHECK (source_type IN ('gm', 'quest', 'achievement', 'event', 'admin')),
    ADD COLUMN source_id   integer     NULL;
        -- NULL = источник не привязан к конкретной записи (например ручная GM-правка)

COMMENT ON TABLE character_permanent_modifiers IS
    'Постоянные модификаторы характеристик персонажа из внешних источников. '
    'Источники: квест, достижение, GM-правка, событие. '
    'НЕ является кешем — это источник правды для перманентных бонусов. '
    'Базовые статы класса хранятся в class_stat_formula, бонусы шмота — в character_equipment.';

COMMENT ON COLUMN character_permanent_modifiers.attribute_id IS 'Характеристика из entity_attributes';
COMMENT ON COLUMN character_permanent_modifiers.value        IS 'Значение бонуса (может быть отрицательным для штрафов)';
COMMENT ON COLUMN character_permanent_modifiers.source_type  IS 'Источник: gm | quest | achievement | event | admin';
COMMENT ON COLUMN character_permanent_modifiers.source_id    IS 'ID источника (quest.id / achievement.id / NULL для GM)';

-- Индекс для быстрой выборки всех модификаторов персонажа
CREATE INDEX IF NOT EXISTS ix_char_perm_mod_character
    ON character_permanent_modifiers (character_id);

-- Индекс для поиска по источнику (например, откатить все бонусы от квеста N)
CREATE INDEX ix_char_perm_mod_source
    ON character_permanent_modifiers (source_type, source_id)
    WHERE source_id IS NOT NULL;


-- ============================================================
-- 4. SEED class_stat_formula
--    Mage (id=1): Intelligence/Magical — стекло-пушка
--    Warrior (id=2): Strength/Physical — живучий танк
-- ============================================================

-- Mage
INSERT INTO class_stat_formula
    (class_id, attribute_id, base_value, multiplier, exponent)
SELECT 1, ea.id, v.base, v.mult, v.exp
FROM (VALUES
    -- attr_slug           base    mult    exp     -- lvl10  lvl30  lvl60
    ('max_health',          80,    8.00,  1.10),   -- 166    462    1044
    ('max_mana',           200,   25.00,  1.12),   -- 519   1607    4248
    ('intelligence',        15,    2.50,  1.05),   --  40     97     204
    ('magical_attack',       5,    1.80,  1.08),   --  23     65     148
    ('magical_defense',      8,    2.00,  1.08),   --  28     77     174
    ('physical_attack',      2,    0.50,  1.00),   --   7     17      32
    ('physical_defense',     5,    1.20,  1.05),   --  17     42      89
    ('strength',             5,    0.80,  1.00),   --  13     29      53
    ('luck',                 3,    0.50,  1.00),   --   8     18      33
    ('crit_chance',         15,    0.80,  1.02),   --  23     38      63
    ('crit_multiplier',      2,    0.05,  1.00),   --   3      4       5
    ('hp_regen_per_s',       1,    0.30,  1.05),   --   4      9      17
    ('mp_regen_per_s',       1,    0.80,  1.08),   --   9     25      56
    ('accuracy',             5,    0.50,  1.00),   --  10     20      35
    ('evasion',              5,    0.50,  1.00),   --  10     20      35
    ('block_chance',         0,    0.00,  1.00),   --   0      0       0
    ('block_value',          0,    0.00,  1.00),   --   0      0       0
    ('move_speed',           5,    0.00,  1.00),   --   5      5       5
    ('attack_speed',         5,    0.20,  1.00),   --   7     11      17
    ('cast_speed',           7,    0.30,  1.00)    --  10     16      25
) AS v(attr_slug, base, mult, exp)
JOIN entity_attributes ea ON ea.slug = v.attr_slug;

-- Warrior
INSERT INTO class_stat_formula
    (class_id, attribute_id, base_value, multiplier, exponent)
SELECT 2, ea.id, v.base, v.mult, v.exp
FROM (VALUES
    -- attr_slug           base    mult    exp     -- lvl10  lvl30  lvl60
    ('max_health',         150,   18.00,  1.15),   -- 369   1041    2729
    ('max_mana',            50,    5.00,  1.05),   --  93    212     412
    ('intelligence',         5,    0.50,  1.00),   --  10     20      35
    ('magical_attack',       2,    0.50,  1.00),   --   7     17      32
    ('magical_defense',      5,    1.50,  1.05),   --  23     55     114
    ('physical_attack',     10,    3.50,  1.10),   --  44    125     285
    ('physical_defense',    15,    4.00,  1.12),   --  57    166     424
    ('strength',            12,    2.00,  1.08),   --  32     86     193
    ('luck',                 3,    0.30,  1.00),   --   6     12      21
    ('crit_chance',         15,    0.50,  1.00),   --  20     30      45
    ('crit_multiplier',      2,    0.05,  1.00),   --   3      4       5
    ('hp_regen_per_s',       1,    0.50,  1.08),   --   6     16      35
    ('mp_regen_per_s',       1,    0.20,  1.00),   --   3      7      13
    ('accuracy',             5,    0.50,  1.00),   --  10     20      35
    ('evasion',              3,    0.30,  1.00),   --   6     12      21
    ('block_chance',        15,    0.50,  1.00),   --  20     30      45
    ('block_value',          3,    1.00,  1.05),   --  13     33      66
    ('move_speed',           5,    0.00,  1.00),   --   5      5       5
    ('attack_speed',         5,    0.30,  1.00),   --   8     14      23
    ('cast_speed',           3,    0.10,  1.00)    --   4      6       9
) AS v(attr_slug, base, mult, exp)
JOIN entity_attributes ea ON ea.slug = v.attr_slug;


-- ============================================================
-- 5. SEED class_skill_tree
--    Определяет какие скилы доступны каждому классу и с какого уровня
-- ============================================================

INSERT INTO class_skill_tree (class_id, skill_id, required_level, is_default)
VALUES
    -- Mage: базовая атака с рождения, Fireball открывается на 5 уровне
    (1, 1, 1, true),   -- Basic Attack  — выдаётся автоматически при создании
    (1, 3, 5, false),  -- Fireball      — открывается на уровне 5

    -- Warrior: базовая атака с рождения, Power Slash открывается на 5 уровне
    (2, 1, 1, true),   -- Basic Attack  — выдаётся автоматически при создании
    (2, 2, 5, false);  -- Power Slash   — открывается на уровне 5

COMMENT ON TABLE class_skill_tree IS
    'Шаблон доступных скилов для класса. '
    'is_default=true — скил выдаётся автоматически при создании персонажа. '
    'required_level — минимальный уровень персонажа для изучения скила. '
    'Факт выученных скилов хранится в character_skills.';
