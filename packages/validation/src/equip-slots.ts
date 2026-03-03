import { z } from 'zod';

export const createEquipSlotSchema = z.object({
  name: z.string().min(1).max(50),
  slug: z.string().min(1).max(50),
});

export const updateEquipSlotSchema = createEquipSlotSchema.partial().extend({
  id: z.number().int().positive(),
});

export const getEquipSlotByIdSchema = z.object({
  id: z.number().int().positive(),
});

export const deleteEquipSlotSchema = z.object({
  id: z.number().int().positive(),
});

export const listEquipSlotsSchema = z.object({
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
  sortBy: z.enum(['id', 'name', 'slug']).default('id'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type CreateEquipSlotInput = z.infer<typeof createEquipSlotSchema>;
export type UpdateEquipSlotInput = z.infer<typeof updateEquipSlotSchema>;
export type GetEquipSlotByIdInput = z.infer<typeof getEquipSlotByIdSchema>;
export type DeleteEquipSlotInput = z.infer<typeof deleteEquipSlotSchema>;
export type ListEquipSlotsInput = z.infer<typeof listEquipSlotsSchema>;
