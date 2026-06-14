# ContentSmith — Root Changelog

## Docker Compose

- Убраны `extra_hosts` (больше не нужны — используется внешняя сеть `mmo_network`)
- Добавлена внешняя сеть `mmo_network` (external: true)
- Добавлены volumes: `studio_uploads`, `studio_config`, `gm_uploads`, `gm_config`
- Порты теперь берутся из переменных окружения без fallback-значений (обязательные переменные)
- Значения `NEXTAUTH_URL` и `NEXTAUTH_SECRET` больше не имеют значений по умолчанию — теперь обязательны

## .env.example

- Обновлены примеры `DATABASE_URL` / `GAME_DATABASE_URL`: `mmorpg_prototype_db` вместо `host.docker.internal`
- Добавлены пояснения по Docker-сети и локальной разработке
