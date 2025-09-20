import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, requirePermission, devRequirePermission, permissions } from '../trpc';
import { 
  QuestSchema, 
  CreateQuestSchema, 
  UpdateQuestSchema,
  QuestStepSchema
} from '@contentsmith/validation';
import { quest, questStep } from '@contentsmith/database';
import { eq, desc, like, or, inArray } from '@contentsmith/database';

// В режиме разработки используем dev процедуры
const isDev = process.env.NODE_ENV === 'development';
const requirePerm = (permission: string) => 
  isDev ? devRequirePermission(permission) : requirePermission(permission);

export const questRouter = createTRPCRouter({
  // Get all quests with pagination
  list: requirePerm(permissions.QUEST_READ)
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(10),
      search: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const offset = (input.page - 1) * input.limit;
      
      const whereClause = input.search 
        ? like(quest.slug, `%${input.search}%`)
        : undefined;
      
      const quests = await ctx.db.select()
        .from(quest)
        .where(whereClause)
        .limit(input.limit)
        .offset(offset)
        .orderBy(desc(quest.id));
      
      return {
        data: quests,
        pagination: {
          page: input.page,
          limit: input.limit,
          total: quests.length, // TODO: Get actual count
        },
      };
    }),

  // Get single quest by ID
  byId: requirePerm(permissions.QUEST_READ)
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const result = await ctx.db
        .select()
        .from(quest)
        .where(eq(quest.id, input.id))
        .limit(1);
      
      if (!result[0]) {
        throw new TRPCError({ 
          code: 'NOT_FOUND', 
          message: 'Quest not found' 
        });
      }
      
      return result[0];
    }),

  // Get quest with all steps
  getWithSteps: requirePerm(permissions.QUEST_READ)
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      // Get quest
      const questResult = await ctx.db
        .select()
        .from(quest)
        .where(eq(quest.id, input.id))
        .limit(1);
      
      if (!questResult[0]) {
        throw new TRPCError({ 
          code: 'NOT_FOUND', 
          message: 'Quest not found' 
        });
      }

      // Get all steps for this quest
      const steps = await ctx.db
        .select()
        .from(questStep)
        .where(eq(questStep.questId, input.id))
        .orderBy(questStep.stepIndex);

      return {
        quest: questResult[0],
        steps,
      };
    }),

  // Create new quest
  create: requirePerm(permissions.QUEST_WRITE)
    .input(CreateQuestSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await ctx.db
        .insert(quest)
        .values(input)
        .returning();
      
      return result[0];
    }),

  // Update quest
  update: requirePerm(permissions.QUEST_WRITE)
    .input(UpdateQuestSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input;
      
      const result = await ctx.db
        .update(quest)
        .set(updateData)
        .where(eq(quest.id, id))
        .returning();
      
      if (!result[0]) {
        throw new TRPCError({ 
          code: 'NOT_FOUND', 
          message: 'Quest not found' 
        });
      }
      
      return result[0];
    }),

  // Delete quest
  delete: requirePerm(permissions.QUEST_WRITE)
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const result = await ctx.db
        .delete(quest)
        .where(eq(quest.id, input.id))
        .returning();
      
      if (!result[0]) {
        throw new TRPCError({ 
          code: 'NOT_FOUND', 
          message: 'Quest not found' 
        });
      }
      
      return { success: true };
    }),

  // Add step to quest
  createStep: requirePerm(permissions.QUEST_WRITE)
    .input(z.object({
      questId: z.number(),
      stepIndex: z.number().min(0),
      stepType: z.enum(['collect', 'kill', 'talk', 'reach', 'custom']),
      params: z.record(z.unknown()),
      clientStepKey: z.string().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await ctx.db
        .insert(questStep)
        .values(input)
        .returning();
      
      return result[0];
    }),

  // Update quest step
  updateStep: requirePerm(permissions.QUEST_WRITE)
    .input(z.object({
      id: z.number(),
      stepIndex: z.number().min(0).optional(),
      stepType: z.enum(['collect', 'kill', 'talk', 'reach', 'custom']).optional(),
      params: z.record(z.unknown()).optional(),
      clientStepKey: z.string().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input;
      
      const result = await ctx.db
        .update(questStep)
        .set(updateData)
        .where(eq(questStep.id, id))
        .returning();
      
      if (!result[0]) {
        throw new TRPCError({ 
          code: 'NOT_FOUND', 
          message: 'Quest step not found' 
        });
      }
      
      return result[0];
    }),

  // Delete quest step
  deleteStep: requirePerm(permissions.QUEST_WRITE)
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const result = await ctx.db
        .delete(questStep)
        .where(eq(questStep.id, input.id))
        .returning();
      
      if (!result[0]) {
        throw new TRPCError({ 
          code: 'NOT_FOUND', 
          message: 'Quest step not found' 
        });
      }
      
      return { success: true };
    }),

  // Get steps for quest
  stepsByQuestId: requirePerm(permissions.QUEST_READ)
    .input(z.object({ questId: z.number() }))
    .query(async ({ input, ctx }) => {
      const steps = await ctx.db
        .select()
        .from(questStep)
        .where(eq(questStep.questId, input.questId))
        .orderBy(questStep.stepIndex);
      
      return steps;
    }),
});