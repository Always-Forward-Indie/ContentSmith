import { z } from 'zod';
import { eq, and, sql, or, ilike, isNull } from 'drizzle-orm';
import { createTRPCRouter, gmProcedure } from '../trpc';
import { characters, characterClass, race, expForLevel, characterPermanentModifiers, entityAttributes, characterSkills, users, characterPosition, characterCurrentState, classStatFormula, classSkillTree, skills, playerInventory, characterEquipment, playerQuest, playerFlag, playerActiveEffect, characterTitles, characterReputation, characterPity, characterBestiary, characterEmotes, characterSkillMastery, characterSkillBar, currencyTransactions, gameAnalytics } from '../schema';
import { logGmAction } from '../utils/gmLog';

export const charactersRouter = createTRPCRouter({
  // Полная карточка персонажа
  byId: gmProcedure
    .input(z.object({ characterId: z.number() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          id: characters.id,
          name: characters.name,
          ownerId: characters.ownerId,
          ownerLogin: users.login,
          classId: characters.classId,
          className: characterClass.name,
          raceId: characters.raceId,
          raceName: race.name,
          level: characters.level,
          experiencePoints: characters.experiencePoints,
          // Текущее состояние (из character_current_state)
          currentHealth: characterCurrentState.currentHealth,
          currentMana: characterCurrentState.currentMana,
          isDead: characterCurrentState.isDead,
          gender: characters.gender,
          freeSkillPoints: characters.freeSkillPoints,
          totalPlayTimeSec: characters.totalPlayTimeSec,
          accountSlot: characters.accountSlot,
          createdAt: characters.createdAt,
          lastOnlineAt: characters.lastOnlineAt,
          // Живое состояние из character_current_state (тот же источник)
          liveHealth: characterCurrentState.currentHealth,
          liveMana: characterCurrentState.currentMana,
          liveDead: characterCurrentState.isDead,
          liveUpdatedAt: characterCurrentState.updatedAt,
          // Максимальные HP/MP из character_permanent_modifiers
          maxHealth: sql<number | null>`(SELECT cpm.value::integer FROM character_permanent_modifiers cpm JOIN entity_attributes ea ON ea.id = cpm.attribute_id WHERE cpm.character_id = ${characters.id} AND ea.name = 'Maximum Health' LIMIT 1)`,
          maxMana: sql<number | null>`(SELECT cpm.value::integer FROM character_permanent_modifiers cpm JOIN entity_attributes ea ON ea.id = cpm.attribute_id WHERE cpm.character_id = ${characters.id} AND ea.name = 'Maximum Mana' LIMIT 1)`,
          // Позиция
          posX: characterPosition.x,
          posY: characterPosition.y,
          posZ: characterPosition.z,
          posRotZ: characterPosition.rotZ,
          posZoneId: characterPosition.zoneId,
        })
        .from(characters)
        .leftJoin(characterClass, eq(characterClass.id, characters.classId))
        .leftJoin(race, eq(race.id, characters.raceId))
        .leftJoin(users, eq(users.id, characters.ownerId))
        .leftJoin(characterCurrentState, eq(characterCurrentState.characterId, characters.id))
        .leftJoin(characterPosition, eq(characterPosition.characterId, characters.id))
        .where(eq(characters.id, input.characterId));
      return rows[0] ?? null;
    }),

  // Формула роста статов класса
  classStatFormula: gmProcedure
    .input(z.object({ classId: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          attributeId: classStatFormula.attributeId,
          attributeName: entityAttributes.name,
          baseValue: classStatFormula.baseValue,
          multiplier: classStatFormula.multiplier,
          exponent: classStatFormula.exponent,
        })
        .from(classStatFormula)
        .leftJoin(entityAttributes, eq(entityAttributes.id, classStatFormula.attributeId))
        .where(eq(classStatFormula.classId, input.classId))
        .orderBy(entityAttributes.name);
    }),

  // Древо скилов класса
  classSkillTree: gmProcedure
    .input(z.object({ classId: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          id: classSkillTree.id,
          skillId: classSkillTree.skillId,
          skillName: skills.name,
          skillSlug: skills.slug,
          requiredLevel: classSkillTree.requiredLevel,
          isDefault: classSkillTree.isDefault,
        })
        .from(classSkillTree)
        .leftJoin(skills, eq(skills.id, classSkillTree.skillId))
        .where(eq(classSkillTree.classId, input.classId))
        .orderBy(classSkillTree.requiredLevel);
    }),

  // Воскресить персонажа (is_dead = false, HP/MP = текущий уровень × 10)
  revive: gmProcedure
    .input(z.object({ characterId: z.number(), gmUserId: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const char = await ctx.db
        .select({ level: characters.level })
        .from(characters)
        .where(eq(characters.id, input.characterId))
        .then(r => r[0]);
      if (!char) throw new Error('Character not found');
      const baseHp = char.level * 10;
      await ctx.db
        .insert(characterCurrentState)
        .values({ characterId: input.characterId, currentHealth: baseHp, currentMana: baseHp, isDead: false })
        .onConflictDoUpdate({
          target: characterCurrentState.characterId,
          set: { isDead: false, currentHealth: baseHp, currentMana: baseHp, updatedAt: new Date() },
        });
      await logGmAction({ actionType: 'revive_character', targetType: 'character', targetId: input.characterId, gmUserId: input.gmUserId ?? null });
      return { success: true };
    }),

  // Изменить уровень (пересчитывает experience_points по exp_for_level)
  setLevel: gmProcedure
    .input(z.object({ characterId: z.number(), level: z.number().min(1), gmUserId: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const expRow = await ctx.db
        .select({ experiencePoints: expForLevel.experiencePoints })
        .from(expForLevel)
        .where(eq(expForLevel.level, input.level))
        .then(r => r[0]);

      const experiencePoints = expRow?.experiencePoints ?? 0;

      await ctx.db
        .update(characters)
        .set({ level: input.level, experiencePoints })
        .where(eq(characters.id, input.characterId));
      await logGmAction({ actionType: 'set_character_level', targetType: 'character', targetId: input.characterId, newValue: { level: input.level, experiencePoints }, gmUserId: input.gmUserId ?? null });
      return { success: true, experiencePoints };
    }),

  // Создать персонажа для аккаунта
  create: gmProcedure
    .input(z.object({
      ownerId: z.number(),
      name: z.string().min(1).max(20),
      classId: z.number(),
      raceId: z.number(),
      level: z.number().min(1).default(1),
      gmUserId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const expRow = await ctx.db
        .select({ experiencePoints: expForLevel.experiencePoints })
        .from(expForLevel)
        .where(eq(expForLevel.level, input.level))
        .then(r => r[0]);
      const experiencePoints = expRow?.experiencePoints ?? 0;
      const hp = input.level * 10;
      const [created] = await ctx.db
        .insert(characters)
        .values({
          name: input.name,
          ownerId: input.ownerId,
          classId: input.classId,
          raceId: input.raceId,
          level: input.level,
          experiencePoints,
          radius: 100,
        })
        .returning({ id: characters.id });

      // Инициализировать character_permanent_modifiers
      await ctx.db.insert(characterCurrentState).values({
        characterId: created!.id,
        currentHealth: hp,
        currentMana: hp,
        isDead: false,
      });

      // Инициализировать все атрибуты значением 1
      const allAttrs = await ctx.db.select({ id: entityAttributes.id }).from(entityAttributes);
      if (allAttrs.length > 0) {
        await ctx.db.insert(characterPermanentModifiers).values(
          allAttrs.map(a => ({ characterId: created!.id, attributeId: a.id, value: '1', sourceType: 'gm' }))
        );
      }

      await logGmAction({ actionType: 'create_character', targetType: 'character', targetId: created!.id, newValue: { name: input.name, ownerId: input.ownerId, classId: input.classId, raceId: input.raceId, level: input.level }, gmUserId: input.gmUserId ?? null });
      return { success: true, characterId: created!.id };
    }),

  // Обновить поля персонажа
  update: gmProcedure
    .input(z.object({
      characterId: z.number(),
      name: z.string().min(1).max(20).optional(),
      classId: z.number().optional(),
      raceId: z.number().optional(),
      level: z.number().min(1).optional(),
      experiencePoints: z.number().min(0).optional(),
      currentHealth: z.number().min(0).optional(),
      currentMana: z.number().min(0).optional(),
      isDead: z.boolean().optional(),
      freeSkillPoints: z.number().min(0).optional(),
      gender: z.number().min(0).max(2).optional(),
      ownerId: z.number().optional(),
      gmUserId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { characterId, level, experiencePoints, ownerId, gmUserId, currentHealth, currentMana, isDead, ...fields } = input;
      const patch = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));

      if (level !== undefined) {
        const expRow = await ctx.db
          .select({ experiencePoints: expForLevel.experiencePoints })
          .from(expForLevel)
          .where(eq(expForLevel.level, level))
          .then(r => r[0]);
        patch.level = level;
        // Явно заданный опыт имеет приоритет над автоматическим
        patch.experiencePoints = experiencePoints ?? expRow?.experiencePoints ?? 0;
      } else if (experiencePoints !== undefined) {
        patch.experiencePoints = experiencePoints;
      }

      if (ownerId !== undefined) {
        const owner = await ctx.db.select({ id: users.id }).from(users).where(eq(users.id, ownerId)).then(r => r[0]);
        if (!owner) throw new Error(`Аккаунт с ID ${ownerId} не найден`);
        patch.ownerId = ownerId;
      }

      if (Object.keys(patch).length === 0 && currentHealth === undefined && currentMana === undefined && isDead === undefined) return { success: true };

      let old: Record<string, unknown> | undefined;
      if (Object.keys(patch).length > 0) {
        [old] = await ctx.db.select().from(characters).where(eq(characters.id, characterId)) as Record<string, unknown>[];
        await ctx.db.update(characters).set(patch).where(eq(characters.id, characterId));
      }

      // Обновить character_current_state если переданы HP/MP/мёртв
      const ccsUpdate: Record<string, unknown> = {};
      if (currentHealth !== undefined) ccsUpdate.currentHealth = currentHealth;
      if (currentMana !== undefined) ccsUpdate.currentMana = currentMana;
      if (isDead !== undefined) ccsUpdate.isDead = isDead;
      if (Object.keys(ccsUpdate).length > 0) {
        const existing = await ctx.db.select().from(characterCurrentState).where(eq(characterCurrentState.characterId, characterId)).then(r => r[0]);
        if (existing) {
          await ctx.db.update(characterCurrentState).set({ ...ccsUpdate, updatedAt: new Date() }).where(eq(characterCurrentState.characterId, characterId));
        } else {
          await ctx.db.insert(characterCurrentState).values({
            characterId,
            currentHealth: currentHealth ?? 100,
            currentMana: currentMana ?? 100,
            isDead: isDead ?? false,
          });
        }
      }

      const oldValue = old ? Object.fromEntries(Object.keys(patch).map(k => [k, (old as Record<string, unknown>)?.[k]])) : {};
      if (currentHealth !== undefined || currentMana !== undefined || isDead !== undefined) {
        if (currentHealth !== undefined) oldValue.currentHealth = undefined;
        if (currentMana !== undefined) oldValue.currentMana = undefined;
        if (isDead !== undefined) oldValue.isDead = undefined;
      }

      const newValue = { ...patch, ...(currentHealth !== undefined ? { currentHealth } : {}), ...(currentMana !== undefined ? { currentMana } : {}), ...(isDead !== undefined ? { isDead } : {}) };
      await logGmAction({ actionType: 'update_character', targetType: 'character', targetId: characterId, oldValue, newValue, gmUserId: gmUserId ?? null });
      return { success: true };
    }),

  // Удалить персонажа
  delete: gmProcedure
    .input(z.object({ characterId: z.number(), gmUserId: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const [old] = await ctx.db.select({ name: characters.name }).from(characters).where(eq(characters.id, input.characterId));
      await ctx.db.delete(characters).where(eq(characters.id, input.characterId));
      await logGmAction({ actionType: 'delete_character', targetType: 'character', targetId: input.characterId, oldValue: { name: old?.name }, gmUserId: input.gmUserId ?? null });
      return { success: true };
    }),

  // Полная очистка персонажа (удаление всех связанных данных, персонаж остаётся в слоте)
  wipe: gmProcedure
    .input(z.object({ characterId: z.number(), gmUserId: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { characterId } = input;
      const [char] = await ctx.db.select({ name: characters.name, level: characters.level }).from(characters).where(eq(characters.id, characterId));
      if (!char) throw new Error('Character not found');

      await ctx.db.transaction(async (tx) => {
        await tx.delete(characterPermanentModifiers).where(eq(characterPermanentModifiers.characterId, characterId));
        await tx.delete(characterSkills).where(eq(characterSkills.characterId, characterId));
        await tx.delete(playerInventory).where(eq(playerInventory.characterId, characterId));
        await tx.delete(characterEquipment).where(eq(characterEquipment.characterId, characterId));
        await tx.delete(playerQuest).where(eq(playerQuest.playerId, characterId));
        await tx.delete(playerFlag).where(eq(playerFlag.playerId, characterId));
        await tx.delete(playerActiveEffect).where(eq(playerActiveEffect.playerId, characterId));
        await tx.delete(characterTitles).where(eq(characterTitles.characterId, characterId));
        await tx.delete(characterReputation).where(eq(characterReputation.characterId, characterId));
        await tx.delete(characterPity).where(eq(characterPity.characterId, characterId));
        await tx.delete(characterBestiary).where(eq(characterBestiary.characterId, characterId));
        await tx.delete(characterEmotes).where(eq(characterEmotes.characterId, characterId));
        await tx.delete(characterSkillMastery).where(eq(characterSkillMastery.characterId, characterId));
        await tx.delete(characterSkillBar).where(eq(characterSkillBar.characterId, characterId));
        await tx.delete(currencyTransactions).where(eq(currencyTransactions.characterId, characterId));
        await tx.delete(gameAnalytics).where(eq(gameAnalytics.characterId, characterId));

        const hp = char.level * 10;
        await tx
          .insert(characterCurrentState)
          .values({ characterId, currentHealth: hp, currentMana: hp, isDead: false })
          .onConflictDoUpdate({
            target: characterCurrentState.characterId,
            set: { currentHealth: hp, currentMana: hp, isDead: false, updatedAt: new Date() },
          });
      });

      await logGmAction({ actionType: 'wipe_character', targetType: 'character', targetId: characterId, oldValue: { name: char.name }, gmUserId: input.gmUserId ?? null });
      return { success: true };
    }),

  // Сброс персонажа до уровня 1 (очистка всех данных + сброс статов)
  reset: gmProcedure
    .input(z.object({ characterId: z.number(), gmUserId: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { characterId } = input;
      const [char] = await ctx.db
        .select({ name: characters.name, bindZoneId: characters.bindZoneId, bindX: characters.bindX, bindY: characters.bindY, bindZ: characters.bindZ })
        .from(characters)
        .where(eq(characters.id, characterId));
      if (!char) throw new Error('Character not found');

      const [lvl1exp] = await ctx.db
        .select({ experiencePoints: expForLevel.experiencePoints })
        .from(expForLevel)
        .where(eq(expForLevel.level, 1));

      await ctx.db.transaction(async (tx) => {
        await tx.delete(characterPermanentModifiers).where(eq(characterPermanentModifiers.characterId, characterId));
        await tx.delete(characterSkills).where(eq(characterSkills.characterId, characterId));
        await tx.delete(playerInventory).where(eq(playerInventory.characterId, characterId));
        await tx.delete(characterEquipment).where(eq(characterEquipment.characterId, characterId));
        await tx.delete(playerQuest).where(eq(playerQuest.playerId, characterId));
        await tx.delete(playerFlag).where(eq(playerFlag.playerId, characterId));
        await tx.delete(playerActiveEffect).where(eq(playerActiveEffect.playerId, characterId));
        await tx.delete(characterTitles).where(eq(characterTitles.characterId, characterId));
        await tx.delete(characterReputation).where(eq(characterReputation.characterId, characterId));
        await tx.delete(characterPity).where(eq(characterPity.characterId, characterId));
        await tx.delete(characterBestiary).where(eq(characterBestiary.characterId, characterId));
        await tx.delete(characterEmotes).where(eq(characterEmotes.characterId, characterId));
        await tx.delete(characterSkillMastery).where(eq(characterSkillMastery.characterId, characterId));
        await tx.delete(characterSkillBar).where(eq(characterSkillBar.characterId, characterId));
        await tx.delete(currencyTransactions).where(eq(currencyTransactions.characterId, characterId));
        await tx.delete(gameAnalytics).where(eq(gameAnalytics.characterId, characterId));

        await tx
          .update(characters)
          .set({ level: 1, experiencePoints: lvl1exp?.experiencePoints ?? 0, freeSkillPoints: 0, totalPlayTimeSec: 0, lastSessionPlayTimeSec: 0 })
          .where(eq(characters.id, characterId));

        await tx
          .insert(characterCurrentState)
          .values({ characterId, currentHealth: 10, currentMana: 10, isDead: false })
          .onConflictDoUpdate({
            target: characterCurrentState.characterId,
            set: { currentHealth: 10, currentMana: 10, isDead: false, updatedAt: new Date() },
          });

        if (char.bindZoneId != null && char.bindX != null && char.bindY != null && char.bindZ != null) {
          await tx
            .update(characterPosition)
            .set({ zoneId: char.bindZoneId, x: char.bindX, y: char.bindY, z: char.bindZ })
            .where(eq(characterPosition.characterId, characterId));
        }
      });

      await logGmAction({ actionType: 'reset_character', targetType: 'character', targetId: characterId, oldValue: { name: char.name }, gmUserId: input.gmUserId ?? null });
      return { success: true };
    }),

  // Все позиции персонажей для карты
  positions: gmProcedure
    .input(z.object({ filter: z.enum(['all', 'online', 'offline']).default('all') }).default({}))
    .query(async ({ ctx, input }) => {
      const conditions = [isNull(characters.deletedAt)];
      if (input.filter === 'online') conditions.push(eq(characters.isOnline, true));
      if (input.filter === 'offline') conditions.push(eq(characters.isOnline, false));

      return ctx.db
        .select({
          id: characters.id,
          name: characters.name,
          level: characters.level,
          isOnline: characters.isOnline,
          posX: characterPosition.x,
          posY: characterPosition.y,
          posZ: characterPosition.z,
          zoneId: characterPosition.zoneId,
          rotZ: characterPosition.rotZ,
          className: characterClass.name,
          ownerLogin: users.login,
        })
        .from(characters)
        .leftJoin(characterPosition, eq(characterPosition.characterId, characters.id))
        .leftJoin(characterClass, eq(characterClass.id, characters.classId))
        .leftJoin(users, eq(users.id, characters.ownerId))
        .where(and(...conditions));
    }),

  // Телепортация персонажа на заданные координаты
  teleportToCoords: gmProcedure
    .input(z.object({
      characterId: z.number(),
      x: z.number(),
      y: z.number(),
      z: z.number(),
      zoneId: z.number().optional(),
      rotZ: z.number().optional(),
      gmUserId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { characterId, x, y, z: pz, zoneId, rotZ } = input;

      await ctx.db
        .insert(characterPosition)
        .values({ characterId, x: String(x), y: String(y), z: String(pz), zoneId: zoneId ?? 1, rotZ: rotZ ?? 0 })
        .onConflictDoUpdate({
          target: characterPosition.characterId,
          set: { x: String(x), y: String(y), z: String(pz), zoneId: zoneId ?? 1, rotZ: rotZ ?? 0 },
        });

      const [char] = await ctx.db.select({ name: characters.name }).from(characters).where(eq(characters.id, characterId));
      await logGmAction({
        actionType: 'teleport_to_coords',
        targetType: 'character',
        targetId: characterId,
        newValue: { x, y, z: pz, zoneId: zoneId ?? 1, rotZ: rotZ ?? 0 },
        oldValue: { name: char?.name },
        gmUserId: input.gmUserId ?? null,
      });
      return { success: true };
    }),

  // Телепортация персонажа к другому игроку по никнейму
  teleportToPlayer: gmProcedure
    .input(z.object({
      sourceCharacterId: z.number(),
      targetNickname: z.string().min(1),
      gmUserId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const target = await ctx.db
        .select({
          id: characters.id,
          name: characters.name,
          x: characterPosition.x,
          y: characterPosition.y,
          z: characterPosition.z,
          zoneId: characterPosition.zoneId,
          rotZ: characterPosition.rotZ,
        })
        .from(characters)
        .leftJoin(characterPosition, eq(characterPosition.characterId, characters.id))
        .where(and(
          ilike(characters.name, input.targetNickname),
          isNull(characters.deletedAt),
        ))
        .limit(1)
        .then((r) => r[0]);

      if (!target || target.x == null) throw new Error(`Игрок «${input.targetNickname}» не найден или не имеет позиции`);

      await ctx.db
        .insert(characterPosition)
        .values({
          characterId: input.sourceCharacterId,
          x: String(target.x),
          y: String(target.y),
          z: String(target.z),
          zoneId: target.zoneId ?? 1,
          rotZ: target.rotZ ?? 0,
        })
        .onConflictDoUpdate({
          target: characterPosition.characterId,
          set: {
            x: String(target.x),
            y: String(target.y),
            z: String(target.z),
            zoneId: target.zoneId ?? 1,
            rotZ: target.rotZ ?? 0,
          },
        });

      const [source] = await ctx.db.select({ name: characters.name }).from(characters).where(eq(characters.id, input.sourceCharacterId));
      await logGmAction({
        actionType: 'teleport_to_player',
        targetType: 'character',
        targetId: input.sourceCharacterId,
        newValue: { toPlayer: target.name, x: Number(target.x), y: Number(target.y), z: Number(target.z), zoneId: target.zoneId },
        oldValue: { name: source?.name },
        gmUserId: input.gmUserId ?? null,
      });
      return { success: true, targetName: target.name };
    }),

  // Массовая очистка ВСЕХ персонажей (все данные, персонажи остаются)
  wipeAll: gmProcedure
    .input(z.object({ gmUserId: z.number().optional() }).default({}))
    .mutation(async ({ ctx, input }) => {
      const [totalChars] = await ctx.db.select({ v: sql<number>`COUNT(*)::int`.as('v') }).from(characters).where(isNull(characters.deletedAt));
      const charCount = totalChars?.v ?? 0;

      await ctx.db.transaction(async (tx) => {
        await tx.delete(characterPermanentModifiers);
        await tx.delete(characterSkills);
        await tx.delete(playerInventory);
        await tx.delete(characterEquipment);
        await tx.delete(playerQuest);
        await tx.delete(playerFlag);
        await tx.delete(playerActiveEffect);
        await tx.delete(characterTitles);
        await tx.delete(characterReputation);
        await tx.delete(characterPity);
        await tx.delete(characterBestiary);
        await tx.delete(characterEmotes);
        await tx.delete(characterSkillMastery);
        await tx.delete(characterSkillBar);
        await tx.delete(currencyTransactions);
        await tx.delete(gameAnalytics);

        await tx.execute(sql`
          INSERT INTO character_current_state (character_id, current_health, current_mana, is_dead, updated_at)
          SELECT c.id, c.level * 10, c.level * 10, false, now()
          FROM characters c
          ON CONFLICT (character_id) DO UPDATE
          SET current_health = EXCLUDED.current_health,
              current_mana   = EXCLUDED.current_mana,
              is_dead        = EXCLUDED.is_dead,
              updated_at     = EXCLUDED.updated_at
        `);
      });

      await logGmAction({ actionType: 'wipe_all_characters', targetType: 'all', oldValue: { totalCharacters: charCount }, gmUserId: input.gmUserId ?? null });
      return { success: true, totalCharacters: charCount };
    }),
});
