import { z } from 'zod'
import { createTRPCRouter, devRequirePermission } from '../trpc'
import { db } from '../db'
import { npc } from '@contentsmith/database'
import { like, or, desc, eq } from '@contentsmith/database'

// В режиме разработки используем dev процедуры
const isDev = process.env.NODE_ENV === 'development'
const requirePerm = (permission: string) => 
  isDev ? devRequirePermission(permission) : devRequirePermission(permission)

export const npcRouter = createTRPCRouter({
  // Get all NPCs with optional search
  list: requirePerm('npc:read')
    .input(z.object({
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      const baseQuery = db.select().from(npc)

      if (input.search) {
        const npcs = await baseQuery
          .where(
            or(
              like(npc.name, `%${input.search}%`),
              like(npc.slug, `%${input.search}%`)
            )
          )
          .orderBy(desc(npc.id))
          .limit(input.limit)
        return npcs
      }

      const npcs = await baseQuery
        .orderBy(desc(npc.id))
        .limit(input.limit)

      return npcs
    }),

  // Get NPC by ID
  getById: requirePerm('npc:read')
    .input(z.number())
    .query(async ({ input }) => {
      const result = await db.select().from(npc).where(eq(npc.id, input))
      return result[0] || null
    }),

  // Get NPCs by IDs (for batch operations)
  getByIds: requirePerm('npc:read')
    .input(z.array(z.number()))
    .query(async ({ input }) => {
      if (input.length === 0) return []
      
      const result = await db.select().from(npc).where(
        or(...input.map(id => eq(npc.id, id)))
      )
      return result
    }),
})