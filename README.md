# ContentSmith - MMORPG Content Management System

Professional web-based content editor for MMORPG games, built with modern web technologies.

## Features

- 🎭 **Dialogue System**: Visual graph editor for NPC dialogues with conditions and actions
- 🗡️ **Quest Management**: Complete quest creation and management with step-by-step objectives
- 🌍 **Localization**: Multi-language support with UE5 integration
- 🔒 **RBAC Security**: Role-based access control with GM-only authentication
- 🐳 **Docker Ready**: Single command production deployment
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
   Edit `.env` with your database connection strings.

3. **Install and run**
   ```bash
   npm install
   npm run dev
   ```
   Studio runs on port 3000, GM Panel on port 3001.

### Production Deployment

1. **Clone and configure**
   ```bash
   git clone <repository-url>
   cd ContentSmith
   cp .env.example .env
   ```
   Edit `.env` — point `DATABASE_URL` and `GAME_DATABASE_URL` to your game database,
   set `STUDIO_NEXTAUTH_SECRET` and `GM_NEXTAUTH_SECRET` (random 32+ char strings).

2. **Build and start**
   ```bash
   docker compose up --build -d
   ```
   Builds and starts both containers — Studio on port 3000, GM Panel on port 3001.
   Node.js / npm on the host are **not required** — everything is built inside Docker.

3. **Access**
   - Studio: `http://your-server:3000`
   - GM Panel: `http://your-server:3001`
   - Log in with any game database user that has a GM role (`user_roles.is_staff = true`)

## Project Structure

```
ContentSmith/
├── apps/
│   ├── studio/                 # Content editor (port 3000)
│   └── gm-panel/               # GM/admin panel (port 3001)
├── packages/
│   ├── database/               # Drizzle ORM schema
│   ├── validation/             # Zod schemas
│   └── ui/                     # Shared UI components
├── Dockerfile                  # Studio production image
├── Dockerfile.gm               # GM Panel production image
├── docker-compose.yml          # Production deployment
└── package.json                # Monorepo root
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