import { z } from 'zod';

export const upsertExpForLevelSchema = z.object({
  level: z.number().int().min(1),
  experiencePoints: z.number().int().min(0),
});

export const bulkUpsertExpForLevelSchema = z.object({
  entries: z.array(upsertExpForLevelSchema).min(1),
});

export const deleteExpForLevelSchema = z.object({
  level: z.number().int().min(1),
});

export type UpsertExpForLevelInput = z.infer<typeof upsertExpForLevelSchema>;
export type BulkUpsertExpForLevelInput = z.infer<typeof bulkUpsertExpForLevelSchema>;
