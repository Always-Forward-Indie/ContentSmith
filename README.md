# ContentSmith - MMORPG Content Management System

Professional web-based content editor for MMORPG games, built with modern web technologies.

## Features

- 🎭 **Dialogue System**: Visual graph editor for NPC dialogues with conditions and actions
- 🗡️ **Quest Management**: Complete quest creation and management with step-by-step objectives
- 🌍 **Localization**: Multi-language support with UE5 integration
- 🔒 **RBAC Security**: Role-based access control with granular permissions
- 🐳 **Docker Ready**: Containerized deployment with development and production configurations
- ⚡ **Real-time**: Live preview and collaborative editing capabilities

## Tech Stack

- **Frontend**: Next.js 14 with App Router, React 18, TypeScript
- **Backend**: tRPC for type-safe API, NextAuth.js for authentication
- **Database**: PostgreSQL with Drizzle ORM
- **UI**: Tailwind CSS with shadcn/ui components
- **Graph Editor**: React Flow for dialogue visual editing
- **Deployment**: Docker with multi-stage builds

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- PostgreSQL (or use Docker)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ContentSmith
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your database credentials and secrets.

3. **Start with Docker (Recommended)**
   ```bash
   # Development environment with hot reload
   npm run docker:dev
   
   # Or for production
   npm run docker:prod
   ```

4. **Alternative: Local development**
   ```bash
   # Install dependencies
   npm install
   
   # Start PostgreSQL and Redis (adjust credentials in .env)
   docker-compose -f docker-compose.dev.yml up postgres redis
   
   # Run database migrations
   npm run db:migrate
   
   # Start development server
   npm run dev
   ```

5. **Access the application**
   - Web Interface: http://localhost:3000
   - Database Studio: `npm run db:studio`

### Production Deployment

1. **Set environment variables**
   ```bash
   # Required environment variables
   DATABASE_URL=postgresql://user:password@host:port/database
   NEXTAUTH_SECRET=your-secret-key
   NEXTAUTH_URL=https://your-domain.com
   ```

2. **Deploy with Docker**
   ```bash
   docker-compose up -d
   ```

## Project Structure

```
ContentSmith/
├── apps/
│   └── studio/                 # Next.js admin interface
│       ├── src/
│       │   ├── app/           # Next.js App Router pages
│       │   ├── components/    # React components
│       │   ├── lib/          # Utilities and configurations
│       │   └── server/       # tRPC API routes
│       ├── package.json
│       └── next.config.js
├── packages/
│   ├── database/              # Drizzle ORM schema and migrations
│   │   ├── src/
│   │   │   ├── schema/       # Database schema definitions
│   │   │   ├── migrate.ts    # Migration runner
│   │   │   └── index.ts      # Database connection
│   │   └── drizzle.config.ts
│   ├── validation/            # Zod schemas for validation
│   │   └── src/
│   │       ├── conditions.ts # Game condition schemas
│   │       ├── actions.ts    # Game action schemas
│   │       ├── dialogue.ts   # Dialogue validation
│   │       ├── quest.ts      # Quest validation
│   │       └── localization.ts # i18n schemas
│   └── ui/                   # Shared UI components (future)
├── docker-compose.yml        # Production deployment
├── docker-compose.dev.yml    # Development environment
├── Dockerfile               # Multi-stage build
└── package.json            # Monorepo configuration
```

## Database Schema

The system uses PostgreSQL with the following main entities:

### Dialogues
- **dialogue**: Main dialogue container
- **dialogue_node**: Individual dialogue nodes (line, choice_hub, action, jump, end)
- **dialogue_edge**: Connections between nodes with conditions
- **npc_dialogue**: NPC to dialogue mappings

### Quests
- **quest**: Quest definitions with basic metadata
- **quest_step**: Individual quest objectives
- **player_quest**: Player progress tracking
- **player_flag**: Flexible player state flags

### Localization
- **localization_key**: Text keys for UE5 integration
- **localization_text**: Multi-language translations

## API Documentation

The system uses tRPC for type-safe API communication. Main routers:

### Dialogue Router
- `dialogue.list()` - Get paginated dialogues
- `dialogue.byId(id)` - Get single dialogue
- `dialogue.getGraph(id)` - Get dialogue with nodes/edges
- `dialogue.create(data)` - Create new dialogue
- `dialogue.update(data)` - Update dialogue
- `dialogue.delete(id)` - Delete dialogue

### Quest Router
- Similar CRUD operations for quests and quest steps

### Localization Router
- UE5 text import/export functionality
- Multi-language text management

## UE5 Integration

The system provides JSON export/import for UE5 localization:

```typescript
// Export format for UE5
{
  "namespace": "dialogues",
  "language": "en",
  "entries": {
    "npc_guard_greeting": "Halt! Who goes there?",
    "quest_fetch_item_desc": "Bring me 5 wolf pelts"
  }
}
```

## Security & Permissions

Role-based access control with these roles:

- **Viewer**: Read-only access to content
- **Writer**: Create and edit dialogues, quests, translations
- **Admin**: Full system access including user management

## Development

### Adding New Features

1. Define schemas in `packages/validation/`
2. Create database tables in `packages/database/src/schema/`
3. Add tRPC routers in `apps/studio/src/server/routers/`
4. Create UI components in `apps/studio/src/components/`
5. Add pages in `apps/studio/src/app/`

### Code Quality

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Building
npm run build
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

[Your License Here]

## Support

For issues and questions, please use the GitHub issue tracker.