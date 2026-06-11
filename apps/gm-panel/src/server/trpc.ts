import { initTRPC, TRPCError } from '@trpc/server';
import { getServerSession } from 'next-auth';
import { db } from './db';
import { authOptions } from '@/lib/auth';

export const createTRPCContext = async () => {
  const session = await getServerSession(authOptions);
  return { session, db };
};

type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape }) {
    return shape;
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

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

const isGM = t.middleware(({ next, ctx }) => {
  if (!ctx.session?.user?.isStaff) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'GM access required' });
  }
  return next({
    ctx: {
      session: ctx.session,
      db: ctx.db,
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);
export const gmProcedure = t.procedure.use(isAuthed).use(isGM);
