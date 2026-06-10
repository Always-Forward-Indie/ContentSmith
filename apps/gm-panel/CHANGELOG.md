# GM Panel — Changelog

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
