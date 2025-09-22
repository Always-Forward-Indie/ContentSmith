import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { db } from '../db';
import { race } from '@contentsmith/database';
import { eq, like, or, desc, asc, and } from '@contentsmith/database';
import {
  raceSchema,
  createRaceSchema,
  updateRaceSchema,
} from '@contentsmith/validation';

const raceListQuerySchema = z.object({
  search: z.string().optional(),
});

const raceIdSchema = z.object({
  id: z.number().int().positive('Invalid race ID'),
});

export const raceRouter = createTRPCRouter({
  // Получить список рас с поиском
  list: publicProcedure
    .input(raceListQuerySchema)
    .query(async ({ input }) => {
      const { search } = input;

      // Создаем условия для WHERE
      const conditions = [];

      if (search) {
        conditions.push(
          or(
            like(race.name, `%${search}%`),
            like(race.slug, `%${search}%`)
          )
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Получаем расы
      const results = await db
        .select({
          id: race.id,
          name: race.name,
          slug: race.slug,
        })
        .from(race)
        .where(whereClause)
        .orderBy(race.name);

      return results;
    }),

  // Получить расу по ID
  getById: publicProcedure
    .input(raceIdSchema)
    .query(async ({ input }) => {
      const raceRecord = await db
        .select({
          id: race.id,
          name: race.name,
          slug: race.slug,
        })
        .from(race)
        .where(eq(race.id, input.id))
        .limit(1);

      if (raceRecord.length === 0) {
        throw new Error('Race not found');
      }

      return raceRecord[0];
    }),

  // Создать новую расу
  create: publicProcedure
    .input(createRaceSchema)
    .mutation(async ({ input }) => {
      // Проверяем уникальность slug
      const existingSlug = await db
        .select()
        .from(race)
        .where(eq(race.slug, input.slug))
        .limit(1);

      if (existingSlug.length > 0) {
        throw new Error('Race with this slug already exists');
      }

      // Проверяем уникальность name
      const existingName = await db
        .select()
        .from(race)
        .where(eq(race.name, input.name))
        .limit(1);

      if (existingName.length > 0) {
        throw new Error('Race with this name already exists');
      }

      const result = await db
        .insert(race)
        .values({
          name: input.name,
          slug: input.slug,
        })
        .returning();

      return result[0];
    }),

  // Обновить расу
  update: publicProcedure
    .input(updateRaceSchema)
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;

      // Проверяем, что раса существует
      const existingRace = await db
        .select()
        .from(race)
        .where(eq(race.id, id))
        .limit(1);

      if (existingRace.length === 0) {
        throw new Error('Race not found');
      }

      // Если обновляется slug, проверяем уникальность
      if (updateData.slug) {
        const duplicateSlug = await db
          .select()
          .from(race)
          .where(eq(race.slug, updateData.slug))
          .limit(1);

        if (duplicateSlug.length > 0 && duplicateSlug[0].id !== id) {
          throw new Error('Race with this slug already exists');
        }
      }

      // Если обновляется name, проверяем уникальность
      if (updateData.name) {
        const duplicateName = await db
          .select()
          .from(race)
          .where(eq(race.name, updateData.name))
          .limit(1);

        if (duplicateName.length > 0 && duplicateName[0].id !== id) {
          throw new Error('Race with this name already exists');
        }
      }

      const result = await db
        .update(race)
        .set(updateData)
        .where(eq(race.id, id))
        .returning();

      return result[0];
    }),

  // Удалить расу
  delete: publicProcedure
    .input(raceIdSchema)
    .mutation(async ({ input }) => {
      // Проверяем, что раса существует
      const existingRace = await db
        .select()
        .from(race)
        .where(eq(race.id, input.id))
        .limit(1);

      if (existingRace.length === 0) {
        throw new Error('Race not found');
      }

      // TODO: Проверить, не используется ли эта раса в других таблицах
      // Например, в npc таблице (raceId)

      await db.delete(race).where(eq(race.id, input.id));

      return { success: true };
    }),
});