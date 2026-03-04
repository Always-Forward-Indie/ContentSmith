import { z } from 'zod';

// ─── Vendor NPC ───────────────────────────────────────────────────────────────

export const createVendorSchema = z.object({
  npcId: z.number().int().positive(),
  markupPct: z.number().int().min(0).max(1000).default(0),
});

export const updateVendorSchema = createVendorSchema.partial().extend({
  id: z.number().int().positive(),
});

export const vendorIdSchema = z.object({
  id: z.number().int().positive(),
});

// ─── Vendor Inventory ─────────────────────────────────────────────────────────

export const addVendorItemSchema = z.object({
  vendorNpcId: z.number().int().positive(),
  itemId: z.number().int().positive(),
  stockCount: z.number().int().default(-1),
  priceOverride: z.number().int().nullable().optional(),
});

export const updateVendorItemSchema = z.object({
  id: z.number().int().positive(),
  stockCount: z.number().int().optional(),
  priceOverride: z.number().int().nullable().optional(),
});

export const removeVendorItemSchema = z.object({
  id: z.number().int().positive(),
});

export type CreateVendorInput = z.infer<typeof createVendorSchema>;
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;
export type AddVendorItemInput = z.infer<typeof addVendorItemSchema>;
export type UpdateVendorItemInput = z.infer<typeof updateVendorItemSchema>;
