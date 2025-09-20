import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, requirePermission, devRequirePermission, permissions } from '../trpc';
import { 
  DialogueSchema, 
  CreateDialogueSchema, 
  UpdateDialogueSchema,
  DialogueNodeSchema,
  DialogueNodeBaseSchema,
  DialogueEdgeSchema
} from '@contentsmith/validation';
import { dialogue, dialogueNode, dialogueEdge } from '@contentsmith/database';
import { eq, desc, like, or, inArray } from '@contentsmith/database';

// В режиме разработки используем dev процедуры
const isDev = process.env.NODE_ENV === 'development';
const requirePerm = (permission: string) => 
  isDev ? devRequirePermission(permission) : requirePermission(permission);

export const dialogueRouter = createTRPCRouter({
  // Get all dialogues with pagination
  list: requirePerm(permissions.DIALOGUE_READ)
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(10),
      search: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const offset = (input.page - 1) * input.limit;
      
      const whereClause = input.search 
        ? like(dialogue.slug, `%${input.search}%`)
        : undefined;
      
      const dialogues = await ctx.db.select()
        .from(dialogue)
        .where(whereClause)
        .limit(input.limit)
        .offset(offset)
        .orderBy(desc(dialogue.id));
      
      return {
        data: dialogues,
        pagination: {
          page: input.page,
          limit: input.limit,
          total: dialogues.length, // TODO: Get actual count
        },
      };
    }),

  // Get single dialogue by ID
  byId: requirePerm(permissions.DIALOGUE_READ)
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const result = await ctx.db
        .select()
        .from(dialogue)
        .where(eq(dialogue.id, input.id))
        .limit(1);
      
      if (!result[0]) {
        throw new TRPCError({ 
          code: 'NOT_FOUND', 
          message: 'Dialogue not found' 
        });
      }
      
      return result[0];
    }),

  // Get dialogue with all nodes and edges
  getGraph: requirePerm(permissions.DIALOGUE_READ)
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      // Get dialogue
      const dialogueResult = await ctx.db
        .select()
        .from(dialogue)
        .where(eq(dialogue.id, input.id))
        .limit(1);
      
      if (!dialogueResult[0]) {
        throw new TRPCError({ 
          code: 'NOT_FOUND', 
          message: 'Dialogue not found' 
        });
      }

      // Get all nodes for this dialogue
      const nodes = await ctx.db
        .select()
        .from(dialogueNode)
        .where(eq(dialogueNode.dialogueId, input.id));

      // Get all edges for this dialogue's nodes
      const nodeIds = nodes.map(n => n.id);
      const edges = nodeIds.length > 0 
        ? await ctx.db
            .select()
            .from(dialogueEdge)
            .where(inArray(dialogueEdge.fromNodeId, nodeIds))
        : [];

      return {
        dialogue: dialogueResult[0],
        nodes,
        edges,
      };
    }),

  // Create new dialogue
  create: requirePerm(permissions.DIALOGUE_WRITE)
    .input(CreateDialogueSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await ctx.db
        .insert(dialogue)
        .values(input)
        .returning();
      
      return result[0];
    }),

  // Update dialogue
  update: requirePerm(permissions.DIALOGUE_WRITE)
    .input(UpdateDialogueSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input;
      
      const result = await ctx.db
        .update(dialogue)
        .set(updateData)
        .where(eq(dialogue.id, id))
        .returning();
      
      if (!result[0]) {
        throw new TRPCError({ 
          code: 'NOT_FOUND', 
          message: 'Dialogue not found' 
        });
      }
      
      return result[0];
    }),

  // Delete dialogue
  delete: requirePerm(permissions.DIALOGUE_WRITE)
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const result = await ctx.db
        .delete(dialogue)
        .where(eq(dialogue.id, input.id))
        .returning();
      
      if (!result[0]) {
        throw new TRPCError({ 
          code: 'NOT_FOUND', 
          message: 'Dialogue not found' 
        });
      }
      
      return { success: true };
    }),

  // Node operations
  createNode: requirePerm(permissions.DIALOGUE_WRITE)
    .input(DialogueNodeBaseSchema.omit({ id: true }))
    .mutation(async ({ input, ctx }) => {
      const result = await ctx.db
        .insert(dialogueNode)
        .values(input)
        .returning();
      
      return result[0];
    }),

  updateNode: requirePerm(permissions.DIALOGUE_WRITE)
    .input(DialogueNodeBaseSchema.required({ id: true }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input;
      
      const result = await ctx.db
        .update(dialogueNode)
        .set(updateData)
        .where(eq(dialogueNode.id, id))
        .returning();
      
      if (!result[0]) {
        throw new TRPCError({ 
          code: 'NOT_FOUND', 
          message: 'Node not found' 
        });
      }
      
      return result[0];
    }),

  deleteNode: requirePerm(permissions.DIALOGUE_WRITE)
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // First delete all edges connected to this node
      await ctx.db
        .delete(dialogueEdge)
        .where(or(
          eq(dialogueEdge.fromNodeId, input.id),
          eq(dialogueEdge.toNodeId, input.id)
        ));
      
      // Then delete the node
      const result = await ctx.db
        .delete(dialogueNode)
        .where(eq(dialogueNode.id, input.id))
        .returning();
      
      if (!result[0]) {
        throw new TRPCError({ 
          code: 'NOT_FOUND', 
          message: 'Node not found' 
        });
      }
      
      return { success: true };
    }),

  // Edge operations
  createEdge: requirePerm(permissions.DIALOGUE_WRITE)
    .input(DialogueEdgeSchema.omit({ id: true }))
    .mutation(async ({ input, ctx }) => {
      const result = await ctx.db
        .insert(dialogueEdge)
        .values(input)
        .returning();
      
      return result[0];
    }),

  updateEdge: requirePerm(permissions.DIALOGUE_WRITE)
    .input(DialogueEdgeSchema.required({ id: true }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input;
      
      const result = await ctx.db
        .update(dialogueEdge)
        .set(updateData)
        .where(eq(dialogueEdge.id, id))
        .returning();
      
      if (!result[0]) {
        throw new TRPCError({ 
          code: 'NOT_FOUND', 
          message: 'Edge not found' 
        });
      }
      
      return result[0];
    }),

  deleteEdge: requirePerm(permissions.DIALOGUE_WRITE)
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const result = await ctx.db
        .delete(dialogueEdge)
        .where(eq(dialogueEdge.id, input.id))
        .returning();
      
      if (!result[0]) {
        throw new TRPCError({ 
          code: 'NOT_FOUND', 
          message: 'Edge not found' 
        });
      }
      
      return { success: true };
    }),

  // Simplified save - just save individual operations
  saveNode: requirePerm(permissions.DIALOGUE_WRITE)
    .input(z.object({
      dialogueId: z.number(),
      id: z.number().optional(),
      type: z.enum(['line', 'choice_hub', 'action', 'jump', 'end']),
      clientNodeKey: z.string(),
      speakerNpcId: z.number().nullable(),
      conditionGroup: z.any().nullable(),
      actionGroup: z.any().nullable(),
      jumpTargetNodeId: z.number().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...nodeData } = input;

      if (id) {
        // Update existing node
        const result = await ctx.db
          .update(dialogueNode)
          .set(nodeData)
          .where(eq(dialogueNode.id, id))
          .returning();
        return result[0];
      } else {
        // Create new node
        const result = await ctx.db
          .insert(dialogueNode)
          .values(nodeData)
          .returning();
        return result[0];
      }
    }),

  saveEdge: requirePerm(permissions.DIALOGUE_WRITE)
    .input(z.object({
      id: z.number().optional(),
      fromNodeId: z.number(),
      toNodeId: z.number(),
      clientChoiceKey: z.string().optional(),
      conditionGroup: z.any().nullable().optional(),
      actionGroup: z.any().nullable().optional(),
      orderIndex: z.number().optional(),
      hideIfLocked: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...edgeData } = input;

      if (id) {
        // Update existing edge
        const result = await ctx.db
          .update(dialogueEdge)
          .set(edgeData)
          .where(eq(dialogueEdge.id, id))
          .returning();
        return result[0];
      } else {
        // Create new edge
        const result = await ctx.db
          .insert(dialogueEdge)
          .values(edgeData)
          .returning();
        return result[0];
      }
    }),

  deleteAllEdgesForDialogue: requirePerm(permissions.DIALOGUE_WRITE)
    .input(z.object({ dialogueId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // Get all nodes for this dialogue
      const nodes = await ctx.db
        .select({ id: dialogueNode.id })
        .from(dialogueNode)
        .where(eq(dialogueNode.dialogueId, input.dialogueId));

      if (nodes.length > 0) {
        const nodeIds = nodes.map(n => n.id);
        // Delete all edges that involve these nodes
        await ctx.db
          .delete(dialogueEdge)
          .where(inArray(dialogueEdge.fromNodeId, nodeIds));
      }

      return { success: true };
    }),
});