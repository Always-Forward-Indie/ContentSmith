# Studio — Changelog

## [Unreleased] — 2026-04-17

### Новые разделы (CRUD)

- **Карты** — полноэкранный редактор карт мира (`/maps/[mapId]`):
  - SVG-канвас с панорамированием и зумом (колесо мыши)
  - Слои: зоны, spawn-зоны, NPC, мировые объекты, точки рестарта, мобы
  - Инструменты: выбор, добавление NPC / WorldObject / Respawn / Mob / Zone / SpawnZone
  - Создание зон и spawn-зон рисованием прямоугольника
  - Перетаскивание и ресайз зон / spawn-зон за ручки (8 направлений)
  - Перетаскивание точечных сущностей (NPC, WorldObject, Respawn, Mob)
  - Панель деталей выбранной сущности с редактированием позиции и двухшаговым удалением
  - Zoom-to-fit при загрузке и по кнопке в тулбаре
  - Загрузка фонового изображения карты (API `/api/upload`)
  - Конфиг карты через API `/api/map-config`
- **Damage Elements** — элементы урона (огонь, лёд и т.д.)
- **Emote Definitions** — определения анимаций эмоций персонажей
- **Factions** — фракции мира
- **Item Sets** — сеты предметов с бонусами
- **Mastery Definitions** — определения мастерства
- **Respawn Zones** — зоны возрождения (CRUD + позиция на карте)
- **Status Effects** — статусные эффекты (баффы, дебаффы, DoT, HoT, CC) с модификаторами
- **Timed Champions** — временные чемпионы
- **Title Definitions** — определения титулов персонажей
- **World Objects** — мировые объекты (CRUD + позиция на карте)
- **Zone Events** — события зон

### Улучшения существующих разделов

- **Классы** — добавлены формулы статов (`classStatFormula`), дерево скиллов (`classSkillTree`)
- **Мобы** — добавлены статы моба (`mobStat`), сопротивления (`mobResistances`) и слабости (`mobWeaknesses`); улучшена страница моба
- **NPC** — добавлены: NPC-тренер классов (`npcTrainerClass`), ambient speech (phrases NPC), редактор диалогов; улучшена страница NPC
- **Квесты** — редактор шагов квеста (`QuestStepEditor`) с поддержкой типов `collect / kill / talk / reach / custom`; редактор условий и наград
- **Скиллы** — добавлены формулы урона (`skillDamageFormulas`) и типы урона (`skillDamageTypes`); пассивные модификаторы (`passiveSkillModifiers`)
- **Вендоры** — добавлен список инвентаря вендора (`vendorInventory`) с управлением позициями
- **Зоны** — улучшена страница зоны, добавлена интеграция с редактором карт
- **Предметы** — добавлены: ограничения по классу (`itemClassRestrictions`), эффекты использования (`itemUseEffects`); улучшена форма предмета

### Навигация

- Новые дропдауны в шапке: **Игровая механика** (статус-эффекты, элементы урона, мастерство, фракции, эмоты) и **Мир** (карты, зоны, события зон, мировые объекты, спавн-зоны, точки рестарта)
- Обновлён дропдаун предметов

### Новые компоненты

- `WorldMapEditor` — главный SVG-редактор карты
- `MapToolbar` — тулбар редактора (инструменты, слои, зум, загрузка)
- `AddEntityDialog` — диалог добавления сущности на карту
- `EntityDetailPanel` — боковая панель деталей выбранной сущности
- `ActionListEditor` — редактор списка действий (квесты, диалоги)
- `ConditionGroupEditor` — редактор групп условий
- `EntityCombobox` — универсальный combobox выбора сущности

### Исправления

- Тосты (Toaster) перемещены в нижний левый угол, чтобы не перекрывать правую панель редактора карт
- Кнопка «Удалить» в панели редактора карт больше не исчезает при случайном клике на фон SVG в режиме `select`

### База данных (новые таблицы)

`npc_placements`, `skill_damage_types`, `skill_damage_formulas`, `mob_stat`, `spawn_zone_mobs`, `character_class`, `class_stat_formula`, `class_skill_tree`, `exp_for_level`, `vendor_npc`, `vendor_inventory`, `zones`, `character_genders`, `game_config`, `factions`, `damage_elements`, `mastery_definitions`, `status_effects`, `status_effect_modifiers`, `passive_skill_modifiers`, `item_sets`, `item_set_members`, `item_set_bonuses`, `item_class_restrictions`, `item_use_effects`, `mob_resistances`, `mob_weaknesses`, `npc_trainer_class`, `npc_ambient_speech_configs`, `npc_ambient_speech_lines`

### Новые enum'ы

- `quest_step_type`: `collect | kill | talk | reach | custom`
- `effect_modifier_type`: `flat | percent | percent_all`
- `status_effect_category`: `buff | debuff | dot | hot | cc`
