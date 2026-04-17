# GM Panel — Changelog

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
