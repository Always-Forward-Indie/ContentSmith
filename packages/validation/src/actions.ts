import { z } from 'zod';

// Basic action types for game events
export const ActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('give_item'),
    itemId: z.string().min(1),
    count: z.number().min(1).default(1)
  }),
  z.object({
    type: z.literal('remove_item'),
    itemId: z.string().min(1),
    count: z.number().min(1).default(1)
  }),
  z.object({
    type: z.literal('give_exp'),
    amount: z.number().min(0)
  }),
  z.object({
    type: z.literal('set_flag'),
    key: z.string().min(1),
    value: z.union([z.boolean(), z.number()])
  }),
  z.object({
    type: z.literal('start_quest'),
    questId: z.string().min(1)
  }),
  z.object({
    type: z.literal('complete_quest'),
    questId: z.string().min(1)
  }),
  z.object({
    type: z.literal('teleport'),
    mapId: z.string().min(1),
    x: z.number(),
    y: z.number(),
    z: z.number().optional()
  }),
  z.object({
    type: z.literal('play_sound'),
    soundId: z.string().min(1)
  }),
  z.object({
    type: z.literal('play_animation'),
    animationId: z.string().min(1),
    target: z.enum(['player', 'npc']).default('npc')
  }),
  z.object({
    type: z.literal('show_message'),
    messageKey: z.string().min(1),
    duration: z.number().min(0).default(3000)
  }),
  z.object({
    type: z.literal('custom'),
    script: z.string().min(1),
    params: z.record(z.unknown()).optional()
  })
]);

export const ActionGroupSchema = z.array(ActionSchema);

export type Action = z.infer<typeof ActionSchema>;
export type ActionGroup = z.infer<typeof ActionGroupSchema>;