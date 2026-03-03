import { initTRPC } from '@trpc/server';
import { db } from './db';

export const createTRPCContext = () => ({
  db,
});

type Context = ReturnType<typeof createTRPCContext>;

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape }) {
    return shape;
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
