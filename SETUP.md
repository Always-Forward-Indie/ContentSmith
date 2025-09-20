# Инструкции по запуску ContentSmith

## Быстрый старт

1. **Установите зависимости**
   ```bash
   npm install
   ```

2. **Создайте .env файл**
   ```bash
   cp .env.example .env
   ```
   
   Отредактируйте .env файл:
   ```env
   DATABASE_URL=postgresql://dev_user:dev_pass@localhost:5432/contentsmith_dev
   NEXTAUTH_SECRET=your-secret-key-here
   NEXTAUTH_URL=http://localhost:3000
   ```

3. **Запустите в Docker (рекомендуется)**
   ```bash
   # Разработка с hot reload
   npm run docker:dev
   ```

4. **Доступ к приложению**
   - Веб-интерфейс: http://localhost:3000
   - PostgreSQL: localhost:5432
   - Redis: localhost:6379

## Альтернативный запуск (без Docker)

```bash
# Запустите только базу данных в Docker
docker-compose -f docker-compose.dev.yml up postgres redis -d

# Установите зависимости
npm install

# Запустите миграции
npm run db:migrate

# Запустите dev сервер
npm run dev
```

## Структура проекта

- `apps/studio/` - Next.js админ-панель
- `packages/database/` - Drizzle ORM схема и миграции  
- `packages/validation/` - Zod схемы валидации
- `packages/ui/` - Переиспользуемые UI компоненты

## Команды разработки

```bash
# Разработка
npm run dev

# Сборка
npm run build

# Проверка типов
npm run type-check

# Линтинг
npm run lint

# База данных
npm run db:migrate    # Запуск миграций
npm run db:studio     # Drizzle Studio

# Docker
npm run docker:dev    # Разработка
npm run docker:prod   # Продакшен
```