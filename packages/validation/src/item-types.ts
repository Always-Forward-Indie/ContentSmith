import { z } from 'zod';

// Base schema for item types
export const itemTypesBaseSchema = z.object({
  name: z.string().min(1).max(50),
  slug: z.string().min(1).max(50),
});

// Schema for creating item types
export const createItemTypesSchema = itemTypesBaseSchema;

// Schema for updating item types
export const updateItemTypesSchema = itemTypesBaseSchema.partial().extend({
  id: z.number().int().positive(),
});

// Schema for getting item types by ID
export const getItemTypesByIdSchema = z.object({
  id: z.number().int().positive(),
});

// Schema for deleting item types
export const deleteItemTypesSchema = z.object({
  id: z.number().int().positive(),
});

// Schema for listing item types with pagination and search
export const listItemTypesSchema = z.object({
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
  sortBy: z.enum(['id', 'name', 'slug']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

// Type exports
export type CreateItemTypesInput = z.infer<typeof createItemTypesSchema>;
export type UpdateItemTypesInput = z.infer<typeof updateItemTypesSchema>;
export type GetItemTypesByIdInput = z.infer<typeof getItemTypesByIdSchema>;
export type DeleteItemTypesInput = z.infer<typeof deleteItemTypesSchema>;
export type ListItemTypesInput = z.infer<typeof listItemTypesSchema>;