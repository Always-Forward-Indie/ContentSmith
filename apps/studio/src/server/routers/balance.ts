import { z } from 'zod';
import { eq, and, like, inArray, sql } from '@contentsmith/database';
import { db } from '../db';
import {
  characterClass,
  classStatFormula,
  entityAttributes,
  mob,
  mobStat,
  mobSkills,
  mobRanks,
  gameConfig,
  skills,
  skillSchool,
  skillScaleType,
  skillPropertiesMapping,
  skillProperties,
  skillEffectInstances,
  skillEffectsMapping,
  skillDamageFormulas,
  expForLevel,
  mobLootInfo,
  items,
  itemAttributesMapping,
  itemTypes,
  equipSlot,
  vendorNpc,
  vendorInventory,
  npc,
  quest,
  questStep,
  questReward,
  itemSets,
  itemSetMembers,
  itemSetBonuses,
  titleDefinitions,
} from '@contentsmith/database';
import { createTRPCRouter, publicProcedure } from '../trpc';

// ---------------------------------------------------------------------------
// Shared helper: batch-fetch skill calc data (eliminates N+1)
// ---------------------------------------------------------------------------

async function fetchSkillCalcData(skillIds: number[], level: number) {
  if (skillIds.length === 0) return [];

  const skillRows = await db
    .select({
      id: skills.id,
      name: skills.name,
      slug: skills.slug,
      schoolSlug: skillSchool.slug,
      scaleTypeSlug: skillScaleType.slug,
      isPassive: skills.isPassive,
    })
    .from(skills)
    .leftJoin(skillSchool, eq(skillSchool.id, skills.schoolId))
    .leftJoin(skillScaleType, eq(skillScaleType.id, skills.scaleStatId))
    .where(inArray(skills.id, skillIds));

  const allProperties = await db
    .select({
      skillId: skillPropertiesMapping.skillId,
      propertySlug: skillProperties.slug,
      propertyValue: skillPropertiesMapping.propertyValue,
    })
    .from(skillPropertiesMapping)
    .leftJoin(skillProperties, eq(skillProperties.id, skillPropertiesMapping.propertyId))
    .where(
      and(
        inArray(skillPropertiesMapping.skillId, skillIds),
        eq(skillPropertiesMapping.skillLevel, level),
      ),
    );

  const allInstances = await db
    .select({
      id: skillEffectInstances.id,
      skillId: skillEffectInstances.skillId,
    })
    .from(skillEffectInstances)
    .where(inArray(skillEffectInstances.skillId, skillIds));

  const instanceIds = allInstances.map((i) => i.id);

  let allEffects: Array<{ instanceId: number; effectSlug: string | null; value: number }> = [];
  if (instanceIds.length > 0) {
    allEffects = await db
      .select({
        instanceId: skillEffectsMapping.effectInstanceId,
        effectSlug: skillDamageFormulas.slug,
        value: skillEffectsMapping.value,
      })
      .from(skillEffectsMapping)
      .leftJoin(skillDamageFormulas, eq(skillDamageFormulas.id, skillEffectsMapping.effectId))
      .where(
        and(
          inArray(skillEffectsMapping.effectInstanceId, instanceIds),
          eq(skillEffectsMapping.level, level),
        ),
      );
  }

  const instanceBySkill = new Map<number, number[]>();
  for (const inst of allInstances) {
    const arr = instanceBySkill.get(inst.skillId) ?? [];
    arr.push(inst.id);
    instanceBySkill.set(inst.skillId, arr);
  }

  return skillRows.map((s) => {
    const propMap = new Map(
      allProperties
        .filter((p) => p.skillId === s.id)
        .map((p) => [p.propertySlug, Number(p.propertyValue)]),
    );

    const instIds = instanceBySkill.get(s.id) ?? [];
    const effectMap = new Map(
      allEffects
        .filter((e) => instIds.includes(e.instanceId) && e.effectSlug != null)
        .map((e) => [e.effectSlug!, Number(e.value)]),
    );

    return {
      id: s.id,
      name: s.name,
      slug: s.slug,
      schoolSlug: s.schoolSlug ?? 'physical',
      scaleStatSlug: s.scaleTypeSlug ?? 'physical_attack',
      isPassive: s.isPassive,
      castMs: propMap.get('cast_ms') ?? 0,
      swingMs: propMap.get('swing_ms') ?? 1200,
      cooldownMs: propMap.get('cooldown_ms') ?? 1000,
      costMp: propMap.get('cost_mp') ?? 0,
      gcdMs: propMap.get('gcd_ms') ?? 500,
      maxRange: propMap.get('max_range') ?? 2.5,
      areaRadius: propMap.get('area_radius') ?? 0,
      flatAdd: effectMap.get('flat_add') ?? 0,
      coeff: effectMap.get('coeff') ?? 1.0,
    };
  });
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const balanceRouter = createTRPCRouter({
  getClassProfiles: publicProcedure.query(async () => {
    const classes = await db.select().from(characterClass).orderBy(characterClass.id);

    const allFormulas = await db
      .select({
        classId: classStatFormula.classId,
        attributeSlug: entityAttributes.slug,
        baseValue: classStatFormula.baseValue,
        multiplier: classStatFormula.multiplier,
        exponent: classStatFormula.exponent,
      })
      .from(classStatFormula)
      .leftJoin(entityAttributes, eq(entityAttributes.id, classStatFormula.attributeId));

    return classes.map((cls) => ({
      classId: cls.id,
      className: cls.name,
      classSlug: cls.slug,
      formulas: allFormulas
        .filter((f) => f.classId === cls.id)
        .map((f) => ({
          attributeSlug: f.attributeSlug!,
          baseValue: Number(f.baseValue),
          multiplier: Number(f.multiplier),
          exponent: Number(f.exponent),
        })),
    }));
  }),

  getCombatConfig: publicProcedure.query(async () => {
    const rows = await db
      .select({ key: gameConfig.key, value: gameConfig.value })
      .from(gameConfig)
      .where(sql`${gameConfig.key} LIKE 'combat.%' OR ${gameConfig.key} LIKE 'regen.%'`);
    return rows;
  }),

  getMobProfiles: publicProcedure.query(async () => {
    const mobs = await db
      .select({
        id: mob.id,
        name: mob.name,
        level: mob.level,
        spawnHealth: mob.spawnHealth,
        spawnMana: mob.spawnMana,
        baseXp: mob.baseXp,
        attackCooldown: mob.attackCooldown,
        rankId: mob.rankId,
      })
      .from(mob)
      .orderBy(mob.level, mob.name);

    const mobIds = mobs.map((m) => m.id);

    const allStats =
      mobIds.length > 0
        ? await db
            .select({
              mobId: mobStat.mobId,
              attributeSlug: entityAttributes.slug,
              flatValue: mobStat.flatValue,
            })
            .from(mobStat)
            .leftJoin(entityAttributes, eq(entityAttributes.id, mobStat.attributeId))
            .where(inArray(mobStat.mobId, mobIds))
        : [];

    const allMobSkillLinks =
      mobIds.length > 0
        ? await db
            .select({
              mobId: mobSkills.mobId,
              skillId: mobSkills.skillId,
              currentLevel: mobSkills.currentLevel,
            })
            .from(mobSkills)
            .where(inArray(mobSkills.mobId, mobIds))
        : [];

    const uniqueSkillIds = Array.from(new Set(allMobSkillLinks.map((l) => l.skillId)));
    const skillCalcDataList = await fetchSkillCalcData(uniqueSkillIds, 1);
    const skillCalcMap = new Map(skillCalcDataList.map((s) => [s.id, s]));

    const ranks = await db.select().from(mobRanks);
    const rankMap = new Map(ranks.map((r) => [r.rankId, { code: r.code, mult: Number(r.mult) }]));

    return mobs.map((m) => {
      const rank = rankMap.get(m.rankId ?? 1);
      const mobSkillLinks = allMobSkillLinks.filter((l) => l.mobId === m.id);

      return {
        id: m.id,
        name: m.name,
        level: m.level,
        spawnHealth: m.spawnHealth,
        spawnMana: m.spawnMana,
        baseXp: m.baseXp,
        attackCooldown: Number(m.attackCooldown),
        rankCode: rank?.code ?? 'normal',
        rankMult: rank?.mult ?? 1.0,
        attributes: allStats
          .filter((s) => s.mobId === m.id)
          .map((s) => ({
            attributeSlug: s.attributeSlug!,
            flatValue: Number(s.flatValue),
          })),
        skills: mobSkillLinks
          .map((l) => {
            const calc = skillCalcMap.get(l.skillId);
            if (!calc) return null;
            return {
              skillId: l.skillId,
              name: calc.name ?? 'Unknown',
              slug: calc.slug ?? '',
              schoolSlug: calc.schoolSlug,
              scaleStatSlug: calc.scaleStatSlug,
              castMs: calc.castMs,
              swingMs: calc.swingMs,
              cooldownMs: calc.cooldownMs,
              costMp: calc.costMp,
              flatAdd: calc.flatAdd,
              coeff: calc.coeff,
              maxRange: calc.maxRange,
            };
          })
          .filter((s): s is NonNullable<typeof s> => s !== null),
      };
    });
  }),

  getExpTable: publicProcedure.query(async () => {
    const rows = await db
      .select({
        level: expForLevel.level,
        experiencePoints: expForLevel.experiencePoints,
      })
      .from(expForLevel)
      .orderBy(expForLevel.level);

    return rows.map((r) => ({
      level: r.level,
      xpRequired: Number(r.experiencePoints),
    }));
  }),

  getMobRanks: publicProcedure.query(async () => {
    const rows = await db.select().from(mobRanks).orderBy(mobRanks.rankId);
    return rows.map((r) => ({
      rankId: r.rankId,
      code: r.code,
      xpMultiplier: Number(r.mult),
    }));
  }),

  getSkillCalcData: publicProcedure
    .input(z.object({ skillId: z.number(), level: z.number().default(1) }))
    .query(async ({ input }) => {
      const results = await fetchSkillCalcData([input.skillId], input.level);
      return results[0] ?? null;
    }),

  getAllSkillsCalcData: publicProcedure
    .input(z.object({ level: z.number().default(1) }).optional())
    .query(async ({ input }) => {
      const level = input?.level ?? 1;

      const activeSkills = await db
        .select({ id: skills.id })
        .from(skills)
        .where(eq(skills.isPassive, false))
        .orderBy(skills.id);

      const skillIds = activeSkills.map((s) => s.id);
      return fetchSkillCalcData(skillIds, level);
    }),

  // ── Mob loot table ───────────────────────────────────────────────────────
  getMobLoot: publicProcedure
    .input(z.object({ mobId: z.number() }))
    .query(async ({ input }) => {
      const rows = await db
        .select({
          id: mobLootInfo.id,
          itemId: mobLootInfo.itemId,
          itemName: items.name,
          dropChance: mobLootInfo.dropChance,
          minQuantity: mobLootInfo.minQuantity,
          maxQuantity: mobLootInfo.maxQuantity,
          lootTier: mobLootInfo.lootTier,
          isHarvestOnly: mobLootInfo.isHarvestOnly,
          vendorPriceSell: items.vendorPriceSell,
          vendorPriceBuy: items.vendorPriceBuy,
          itemTypeId: items.itemType,
        })
        .from(mobLootInfo)
        .leftJoin(items, eq(items.id, mobLootInfo.itemId))
        .where(eq(mobLootInfo.mobId, input.mobId))
        .orderBy(mobLootInfo.dropChance);

      return rows.map((r) => ({
        id: r.id,
        itemId: Number(r.itemId),
        itemName: r.itemName ?? 'Unknown',
        dropChance: r.dropChance,
        minQuantity: r.minQuantity,
        maxQuantity: r.maxQuantity,
        lootTier: r.lootTier,
        isHarvestOnly: r.isHarvestOnly,
        vendorPriceSell: Number(r.vendorPriceSell ?? 0),
        vendorPriceBuy: Number(r.vendorPriceBuy ?? 0),
        itemTypeId: r.itemTypeId,
      }));
    }),

  // ── All equippable items (for loadout builder) ───────────────────────────
  getEquippableItems: publicProcedure.query(async () => {
    const allItems = await db
      .select({
        id: items.id,
        name: items.name,
        equipSlotId: items.equipSlot,
        levelRequirement: items.levelRequirement,
        isDurable: items.isDurable,
        durabilityMax: items.durabilityMax,
        vendorPriceBuy: items.vendorPriceBuy,
        isTwoHanded: items.isTwoHanded,
      })
      .from(items)
      .where(eq(items.isEquippable, true))
      .orderBy(items.equipSlot, items.name);

    const itemIds = allItems.map((i) => Number(i.id));
    let allAttrs: Array<{
      itemId: number;
      attributeSlug: string | null;
      value: number;
    }> = [];

    if (itemIds.length > 0) {
      allAttrs = await db
        .select({
          itemId: itemAttributesMapping.itemId,
          attributeSlug: entityAttributes.slug,
          value: itemAttributesMapping.value,
        })
        .from(itemAttributesMapping)
        .leftJoin(entityAttributes, eq(entityAttributes.id, itemAttributesMapping.attributeId))
        .where(
          and(
            inArray(itemAttributesMapping.itemId, itemIds),
            eq(itemAttributesMapping.applyOn, 'equip'),
          ),
        );
    }

    const slots = await db.select().from(equipSlot).orderBy(equipSlot.id);
    const slotMap = new Map(slots.map((s) => [s.id, s.slug]));

    const attrsByItem = new Map<number, Array<{ attributeSlug: string; value: number }>>();
    for (const a of allAttrs) {
      const arr = attrsByItem.get(Number(a.itemId)) ?? [];
      if (a.attributeSlug) arr.push({ attributeSlug: a.attributeSlug, value: a.value });
      attrsByItem.set(Number(a.itemId), arr);
    }

    return {
      items: allItems.map((i) => ({
        id: Number(i.id),
        name: i.name,
        slotSlug: slotMap.get(i.equipSlotId ?? 0) ?? 'unknown',
        slotId: i.equipSlotId ?? 0,
        levelRequirement: Number(i.levelRequirement),
        isDurable: i.isDurable,
        durabilityMax: Number(i.durabilityMax),
        vendorPriceBuy: Number(i.vendorPriceBuy ?? 0),
        isTwoHanded: i.isTwoHanded,
        attributes: attrsByItem.get(Number(i.id)) ?? [],
      })),
      slots: slots.map((s) => ({ id: s.id, slug: s.slug, name: s.name })),
    };
  }),

  // ── Title definitions with bonuses ───────────────────────────────────────
  getTitles: publicProcedure.query(async () => {
    const titles = await db
      .select({
        id: titleDefinitions.id,
        slug: titleDefinitions.slug,
        displayName: titleDefinitions.displayName,
        bonuses: titleDefinitions.bonuses,
      })
      .from(titleDefinitions)
      .orderBy(titleDefinitions.displayName);

    return titles.map((t) => ({
      id: t.id,
      slug: t.slug,
      displayName: t.displayName,
      bonuses: (t.bonuses as Array<{ attributeSlug: string; value: number }>) ?? [],
    }));
  }),

  // ── Item set bonuses ─────────────────────────────────────────────────────
  getItemSets: publicProcedure.query(async () => {
    const sets = await db.select().from(itemSets).orderBy(itemSets.name);
    const members = await db.select().from(itemSetMembers);
    const bonuses = await db
      .select({
        id: itemSetBonuses.id,
        setId: itemSetBonuses.setId,
        piecesRequired: itemSetBonuses.piecesRequired,
        attributeSlug: entityAttributes.slug,
        bonusValue: itemSetBonuses.bonusValue,
      })
      .from(itemSetBonuses)
      .leftJoin(entityAttributes, eq(entityAttributes.id, itemSetBonuses.attributeId));

    return sets.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      memberItemIds: members.filter((m) => m.setId === s.id).map((m) => m.itemId),
      bonuses: bonuses
        .filter((b) => b.setId === s.id)
        .map((b) => ({
          piecesRequired: b.piecesRequired,
          attributeSlug: b.attributeSlug ?? '',
          bonusValue: b.bonusValue,
        })),
    }));
  }),

  // ── Quest data (rewards + steps) ─────────────────────────────────────────
  getQuestDetails: publicProcedure
    .input(z.object({ questId: z.number() }))
    .query(async ({ input }) => {
      const q = await db.select().from(quest).where(eq(quest.id, input.questId));
      if (!q[0]) return null;

      const steps = await db
        .select()
        .from(questStep)
        .where(eq(questStep.questId, input.questId))
        .orderBy(questStep.stepIndex);

      const rewards = await db
        .select({
          id: questReward.id,
          rewardType: questReward.rewardType,
          itemId: questReward.itemId,
          itemName: items.name,
          quantity: questReward.quantity,
          amount: questReward.amount,
        })
        .from(questReward)
        .leftJoin(items, eq(items.id, questReward.itemId))
        .where(eq(questReward.questId, input.questId));

      return {
        ...q[0],
        steps: steps.map((s) => ({
          stepIndex: s.stepIndex,
          stepType: s.stepType,
          params: s.params as Record<string, unknown>,
        })),
        rewards: rewards.map((r) => ({
          rewardType: r.rewardType,
          itemId: r.itemId ? Number(r.itemId) : null,
          itemName: r.itemName,
          quantity: r.quantity,
          amount: Number(r.amount),
        })),
      };
    }),

  // ── Vendor data ──────────────────────────────────────────────────────────
  getVendors: publicProcedure.query(async () => {
    const vendors = await db
      .select({
        id: vendorNpc.id,
        npcId: vendorNpc.npcId,
        npcName: npc.name,
        markupPct: vendorNpc.markupPct,
      })
      .from(vendorNpc)
      .leftJoin(npc, eq(npc.id, vendorNpc.npcId))
      .orderBy(vendorNpc.id);

    const invRows = await db
      .select({
        vendorNpcId: vendorInventory.vendorNpcId,
        itemId: vendorInventory.itemId,
        itemName: items.name,
        priceOverride: vendorInventory.priceOverride,
        vendorPriceBuy: items.vendorPriceBuy,
        stockCount: vendorInventory.stockCount,
      })
      .from(vendorInventory)
      .leftJoin(items, eq(items.id, vendorInventory.itemId));

    return vendors.map((v) => ({
      id: v.id,
      npcName: v.npcName ?? 'Unknown',
      markupPct: v.markupPct,
      inventory: invRows
        .filter((i) => i.vendorNpcId === v.id)
        .map((i) => ({
          itemId: Number(i.itemId),
          itemName: i.itemName ?? 'Unknown',
          price: i.priceOverride
            ? Number(i.priceOverride)
            : Math.ceil(Number(i.vendorPriceBuy ?? 0) * (1 + v.markupPct / 100)),
          stockCount: i.stockCount,
        })),
    }));
  }),
});
