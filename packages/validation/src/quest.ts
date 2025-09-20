import { z } from 'zod';

// Quest step parameter schemas based on type
export const QuestStepParamsSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('collect'),
    itemId: z.string().min(1),
    count: z.number().min(1)
  }),
  z.object({
    type: z.literal('kill'),
    npcId: z.string().min(1),
    count: z.number().min(1)
  }),
  z.object({
    type: z.literal('talk'),
    npcId: z.string().min(1),
    dialogueId: z.string().optional()
  }),
  z.object({
    type: z.literal('reach'),
    mapId: z.string().min(1),
    x: z.number(),
    y: z.number(),
    radius: z.number().min(0).default(5)
  }),
  z.object({
    type: z.literal('custom'),
    script: z.string().min(1),
    params: z.record(z.unknown())
  })
]);

export const QuestStepSchema = z.object({
  id: z.number().optional(),
  questId: z.number(),
  stepIndex: z.number().min(0),
  stepType: z.enum(['collect', 'kill', 'talk', 'reach', 'custom']),
  params: z.record(z.unknown()), // Will be validated by QuestStepParamsSchema based on type
  clientStepKey: z.string().nullable().optional(),
});

export const QuestSchema = z.object({
  id: z.number().optional(),
  slug: z.string().min(1).max(255),
  minLevel: z.number().min(1).max(999).default(1),
  repeatable: z.boolean().default(false),
  cooldownSec: z.number().min(0).default(0),
  giverNpcId: z.number().nullable().optional(),
  turninNpcId: z.number().nullable().optional(),
  clientQuestKey: z.string().nullable().optional(),
});

export const CreateQuestSchema = QuestSchema.omit({ id: true });
export const UpdateQuestSchema = QuestSchema.partial().required({ id: true });

export const PlayerQuestSchema = z.object({
  playerId: z.number(),
  questId: z.number(),
  state: z.enum(['offered', 'active', 'completed', 'turned_in', 'failed']),
  currentStep: z.number().min(0).default(0),
  progress: z.record(z.unknown()).nullable().optional(),
});

export type QuestStepParams = z.infer<typeof QuestStepParamsSchema>;
export type QuestStep = z.infer<typeof QuestStepSchema>;
export type Quest = z.infer<typeof QuestSchema>;
export type CreateQuest = z.infer<typeof CreateQuestSchema>;
export type UpdateQuest = z.infer<typeof UpdateQuestSchema>;
export type PlayerQuest = z.infer<typeof PlayerQuestSchema>;