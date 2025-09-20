# ContentSmith - MMORPG Content Editor

Система управления контентом для MMORPG с веб-интерфейсом для редактирования диалогов и квестов.

## 🚀 Быстрый старт

### Вариант 1: Запуск в Docker (Рекомендуется)
```bash
# Клонировать репозиторий
git clone <repository-url>
cd ContentSmith

# Настроить переменные окружения
cp .env.example .env
# Отредактировать .env файл с вашими настройками БД

# Запустить приложение в контейнере
npm run docker:dev
```

### Вариант 2: Локальная разработка
```bash
# Установить зависимости
npm install

# Собрать пакеты
npm run build

# Запустить в режиме разработки
npm run dev
```

## 📋 Требования

- **Node.js 18+**
- **PostgreSQL** (локальная установка)
- **Docker** (для контейнеризации)

## ⚙️ Конфигурация

### Переменные окружения (.env)
```env
# База данных (ваша локальная PostgreSQL)
DATABASE_URL=postgresql://postgres:root@localhost:5432/mmo_prototype

# Приложение
APP_PORT=3000
NODE_ENV=development

# Аутентификация
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secure_secret_key
```

## 🏗️ Архитектура

```
ContentSmith/
├── apps/
│   └── studio/          # Next.js приложение
├── packages/
│   ├── database/        # Drizzle ORM схема
│   ├── validation/      # Zod схемы валидации
│   └── ui/             # Общие UI компоненты
└── Docker файлы        # Контейнеризация
```

## 🛠️ Доступные команды

```bash
# Разработка
npm run dev                    # Локальная разработка
npm run docker:dev            # Docker (только приложение)
npm run docker:dev-full      # Docker (приложение + БД + Redis)

# Сборка
npm run build                 # Сборка всех пакетов
npm run type-check           # Проверка типов TypeScript

# База данных
npm run db:migrate           # Запуск миграций
npm run db:studio           # Drizzle Studio
```

## 🎯 Основные функции

### ✅ Реализовано:
- **Управление диалогами** - CRUD операции, поиск, пагинация
- **Граф-редактор диалогов** - Визуальное редактирование с React Flow
- **Типы узлов**: Line, Choice Hub, Action, Jump, End
- **tRPC API** - Type-safe API с валидацией
- **Современный UI** - shadcn/ui + Tailwind CSS
- **Docker поддержка** - Контейнеризация для разработки

### 🔄 В планах:
- **Система квестов** - Управление квестами и шагами
- **Локализация** - Интеграция с UE5, переводы
- **Аутентификация** - RBAC система доступа

## 🌐 Доступ к приложению

После запуска приложение доступно по адресу: **http://localhost:3000**

### Основные разделы:
- `/dialogues` - Управление диалогами
- `/dialogues/[id]` - Детали диалога
- `/dialogues/[id]/graph` - Граф-редактор диалогов

## 🔧 Разработка

### Структура проекта:
- **Monorepo** - Turbo для управления workspace
- **TypeScript** - Полная типизация
- **Next.js 14** - App Router
- **Drizzle ORM** - Type-safe работа с БД
- **tRPC** - End-to-end type safety

### Docker стратегия:
- **Упрощенный подход** - Только Next.js в контейнере
- **Локальная БД** - Использует существующую PostgreSQL
- **Hot reload** - Мгновенное обновление при изменениях

## 📚 Техническая документация

- **Database Schema**: `packages/database/src/schema/`
- **API Routes**: `apps/studio/src/server/routers/`
- **UI Components**: `apps/studio/src/components/`
- **Graph Editor**: `apps/studio/src/components/editors/`

## ⚡ Производительность

- **Multi-stage Docker build** для оптимизации
- **Type-safe API** без runtime overhead
- **Efficient bundling** с Next.js
- **Database indexing** для быстрых запросов