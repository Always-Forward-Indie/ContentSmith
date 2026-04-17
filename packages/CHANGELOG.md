# Packages — Changelog

## [Unreleased] — 2026-04-17

---

### `packages/database`

#### Новые таблицы

**Контент-данные:**
| Таблица | Описание |
|---|---|
| `zones` | Игровые зоны с уровнями, PvP/SafeZone флагами |
| `factions` | Фракции мира |
| `damage_elements` | Элементы урона (огонь, лёд, …) |
| `mastery_definitions` | Определения мастерства |
| `status_effects` | Статусные эффекты |
| `status_effect_modifiers` | Модификаторы эффектов |
| `passive_skill_modifiers` | Пассивные модификаторы скиллов |
| `item_sets` | Сеты предметов |
| `item_set_members` | Члены сетов |
| `item_set_bonuses` | Бонусы сетов |
| `item_class_restrictions` | Ограничения предметов по классу |
| `item_use_effects` | Эффекты использования предметов |
| `character_class` | Классы персонажей |
| `class_stat_formula` | Формулы статов по уровням классов |
| `class_skill_tree` | Дерево скиллов классов |
| `exp_for_level` | Таблица опыта для повышения уровня |
| `character_genders` | Половая принадлежность персонажей |
| `game_config` | Глобальные параметры игры (key-value) |
| `skill_damage_types` | Типы урона скиллов |
| `skill_damage_formulas` | Формулы урона скиллов |
| `mob_stat` | Статы мобов |
| `mob_resistances` | Сопротивления мобов |
| `mob_weaknesses` | Слабости мобов |
| `spawn_zone_mobs` | Привязка мобов к spawn-зонам |
| `npc_placements` | Позиции NPC на карте |
| `npc_trainer_class` | NPC-тренеры классов |
| `npc_ambient_speech_configs` | Конфиг фраз NPC |
| `npc_ambient_speech_lines` | Строки фраз NPC |
| `vendor_npc` | Вендор-NPC |
| `vendor_inventory` | Инвентарь вендора |

**Игровые данные персонажей:**
| Таблица | Описание |
|---|---|
| `characters` | Персонажи игроков |
| `character_position` | Позиция персонажа в мире |
| `character_current_state` | Текущее состояние (HP, MP, …) |
| `character_equipment` | Экипировка |
| `character_skills` | Изученные скиллы |
| `character_skill_bar` | Раскладка скиллов на панели |
| `character_skill_mastery` | Мастерство скиллов |
| `character_emotes` | Эмоуты персонажа |
| `character_titles` | Титулы персонажа |
| `character_reputation` | Репутация по фракциям |
| `character_permanent_modifiers` | Постоянные модификаторы |
| `character_pity` | Pity-счётчики |
| `character_bestiary` | Бестиарий (убитые мобы) |
| `player_inventory` | Инвентарь игрока |
| `player_active_effect` | Активные эффекты на игроке |
| `mob_active_effect` | Активные эффекты на мобах |
| `currency_transactions` | Транзакции валюты |
| `user_sessions` | Сессии пользователей |
| `user_bans` | Баны пользователей |
| `gm_action_log` | Журнал действий GM |

#### Новые enum'ы

- `quest_step_type`: `collect | kill | talk | reach | custom`
- `effect_modifier_type`: `flat | percent | percent_all`
- `status_effect_category`: `buff | debuff | dot | hot | cc`

#### Новые миграции

- `07-spawn-zones-refactor.sql` — рефакторинг таблиц spawn-зон
- `08-seed-zones.sql` — seed для зон

---

### `packages/validation`

#### Новые схемы

- `classes.ts` — валидация классов (create/update, stat formulas, skill tree)
- `exp-for-level.ts` — валидация записей таблицы опыта
- `vendors.ts` — валидация вендоров и позиций инвентаря
- `zones.ts` — валидация зон (create/update/delete, позиции сущностей)
- `damage-elements.ts` — валидация элементов урона
- `emote-definitions.ts` — валидация эмоутов
- `factions.ts` — валидация фракций
- `item-sets.ts` — валидация сетов предметов
- `mastery-definitions.ts` — валидация мастерства
- `respawn-zones.ts` — валидация точек рестарта
- `status-effects.ts` — валидация статус-эффектов
- `timed-champions.ts` — валидация временных чемпионов
- `title-definitions.ts` — валидация титулов
- `world-objects.ts` — валидация мировых объектов
- `zone-events.ts` — валидация событий зон

#### Обновлённые схемы

- `classes.ts` — добавлены поля stat formula, skill tree
- `items.ts` — добавлены поля class restrictions, use effects
- `mobs.ts` — добавлены поля stat, resistances, weaknesses; добавлен `deletePosition`
- `quest.ts` — добавлен `questStepType`, условия и награды
- `skills.ts` — добавлены damage formulas, passive modifiers
- `vendors.ts` — добавлен inventory management
- `zones.ts` — расширена схема с entity positions

---

### `packages/ui`

Без изменений.
