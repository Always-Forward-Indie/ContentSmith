import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { db } from '../db';
import { entityAttributes } from '@contentsmith/database';
import { eq, like, or, desc, asc, and, count } from '@contentsmith/database';
import {
  entityAttributesSchema,
  createEntityAttributesSchema,
  updateEntityAttributesSchema,
} from '@contentsmith/validation';

const entityAttributesListQuerySchema = z.object({
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

const entityAttributesIdSchema = z.object({
  id: z.number().int().positive('Invalid entity attribute ID'),
});

export const entityAttributesRouter = createTRPCRouter({
  // Получить список атрибутов сущностей с поиском
  list: publicProcedure
    .input(entityAttributesListQuerySchema)
    .query(async ({ input }) => {
      const { search, page, pageSize } = input;
      const offset = (page - 1) * pageSize;

      const conditions = [];
      if (search) {
        conditions.push(or(like(entityAttributes.name, `%${search}%`), like(entityAttributes.slug, `%${search}%`)));
      }
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult] = await db
        .select({ total: count() })
        .from(entityAttributes)
        .where(whereClause);
      const total = totalResult?.total ?? 0;

      const results = await db
        .select({ id: entityAttributes.id, name: entityAttributes.name, slug: entityAttributes.slug })
        .from(entityAttributes)
        .where(whereClause)
        .orderBy(entityAttributes.name)
        .limit(pageSize)
        .offset(offset);

      return {
        data: results,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      };
    }),

  // Получить атрибут сущности по ID
  getById: publicProcedure
    .input(entityAttributesIdSchema)
    .query(async ({ input }) => {
      const entityAttribute = await db
        .select({
          id: entityAttributes.id,
          name: entityAttributes.name,
          slug: entityAttributes.slug,
        })
        .from(entityAttributes)
        .where(eq(entityAttributes.id, input.id))
        .limit(1);

      if (entityAttribute.length === 0) {
        throw new Error('Entity attribute not found');
      }

      return entityAttribute[0];
    }),

  // Создать новый атрибут сущности
  create: publicProcedure
    .input(createEntityAttributesSchema)
    .mutation(async ({ input }) => {
      // Проверяем уникальность slug
      const existingAttribute = await db
        .select()
        .from(entityAttributes)
        .where(eq(entityAttributes.slug, input.slug))
        .limit(1);

      if (existingAttribute.length > 0) {
        throw new Error('Entity attribute with this slug already exists');
      }

      // Проверяем уникальность name
      const existingName = await db
        .select()
        .from(entityAttributes)
        .where(eq(entityAttributes.name, input.name))
        .limit(1);

      if (existingName.length > 0) {
        throw new Error('Entity attribute with this name already exists');
      }

      const result = await db
        .insert(entityAttributes)
        .values({
          name: input.name,
          slug: input.slug,
        })
        .returning();

      return result[0];
    }),

  // Обновить атрибут сущности
  update: publicProcedure
    .input(updateEntityAttributesSchema)
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;

      // Проверяем, что атрибут сущности существует
      const existingAttribute = await db
        .select()
        .from(entityAttributes)
        .where(eq(entityAttributes.id, id))
        .limit(1);

      if (existingAttribute.length === 0) {
        throw new Error('Entity attribute not found');
      }

      // Если обновляется slug, проверяем уникальность
      if (updateData.slug) {
        const duplicateSlug = await db
          .select()
          .from(entityAttributes)
          .where(eq(entityAttributes.slug, updateData.slug))
          .limit(1);

        if (duplicateSlug.length > 0 && duplicateSlug[0].id !== id) {
          throw new Error('Entity attribute with this slug already exists');
        }
      }

      // Если обновляется name, проверяем уникальность
      if (updateData.name) {
        const duplicateName = await db
          .select()
          .from(entityAttributes)
          .where(eq(entityAttributes.name, updateData.name))
          .limit(1);

        if (duplicateName.length > 0 && duplicateName[0].id !== id) {
          throw new Error('Entity attribute with this name already exists');
        }
      }

      const result = await db
        .update(entityAttributes)
        .set(updateData)
        .where(eq(entityAttributes.id, id))
        .returning();

      return result[0];
    }),

  // Удалить атрибут сущности
  delete: publicProcedure
    .input(entityAttributesIdSchema)
    .mutation(async ({ input }) => {
      // Проверяем, что атрибут сущности существует
      const existingAttribute = await db
        .select()
        .from(entityAttributes)
        .where(eq(entityAttributes.id, input.id))
        .limit(1);

      if (existingAttribute.length === 0) {
        throw new Error('Entity attribute not found');
      }

      // TODO: Проверить, не используется ли этот атрибут в других таблицах
      // Например, в npc_attributes

      await db.delete(entityAttributes).where(eq(entityAttributes.id, input.id));

      return { success: true };
    }),
});