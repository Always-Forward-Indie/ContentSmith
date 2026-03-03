import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, requirePermission, devRequirePermission, permissions } from '../trpc';
import { 
  QuestSchema, 
  CreateQuestSchema, 
  UpdateQuestSchema,
  QuestStepSchema,
  questListQuerySchema,
} from '@contentsmith/validation';
import { quest, questStep, questReward, npc, items } from '@contentsmith/database';
import { eq, desc, like, or, inArray, count, and, gte, lte, asc, sql } from '@contentsmith/database';

// В режиме разработки используем dev процедуры
const isDev = process.env.NODE_ENV === 'development';
const requirePerm = (permission: string) => 
  isDev ? devRequirePermission(permission) : requirePermission(permission);

export const questRouter = createTRPCRouter({
  // Get all quests with pagination
  list: requirePerm(permissions.QUEST_READ)
    .input(questListQuerySchema)
    .query(async ({ input, ctx }) => {
      const { search, page, limit, repeatable, minLevel, maxLevel, giverNpcId, turninNpcId, sortBy, sortOrder } = input;
      const offset = (page - 1) * limit;

      const conditions = [];
      if (search) conditions.push(like(quest.slug, `%${search}%`));
      if (repeatable !== undefined) conditions.push(eq(quest.repeatable, repeatable));
      if (minLevel) conditions.push(gte(quest.minLevel, minLevel));
      if (maxLevel) conditions.push(lte(quest.minLevel, maxLevel));
      if (giverNpcId) conditions.push(eq(quest.giverNpcId, giverNpcId));
      if (turninNpcId) conditions.push(eq(quest.turninNpcId, turninNpcId));
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult] = await ctx.db
        .select({ count: count() })
        .from(quest)
        .where(whereClause);
      const total = totalResult?.count ?? 0;

      const dir = sortOrder === 'asc' ? asc : desc;
      const orderByClause = (
        sortBy === 'slug'     ? dir(quest.slug) :
        sortBy === 'minLevel' ? dir(quest.minLevel) :
        dir(quest.id)
      );

      const quests = await ctx.db.select({
        id: quest.id,
        slug: quest.slug,
        minLevel: quest.minLevel,
        repeatable: quest.repeatable,
        cooldownSec: quest.cooldownSec,
        giverNpcId: quest.giverNpcId,
        turninNpcId: quest.turninNpcId,
        clientQuestKey: quest.clientQuestKey,
        giverNpcName: sql<string | null>`(select name from npc where id = ${quest.giverNpcId})`,
        turninNpcName: sql<string | null>`(select name from npc where id = ${quest.turninNpcId})`,
      })
        .from(quest)
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      return {
        data: quests,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    }),

  // Get NPCs that are linked to quests as giver or turnin
  getQuestNpcs: requirePerm(permissions.QUEST_READ)
    .query(async ({ ctx }) => {
      const npcs = await ctx.db
        .selectDistinct({ id: npc.id, name: npc.name })
        .from(npc)
        .innerJoin(
          quest,
          or(eq(quest.giverNpcId, npc.id), eq(quest.turninNpcId, npc.id)),
        )
        .orderBy(asc(npc.name));
      return npcs;
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

      const questData = questResult[0];

      // Get all steps for this quest
      const steps = await ctx.db
        .select()
        .from(questStep)
        .where(eq(questStep.questId, input.id))
        .orderBy(questStep.stepIndex);

      // Get NPC information for giver and turnin NPCs
      let giverNpc = null;
      let turninNpc = null;

      if (questData.giverNpcId) {
        const giverResult = await ctx.db
          .select()
          .from(npc)
          .where(eq(npc.id, questData.giverNpcId))
          .limit(1);
        giverNpc = giverResult[0] || null;
      }

      if (questData.turninNpcId) {
        const turninResult = await ctx.db
          .select()
          .from(npc)
          .where(eq(npc.id, questData.turninNpcId))
          .limit(1);
        turninNpc = turninResult[0] || null;
      }

      // Get rewards for this quest
      const rewards = await ctx.db
        .select({
          id: questReward.id,
          questId: questReward.questId,
          rewardType: questReward.rewardType,
          itemId: questReward.itemId,
          quantity: questReward.quantity,
          amount: questReward.amount,
          itemName: items.name,
          itemSlug: items.slug,
        })
        .from(questReward)
        .leftJoin(items, eq(questReward.itemId, items.id))
        .where(eq(questReward.questId, input.id));

      return {
        quest: questData,
        steps,
        rewards,
        giverNpc,
        turninNpc,
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

  // ===== QUEST REWARDS =====

  // List rewards for a quest
  listRewards: requirePerm(permissions.QUEST_READ)
    .input(z.object({ questId: z.number() }))
    .query(async ({ input, ctx }) => {
      const rewards = await ctx.db
        .select({
          id: questReward.id,
          questId: questReward.questId,
          rewardType: questReward.rewardType,
          itemId: questReward.itemId,
          quantity: questReward.quantity,
          amount: questReward.amount,
          itemName: items.name,
          itemSlug: items.slug,
        })
        .from(questReward)
        .leftJoin(items, eq(questReward.itemId, items.id))
        .where(eq(questReward.questId, input.questId));

      return rewards;
    }),

  // Create reward
  createReward: requirePerm(permissions.QUEST_WRITE)
    .input(z.object({
      questId: z.number(),
      rewardType: z.enum(['item', 'gold', 'exp', 'currency']),
      itemId: z.number().nullable().optional(),
      quantity: z.number().min(1).default(1),
      amount: z.number().min(0).default(0),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await ctx.db
        .insert(questReward)
        .values(input)
        .returning();

      return result[0];
    }),

  // Update reward
  updateReward: requirePerm(permissions.QUEST_WRITE)
    .input(z.object({
      id: z.number(),
      rewardType: z.enum(['item', 'gold', 'exp', 'currency']).optional(),
      itemId: z.number().nullable().optional(),
      quantity: z.number().min(1).optional(),
      amount: z.number().min(0).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input;

      const result = await ctx.db
        .update(questReward)
        .set(updateData)
        .where(eq(questReward.id, id))
        .returning();

      if (!result[0]) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Quest reward not found' });
      }

      return result[0];
    }),

  // Delete reward
  deleteReward: requirePerm(permissions.QUEST_WRITE)
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const result = await ctx.db
        .delete(questReward)
        .where(eq(questReward.id, input.id))
        .returning();

      if (!result[0]) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Quest reward not found' });
      }

      return { success: true };
    }),
});