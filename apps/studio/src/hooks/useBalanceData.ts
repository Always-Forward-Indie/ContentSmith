import { useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import {
  buildClassProfile,
  buildMobProfile,
  parseCombatConfig,
  parseRegenConfig,
  DEFAULT_COMBAT_CONFIG,
  DEFAULT_REGEN_CONFIG,
  type CombatantProfile,
  type CombatConfig,
  type RegenConfig,
  type SkillCalcData,
} from '@/lib/balance-calc';

export interface ClassTestProfile {
  classId: number;
  className: string;
  classSlug: string | null;
  formulas: Array<{ attributeSlug: string; baseValue: number; multiplier: number; exponent: number }>;
  profile: CombatantProfile;
}

export interface MobProfileRaw {
  id: number;
  name: string;
  level: number;
  spawnHealth: number | null;
  spawnMana: number | null;
  baseXp: number | null;
  attackCooldown: number;
  rankCode: string;
  rankMult: number;
  attributes: Array<{ attributeSlug: string; flatValue: number }>;
  skills: Array<{
    skillId: number;
    name: string;
    slug: string;
    schoolSlug: string;
    scaleStatSlug: string;
    castMs: number;
    swingMs: number;
    cooldownMs: number;
    costMp: number;
    flatAdd: number;
    coeff: number;
    maxRange: number;
  }>;
}

/**
 * Hook that loads all data needed for balance calculations:
 * - Class profiles at a given level
 * - Combat + regen config from game_config
 * - All mobs as test targets (with skills)
 */
export function useBalanceData(level: number = 1) {
  const { data: classProfiles, isLoading: classLoading } =
    trpc.balance.getClassProfiles.useQuery();
  const { data: combatConfigRows, isLoading: configLoading } =
    trpc.balance.getCombatConfig.useQuery();
  const { data: mobProfiles, isLoading: mobsLoading } =
    trpc.balance.getMobProfiles.useQuery();

  const isLoading = classLoading || configLoading || mobsLoading;

  const combatConfig: CombatConfig = useMemo(() => {
    if (!combatConfigRows) return DEFAULT_COMBAT_CONFIG;
    return parseCombatConfig(combatConfigRows);
  }, [combatConfigRows]);

  const regenConfig: RegenConfig = useMemo(() => {
    if (!combatConfigRows) return DEFAULT_REGEN_CONFIG;
    return parseRegenConfig(combatConfigRows);
  }, [combatConfigRows]);

  const testProfiles: ClassTestProfile[] = useMemo(() => {
    if (!classProfiles) return [];
    return classProfiles.map((cp) => ({
      classId: cp.classId,
      className: cp.className,
      classSlug: cp.classSlug,
      formulas: cp.formulas,
      profile: buildClassProfile(cp.className, level, cp.formulas),
    }));
  }, [classProfiles, level]);

  const mobTargets: CombatantProfile[] = useMemo(() => {
    if (!mobProfiles) return [];
    return mobProfiles.map((m) => {
      const profile = buildMobProfile(m.name, m.level, m.attributes, m.attackCooldown);
      // Attach mob skills to the profile
      if (m.skills && m.skills.length > 0) {
        profile.skills = m.skills.map((s) => ({
          name: s.name,
          slug: s.slug,
          scaleStatSlug: s.scaleStatSlug,
          schoolSlug: s.schoolSlug,
          flatAdd: s.flatAdd,
          coeff: s.coeff,
          castMs: s.castMs,
          swingMs: s.swingMs,
          cooldownMs: s.cooldownMs,
          costMp: s.costMp,
          maxRange: s.maxRange,
        }));
      }
      return profile;
    });
  }, [mobProfiles]);

  const mobsRaw: MobProfileRaw[] = useMemo(() => {
    if (!mobProfiles) return [];
    return mobProfiles as MobProfileRaw[];
  }, [mobProfiles]);

  return {
    isLoading,
    combatConfig,
    regenConfig,
    testProfiles,
    mobTargets,
    mobsRaw,
    classProfiles,
  };
}
