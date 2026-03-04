import { z } from 'zod';
import { eq, and, or, like, count } from '@contentsmith/database';
import { db } from '../db';
import { characterClass, classStatFormula, classSkillTree, entityAttributes, skills } from '@contentsmith/database';
import { createTRPCRouter, publicProcedure } from '../trpc';
import {
  createClassSchema, updateClassSchema, classIdSchema,
  upsertStatFormulaSchema, deleteStatFormulaSchema,
  addSkillToClassSchema, updateClassSkillSchema, removeSkillFromClassSchema,
} from '@contentsmith/validation';

export const classesRouter = createTRPCRouter({
  // ─── Classes ────────────────────────────────────────────────────────────────

  list: publicProcedure
    .input(z.object({
      search: z.string().optional(),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      const { search, page, pageSize } = input;
      const offset = (page - 1) * pageSize;
      const whereClause = search
        ? or(like(characterClass.name, `%${search}%`), like(characterClass.slug, `%${search}%`))
        : undefined;
      const [{ total }] = await db.select({ total: count() }).from(characterClass).where(whereClause);
      const data = await db.select().from(characterClass).where(whereClause).orderBy(characterClass.name).limit(pageSize).offset(offset);
      return { data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
    }),

  getById: publicProcedure.input(classIdSchema).query(async ({ input }) => {
    const rows = await db.select().from(characterClass).where(eq(characterClass.id, input.id)).limit(1);
    if (!rows[0]) throw new Error('Class not found');
    return rows[0];
  }),

  create: publicProcedure.input(createClassSchema).mutation(async ({ input }) => {
    const slugValue = input.slug ?? input.name.toLowerCase().replace(/[^\w]+/g, '-');
    const rows = await db.insert(characterClass).values({
      name: input.name,
      slug: slugValue,
      description: input.description ?? null,
    }).returning();
    return rows[0];
  }),

  update: publicProcedure.input(updateClassSchema).mutation(async ({ input }) => {
    const { id, ...rest } = input;
    const rows = await db.update(characterClass).set(rest).where(eq(characterClass.id, id)).returning();
    if (!rows[0]) throw new Error('Class not found');
    return rows[0];
  }),

  delete: publicProcedure.input(classIdSchema).mutation(async ({ input }) => {
    await db.delete(characterClass).where(eq(characterClass.id, input.id));
    return { success: true };
  }),

  // ─── Stat Formulas ──────────────────────────────────────────────────────────

  listStatFormulas: publicProcedure
    .input(z.object({ classId: z.number() }))
    .query(async ({ input }) => {
      return db
        .select({
          classId: classStatFormula.classId,
          attributeId: classStatFormula.attributeId,
          attributeName: entityAttributes.name,
          attributeSlug: entityAttributes.slug,
          baseValue: classStatFormula.baseValue,
          multiplier: classStatFormula.multiplier,
          exponent: classStatFormula.exponent,
        })
        .from(classStatFormula)
        .leftJoin(entityAttributes, eq(entityAttributes.id, classStatFormula.attributeId))
        .where(eq(classStatFormula.classId, input.classId))
        .orderBy(entityAttributes.name);
    }),

  upsertStatFormula: publicProcedure.input(upsertStatFormulaSchema).mutation(async ({ input }) => {
    await db
      .insert(classStatFormula)
      .values({
        classId: input.classId,
        attributeId: input.attributeId,
        baseValue: input.baseValue,
        multiplier: input.multiplier,
        exponent: input.exponent,
      })
      .onConflictDoUpdate({
        target: [classStatFormula.classId, classStatFormula.attributeId],
        set: {
          baseValue: input.baseValue,
          multiplier: input.multiplier,
          exponent: input.exponent,
        },
      });
    return { success: true };
  }),

  deleteStatFormula: publicProcedure.input(deleteStatFormulaSchema).mutation(async ({ input }) => {
    await db.delete(classStatFormula).where(
      and(eq(classStatFormula.classId, input.classId), eq(classStatFormula.attributeId, input.attributeId))
    );
    return { success: true };
  }),

  // ─── Skill Tree ─────────────────────────────────────────────────────────────

  listSkillTree: publicProcedure
    .input(z.object({ classId: z.number() }))
    .query(async ({ input }) => {
      return db
        .select({
          id: classSkillTree.id,
          classId: classSkillTree.classId,
          skillId: classSkillTree.skillId,
          skillName: skills.name,
          skillSlug: skills.slug,
          requiredLevel: classSkillTree.requiredLevel,
          isDefault: classSkillTree.isDefault,
        })
        .from(classSkillTree)
        .leftJoin(skills, eq(skills.id, classSkillTree.skillId))
        .where(eq(classSkillTree.classId, input.classId))
        .orderBy(classSkillTree.requiredLevel);
    }),

  addSkillToClass: publicProcedure.input(addSkillToClassSchema).mutation(async ({ input }) => {
    const rows = await db.insert(classSkillTree).values(input).returning();
    return rows[0];
  }),

  updateClassSkill: publicProcedure.input(updateClassSkillSchema).mutation(async ({ input }) => {
    const { id, ...rest } = input;
    await db.update(classSkillTree).set(rest).where(eq(classSkillTree.id, id));
    return { success: true };
  }),

  removeSkillFromClass: publicProcedure.input(removeSkillFromClassSchema).mutation(async ({ input }) => {
    await db.delete(classSkillTree).where(eq(classSkillTree.id, input.id));
    return { success: true };
  }),
});
