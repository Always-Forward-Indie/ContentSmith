import { initTRPC, TRPCError } from '@trpc/server';
import { type CreateNextContextOptions } from '@trpc/server/adapters/next';
import { getServerSession } from 'next-auth';
import { db } from './db';

// RBAC Permission system
export const permissions = {
  DIALOGUE_READ: 'dialogue:read',
  DIALOGUE_WRITE: 'dialogue:write',
  QUEST_READ: 'quest:read',
  QUEST_WRITE: 'quest:write',
  LOCALIZATION_READ: 'localization:read',
  LOCALIZATION_WRITE: 'localization:write',
  ADMIN_USERS: 'admin:users',
  ADMIN_SYSTEM: 'admin:system'
} as const;

export const roles = {
  VIEWER: [
    permissions.DIALOGUE_READ, 
    permissions.QUEST_READ, 
    permissions.LOCALIZATION_READ
  ],
  WRITER: [
    permissions.DIALOGUE_READ, 
    permissions.DIALOGUE_WRITE,
    permissions.QUEST_READ, 
    permissions.QUEST_WRITE,
    permissions.LOCALIZATION_READ, 
    permissions.LOCALIZATION_WRITE
  ],
  ADMIN: [
    permissions.DIALOGUE_READ, 
    permissions.DIALOGUE_WRITE,
    permissions.QUEST_READ, 
    permissions.QUEST_WRITE,
    permissions.LOCALIZATION_READ, 
    permissions.LOCALIZATION_WRITE,
    permissions.ADMIN_USERS,
    permissions.ADMIN_SYSTEM
  ]
} as const;

// Context creation
export const createTRPCContext = async (opts: CreateNextContextOptions) => {
  const { req, res } = opts;
  
  // Get session from NextAuth
  const session = await getServerSession(req, res, {
    // authOptions will be defined in auth config
  });

  return {
    session,
    db,
  };
};

type Context = Awaited<ReturnType<typeof createTRPCContext>>;

// Initialize tRPC
const t = initTRPC.context<Context>().create({
  errorFormatter({ shape }) {
    return shape;
  },
});

// Base router and procedure
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

// Development procedure (без аутентификации)
export const devProcedure = t.procedure.use(({ next, ctx }) => {
  // В режиме разработки пропускаем проверку аутентификации
  return next({
    ctx: {
      session: null, // Нет сессии в dev режиме
      db: ctx.db,
    },
  });
});

// Auth middleware
const isAuthed = t.middleware(({ next, ctx }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      session: ctx.session,
      db: ctx.db,
    },
  });
});

// Permission middleware factory
const hasPermission = (permission: string) => 
  t.middleware(({ next, ctx }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    // TODO: Check user permissions against database
    // For now, assume all authenticated users have all permissions
    // This should be replaced with actual permission checking
    
    return next({
      ctx: {
        session: ctx.session,
        db: ctx.db,
      },
    });
  });

// Protected procedure
export const protectedProcedure = publicProcedure.use(isAuthed);

// Permission-based procedures
export const requirePermission = (permission: string) => 
  protectedProcedure.use(hasPermission(permission));

// Development procedure без аутентификации
export const devRequirePermission = (permission: string) => devProcedure;