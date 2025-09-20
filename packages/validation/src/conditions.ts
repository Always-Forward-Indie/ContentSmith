import { z } from 'zod';

// Basic condition types for game logic
export const ConditionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('quest_state'),
    questId: z.string().min(1),
    state: z.enum(['offered', 'active', 'completed', 'turned_in', 'failed'])
  }),
  z.object({
    type: z.literal('player_level'),
    operator: z.enum(['>=', '<=', '==', '>', '<']),
    value: z.number().min(1).max(999)
  }),
  z.object({
    type: z.literal('flag'),
    key: z.string().min(1),
    value: z.union([z.boolean(), z.number()])
  }),
  z.object({
    type: z.literal('item_count'),
    itemId: z.string().min(1),
    count: z.number().min(0),
    operator: z.enum(['>=', '<=', '=='])
  }),
  z.object({
    type: z.literal('has_item'),
    itemId: z.string().min(1)
  }),
  z.object({
    type: z.literal('class'),
    classId: z.string().min(1)
  }),
  z.object({
    type: z.literal('faction'),
    factionId: z.string().min(1),
    standing: z.number().optional()
  })
]);

export const ConditionGroupSchema: z.ZodType<{
  op: 'AND' | 'OR' | 'NOT';
  items: Array<z.infer<typeof ConditionSchema> | {
    op: 'AND' | 'OR' | 'NOT';
    items: any[];
  }>;
}> = z.object({
  op: z.enum(['AND', 'OR', 'NOT']),
  items: z.array(z.union([
    ConditionSchema,
    z.lazy(() => ConditionGroupSchema)
  ]))
});

export type Condition = z.infer<typeof ConditionSchema>;
export type ConditionGroup = z.infer<typeof ConditionGroupSchema>;