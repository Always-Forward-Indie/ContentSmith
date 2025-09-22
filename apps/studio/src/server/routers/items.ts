import { z } from 'zod';
import { createTRPCRouter, devRequirePermission } from '../trpc';
import { db } from '../db';
import {
  items,
  itemTypes,
  itemsRarity,
  itemAttributes,
  itemAttributesMapping,
} from '@contentsmith/database';
import { like, or, desc, asc, eq, and, sql } from '@contentsmith/database';
import {
  itemsListQuerySchema,
  createItemSchema,
  updateItemSchema,
  itemIdSchema,
  createItemTypeSchema,
  updateItemTypeSchema,
  itemTypeIdSchema,
  createItemRaritySchema,
  updateItemRaritySchema,
  itemRarityIdSchema,
  createItemAttributeSchema,
  updateItemAttributeSchema,
  itemAttributeIdSchema,
  createItemAttributeMappingSchema,
  updateItemAttributeMappingSchema,
  itemAttributeMappingIdSchema,
  itemWithAttributesSchema,
  updateItemWithAttributesSchema,
} from '@contentsmith/validation';
import { TRPCError } from '@trpc/server';

// В режиме разработки используем dev процедуры
const isDev = process.env.NODE_ENV === 'development';
const requirePerm = (permission: string) => 
  isDev ? devRequirePermission(permission) : devRequirePermission(permission);

export const itemsRouter = createTRPCRouter({
  // ===== ITEMS =====
  list: requirePerm('items:read')
    .input(itemsListQuerySchema)
    .query(async ({ input }) => {
      const { page, limit, search, itemType, rarityId, isQuestItem, isEquippable, sortBy, sortOrder } = input;
      const offset = (page - 1) * limit;

      // Build where conditions
      const conditions = [];
      
      if (search) {
        conditions.push(
          or(
            like(items.name, `%${search}%`),
            like(items.slug, `%${search}%`),
            like(items.description, `%${search}%`)
          )
        );
      }
      
      if (itemType) {
        conditions.push(eq(items.itemType, itemType));
      }
      
      if (rarityId) {
        conditions.push(eq(items.rarityId, rarityId));
      }
      
      if (isQuestItem !== undefined) {
        conditions.push(eq(items.isQuestItem, isQuestItem));
      }
      
      if (isEquippable !== undefined) {
        conditions.push(eq(items.isEquippable, isEquippable));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      // Build order clause
      const orderByMap: Record<string, any> = {
        name: items.name,
        weight: items.weight,
        vendorPriceBuy: items.vendorPriceBuy,
        vendorPriceSell: items.vendorPriceSell,
        levelRequirement: items.levelRequirement,
      };
      
      const orderBy = sortOrder === 'desc' 
        ? desc(orderByMap[sortBy]) 
        : asc(orderByMap[sortBy]);

      // Get items with related data
      const itemsList = await db
        .select({
          id: items.id,
          name: items.name,
          slug: items.slug,
          description: items.description,
          isQuestItem: items.isQuestItem,
          itemType: items.itemType,
          weight: items.weight,
          rarityId: items.rarityId,
          stackMax: items.stackMax,
          isContainer: items.isContainer,
          isDurable: items.isDurable,
          isTradable: items.isTradable,
          durabilityMax: items.durabilityMax,
          vendorPriceBuy: items.vendorPriceBuy,
          vendorPriceSell: items.vendorPriceSell,
          equipSlot: items.equipSlot,
          levelRequirement: items.levelRequirement,
          isEquippable: items.isEquippable,
          isHarvest: items.isHarvest,
          typeName: itemTypes.name,
          typeSlug: itemTypes.slug,
          rarityName: itemsRarity.name,
          rarityColorHex: itemsRarity.colorHex,
          raritySlug: itemsRarity.slug,
        })
        .from(items)
        .leftJoin(itemTypes, eq(items.itemType, itemTypes.id))
        .leftJoin(itemsRarity, eq(items.rarityId, itemsRarity.id))
        .where(whereClause)
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(items)
        .where(whereClause);

      return {
        items: itemsList,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
        },
      };
    }),

  getById: requirePerm('items:read')
    .input(itemIdSchema)
    .query(async ({ input }) => {
      const item = await db
        .select({
          id: items.id,
          name: items.name,
          slug: items.slug,
          description: items.description,
          isQuestItem: items.isQuestItem,
          itemType: items.itemType,
          weight: items.weight,
          rarityId: items.rarityId,
          stackMax: items.stackMax,
          isContainer: items.isContainer,
          isDurable: items.isDurable,
          isTradable: items.isTradable,
          durabilityMax: items.durabilityMax,
          vendorPriceBuy: items.vendorPriceBuy,
          vendorPriceSell: items.vendorPriceSell,
          equipSlot: items.equipSlot,
          levelRequirement: items.levelRequirement,
          isEquippable: items.isEquippable,
          isHarvest: items.isHarvest,
          typeName: itemTypes.name,
          typeSlug: itemTypes.slug,
          rarityName: itemsRarity.name,
          rarityColorHex: itemsRarity.colorHex,
          raritySlug: itemsRarity.slug,
        })
        .from(items)
        .leftJoin(itemTypes, eq(items.itemType, itemTypes.id))
        .leftJoin(itemsRarity, eq(items.rarityId, itemsRarity.id))
        .where(eq(items.id, input.id))
        .limit(1);

      if (!item.length) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Item not found',
        });
      }

      // Get item attributes
      const attributes = await db
        .select({
          id: itemAttributesMapping.id,
          attributeId: itemAttributesMapping.attributeId,
          value: itemAttributesMapping.value,
          attributeName: itemAttributes.name,
          attributeSlug: itemAttributes.slug,
        })
        .from(itemAttributesMapping)
        .leftJoin(itemAttributes, eq(itemAttributesMapping.attributeId, itemAttributes.id))
        .where(eq(itemAttributesMapping.itemId, input.id));

      return {
        ...item[0],
        attributes,
      };
    }),

  create: requirePerm('items:write')
    .input(itemWithAttributesSchema)
    .mutation(async ({ input }) => {
      const { attributes, ...itemData } = input;

      return await db.transaction(async (tx) => {
        // Create the item
        const [newItem] = await tx
          .insert(items)
          .values(itemData)
          .returning();

        // Add attributes if provided
        if (attributes && attributes.length > 0) {
          await tx
            .insert(itemAttributesMapping)
            .values(
              attributes.map((attr: any) => ({
                itemId: newItem.id,
                attributeId: attr.attributeId,
                value: attr.value,
              }))
            );
        }

        return newItem;
      });
    }),

  update: requirePerm('items:write')
    .input(z.object({
      id: z.number().int().positive(),
      data: updateItemWithAttributesSchema,
    }))
    .mutation(async ({ input }) => {
      const { id, data } = input;
      const { attributes, ...itemData } = data;

      return await db.transaction(async (tx) => {
        // Update the item
        const [updatedItem] = await tx
          .update(items)
          .set(itemData)
          .where(eq(items.id, id))
          .returning();

        if (!updatedItem) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Item not found',
          });
        }

        // Update attributes if provided
        if (attributes !== undefined) {
          // Remove existing attributes
          await tx
            .delete(itemAttributesMapping)
            .where(eq(itemAttributesMapping.itemId, id));

          // Add new attributes
          if (attributes.length > 0) {
            await tx
              .insert(itemAttributesMapping)
              .values(
                attributes.map((attr: any) => ({
                  itemId: id,
                  attributeId: attr.attributeId,
                  value: attr.value,
                }))
              );
          }
        }

        return updatedItem;
      });
    }),

  delete: requirePerm('items:delete')
    .input(itemIdSchema)
    .mutation(async ({ input }) => {
      const [deletedItem] = await db
        .delete(items)
        .where(eq(items.id, input.id))
        .returning();

      if (!deletedItem) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Item not found',
        });
      }

      return deletedItem;
    }),

  // ===== ITEM TYPES =====
  types: createTRPCRouter({
    list: requirePerm('items:read')
      .query(async () => {
        return await db
          .select()
          .from(itemTypes)
          .orderBy(asc(itemTypes.name));
      }),

    getById: requirePerm('items:read')
      .input(itemTypeIdSchema)
      .query(async ({ input }) => {
        const [itemType] = await db
          .select()
          .from(itemTypes)
          .where(eq(itemTypes.id, input.id))
          .limit(1);

        if (!itemType) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Item type not found',
          });
        }

        return itemType;
      }),

    create: requirePerm('items:write')
      .input(createItemTypeSchema)
      .mutation(async ({ input }) => {
        const [newItemType] = await db
          .insert(itemTypes)
          .values(input)
          .returning();

        return newItemType;
      }),

    update: requirePerm('items:write')
      .input(z.object({
        id: z.number().int().positive(),
        data: updateItemTypeSchema,
      }))
      .mutation(async ({ input }) => {
        const [updatedItemType] = await db
          .update(itemTypes)
          .set(input.data)
          .where(eq(itemTypes.id, input.id))
          .returning();

        if (!updatedItemType) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Item type not found',
          });
        }

        return updatedItemType;
      }),

    delete: requirePerm('items:delete')
      .input(itemTypeIdSchema)
      .mutation(async ({ input }) => {
        const [deletedItemType] = await db
          .delete(itemTypes)
          .where(eq(itemTypes.id, input.id))
          .returning();

        if (!deletedItemType) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Item type not found',
          });
        }

        return deletedItemType;
      }),
  }),

  // ===== ITEM RARITIES =====
  rarities: createTRPCRouter({
    list: requirePerm('items:read')
      .query(async () => {
        return await db
          .select()
          .from(itemsRarity)
          .orderBy(asc(itemsRarity.id));
      }),

    getById: requirePerm('items:read')
      .input(itemRarityIdSchema)
      .query(async ({ input }) => {
        const [rarity] = await db
          .select()
          .from(itemsRarity)
          .where(eq(itemsRarity.id, input.id))
          .limit(1);

        if (!rarity) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Item rarity not found',
          });
        }

        return rarity;
      }),

    create: requirePerm('items:write')
      .input(createItemRaritySchema)
      .mutation(async ({ input }) => {
        const [newRarity] = await db
          .insert(itemsRarity)
          .values(input)
          .returning();

        return newRarity;
      }),

    update: requirePerm('items:write')
      .input(z.object({
        id: z.number().int().positive(),
        data: updateItemRaritySchema,
      }))
      .mutation(async ({ input }) => {
        const [updatedRarity] = await db
          .update(itemsRarity)
          .set(input.data)
          .where(eq(itemsRarity.id, input.id))
          .returning();

        if (!updatedRarity) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Item rarity not found',
          });
        }

        return updatedRarity;
      }),

    delete: requirePerm('items:delete')
      .input(itemRarityIdSchema)
      .mutation(async ({ input }) => {
        const [deletedRarity] = await db
          .delete(itemsRarity)
          .where(eq(itemsRarity.id, input.id))
          .returning();

        if (!deletedRarity) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Item rarity not found',
          });
        }

        return deletedRarity;
      }),
  }),

  // ===== ITEM ATTRIBUTES =====
  attributes: createTRPCRouter({
    list: requirePerm('items:read')
      .query(async () => {
        return await db
          .select()
          .from(itemAttributes)
          .orderBy(asc(itemAttributes.name));
      }),

    getById: requirePerm('items:read')
      .input(itemAttributeIdSchema)
      .query(async ({ input }) => {
        const [attribute] = await db
          .select()
          .from(itemAttributes)
          .where(eq(itemAttributes.id, input.id))
          .limit(1);

        if (!attribute) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Item attribute not found',
          });
        }

        return attribute;
      }),

    create: requirePerm('items:write')
      .input(createItemAttributeSchema)
      .mutation(async ({ input }) => {
        const [newAttribute] = await db
          .insert(itemAttributes)
          .values(input)
          .returning();

        return newAttribute;
      }),

    update: requirePerm('items:write')
      .input(z.object({
        id: z.number().int().positive(),
        data: updateItemAttributeSchema,
      }))
      .mutation(async ({ input }) => {
        const [updatedAttribute] = await db
          .update(itemAttributes)
          .set(input.data)
          .where(eq(itemAttributes.id, input.id))
          .returning();

        if (!updatedAttribute) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Item attribute not found',
          });
        }

        return updatedAttribute;
      }),

    delete: requirePerm('items:delete')
      .input(itemAttributeIdSchema)
      .mutation(async ({ input }) => {
        const [deletedAttribute] = await db
          .delete(itemAttributes)
          .where(eq(itemAttributes.id, input.id))
          .returning();

        if (!deletedAttribute) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Item attribute not found',
          });
        }

        return deletedAttribute;
      }),
  }),
});