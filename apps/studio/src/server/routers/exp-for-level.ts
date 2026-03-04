import { z } from 'zod';
import { eq, asc, count } from '@contentsmith/database';
import { db } from '../db';
import { expForLevel } from '@contentsmith/database';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { bulkUpsertExpForLevelSchema, deleteExpForLevelSchema } from '@contentsmith/validation';

export const expForLevelRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.object({
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(200).default(50),
    }))
    .query(async ({ input }) => {
      const { page, pageSize } = input;
      const offset = (page - 1) * pageSize;
      const [{ total }] = await db.select({ total: count() }).from(expForLevel);
      const data = await db.select().from(expForLevel).orderBy(asc(expForLevel.level)).limit(pageSize).offset(offset);
      return { data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
    }),

  upsert: publicProcedure
    .input(z.object({ level: z.number().int().min(1), experiencePoints: z.number().int().min(0) }))
    .mutation(async ({ input }) => {
      await db
        .insert(expForLevel)
        .values({ level: input.level, experiencePoints: input.experiencePoints })
        .onConflictDoUpdate({
          target: expForLevel.level,
          set: { experiencePoints: input.experiencePoints },
        });
      return { success: true };
    }),

  bulkUpsert: publicProcedure.input(bulkUpsertExpForLevelSchema).mutation(async ({ input }) => {
    for (const entry of input.entries) {
      await db
        .insert(expForLevel)
        .values(entry)
        .onConflictDoUpdate({
          target: expForLevel.level,
          set: { experiencePoints: entry.experiencePoints },
        });
    }
    return { success: true, count: input.entries.length };
  }),

  delete: publicProcedure.input(deleteExpForLevelSchema).mutation(async ({ input }) => {
    await db.delete(expForLevel).where(eq(expForLevel.level, input.level));
    return { success: true };
  }),
});
