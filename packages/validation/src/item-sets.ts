import { z } from 'zod';

export const itemSetSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(128),
  slug: z.string().min(1).max(128),
});

export const createItemSetSchema = itemSetSchema.omit({ id: true });
export const updateItemSetSchema = itemSetSchema.partial().required({ id: true });
export const itemSetIdSchema = z.object({ id: z.number().int().positive() });
export const itemSetListQuerySchema = z.object({
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const addItemToSetSchema = z.object({
  setId: z.number().int().positive(),
  itemId: z.number().int().positive(),
});

export const removeItemFromSetSchema = z.object({
  setId: z.number().int().positive(),
  itemId: z.number().int().positive(),
});

export const itemSetBonusSchema = z.object({
  id: z.number().int().positive(),
  setId: z.number().int().positive(),
  piecesRequired: z.number().int().positive(),
  attributeId: z.number().int().positive(),
  bonusValue: z.number().int(),
});
export const createItemSetBonusSchema = itemSetBonusSchema.omit({ id: true });
export const updateItemSetBonusSchema = itemSetBonusSchema.partial().required({ id: true });
