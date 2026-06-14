# GM Panel — Changelog

## [Unreleased] — 2026-06-14

### Аналитика

#### Основная аналитика (`/analytics`)
- **MAU / WAU** — новые KPI-карточки: уникальные персонажи с сессией за 30 и 7 дней
- **Онлайн по часам** — график приблизительного одновременного онлайна за 7 дней, вычисленный по `session_start` / `session_end`
- **Фильтр по дате** — выбор периода (7 / 14 / 30 / 90 дней) в шапке страницы
- **Источник валюты** — `currencyFlowByDay` теперь читает `game_analytics` (события `gold_change`) вместо пустой таблицы `currency_transactions`
- **CSV-экспорт** — кнопка «CSV» на таблице топ-персонажей

#### Game Analytics (`/game-analytics`)
- **Когорты удержания** — исправлен критический баг: D+N теперь проверяется как диапазон (`BETWEEN`) вместо точного совпадения дня; описание обновлено на «±1 день»
- **Настраиваемый период** — все процедуры принимают `periodInput`: можно выбрать пресет (7/14/30/90 дней) или произвольный диапазон дат
- **Очистка событий** — новая мутация `clearEvents` с фильтрами по типу, персонажу и дате; логируется в аудит
- **CSV-экспорт** — кнопка «CSV» на каждой таблице: воронка квестов, топ мобов, топ предметов, лог событий, когорты

### Управление персонажами

#### Новые мутации на странице персонажа
- **Очистка (wipe)** — удаление всех данных персонажа (скилы, инвентарь, квесты, эффекты, титулы, репутация, бестиарий, эмоции, mastery, skillbar, транзакции, аналитика). Персонаж остаётся в слоте с текущим уровнем.
- **Сброс до Lv.1 (reset)** — полная очистка + сброс уровня, exp, статов, телепорт к точке привязки
- **Телепорт по координатам** — задать X/Y/Z, персонаж мгновенно перемещается
- **Телепорт к игроку** — ввести никнейм, персонаж телепортируется к целевому игроку

#### Список персонажей
- **Колонка «Онлайн»** — индикатор онлайн/оффлайн (`is_online`)
- **Массовая очистка** — кнопка «Очистить всё» (удаление всех данных всех персонажей)

#### API
- `characters.positions` — новый query: позиции всех персонажей для карты, фильтр all/online/offline
- `characters.wipe` / `characters.reset` / `characters.wipeAll` — mass operations
- `characters.teleportToCoords` / `characters.teleportToPlayer` — телепортация

### Управление аккаунтами

- **Удаление аккаунта с каскадом** — при удалении аккаунта удаляются все связанные персонажи и их данные (17 таблиц: инвентарь, скилы, квесты, эффекты, позиции, транзакции, аналитика...), затем сессии, баны и сам аккаунт
- **Очистка аккаунта (wipe)** — сброс данных всех персонажей аккаунта, отзыв сессий, удаление банов
- **Массовая очистка всех аккаунтов** — `accounts.wipeAll`: сброс всех персонажей, отзыв сессий, удаление банов

### Схема БД

- `characters`: переименован `play_time_sec` → `total_play_time_sec`; добавлены `last_session_play_time_sec`, `is_online`
- `gameAnalytics`: столбец `user_id` → `owner_id` (приведено к схеме `characters`)

### Навигация

- Добавлен пункт «Карта» (`/map`) в AppHeader

### Инфраструктура (Docker)

- `HOSTNAME=0.0.0.0` и `NODE_NO_WARNINGS=1` в Docker-образах
- `MAP_UPLOAD_DIR` и volume для загрузок карт
- Сервис подключается к внешней сети `mmo_network` и внутренней `default`

---

## [Unreleased] — 2026-06-10

### Новые разделы

- **Analytics** (`/analytics`) — сводная панель аналитики:
  - Общая статистика: количество пользователей, персонажей, активных банов, сессий
  - Квесты: активные треки квестов
  - Логины за последние 24 часа
  - Данные из таблиц: `users`, `user_bans`, `user_sessions`, `characters`, `character_class`, `race`, `player_quest`, `character_position`, `zones`, `currency_transactions`
- **Game Analytics** (`/game-analytics`) — дашборд игровых событий:
  - KPI метрики: total events, sessions, deaths, mob kills, level-ups, quest accepts/completes/abandons, items acquired, gold changes
  - Фильтр по периоду (1–365 дней)
  - Лог событий с пагинацией (50 записей на страницу)
  - Сегментация по event type, character, zone level
  - Использует новую таблицу `game_analytics` (аппенд-only лог от Game Server)

### Аутентификация

- **Login / Auth** — система входа в приложение:
  - NextAuth v4 с CredentialsProvider — валидация логина/пароля через игровую БД
  - Проверка прав: доступ только для пользователей с `isStaff = true` (GM+)
  - JWT-стратегия сессий
  - Страница логина (`/login`)
  - `SessionProvider` в дереве компонентов
  - Middleware: защита всех роутов, редирект на `/login` без сессии
- **tRPC авторизация** — все роутеры переведены с `publicProcedure` на `gmProcedure`:
  - `gmProcedure` проверяет сессию + `isStaff`
  - `accounts`, `characters`, `sessions`, `bans`, `transactions`, `gmLog`, `characterExtras`, `gameConfig`, `effects`, `inventory`, `equipment`, `skills`, `flags`, `attributes`, `quests`, `analytics`, `gameAnalytics`
- Новые зависимости: `next-auth`
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET` добавлены в `.env.local`

### Новые роутеры

- `analyticsRouter` — сводная статистика по пользователям и персонажам:
  - `overview` — агрегированная статистика
- `gameAnalyticsRouter` — аналитика игровых событий:
  - `overview` — KPI за выбранный период
  - `events` — список событий с пагинацией и фильтрацией

### База данных

- Новая таблица `game_analytics` (логи событий Game Server):
  - Поля: `event_type`, `character_id`, `session_id`, `level`, `zone_id`, `payload (jsonb)`
  - Индексы: `event_type + created_at`, `character_id + created_at`, `session_id`, `created_at`

### Прочие изменения

- Добавлена зависимость `recharts` (v3) — библиотека графиков для дашбордов
- Обновлён `AppHeader` — добавлены ссылки на Analytics и Game Analytics
- Расширен `schema.ts` — добавлена таблица `gameAnalytics`

### Производственные исправления

- **Docker** — двух-стейджевая сборка (builder → runner), standalone Next.js, копирование `static/` в runner-образ
- **Пароли** — алгоритм хэширования заменён с bcrypt на SHA-256 (соответствует игровому серверу), зависимость `bcryptjs` удалена
- **Middleware** — переписан без `withAuth`, прямая проверка куки `next-auth.session-token`
- **`next.config.js`** — убран блок `env`
- **Сессия** — `maxAge: 8h`, автовыход через 8 часов после входа
- **Кнопка «Выйти»** — иконка `LogOut` в AppHeader, вызов `signOut()`
- **`db.ts`** — ленивая инициализация через Proxy, не падает при сборке без переменных окружения
- **TypeScript** — `strict: false`, исправлена типизация `OverviewData` в analytics

---

## [Unreleased] — 2026-04-17

### Новые разделы

- **Game Config** (`/game-config`) — редактор параметров игры (таблица `game_config`):
  - Список всех конфигов с поиском по ключу
  - Inline-редактирование значений с сохранением через tRPC
  - Цветовые бейджи типов (`int`, `float`, `string`, ...)
  - Логирование изменений в `gm_action_log`
  - Группировка параметров по префиксу ключа с коллапсом/раскрытием

### Улучшения существующих разделов

- **Персонаж** (`/characters/[id]`) — добавлены новые вкладки:
  - **Титулы** — список титулов персонажа, выдача/отзыв, установка активного
  - **Репутация** — просмотр репутации по фракциям, ручная корректировка и сброс
  - **Мастерство** — список прокачанных мастерств с редактированием уровня
  - **Эмоуты** — выданные анимации, выдача/отзыв
  - **Бестиарий** — просмотр убитых мобов персонажем
  - **Панель скилов** — просмотр текущей раскладки умений на панели
  - **Pity** — просмотр и сброс pity-счётчиков персонажа

### Новые роутеры

- `gameConfigRouter` — CRUD для глобальных параметров игры (list, byKey, update)
- `characterExtrasRouter` — управление расширенными данными персонажа:
  - Титулы: `listTitles`, `grantTitle`, `revokeTitle`, `setTitleEquipped`
  - Репутация: `listReputation`, `setReputation`, `resetReputation`
  - Мастерство: `listMastery`, `setMastery`
  - Эмоуты: `listEmotes`, `grantEmote`, `revokeEmote`
  - Бестиарий: `listBestiary`
  - Skill bar: `listSkillBar`
  - Pity: `listPity`, `resetPity`

### Прочие изменения

- Обновлён `AppHeader` — добавлена ссылка на раздел Game Config
- Обновлена схема (`schema.ts`) — добавлены таблицы: `game_config`, `character_titles`, `character_reputation`, `character_pity`, `character_bestiary`, `character_emotes`, `character_skill_mastery`, `character_skill_bar`
- Обновлён `accounts.ts` — улучшена обработка аккаунтов
- Обновлён `effects.ts` — учёт новых статус-эффектов
