import { z } from 'zod';

// Item Type schemas
export const createItemTypeSchema = z.object({
  name: z.string().min(1).max(50),
  slug: z.string().min(1).max(50),
});

export const updateItemTypeSchema = createItemTypeSchema.partial();

export const itemTypeIdSchema = z.object({
  id: z.number().int().positive(),
});

// Item Rarity schemas
export const createItemRaritySchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(30),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
  slug: z.string().min(1).max(30).optional(),
});

export const updateItemRaritySchema = createItemRaritySchema.partial().omit({ id: true });

export const itemRarityIdSchema = z.object({
  id: z.number().int().positive(),
});

// Item Attributes schemas
export const createItemAttributeSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
});

export const updateItemAttributeSchema = createItemAttributeSchema.partial();

export const itemAttributeIdSchema = z.object({
  id: z.number().int().positive(),
});

export const itemAttributesListQuerySchema = z.object({
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(50),
  sortBy: z.enum(['name', 'slug']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

// Items Rarity schemas
export const createItemsRaritySchema = z.object({
  name: z.string().min(1).max(30),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
  slug: z.string().min(1).max(30).optional(),
});

export const updateItemsRaritySchema = createItemsRaritySchema.partial();

export const itemsRarityIdSchema = z.object({
  id: z.number().int().positive(),
});

export const itemsRarityListQuerySchema = z.object({
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(50),
  sortBy: z.enum(['name', 'slug', 'colorHex']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

// Item schemas
export const createItemSchema = z.object({
  name: z.string().min(1).max(50),
  slug: z.string().min(1).max(50),
  description: z.string().optional(),
  isQuestItem: z.boolean().default(false),
  itemType: z.number().int().positive(),
  weight: z.number().min(0).default(0.0),
  rarityId: z.number().int().positive().default(1),
  stackMax: z.number().int().positive().default(64),
  isContainer: z.boolean().default(false),
  isDurable: z.boolean().default(false),
  isTradable: z.boolean().default(true),
  durabilityMax: z.number().int().positive().default(100),
  vendorPriceBuy: z.number().int().positive().default(1),
  vendorPriceSell: z.number().int().positive().default(1),
  equipSlot: z.number().int().min(0).default(0).optional(),
  levelRequirement: z.number().int().min(0).default(0),
  isEquippable: z.boolean().default(false),
  isHarvest: z.boolean().default(false),
});

export const updateItemSchema = createItemSchema.partial();

export const itemIdSchema = z.object({
  id: z.number().int().positive(),
});

// Item Attributes Mapping schemas
export const createItemAttributeMappingSchema = z.object({
  itemId: z.number().int().positive(),
  attributeId: z.number().int().positive(),
  value: z.number().int(),
});

export const updateItemAttributeMappingSchema = createItemAttributeMappingSchema.partial().omit({ itemId: true, attributeId: true });

export const itemAttributeMappingIdSchema = z.object({
  id: z.number().int().positive(),
});

// Composite schemas for complex operations
export const itemWithAttributesSchema = createItemSchema.extend({
  attributes: z.array(z.object({
    attributeId: z.number().int().positive(),
    value: z.number().int(),
  })).default([]),
});

export const updateItemWithAttributesSchema = updateItemSchema.extend({
  attributes: z.array(z.object({
    attributeId: z.number().int().positive(),
    value: z.number().int(),
  })).optional(),
});

// Query/Filter schemas
export const itemsListQuerySchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  itemType: z.number().int().positive().optional(),
  rarityId: z.number().int().positive().optional(),
  isQuestItem: z.boolean().optional(),
  isEquippable: z.boolean().optional(),
  sortBy: z.enum(['name', 'weight', 'vendorPriceBuy', 'vendorPriceSell', 'levelRequirement']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

// Type exports
export type CreateItemType = z.infer<typeof createItemTypeSchema>;
export type UpdateItemType = z.infer<typeof updateItemTypeSchema>;
export type ItemTypeId = z.infer<typeof itemTypeIdSchema>;

export type CreateItemRarity = z.infer<typeof createItemRaritySchema>;
export type UpdateItemRarity = z.infer<typeof updateItemRaritySchema>;
export type ItemRarityId = z.infer<typeof itemRarityIdSchema>;

export type CreateItemAttribute = z.infer<typeof createItemAttributeSchema>;
export type UpdateItemAttribute = z.infer<typeof updateItemAttributeSchema>;
export type ItemAttributeId = z.infer<typeof itemAttributeIdSchema>;

export type CreateItem = z.infer<typeof createItemSchema>;
export type UpdateItem = z.infer<typeof updateItemSchema>;
export type ItemId = z.infer<typeof itemIdSchema>;

export type CreateItemAttributeMapping = z.infer<typeof createItemAttributeMappingSchema>;
export type UpdateItemAttributeMapping = z.infer<typeof updateItemAttributeMappingSchema>;
export type ItemAttributeMappingId = z.infer<typeof itemAttributeMappingIdSchema>;

export type ItemWithAttributes = z.infer<typeof itemWithAttributesSchema>;
export type UpdateItemWithAttributes = z.infer<typeof updateItemWithAttributesSchema>;
export type ItemsListQuery = z.infer<typeof itemsListQuerySchema>;