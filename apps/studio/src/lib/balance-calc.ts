/**
 * Balance Calculator — pure computation engine for combat & balance metrics.
 *
 * All formulas mirror the C++ server implementation described in
 * docs/stats-system-design.md (version 3.0, migration 060).
 *
 * Every function is deterministic (no RNG) — we use *expected values*
 * for probabilistic steps (crit, block, hit-chance, variance).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Stat map: slug → flat value */
export type StatMap = Record<string, number>;

/** game_config constants needed for calculations */
export interface CombatConfig {
  baseHitChance: number;          // combat.base_hit_chance          (0.95)
  hitChanceMin: number;           // combat.hit_chance_min           (0.05)
  hitChanceMax: number;           // combat.hit_chance_max           (0.95)
  damageVariance: number;         // combat.damage_variance          (0.12)
  critChanceCap: number;          // combat.crit_chance_cap          (75)
  blockChanceCap: number;         // combat.block_chance_cap         (75)
  defenseCap: number;             // combat.defense_cap              (0.85)
  defenseFormulaK: number;        // combat.defense_formula_k        (7.5)
  maxResistanceCap: number;       // combat.max_resistance_cap       (75)
  levelDiffCap: number;           // combat.level_diff_cap           (10)
  levelDiffDamagePerLevel: number; // combat.level_diff_damage_per_level (0.04)
  levelDiffHitPerLevel: number;   // combat.level_diff_hit_per_level (0.02)
  attackSpeedBaseDivisor: number; // combat.attack_speed_base_divisor (100)
  castSpeedBaseDivisor: number;   // combat.cast_speed_base_divisor  (100)
  defaultCritMultiplier: number;  // combat.default_crit_multiplier  (200)
}

/** Minimal combatant profile (works for both player-class-profiles and mobs) */
export interface CombatantProfile {
  name: string;
  level: number;
  stats: StatMap;
  /** attack cooldown in seconds (mob-specific, for players derived from weapon) */
  attackCooldownSec?: number;
  /** Available skills (for rotation simulation) */
  skills?: SkillCalcData[];
}

/** Skill data needed for calculations */
export interface SkillCalcData {
  name: string;
  slug?: string;
  /** 'physical_attack' | 'magical_attack' */
  scaleStatSlug: string;
  /** 'physical' | 'fire' | 'ice' | 'arcane' | ... */
  schoolSlug: string;
  flatAdd: number;
  coeff: number;
  castMs: number;
  swingMs: number;
  cooldownMs: number;
  costMp: number;
  maxRange?: number;
}

/** Result of a full combat simulation between attacker and target */
export interface CombatSimResult {
  /** Real damage per hit (expected, accounting for hit/crit/block/defense/resist) */
  damagePerHit: number;
  /** Raw damage before defense/resist (for display) */
  rawDamage: number;
  /** Hits needed to kill target */
  hitsToKill: number;
  /** Time to kill in seconds */
  timeToKillSec: number;
  /** Effective attack interval in seconds */
  attackIntervalSec: number;
  /** Damage target deals back to attacker during the fight */
  damageTakenDuringFight: number;
  /** Hit chance (0..1) */
  hitChance: number;
  /** Expected crit multiplier (weighted average) */
  effectiveCritMult: number;
  /** Defense damage reduction % (0..1) */
  defenseReduction: number;
  /** Elemental resist reduction % (0..1) */
  elementalReduction: number;
  /** DPS (damage per second) across the full fight */
  dps: number;
  /** Whether the attacker can sustain (HP regen > DPS taken) */
  canSustain: boolean;
  /** HP remaining after the fight */
  hpRemaining: number;
  /** Mana used during the fight */
  manaUsed: number;
}

/** Item impact analysis */
export interface ItemImpactResult {
  /** stat slug → delta value */
  statDeltas: Record<string, number>;
  /** Damage change (absolute) */
  damageChange: number;
  /** Damage change (%) */
  damageChangePct: number;
  /** Hits-to-kill change */
  hitsToKillChange: number;
  /** Time-to-kill change in seconds */
  timeToKillChange: number;
}

/** Skill efficiency analysis */
export interface SkillEfficiencyResult {
  totalDamage: number;
  damagePerMana: number;
  damagePerSecond: number;
  /** How many times better than basic attack DPS */
  dpsVsAutoAttack: number;
  /** Full skill cycle time in seconds (cast + swing + cooldown-remaining) */
  totalCycleTimeSec: number;
  effectiveCastMs: number;
  effectiveSwingMs: number;
}

/** EXP farming efficiency */
export interface FarmEfficiencyResult {
  killsPerMinute: number;
  expPerMinute: number;
  /** Time in seconds for one full kill cycle (kill + downtime) */
  fullCycleSec: number;
}

/** Mob rank info */
export interface MobRank {
  rankId: number;
  code: string;
  xpMultiplier: number;
}

/** XP progression result for a single level */
export interface LevelProgressionEntry {
  level: number;
  xpRequired: number;
  /** XP needed to go from level-1 to this level */
  xpForThisLevel: number;
  /** Kills of a specific mob to reach this level from previous */
  killsForLevel: number;
  /** Time in seconds to reach this level from previous */
  timeForLevelSec: number;
  /** Cumulative time from level 1 */
  cumulativeTimeSec: number;
  /** XP per kill at this level (accounts for level diff) */
  xpPerKill: number;
}

/** Class power curve entry */
export interface ClassPowerEntry {
  level: number;
  stats: StatMap;
  /** DPS against a reference target */
  dps: number;
  /** Effective HP (with defense factored in) */
  effectiveHp: number;
  /** Max health */
  maxHp: number;
  /** Max mana */
  maxMp: number;
  /** HP regen/s */
  hpRegen: number;
  /** MP regen/s */
  mpRegen: number;
}

/** Equipment profile: a named set of items across slots */
export interface EquipmentProfile {
  name: string;
  /** slot slug → array of attribute bonuses */
  slots: Record<string, Array<{ attributeSlug: string; value: number }>>;
}

/** Regen config parsed from game_config */
export interface RegenConfig {
  baseHpRegen: number;
  baseMpRegen: number;
  hpRegenConCoeff: number;
  mpRegenWisCoeff: number;
  tickIntervalMs: number;
  disableInCombatMs: number;
}

// ── New V3 types ─────────────────────────────────────────────────────────────

/** Pity system config from game_config */
export interface PityConfig {
  softPityKills: number;    // pity.soft_pity_kills (300)
  hardPityKills: number;    // pity.hard_pity_kills (800)
  softBonusPerKill: number; // pity.soft_bonus_per_kill (0.00005)
}

/** Durability system config from game_config */
export interface DurabilityConfig {
  weaponLossPerHit: number;   // durability.weapon_loss_per_hit (1.0)
  armorLossPerHit: number;    // durability.armor_loss_per_hit  (1.0)
  deathPenaltyPct: number;    // durability.death_penalty_pct   (0.05)
}

/** Economy config from game_config */
export interface EconomyConfig {
  vendorBuyMarkupPct: number;   // economy.vendor_buy_markup_pct (0)
  vendorSellTaxPct: number;     // economy.vendor_sell_tax_pct   (0)
}

/** Loot drop info for a single item */
export interface LootDropInfo {
  itemId: number;
  itemName: string;
  dropChance: number;     // 0..1
  minQuantity: number;
  maxQuantity: number;
  lootTier: string;
}

/** Result of loot farm time calculation */
export interface LootFarmResult {
  /** Expected kills to get 1 drop (no pity) */
  expectedKills: number;
  /** Expected time in seconds (kills × cycle time) */
  expectedTimeSec: number;
  /** With pity: guaranteed max kills */
  pityGuaranteedKills: number;
  /** With pity: guaranteed max time */
  pityGuaranteedTimeSec: number;
  /** Expected kills for a specific quantity */
  killsForQuantity: number;
  /** Average quantity per drop */
  avgQuantityPerDrop: number;
}

/** Durability breakdown result */
export interface DurabilityResult {
  /** Player attacks before weapon breaks */
  weaponHitsToBreak: number;
  /** Mob hits before armor piece breaks */
  armorHitsToBreak: number;
  /** Fights before weapon breaks (assuming hitsToKill per fight) */
  weaponFightsToBreak: number;
  /** Fights before armor breaks */
  armorFightsToBreak: number;
  /** Time in seconds before weapon needs repair */
  weaponTimeToBreakSec: number;
  /** Time in seconds before armor needs repair */
  armorTimeToBreakSec: number;
  /** Repair cost for weapon at 0 dur */
  weaponFullRepairCost: number;
  /** Repair cost for armor at 0 dur */
  armorFullRepairCost: number;
  /** Durability cost per fight (weapon) */
  weaponDurPerFight: number;
  /** Durability cost per fight (armor) */
  armorDurPerFight: number;
}

/** Economy calc result — how long to afford an item */
export interface GoldFarmResult {
  /** Gold earned per kill (from selling drops) */
  goldPerKill: number;
  /** Kills needed to afford target price */
  killsNeeded: number;
  /** Time in seconds to farm enough gold */
  timeSec: number;
  /** Gold per minute */
  goldPerMinute: number;
}

/** Balance verdict severity */
export type BalanceVerdict = 'great' | 'ok' | 'warn' | 'danger';

/** A single balance recommendation/flag */
export interface BalanceFlag {
  key: string;
  verdict: BalanceVerdict;
  label: string;
  detail: string;
  detailParams?: Record<string, string | number>;
}

/** Full combat comparison: base vs modified, with absolute values */
export interface CombatComparison {
  base: CombatSimResult;
  modified: CombatSimResult;
  damageChange: number;
  damageChangePct: number;
  hitsToKillChange: number;
  timeToKillChange: number;
  dpsChange: number;
  dpsChangePct: number;
  damageTakenChange: number;
  hpRemainingChange: number;
  statDeltas: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Default config (matches DB defaults)
// ---------------------------------------------------------------------------

export const DEFAULT_COMBAT_CONFIG: CombatConfig = {
  baseHitChance: 0.95,
  hitChanceMin: 0.05,
  hitChanceMax: 0.95,
  damageVariance: 0.12,
  critChanceCap: 75,
  blockChanceCap: 75,
  defenseCap: 0.85,
  defenseFormulaK: 7.5,
  maxResistanceCap: 75,
  levelDiffCap: 10,
  levelDiffDamagePerLevel: 0.04,
  levelDiffHitPerLevel: 0.02,
  attackSpeedBaseDivisor: 100,
  castSpeedBaseDivisor: 100,
  defaultCritMultiplier: 200,
};

export const DEFAULT_REGEN_CONFIG: RegenConfig = {
  baseHpRegen: 2,
  baseMpRegen: 1,
  hpRegenConCoeff: 0.3,
  mpRegenWisCoeff: 0.5,
  tickIntervalMs: 4000,
  disableInCombatMs: 8000,
};

/** Standard mob rank XP multipliers */
export const MOB_RANKS: MobRank[] = [
  { rankId: 1, code: 'normal', xpMultiplier: 1.0 },
  { rankId: 2, code: 'pack', xpMultiplier: 0.6 },
  { rankId: 3, code: 'strong', xpMultiplier: 1.5 },
  { rankId: 4, code: 'elite', xpMultiplier: 2.2 },
  { rankId: 5, code: 'miniboss', xpMultiplier: 5.0 },
  { rankId: 6, code: 'boss', xpMultiplier: 20.0 },
];

export const DEFAULT_PITY_CONFIG: PityConfig = {
  softPityKills: 300,
  hardPityKills: 800,
  softBonusPerKill: 0.00005,
};

export const DEFAULT_DURABILITY_CONFIG: DurabilityConfig = {
  weaponLossPerHit: 1.0,
  armorLossPerHit: 1.0,
  deathPenaltyPct: 0.05,
};

export const DEFAULT_ECONOMY_CONFIG: EconomyConfig = {
  vendorBuyMarkupPct: 0,
  vendorSellTaxPct: 0,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStat(stats: StatMap, slug: string): number {
  return stats[slug] ?? 0;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** stat_at_level = base_value + multiplier × level^exponent */
export function statAtLevel(
  baseValue: number,
  multiplier: number,
  exponent: number,
  level: number,
): number {
  return baseValue + multiplier * Math.pow(level, exponent);
}

/**
 * Build a full stat map for a class at a given level from formulas.
 */
export function buildClassProfile(
  className: string,
  level: number,
  formulas: Array<{ attributeSlug: string; baseValue: number; multiplier: number; exponent: number }>,
): CombatantProfile {
  const stats: StatMap = {};
  for (const f of formulas) {
    stats[f.attributeSlug] = statAtLevel(f.baseValue, f.multiplier, f.exponent, level);
  }
  return { name: `${className} Lv${level}`, level, stats };
}

/**
 * Build a combatant profile from mob data.
 */
export function buildMobProfile(
  name: string,
  level: number,
  attributes: Array<{ attributeSlug: string; flatValue: number }>,
  attackCooldownSec?: number,
): CombatantProfile {
  const stats: StatMap = {};
  for (const a of attributes) {
    stats[a.attributeSlug] = a.flatValue;
  }
  return { name, level, stats, attackCooldownSec };
}

// ---------------------------------------------------------------------------
// Damage Pipeline (expected values, no RNG)
// ---------------------------------------------------------------------------

/**
 * Determine which defense stat and which resist slug to use for a school.
 */
function getDefenseAndResist(schoolSlug: string): {
  defenseStat: string;
  resistSlug: string | null;
} {
  if (schoolSlug === 'physical') {
    return { defenseStat: 'physical_defense', resistSlug: null };
  }
  // All magical schools use magical_defense
  const resistSlug = `${schoolSlug}_resistance`;
  return { defenseStat: 'magical_defense', resistSlug };
}

/**
 * Calculate expected damage per hit from attacker → target using a specific skill.
 * Uses expected values for all probabilistic steps.
 */
export function calcExpectedDamage(
  attacker: CombatantProfile,
  target: CombatantProfile,
  skill: SkillCalcData,
  cfg: CombatConfig = DEFAULT_COMBAT_CONFIG,
): {
  expectedDamage: number;
  rawDamage: number;
  hitChance: number;
  effectiveCritMult: number;
  defenseReduction: number;
  elementalReduction: number;
  blockReduction: number;
} {
  // 1. HIT CHECK (expected value)
  const accuracy = getStat(attacker.stats, 'accuracy');
  const evasion = getStat(target.stats, 'evasion');
  const levelDiff = clamp(
    attacker.level - target.level,
    -cfg.levelDiffCap,
    cfg.levelDiffCap,
  );
  const levelDiffHitMod = levelDiff * cfg.levelDiffHitPerLevel;
  const hitChance = clamp(
    cfg.baseHitChance + (accuracy - evasion) * 0.01 + levelDiffHitMod,
    cfg.hitChanceMin,
    cfg.hitChanceMax,
  );

  // 2. BASE DAMAGE (use average, no variance)
  const scaleStat = getStat(attacker.stats, skill.scaleStatSlug);
  const rawDmg = skill.flatAdd + scaleStat * skill.coeff;
  // Average damage with variance = rawDmg (symmetric distribution)

  // 3. CRIT (expected multiplier)
  const critChance = clamp(
    getStat(attacker.stats, 'crit_chance'),
    0,
    cfg.critChanceCap,
  );
  const critMult = getStat(attacker.stats, 'crit_multiplier') || cfg.defaultCritMultiplier;
  // expected crit mult = (1 - critChance/100)*1.0 + (critChance/100)*(critMult/100)
  const effectiveCritMult =
    (1 - critChance / 100) * 1.0 + (critChance / 100) * (critMult / 100);
  let damage = rawDmg * effectiveCritMult;

  // 4. BLOCK (expected reduction — only for player targets, skip for mobs)
  let blockReduction = 0;
  const blockChance = clamp(
    getStat(target.stats, 'block_chance'),
    0,
    cfg.blockChanceCap,
  );
  const blockValue = getStat(target.stats, 'block_value');
  if (blockChance > 0 && blockValue > 0) {
    // Expected block reduction = blockChance/100 * blockValue
    blockReduction = (blockChance / 100) * blockValue;
    damage = Math.max(0, damage - blockReduction);
  }

  // 5. LEVEL DIFF MODIFIER
  const levelDiffDmgMod = 1 + levelDiff * cfg.levelDiffDamagePerLevel;
  damage = damage * levelDiffDmgMod;

  // 6. DEFENSE (diminishing returns)
  const { defenseStat, resistSlug } = getDefenseAndResist(skill.schoolSlug);
  const defense = getStat(target.stats, defenseStat);
  let defenseReduction = 0;
  if (defense > 0 && target.level > 0) {
    defenseReduction = defense / (defense + cfg.defenseFormulaK * target.level);
    defenseReduction = clamp(defenseReduction, 0, cfg.defenseCap);
  }
  damage = damage * (1 - defenseReduction);

  // 7. ELEMENTAL RESISTANCE
  let elementalReduction = 0;
  if (resistSlug) {
    const resistValue = getStat(target.stats, resistSlug);
    const cappedResist = Math.min(resistValue, cfg.maxResistanceCap);
    elementalReduction = Math.max(0, cappedResist) / 100;
    damage = damage * (1 - elementalReduction);
  }

  // Multiply by hitChance for expected damage
  const expectedDamage = Math.max(1, damage * hitChance);

  return {
    expectedDamage,
    rawDamage: rawDmg,
    hitChance,
    effectiveCritMult,
    defenseReduction,
    elementalReduction,
    blockReduction,
  };
}

// ---------------------------------------------------------------------------
// Attack Interval
// ---------------------------------------------------------------------------

/**
 * Calculate effective attack interval in milliseconds.
 * For physical skills (castMs === 0): uses swing_ms with attack_speed.
 * For spells (castMs > 0): uses cast_ms with cast_speed.
 */
export function calcEffectiveAttackIntervalMs(
  attacker: CombatantProfile,
  skill: SkillCalcData,
  cfg: CombatConfig = DEFAULT_COMBAT_CONFIG,
): { effectiveCastMs: number; effectiveSwingMs: number; totalMs: number } {
  if (skill.castMs > 0) {
    // Spell
    const castSpeed = getStat(attacker.stats, 'cast_speed');
    const speedFactor = 1 / (1 + castSpeed / cfg.castSpeedBaseDivisor);
    const effectiveCastMs = skill.castMs * speedFactor;
    const effectiveSwingMs = skill.swingMs * speedFactor;
    return {
      effectiveCastMs,
      effectiveSwingMs,
      totalMs: effectiveCastMs + effectiveSwingMs,
    };
  } else {
    // Physical / melee (castMs === 0)
    const attackSpeed = getStat(attacker.stats, 'attack_speed');
    const speedFactor = 1 / (1 + attackSpeed / cfg.attackSpeedBaseDivisor);
    const effectiveSwingMs = skill.swingMs * speedFactor;
    return {
      effectiveCastMs: 0,
      effectiveSwingMs,
      totalMs: effectiveSwingMs,
    };
  }
}

/**
 * For mobs that don't use skills, use their attackCooldown as the interval.
 * attackCooldown is stored in seconds.
 */
export function getMobAttackIntervalMs(mob: CombatantProfile): number {
  if (mob.attackCooldownSec && mob.attackCooldownSec > 0) {
    return mob.attackCooldownSec * 1000;
  }
  // Fallback: 2 seconds
  return 2000;
}

// ---------------------------------------------------------------------------
// Combat Simulation
// ---------------------------------------------------------------------------

/**
 * Basic Attack skill template (used when no specific skill is provided).
 */
export function makeBasicAttack(scaleStatSlug: string = 'physical_attack'): SkillCalcData {
  return {
    name: 'Basic Attack',
    slug: 'basic_attack',
    scaleStatSlug,
    schoolSlug: scaleStatSlug === 'magical_attack' ? 'arcane' : 'physical',
    flatAdd: 1,
    coeff: 1.0,
    castMs: 0,
    swingMs: 1200,
    cooldownMs: 1000,
    costMp: 0,
  };
}

/**
 * Select the best skill for a combatant to use based on server priority logic:
 * 1. Prefer abilities (cooldownMs > 0) over basic attacks
 * 2. Score: coeff*10 + (10000-cooldownMs)/1000
 * 3. Fall back to basic attack
 */
function selectNextSkill(
  combatant: CombatantProfile,
  timeElapsedMs: number,
  skillCooldowns: Map<string, number>,
  currentMana: number,
): SkillCalcData {
  const basicAttack = makeBasicAttack(
    getStat(combatant.stats, 'magical_attack') > getStat(combatant.stats, 'physical_attack')
      ? 'magical_attack'
      : 'physical_attack',
  );

  if (!combatant.skills || combatant.skills.length === 0) return basicAttack;

  // Separate abilities from basic attacks
  const abilities = combatant.skills.filter(s => s.cooldownMs > 0 && s.slug !== 'basic_attack');
  const basics = combatant.skills.filter(s => s.slug === 'basic_attack' || s.cooldownMs === 0);

  // Score and filter abilities
  let bestAbility: SkillCalcData | null = null;
  let bestScore = -1;
  for (const skill of abilities) {
    const lastUsed = skillCooldowns.get(skill.slug ?? skill.name) ?? -Infinity;
    if (timeElapsedMs - lastUsed < skill.cooldownMs) continue;
    if (skill.costMp > currentMana) continue;
    const score = skill.coeff * 10 + (10000 - skill.cooldownMs) / 1000;
    if (score > bestScore) {
      bestScore = score;
      bestAbility = skill;
    }
  }

  if (bestAbility) return bestAbility;

  // Fall back to first available basic or generated one
  return basics[0] ?? basicAttack;
}

/**
 * Simulate combat with skill rotation: attacker attacks target using all available skills.
 * Models time-based cooldowns and mana consumption.
 */
export function simulateCombat(
  attacker: CombatantProfile,
  target: CombatantProfile,
  attackerSkill?: SkillCalcData,
  cfg: CombatConfig = DEFAULT_COMBAT_CONFIG,
): CombatSimResult {
  const targetHP = getStat(target.stats, 'max_health') || 1;
  const attackerMaxHP = getStat(attacker.stats, 'max_health') || 1;
  const attackerMaxMP = getStat(attacker.stats, 'max_mana') || 0;

  // If a specific skill is given, use single-skill mode (backward compat)
  if (attackerSkill || !attacker.skills || attacker.skills.length <= 1) {
    return simulateSingleSkill(attacker, target, attackerSkill, cfg);
  }

  // --- Full rotation simulation ---
  let remainingHP = targetHP;
  let currentMana = attackerMaxMP;
  let timeMs = 0;
  let totalDamage = 0;
  let totalHits = 0;
  let totalManaUsed = 0;
  const skillCooldowns = new Map<string, number>();
  let firstDmgResult: ReturnType<typeof calcExpectedDamage> | null = null;
  let firstSkill: SkillCalcData | null = null;

  // Safety: max 200 iterations
  for (let i = 0; i < 200 && remainingHP > 0; i++) {
    const skill = selectNextSkill(attacker, timeMs, skillCooldowns, currentMana);
    const dmg = calcExpectedDamage(attacker, target, skill, cfg);
    const interval = calcEffectiveAttackIntervalMs(attacker, skill, cfg);

    if (!firstDmgResult) { firstDmgResult = dmg; firstSkill = skill; }

    remainingHP -= dmg.expectedDamage;
    totalDamage += dmg.expectedDamage;
    totalHits++;
    currentMana -= skill.costMp;
    totalManaUsed += skill.costMp;

    if (skill.slug || skill.name) {
      skillCooldowns.set(skill.slug ?? skill.name, timeMs);
    }
    timeMs += interval.totalMs;
  }

  const timeToKillSec = timeMs / 1000;
  const attackIntervalSec = totalHits > 0 ? (timeMs / 1000) / totalHits : 1;
  const dps = timeToKillSec > 0 ? totalDamage / timeToKillSec : 0;

  // Reverse: target attacks attacker
  const targetDmg = simulateTargetDps(target, attacker, cfg);
  const damageTaken = targetDmg.dps * timeToKillSec;
  const hpRemaining = Math.max(0, attackerMaxHP - damageTaken);

  // Regen-based sustain check (out-of-combat regen)
  const hpRegen = getStat(attacker.stats, 'hp_regen_per_s');
  const canSustain = damageTaken < attackerMaxHP;

  const d = firstDmgResult ?? calcExpectedDamage(attacker, target, makeBasicAttack(), cfg);

  return {
    damagePerHit: totalHits > 0 ? totalDamage / totalHits : d.expectedDamage,
    rawDamage: d.rawDamage,
    hitsToKill: totalHits,
    timeToKillSec,
    attackIntervalSec,
    damageTakenDuringFight: damageTaken,
    hitChance: d.hitChance,
    effectiveCritMult: d.effectiveCritMult,
    defenseReduction: d.defenseReduction,
    elementalReduction: d.elementalReduction,
    dps,
    canSustain,
    hpRemaining,
    manaUsed: totalManaUsed,
  };
}

/**
 * Calculate target's DPS against the attacker (for damage-taken calculation).
 * Uses mob skill rotation if available.
 */
function simulateTargetDps(
  target: CombatantProfile,
  attacker: CombatantProfile,
  cfg: CombatConfig,
): { dps: number } {
  const targetSkill = makeBasicAttack(
    getStat(target.stats, 'magical_attack') > getStat(target.stats, 'physical_attack')
      ? 'magical_attack'
      : 'physical_attack',
  );

  // Use mob skills if available
  if (target.skills && target.skills.length > 0) {
    // Weighted DPS: basic attack fills gaps between ability cooldowns
    let totalDmgPerCycle = 0;
    let totalCycleMs = 0;
    const basic = target.skills.find(s => s.slug === 'basic_attack' || s.cooldownMs === 0) ?? targetSkill;
    const abilities = target.skills.filter(s => s.cooldownMs > 0 && s.slug !== 'basic_attack');

    // Calculate basic attack DPS
    const basicDmg = calcExpectedDamage(target, attacker, basic, cfg);
    const basicInterval = target.attackCooldownSec
      ? target.attackCooldownSec * 1000
      : calcEffectiveAttackIntervalMs(target, basic, cfg).totalMs;

    if (abilities.length === 0) {
      return { dps: basicInterval > 0 ? basicDmg.expectedDamage / (basicInterval / 1000) : 0 };
    }

    // Simulate 30s window to get average DPS
    const windowMs = 30000;
    const cooldowns = new Map<string, number>();
    let dmgInWindow = 0;
    let t = 0;

    for (let i = 0; i < 300 && t < windowMs; i++) {
      let usedAbility = false;
      for (const ab of abilities) {
        const lastUsed = cooldowns.get(ab.slug ?? ab.name) ?? -Infinity;
        if (t - lastUsed >= ab.cooldownMs) {
          const abDmg = calcExpectedDamage(target, attacker, ab, cfg);
          const abInterval = calcEffectiveAttackIntervalMs(target, ab, cfg);
          dmgInWindow += abDmg.expectedDamage;
          cooldowns.set(ab.slug ?? ab.name, t);
          t += abInterval.totalMs;
          usedAbility = true;
          break;
        }
      }
      if (!usedAbility) {
        dmgInWindow += basicDmg.expectedDamage;
        t += basicInterval;
      }
    }

    return { dps: t > 0 ? dmgInWindow / (t / 1000) : 0 };
  }

  // Simple: basic attack only
  const reverseDmg = calcExpectedDamage(target, attacker, targetSkill, cfg);
  const targetIntervalMs = getMobAttackIntervalMs(target);
  return { dps: targetIntervalMs > 0 ? reverseDmg.expectedDamage / (targetIntervalMs / 1000) : 0 };
}

/**
 * Single-skill combat simulation (backward compatible).
 */
function simulateSingleSkill(
  attacker: CombatantProfile,
  target: CombatantProfile,
  attackerSkill?: SkillCalcData,
  cfg: CombatConfig = DEFAULT_COMBAT_CONFIG,
): CombatSimResult {
  const skill = attackerSkill ?? makeBasicAttack(
    getStat(attacker.stats, 'magical_attack') > getStat(attacker.stats, 'physical_attack')
      ? 'magical_attack'
      : 'physical_attack',
  );

  const dmgResult = calcExpectedDamage(attacker, target, skill, cfg);
  const intervalResult = calcEffectiveAttackIntervalMs(attacker, skill, cfg);
  const attackIntervalSec = intervalResult.totalMs / 1000;

  const targetHP = getStat(target.stats, 'max_health') || 1;
  const attackerMaxHP = getStat(attacker.stats, 'max_health') || 1;
  const hitsToKill = Math.max(1, Math.ceil(targetHP / dmgResult.expectedDamage));
  const timeToKillSec = hitsToKill * attackIntervalSec;
  const dps = timeToKillSec > 0 ? (dmgResult.expectedDamage * hitsToKill) / timeToKillSec : 0;

  // Reverse: target attacks attacker
  const targetDps = simulateTargetDps(target, attacker, cfg);
  const damageTaken = targetDps.dps * timeToKillSec;
  const hpRemaining = Math.max(0, attackerMaxHP - damageTaken);

  return {
    damagePerHit: dmgResult.expectedDamage,
    rawDamage: dmgResult.rawDamage,
    hitsToKill,
    timeToKillSec,
    attackIntervalSec,
    damageTakenDuringFight: damageTaken,
    hitChance: dmgResult.hitChance,
    effectiveCritMult: dmgResult.effectiveCritMult,
    defenseReduction: dmgResult.defenseReduction,
    elementalReduction: dmgResult.elementalReduction,
    dps,
    canSustain: damageTaken < attackerMaxHP,
    hpRemaining,
    manaUsed: hitsToKill * skill.costMp,
  };
}

// ---------------------------------------------------------------------------
// Multi-Mob Simulation
// ---------------------------------------------------------------------------

/** Result of a multi-mob combat simulation */
export interface MultiMobSimResult {
  /** Whether the player survives the encounter */
  survives: boolean;
  /** Total time for the entire encounter in seconds */
  totalTimeSec: number;
  /** Total damage dealt by the player */
  totalDamageDealt: number;
  /** Total damage taken from all mobs combined */
  totalDamageTaken: number;
  /** HP remaining after all mobs are dead (0 if dead) */
  hpRemaining: number;
  /** HP as percentage of max */
  hpRemainingPct: number;
  /** Time of death in seconds (Infinity if survives) */
  timeOfDeathSec: number;
  /** How many mobs were killed before dying (or total if survived) */
  mobsKilled: number;
  /** Total mobs in the encounter */
  totalMobs: number;
  /** Per-mob breakdown */
  perMob: Array<{
    /** 1v1 sim result for this mob type */
    sim: CombatSimResult;
    /** Number of this mob type */
    count: number;
    /** Mob name */
    name: string;
    /** Mob level */
    level: number;
    /** DPS this mob type deals to player */
    mobDps: number;
  }>;
  /** Combined incoming DPS from all alive mobs at fight start */
  peakIncomingDps: number;
  /** Player's outgoing DPS */
  playerDps: number;
}

/**
 * Simulate combat against multiple mobs attacking simultaneously.
 *
 * Model: Player focus-fires one mob at a time. All alive mobs deal damage
 * to the player simultaneously. Player kills mobs in order (weakest TTK first).
 * HP regen is applied continuously.
 */
export function simulateMultiMobCombat(
  attacker: CombatantProfile,
  mobs: Array<{ profile: CombatantProfile; count: number }>,
  attackerSkill?: SkillCalcData,
  cfg: CombatConfig = DEFAULT_COMBAT_CONFIG,
): MultiMobSimResult {
  const attackerMaxHP = getStat(attacker.stats, 'max_health') || 1;
  const hpRegen = getStat(attacker.stats, 'hp_regen_per_s');

  // Run 1v1 sims for each mob type and compute their DPS against the player
  const mobEntries = mobs.flatMap(({ profile, count }) => {
    const sim = simulateCombat(attacker, profile, attackerSkill, cfg);
    const mobDps = simulateTargetDps(profile, attacker, cfg);
    return Array.from({ length: count }, () => ({
      profile,
      sim,
      mobDps: mobDps.dps,
      ttk: sim.timeToKillSec,
      hp: getStat(profile.stats, 'max_health') || 1,
      name: profile.name,
      level: profile.level,
    }));
  });

  // Sort by TTK ascending — kill weakest first to reduce incoming DPS fastest
  mobEntries.sort((a, b) => a.ttk - b.ttk);

  let currentHP = attackerMaxHP;
  let timeElapsed = 0;
  let totalDamageDealt = 0;
  let totalDamageTaken = 0;
  let mobsKilled = 0;
  let timeOfDeath = Infinity;

  // Fight each mob sequentially while all alive mobs deal damage
  for (let i = 0; i < mobEntries.length; i++) {
    const mob = mobEntries[i];
    const aliveMobs = mobEntries.length - i;

    // Combined DPS from all remaining alive mobs
    let incomingDps = 0;
    for (let j = i; j < mobEntries.length; j++) {
      incomingDps += mobEntries[j].mobDps;
    }

    // Net DPS against player (regen helps)
    const netIncomingDps = Math.max(0, incomingDps - hpRegen);

    // Time to kill this mob
    const ttk = mob.ttk;

    // Damage taken during this mob kill
    const damageDuringKill = netIncomingDps * ttk;

    currentHP -= damageDuringKill;
    totalDamageTaken += incomingDps * ttk; // Raw damage before regen
    totalDamageDealt += mob.hp;

    if (currentHP <= 0) {
      // Player dies during this fight — calculate exact time of death
      const timeToDeathInThisFight = netIncomingDps > 0
        ? currentHP / netIncomingDps + ttk + damageDuringKill / netIncomingDps
        : ttk;
      // Recalculate: HP was positive at start of this mob, dies partway through
      const hpAtStart = currentHP + damageDuringKill;
      const deathTime = netIncomingDps > 0 ? hpAtStart / netIncomingDps : Infinity;
      timeOfDeath = timeElapsed + Math.min(deathTime, ttk);
      currentHP = 0;
      // Count partial kill if we survived long enough
      if (deathTime >= ttk) mobsKilled++;
      break;
    }

    timeElapsed += ttk;
    mobsKilled++;
  }

  const survives = currentHP > 0;

  // Build per-mob-type breakdown
  const perMobMap = new Map<string, MultiMobSimResult['perMob'][0]>();
  for (const { profile, count } of mobs) {
    const key = profile.name;
    if (!perMobMap.has(key)) {
      const sim = simulateCombat(attacker, profile, attackerSkill, cfg);
      const mobDps = simulateTargetDps(profile, attacker, cfg);
      perMobMap.set(key, {
        sim,
        count,
        name: profile.name,
        level: profile.level,
        mobDps: mobDps.dps,
      });
    }
  }

  // Peak incoming DPS = sum of all mob DPS at the start
  const peakIncomingDps = mobEntries.reduce((sum, m) => sum + m.mobDps, 0);
  const playerDps = mobEntries[0]?.sim.dps ?? 0;

  return {
    survives,
    totalTimeSec: survives ? timeElapsed : timeOfDeath,
    totalDamageDealt,
    totalDamageTaken,
    hpRemaining: Math.max(0, currentHP),
    hpRemainingPct: (Math.max(0, currentHP) / attackerMaxHP) * 100,
    timeOfDeathSec: timeOfDeath,
    mobsKilled,
    totalMobs: mobEntries.length,
    perMob: Array.from(perMobMap.values()),
    peakIncomingDps,
    playerDps,
  };
}

// ---------------------------------------------------------------------------
// EXP Farming
// ---------------------------------------------------------------------------

export function calcFarmEfficiency(
  timeToKillSec: number,
  expReward: number,
  downtimeSec: number = 3,
): FarmEfficiencyResult {
  const fullCycleSec = timeToKillSec + downtimeSec;
  const killsPerMinute = fullCycleSec > 0 ? 60 / fullCycleSec : 0;
  return {
    killsPerMinute,
    expPerMinute: killsPerMinute * expReward,
    fullCycleSec,
  };
}

// ---------------------------------------------------------------------------
// Item Impact
// ---------------------------------------------------------------------------

/**
 * Calculate the impact of equipping an item on a combatant's combat metrics.
 * `testTarget` is the mob/enemy used for before/after comparison.
 */
export function calcItemImpact(
  baseCombatant: CombatantProfile,
  itemAttributes: Array<{ attributeSlug: string; value: number }>,
  testTarget: CombatantProfile,
  cfg: CombatConfig = DEFAULT_COMBAT_CONFIG,
): ItemImpactResult {
  // Build modified stats
  const modifiedStats: StatMap = { ...baseCombatant.stats };
  const statDeltas: Record<string, number> = {};
  for (const attr of itemAttributes) {
    const oldVal = modifiedStats[attr.attributeSlug] ?? 0;
    modifiedStats[attr.attributeSlug] = oldVal + attr.value;
    statDeltas[attr.attributeSlug] = attr.value;
  }

  const modifiedCombatant: CombatantProfile = {
    ...baseCombatant,
    stats: modifiedStats,
  };

  const before = simulateCombat(baseCombatant, testTarget, undefined, cfg);
  const after = simulateCombat(modifiedCombatant, testTarget, undefined, cfg);

  return {
    statDeltas,
    damageChange: after.damagePerHit - before.damagePerHit,
    damageChangePct:
      before.damagePerHit > 0
        ? ((after.damagePerHit - before.damagePerHit) / before.damagePerHit) * 100
        : 0,
    hitsToKillChange: after.hitsToKill - before.hitsToKill,
    timeToKillChange: after.timeToKillSec - before.timeToKillSec,
  };
}

// ---------------------------------------------------------------------------
// Skill Efficiency
// ---------------------------------------------------------------------------

/**
 * Analyze skill efficiency against a target, compared to auto-attack.
 */
export function calcSkillEfficiency(
  caster: CombatantProfile,
  target: CombatantProfile,
  skill: SkillCalcData,
  cfg: CombatConfig = DEFAULT_COMBAT_CONFIG,
): SkillEfficiencyResult {
  const dmg = calcExpectedDamage(caster, target, skill, cfg);
  const interval = calcEffectiveAttackIntervalMs(caster, skill, cfg);

  const totalCycleTimeSec = interval.totalMs / 1000;
  const totalDamage = dmg.expectedDamage;
  const damagePerMana = skill.costMp > 0 ? totalDamage / skill.costMp : Infinity;
  const damagePerSecond = totalCycleTimeSec > 0 ? totalDamage / totalCycleTimeSec : 0;

  // Compare to basic attack
  const autoAttack = makeBasicAttack(skill.scaleStatSlug);
  const autoDmg = calcExpectedDamage(caster, target, autoAttack, cfg);
  const autoInterval = calcEffectiveAttackIntervalMs(caster, autoAttack, cfg);
  const autoDps =
    autoInterval.totalMs > 0
      ? autoDmg.expectedDamage / (autoInterval.totalMs / 1000)
      : 0;

  return {
    totalDamage,
    damagePerMana,
    damagePerSecond,
    dpsVsAutoAttack: autoDps > 0 ? damagePerSecond / autoDps : 0,
    totalCycleTimeSec,
    effectiveCastMs: interval.effectiveCastMs,
    effectiveSwingMs: interval.effectiveSwingMs,
  };
}

// ---------------------------------------------------------------------------
// Config parser (game_config rows → CombatConfig)
// ---------------------------------------------------------------------------

export function parseCombatConfig(
  rows: Array<{ key: string; value: string }>,
): CombatConfig {
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const get = (key: string, fallback: number) => {
    const v = map.get(key);
    return v != null ? parseFloat(v) : fallback;
  };

  return {
    baseHitChance: get('combat.base_hit_chance', 0.95),
    hitChanceMin: get('combat.hit_chance_min', 0.05),
    hitChanceMax: get('combat.hit_chance_max', 0.95),
    damageVariance: get('combat.damage_variance', 0.12),
    critChanceCap: get('combat.crit_chance_cap', 75),
    blockChanceCap: get('combat.block_chance_cap', 75),
    defenseCap: get('combat.defense_cap', 0.85),
    defenseFormulaK: get('combat.defense_formula_k', 7.5),
    maxResistanceCap: get('combat.max_resistance_cap', 75),
    levelDiffCap: get('combat.level_diff_cap', 10),
    levelDiffDamagePerLevel: get('combat.level_diff_damage_per_level', 0.04),
    levelDiffHitPerLevel: get('combat.level_diff_hit_per_level', 0.02),
    attackSpeedBaseDivisor: get('combat.attack_speed_base_divisor', 100),
    castSpeedBaseDivisor: get('combat.cast_speed_base_divisor', 100),
    defaultCritMultiplier: get('combat.default_crit_multiplier', 200),
  };
}

export function parseRegenConfig(
  rows: Array<{ key: string; value: string }>,
): RegenConfig {
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const get = (key: string, fallback: number) => {
    const v = map.get(key);
    return v != null ? parseFloat(v) : fallback;
  };

  return {
    baseHpRegen: get('regen.baseHpRegen', 2),
    baseMpRegen: get('regen.baseMpRegen', 1),
    hpRegenConCoeff: get('regen.hpRegenConCoeff', 0.3),
    mpRegenWisCoeff: get('regen.mpRegenWisCoeff', 0.5),
    tickIntervalMs: get('regen.tickIntervalMs', 4000),
    disableInCombatMs: get('regen.disableInCombatMs', 8000),
  };
}

// ---------------------------------------------------------------------------
// XP Progression
// ---------------------------------------------------------------------------

/**
 * Calculate XP awarded for killing a mob, accounting for level difference and rank.
 * Matches ExperienceManager::calculateMobExperience from the C++ server.
 */
export function calcMobXp(
  mobBaseXp: number,
  mobLevel: number,
  playerLevel: number,
  rankMultiplier: number = 1.0,
): number {
  const diff = mobLevel - playerLevel;
  let levelMod: number;
  if (diff < -5) levelMod = 0.1;
  else if (diff <= -3) levelMod = 0.5;
  else if (diff <= 2) levelMod = 1.0;
  else if (diff <= 5) levelMod = 1.5;
  else levelMod = 2.0;

  return Math.round(mobBaseXp * rankMultiplier * levelMod);
}

/**
 * Build a full leveling progression table.
 * Shows how many kills and how long it takes to level up at each level.
 */
export function calcLevelProgression(
  xpTable: Array<{ level: number; xpRequired: number }>,
  mobBaseXp: number,
  mobLevel: number,
  rankMultiplier: number,
  timeToKillSec: number,
  downtimeSec: number = 3,
): LevelProgressionEntry[] {
  const sorted = [...xpTable].sort((a, b) => a.level - b.level);
  const entries: LevelProgressionEntry[] = [];
  let cumulativeTimeSec = 0;

  for (let i = 0; i < sorted.length; i++) {
    const lvl = sorted[i];
    const prevXp = i > 0 ? sorted[i - 1].xpRequired : 0;
    const xpForThisLevel = lvl.xpRequired - prevXp;

    const xpPerKill = calcMobXp(mobBaseXp, mobLevel, lvl.level, rankMultiplier);
    const killsForLevel = xpPerKill > 0 ? Math.ceil(xpForThisLevel / xpPerKill) : Infinity;
    const timeForLevelSec = killsForLevel * (timeToKillSec + downtimeSec);
    cumulativeTimeSec += timeForLevelSec;

    entries.push({
      level: lvl.level,
      xpRequired: lvl.xpRequired,
      xpForThisLevel,
      killsForLevel,
      timeForLevelSec,
      cumulativeTimeSec,
      xpPerKill,
    });
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Class Power Curve
// ---------------------------------------------------------------------------

/**
 * Calculate a class's power curve across level breakpoints.
 */
export function calcClassPowerCurve(
  className: string,
  formulas: Array<{ attributeSlug: string; baseValue: number; multiplier: number; exponent: number }>,
  levels: number[],
  testTarget: CombatantProfile,
  cfg: CombatConfig = DEFAULT_COMBAT_CONFIG,
): ClassPowerEntry[] {
  return levels.map(level => {
    const profile = buildClassProfile(className, level, formulas);
    const sim = simulateCombat(profile, testTarget, undefined, cfg);
    const stats = profile.stats;
    return {
      level,
      stats,
      dps: sim.dps,
      effectiveHp: calcEffectiveHp(
        getStat(stats, 'max_health'),
        getStat(stats, 'physical_defense'),
        level,
        cfg,
      ),
      maxHp: getStat(stats, 'max_health'),
      maxMp: getStat(stats, 'max_mana'),
      hpRegen: getStat(stats, 'hp_regen_per_s'),
      mpRegen: getStat(stats, 'mp_regen_per_s'),
    };
  });
}

/**
 * Effective HP: how much raw damage you can take, factoring in defense DR.
 * EHP = maxHP / (1 - DR) where DR = def / (def + K * level)
 */
export function calcEffectiveHp(
  maxHp: number,
  defense: number,
  level: number,
  cfg: CombatConfig = DEFAULT_COMBAT_CONFIG,
): number {
  const dr = defense > 0 && level > 0
    ? clamp(defense / (defense + cfg.defenseFormulaK * level), 0, cfg.defenseCap)
    : 0;
  return maxHp / Math.max(0.01, 1 - dr);
}

// ---------------------------------------------------------------------------
// Equipment Impact
// ---------------------------------------------------------------------------

/**
 * Apply equipment bonuses to a combatant profile.
 */
export function applyEquipment(
  base: CombatantProfile,
  equipment: Array<{ attributeSlug: string; value: number }>,
): CombatantProfile {
  const stats: StatMap = { ...base.stats };
  for (const e of equipment) {
    stats[e.attributeSlug] = (stats[e.attributeSlug] ?? 0) + e.value;
  }
  return { ...base, stats };
}

// ---------------------------------------------------------------------------
// Combat Comparison (base vs modified — shows absolute + delta)
// ---------------------------------------------------------------------------

/**
 * Compare combat results: base profile vs modified profile against same target.
 * Returns both absolute results and deltas for every metric.
 */
export function compareCombat(
  baseProfile: CombatantProfile,
  modifiedProfile: CombatantProfile,
  target: CombatantProfile,
  skill?: SkillCalcData,
  cfg: CombatConfig = DEFAULT_COMBAT_CONFIG,
): CombatComparison {
  const base = simulateCombat(baseProfile, target, skill, cfg);
  const modified = simulateCombat(modifiedProfile, target, skill, cfg);

  const statDeltas: Record<string, number> = {};
  const allKeys = Array.from(new Set([
    ...Object.keys(baseProfile.stats),
    ...Object.keys(modifiedProfile.stats),
  ]));
  for (const key of allKeys) {
    const d = (modifiedProfile.stats[key] ?? 0) - (baseProfile.stats[key] ?? 0);
    if (Math.abs(d) > 0.001) statDeltas[key] = d;
  }

  return {
    base,
    modified,
    damageChange: modified.damagePerHit - base.damagePerHit,
    damageChangePct: base.damagePerHit > 0 ? ((modified.damagePerHit - base.damagePerHit) / base.damagePerHit) * 100 : 0,
    hitsToKillChange: modified.hitsToKill - base.hitsToKill,
    timeToKillChange: modified.timeToKillSec - base.timeToKillSec,
    dpsChange: modified.dps - base.dps,
    dpsChangePct: base.dps > 0 ? ((modified.dps - base.dps) / base.dps) * 100 : 0,
    damageTakenChange: modified.damageTakenDuringFight - base.damageTakenDuringFight,
    hpRemainingChange: modified.hpRemaining - base.hpRemaining,
    statDeltas,
  };
}

// ---------------------------------------------------------------------------
// Loot Farm Calculator
// ---------------------------------------------------------------------------

/**
 * Calculate how long to farm a specific item from a mob.
 * Mirrors LootManager pity logic from C++ server.
 */
export function calcLootFarmTime(
  drop: LootDropInfo,
  timeToKillSec: number,
  downtimeSec: number = 3,
  targetQuantity: number = 1,
  lootMultiplier: number = 1.0,
  pity: PityConfig = DEFAULT_PITY_CONFIG,
): LootFarmResult {
  const cycleSec = timeToKillSec + downtimeSec;
  const effectiveChance = Math.min(1, drop.dropChance * lootMultiplier);
  const avgQuantityPerDrop = (drop.minQuantity + drop.maxQuantity) / 2;

  // Expected kills for 1 drop (geometric distribution)
  const expectedKillsForOne = effectiveChance > 0 ? 1 / effectiveChance : Infinity;

  // For targetQuantity, considering avg quantity per drop
  const dropsNeeded = avgQuantityPerDrop > 0 ? Math.ceil(targetQuantity / avgQuantityPerDrop) : Infinity;
  const killsForQuantity = Math.ceil(expectedKillsForOne * dropsNeeded);

  return {
    expectedKills: Math.ceil(expectedKillsForOne),
    expectedTimeSec: expectedKillsForOne * cycleSec,
    pityGuaranteedKills: pity.hardPityKills,
    pityGuaranteedTimeSec: pity.hardPityKills * cycleSec,
    killsForQuantity,
    avgQuantityPerDrop,
  };
}

// ---------------------------------------------------------------------------
// Durability Calculator
// ---------------------------------------------------------------------------

/**
 * Calculate durability breakdown for a weapon and armor piece.
 * Matches CombatSystem.cpp durability logic.
 */
export function calcDurability(
  durabilityMax: number,
  vendorBuyPrice: number,
  hitsToKillMob: number,
  mobHitsPerFight: number,
  timeToKillSec: number,
  downtimeSec: number = 3,
  isWeapon: boolean = true,
  durCfg: DurabilityConfig = DEFAULT_DURABILITY_CONFIG,
): DurabilityResult {
  const cycleSec = timeToKillSec + downtimeSec;

  // Weapon: loses durability per player attack (= hitsToKillMob per fight)
  const weaponDurPerFight = hitsToKillMob * durCfg.weaponLossPerHit;
  const weaponFightsToBreak = weaponDurPerFight > 0
    ? Math.floor(durabilityMax / weaponDurPerFight)
    : Infinity;
  const weaponHitsToBreak = durabilityMax / durCfg.weaponLossPerHit;

  // Armor: loses durability per mob hit received (= mobHitsPerFight per fight)
  const armorDurPerFight = mobHitsPerFight * durCfg.armorLossPerHit;
  const armorFightsToBreak = armorDurPerFight > 0
    ? Math.floor(durabilityMax / armorDurPerFight)
    : Infinity;
  const armorHitsToBreak = durabilityMax / durCfg.armorLossPerHit;

  // Repair cost = ceil(vendorPriceBuy × missing / durMax) for full repair
  const weaponFullRepairCost = vendorBuyPrice;
  const armorFullRepairCost = vendorBuyPrice;

  return {
    weaponHitsToBreak,
    armorHitsToBreak,
    weaponFightsToBreak,
    armorFightsToBreak,
    weaponTimeToBreakSec: weaponFightsToBreak * cycleSec,
    armorTimeToBreakSec: armorFightsToBreak * cycleSec,
    weaponFullRepairCost,
    armorFullRepairCost,
    weaponDurPerFight,
    armorDurPerFight,
  };
}

// ---------------------------------------------------------------------------
// Economy / Gold Farm Calculator
// ---------------------------------------------------------------------------

/**
 * Calculate how long to farm enough gold to buy something.
 */
export function calcGoldFarmTime(
  targetGold: number,
  goldPerKill: number,
  timeToKillSec: number,
  downtimeSec: number = 3,
): GoldFarmResult {
  const cycleSec = timeToKillSec + downtimeSec;
  const killsNeeded = goldPerKill > 0 ? Math.ceil(targetGold / goldPerKill) : Infinity;
  const timeSec = killsNeeded * cycleSec;
  const goldPerMinute = cycleSec > 0 ? (goldPerKill / cycleSec) * 60 : 0;

  return {
    goldPerKill,
    killsNeeded,
    timeSec,
    goldPerMinute,
  };
}

/**
 * Calculate vendor buy price with markup.
 */
export function calcVendorBuyPrice(
  basePrice: number,
  markupPct: number = 0,
  vendorMarkupPct: number = 0,
): number {
  return Math.ceil(basePrice * (1 + markupPct / 100) * (1 + vendorMarkupPct));
}

/**
 * Calculate vendor sell price with tax.
 */
export function calcVendorSellPrice(
  basePrice: number,
  taxPct: number = 0,
): number {
  return Math.floor(basePrice * (1 - taxPct));
}

/**
 * Estimate gold income per mob kill from its loot table.
 * Sum of (dropChance × avgQuantity × vendorSellPrice) for each loot entry.
 */
export function calcGoldPerKill(
  lootTable: Array<{
    dropChance: number;
    minQuantity: number;
    maxQuantity: number;
    vendorSellPrice: number;
  }>,
  sellTaxPct: number = 0,
): number {
  let gold = 0;
  for (const item of lootTable) {
    const avgQty = (item.minQuantity + item.maxQuantity) / 2;
    const sellPrice = Math.floor(item.vendorSellPrice * (1 - sellTaxPct));
    gold += item.dropChance * avgQty * sellPrice;
  }
  return gold;
}

// ---------------------------------------------------------------------------
// Quest Time Estimation
// ---------------------------------------------------------------------------

/**
 * Estimate time to complete a quest based on its steps.
 */
export function calcQuestTime(
  steps: Array<{
    stepType: string;
    /** For kill/collect: how many needed */
    count: number;
    /** For kill: TTK against the mob */
    timeToKillSec?: number;
    /** For kill: downtime between fights */
    downtimeSec?: number;
    /** For collect: drop chance of the item from the mob */
    dropChance?: number;
    /** Estimated travel time for this step (reach/talk) */
    travelTimeSec?: number;
  }>,
): { totalTimeSec: number; breakdown: Array<{ stepType: string; timeSec: number }> } {
  const breakdown: Array<{ stepType: string; timeSec: number }> = [];
  let total = 0;

  for (const step of steps) {
    let timeSec = 0;
    const dt = step.downtimeSec ?? 3;
    const ttk = step.timeToKillSec ?? 5;
    const cycle = ttk + dt;

    switch (step.stepType) {
      case 'kill':
        timeSec = step.count * cycle;
        break;
      case 'collect': {
        const chance = step.dropChance ?? 1.0;
        const expectedKills = chance > 0 ? step.count / chance : step.count;
        timeSec = Math.ceil(expectedKills) * cycle;
        break;
      }
      case 'talk':
      case 'reach':
        timeSec = step.travelTimeSec ?? 30;
        break;
      case 'interact':
        timeSec = (step.travelTimeSec ?? 10) * step.count;
        break;
      default:
        timeSec = step.travelTimeSec ?? 60;
    }

    breakdown.push({ stepType: step.stepType, timeSec });
    total += timeSec;
  }

  return { totalTimeSec: total, breakdown };
}

// ---------------------------------------------------------------------------
// Balance Recommendations
// ---------------------------------------------------------------------------

/**
 * Analyze a combat sim and return balance flags/recommendations.
 */
export function analyzeBalance(
  sim: CombatSimResult,
  context: {
    playerLevel: number;
    mobLevel: number;
    mobRankCode: string;
    mobHp: number;
  },
): BalanceFlag[] {
  const flags: BalanceFlag[] = [];
  const lvlDiff = context.playerLevel - context.mobLevel;

  // TTK analysis
  if (sim.timeToKillSec < 2 && context.mobRankCode === 'normal') {
    flags.push({ key: 'ttk_too_fast', verdict: 'warn', label: 'TTK Too Fast', detail: '', detailParams: { ttk: sim.timeToKillSec.toFixed(1) } });
  } else if (sim.timeToKillSec < 5 && context.mobRankCode === 'normal') {
    flags.push({ key: 'ttk_fast', verdict: 'great', label: 'TTK Good', detail: '', detailParams: { ttk: sim.timeToKillSec.toFixed(1) } });
  } else if (sim.timeToKillSec > 30 && context.mobRankCode === 'normal') {
    flags.push({ key: 'ttk_too_slow', verdict: 'danger', label: 'TTK Too Slow', detail: '', detailParams: { ttk: sim.timeToKillSec.toFixed(1) } });
  } else if (sim.timeToKillSec > 15 && context.mobRankCode === 'normal') {
    flags.push({ key: 'ttk_slow', verdict: 'warn', label: 'TTK Slow', detail: '', detailParams: { ttk: sim.timeToKillSec.toFixed(1) } });
  } else {
    flags.push({ key: 'ttk_ok', verdict: 'ok', label: 'TTK Normal', detail: '', detailParams: { ttk: sim.timeToKillSec.toFixed(1) } });
  }

  // Hit chance
  if (sim.hitChance < 0.5) {
    flags.push({ key: 'hit_low', verdict: 'danger', label: 'Hit Chance Very Low', detail: '', detailParams: { pct: (sim.hitChance * 100).toFixed(0) } });
  } else if (sim.hitChance < 0.75) {
    flags.push({ key: 'hit_warn', verdict: 'warn', label: 'Hit Chance Low', detail: '', detailParams: { pct: (sim.hitChance * 100).toFixed(0) } });
  }

  // Sustain check
  if (!sim.canSustain) {
    const hpPct = sim.hpRemaining / (sim.hpRemaining + sim.damageTakenDuringFight) * 100;
    if (hpPct < 20) {
      flags.push({ key: 'sustain_danger', verdict: 'danger', label: 'Cannot Sustain', detail: '', detailParams: { pct: hpPct.toFixed(0) } });
    } else {
      flags.push({ key: 'sustain_warn', verdict: 'warn', label: 'Sustain Marginal', detail: '', detailParams: { pct: hpPct.toFixed(0) } });
    }
  } else {
    flags.push({ key: 'sustain_ok', verdict: 'great', label: 'Can Sustain', detail: '' });
  }

  // DPS analysis
  if (sim.dps < 1 && context.mobRankCode === 'normal') {
    flags.push({ key: 'dps_low', verdict: 'danger', label: 'DPS Very Low', detail: '', detailParams: { dps: sim.dps.toFixed(1) } });
  }

  // Damage taken analysis
  const damagePct = sim.damageTakenDuringFight / ((sim.hpRemaining + sim.damageTakenDuringFight) || 1) * 100;
  if (damagePct > 80) {
    flags.push({ key: 'dmg_taken_high', verdict: 'danger', label: 'Taking Too Much Damage', detail: '', detailParams: { pct: damagePct.toFixed(0) } });
  } else if (damagePct > 50) {
    flags.push({ key: 'dmg_taken_warn', verdict: 'warn', label: 'High Damage Taken', detail: '', detailParams: { pct: damagePct.toFixed(0) } });
  } else if (damagePct < 5 && context.mobRankCode !== 'normal') {
    flags.push({ key: 'dmg_taken_trivial', verdict: 'warn', label: 'Damage Trivial', detail: '', detailParams: { pct: damagePct.toFixed(0) } });
  }

  // Level diff
  if (lvlDiff > 5) {
    flags.push({ key: 'level_high', verdict: 'warn', label: 'Overleveled', detail: '', detailParams: { diff: lvlDiff } });
  } else if (lvlDiff < -5) {
    flags.push({ key: 'level_low', verdict: 'danger', label: 'Underleveled', detail: '', detailParams: { diff: Math.abs(lvlDiff) } });
  }

  return flags;
}

// ---------------------------------------------------------------------------
// Config Parsers (new)
// ---------------------------------------------------------------------------

export function parsePityConfig(rows: Array<{ key: string; value: string }>): PityConfig {
  const cfg = { ...DEFAULT_PITY_CONFIG };
  for (const r of rows) {
    switch (r.key) {
      case 'pity.soft_pity_kills': cfg.softPityKills = Number(r.value); break;
      case 'pity.hard_pity_kills': cfg.hardPityKills = Number(r.value); break;
      case 'pity.soft_bonus_per_kill': cfg.softBonusPerKill = Number(r.value); break;
    }
  }
  return cfg;
}

export function parseDurabilityConfig(rows: Array<{ key: string; value: string }>): DurabilityConfig {
  const cfg = { ...DEFAULT_DURABILITY_CONFIG };
  for (const r of rows) {
    switch (r.key) {
      case 'durability.weapon_loss_per_hit': cfg.weaponLossPerHit = Number(r.value); break;
      case 'durability.armor_loss_per_hit': cfg.armorLossPerHit = Number(r.value); break;
      case 'durability.death_penalty_pct': cfg.deathPenaltyPct = Number(r.value); break;
    }
  }
  return cfg;
}

export function parseEconomyConfig(rows: Array<{ key: string; value: string }>): EconomyConfig {
  const cfg = { ...DEFAULT_ECONOMY_CONFIG };
  for (const r of rows) {
    switch (r.key) {
      case 'economy.vendor_buy_markup_pct': cfg.vendorBuyMarkupPct = Number(r.value); break;
      case 'economy.vendor_sell_tax_pct': cfg.vendorSellTaxPct = Number(r.value); break;
    }
  }
  return cfg;
}
