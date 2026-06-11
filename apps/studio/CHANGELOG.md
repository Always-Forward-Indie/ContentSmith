# Studio — Changelog

## [Unreleased] — 2026-06-10

### Новый раздел: Balance Calculator

- **Balance Calculator** — система анализа и расчёта игрового баланса:
  - `ClassBalancePanel` — баланс классов: статы, формулы, XP-кривая
  - `DurabilityCalcPanel` — расчёт прочности предметов
  - `EquipmentLoadoutPanel` — экипировка персонажа с расчётом статов
  - `ItemBalancePanel` — баланс предметов относительно уровня
  - `LootEconomyPanel` — экономика лута и золота с мобов
  - `MobBalancePanel` — расчёт боевых характеристик мобов (EHP, DPS, TTK)
  - `PlayerBuildSection` — сборка персонажа: класс, уровень, статы
  - `ProgressionPanel` — кривая прогрессии опыта
  - `SkillBalancePanel` — расчёт DPS/DPM скиллов с учётом прокачки
- Библиотека `balance-calc.ts` (1674 строки) — формулы расчёта
- Хуки `useBalanceData` и `usePlayerBuild` для управления данными
- tRPC роутер `balance` для агрегации данных со всех таблиц
- Интегрирован в страницы мобов, скиллов и предметов
- i18n: модуль `balance.json` (en + ru)

### Аутентификация

- **Login / Auth** — система входа в приложение:
  - NextAuth v4 с CredentialsProvider — валидация логина/пароля через игровую БД
  - Проверка прав: доступ только для пользователей с `isStaff = true` (GM+)
  - JWT-стратегия сессий (без DB adapter)
  - Страница логина (`/login`) с i18n (en/ru)
  - `SessionProvider` в дереве компонентов
  - Middleware: защита dashboard-роутов, редирект на `/login` без сессии
- **tRPC авторизация** — починен контекст:
  - `createTRPCContext` получает реальную сессию через `getServerSession(authOptions)`
  - `hasPermission` проверяет `isStaff` (было заглушкой)
  - Роутеры `items`, `npc`, `mobs` исправлены для продакшен-режима (`requirePermission` вместо `devRequirePermission`)

### Производственные исправления

- **Docker** — двух-стейджевая сборка (builder → runner), standalone Next.js, копирование `messages/` и `static/` в runner-образ
- **Пароли** — алгоритм хэширования заменён с bcrypt на SHA-256 (соответствует игровому серверу), зависимость `bcryptjs` удалена
- **Middleware** — переписан без `withAuth` (нестабилен в Docker standalone), прямая проверка куки `next-auth.session-token`
- **`next.config.js`** — убран блок `env` (переменные передаются через Docker Compose runtime)
- **Сессия** — `maxAge: 8h`, автовыход через 8 часов после входа
- **Кнопка «Выйти»** — иконка `LogOut` в AppHeader, вызов `signOut()`
- **Реструктуризация** — shared-пакеты (`@contentsmith/database`, `@contentsmith/validation`) перенесены внутрь `apps/studio/src/` как обычные директории (`@/db`, `@/validation`). Убран `transpilePackages` из `next.config.js`, удалены workspace-зависимости. Docker-сборка: одна команда `npm run build --workspace=@contentsmith/studio`
- **`db.ts`** — ленивая инициализация через Proxy, не падает при сборке без переменных окружения
- **TypeScript** — `noImplicitAny: false` (остальные strict-проверки активны), исправлены типы в 20+ роутерах и компонентах

### Улучшения: Редактор карт

- **i18n** — все строки редактора карт вынесены в переводы (`editors.mapEditor`, `editors.mapPanel`)
- **Новый слой** — Class Spawn Zones (зоны возрождения по классам)
- **Формы зон и спавн-зон** — поддержка `RECT`, `CIRCLE`, `ANNULUS`:
  - Перетаскивание и ресайз круговых и кольцевых зон за центр и радиусы
  - Визуализация кругов/колец в SVG
- **Вращение сущностей** — поворот NPC, World Object, Respawn, Mob через `rotZ`
- **Поиск сущностей** — строка поиска по всем entity на карте
- **Toggle фона** — кнопка скрытия/показа фонового изображения карты
- **Конфигурация осей** — оси X/Y изображения определяются из `mapConfig`, поддержка `+X/-X/+Y/-Y`
- **Панель деталей** — расширена для всех типов сущностей (NPC, Zone, SpawnZone, ClassSpawnZone, WorldObject, Respawn, Mob)
- `DraftRespawnZones` и `DraftClassSpawnZones` — оптимистичные обновления при перетаскивании
- Автосинхронизация selected entity после refetch данных

### Новый раздел: Class Spawn Zones

- **Class Spawn Zones** — зоны возрождения по классам персонажей:
  - Привязка к классу (`classId`) и опционально к зоне (`zoneId`)
  - CRUD страницы (`/class-spawn-zones`)
  - Поддержка форм RECT, CIRCLE, ANNULUS
  - Интеграция с редактором карт (слой `classSpawnZone`)
  - Новый enum `spawn_zone_shape`: `RECT | CIRCLE | ANNULUS`

### Улучшения: Скиллы

- Поле **`animationName`** — название анимации скилла (до 100 символов)
- **`PropertyEditor`** — редактор посекундных свойств скилла по уровням:
  - Cast time, cooldown, cost, range, radius и др.
  - CRUD через `skillPropertiesMapping`
- **`EffectInstancesEditor`** — редактор эффектов скилла с per-level значениями:
  - Damage/Heal/Buff эффекты с target type, formula, value, tick, duration
  - Привязка к атрибутам (attribute scaling)
- Новые эндпоинты: `getProperties`, `getTargetTypes`, `getEffectInstances`, `createEffectInstance`, `updateEffectInstance`, `deleteEffectInstance`, `getEffectMappings`, `createEffectMapping`, `updateEffectMapping`, `deleteEffectMapping`
- **`SkillBalancePanel`** — расчёт баланса скилла на странице редактирования

### Улучшения: Мобы

- **`MobBalancePanel`** — расчёт EHP (эффективных HP), DPS, TTK на странице моба
- **`LootEconomyPanel`** — анализ экономики лута и дропа с моба

### Улучшения: Предметы

- **Use Effects** — отображение эффектов использования предмета (instant, duration, cooldown, attribute scaling)
- **`ItemBalancePanel`** — расчёт баланса предмета по атрибутам на странице просмотра
- Новый эндпоинт `items.getUseEffects`

### Улучшения: Зоны и Spawn Zones

- **Формы зон** — все зоны и spawn-зоны теперь поддерживают RECT, CIRCLE, ANNULUS
- `centerX` / `centerY` / `innerRadius` / `outerRadius` — поля для круговых зон
- **Авто-расчёт центра** — для прямоугольных зон центр вычисляется автоматически
- **`exclusionGameZoneId`** — spawn-зоны могут исключать определённую игровую зону

### Новые UI компоненты

- `Collapsible` — сворачиваемые секции
- `Combobox` — выпадающий список с поиском
- `PropertyEditor` — редактор посекундных свойств скиллов
- `EffectInstancesEditor` — редактор эффектов скиллов
- 9 панелей баланса: `ClassBalancePanel`, `DurabilityCalcPanel`, `EquipmentLoadoutPanel`, `ItemBalancePanel`, `LootEconomyPanel`, `MobBalancePanel`, `PlayerBuildSection`, `ProgressionPanel`, `SkillBalancePanel`

### i18n

- Расширен модуль `editors.json`: mapPanel (типы, поля, действия), mapEditor (нотификации)
- Расширен модуль `skills.json`: animationName, passiveModifiers, propertyEditor, effectInstances
- Расширен модуль `navigation.json`: classSpawnZones
- Расширен модуль `zones.json`: shape, center, radius поля
- Расширен модуль `items.json`: useEffects
- Расширен модуль `mobs.json`: balance panels
- Расширен модуль `spawn-zones.json`: shape, exclusion
- Новый модуль `balance.json` (en + ru)

### База данных

- Новый enum `spawn_zone_shape`: `RECT | CIRCLE | ANNULUS`
- Новая таблица `class_spawn_zones`
- Расширена `spawn_zones`: `shape_type`, `center_x`, `center_y`, `inner_radius`, `outer_radius`, `exclusion_game_zone_id`
- Расширена `zones`: `shape_type`, `center_x`, `center_y`, `inner_radius`, `outer_radius`

---

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
