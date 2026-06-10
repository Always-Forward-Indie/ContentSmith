'use client';

import { useMemo, useState } from 'react';
import {
    Swords, Clock, Heart, Star, TrendingUp,
    Calculator, Shield, Flame, Activity, AlertTriangle,
    CheckCircle, Info, XCircle, Users, Plus, Minus,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { CollapsibleSection } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { useBalanceData } from '@/hooks/useBalanceData';
import { usePlayerBuild } from '@/hooks/usePlayerBuild';
import { PlayerBuildSection } from '@/components/balance/PlayerBuildSection';
import {
    simulateCombat,
    simulateMultiMobCombat,
    calcFarmEfficiency,
    buildMobProfile,
    analyzeBalance,
    applyEquipment,
    type BalanceFlag,
    type SkillCalcData,
    type CombatantProfile,
} from '@/lib/balance-calc';
import type { MobProfileRaw } from '@/hooks/useBalanceData';
import { Trash2 } from 'lucide-react';

interface MobBalancePanelProps {
    mob: {
        id: number;
        name: string;
        level: number;
        spawnHealth: number | null;
        spawnMana: number | null;
        baseXp: number | null;
        rankCode?: string;
        attackCooldown?: number | null;
        attributes: Array<{
            attributeId: number;
            attributeSlug: string;
            attributeName: string;
            flatValue: number;
            multiplier?: number | null;
            exponent?: number | null;
        }>;
    };
}

const TEST_LEVELS = [1, 5, 10, 20, 30, 50];
const DEFAULT_DOWNTIME_SEC = 3;

// ── Shared UI ────────────────────────────────────────────────────────────────

function MetricCard({ icon: Icon, label, value, subValue, colorClass }: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    subValue?: string;
    colorClass?: string;
}) {
    return (
        <div className="flex flex-col gap-1 p-3 rounded-lg bg-muted/40 border border-transparent hover:border-border transition-colors">
            <div className="flex items-center gap-1.5 text-muted-foreground">
                <Icon className="h-3 w-3 shrink-0" />
                <span className="text-[11px] font-medium uppercase tracking-wide leading-none">{label}</span>
            </div>
            <p className={`font-bold tabular-nums text-lg ${colorClass ?? ''}`}>{value}</p>
            {subValue && <p className="text-[10px] text-muted-foreground leading-tight">{subValue}</p>}
        </div>
    );
}

const VERDICT_STYLE: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    great: { icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
    ok: { icon: Info, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
    warn: { icon: AlertTriangle, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10' },
    danger: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
};

function BalanceFlagCard({ flag, t }: { flag: BalanceFlag; t: ReturnType<typeof useTranslations<'balance'>> }) {
    const style = VERDICT_STYLE[flag.verdict] ?? VERDICT_STYLE.ok;
    const Icon = style.icon;
    const tf = t as unknown as (key: string, params?: Record<string, string | number>) => string;
    return (
        <div className={`flex items-start gap-2 p-2.5 rounded-lg ${style.bg}`}>
            <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${style.color}`} />
            <div className="min-w-0">
                <p className={`text-xs font-semibold ${style.color}`}>{tf(`flag_${flag.key}_label`)}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{tf(`flag_${flag.key}_detail`, flag.detailParams)}</p>
            </div>
        </div>
    );
}

function formatTime(seconds: number): string {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs.toFixed(0)}s`;
}

// ── Main component ───────────────────────────────────────────────────────────

export function MobBalancePanel({ mob }: MobBalancePanelProps) {
    const t = useTranslations('balance');
    const tf = t as unknown as (key: string, params?: Record<string, string | number>) => string;
    const [testLevel, setTestLevel] = useState(Math.max(1, mob.level));
    const [selectedClassValue, setSelectedClassValue] = useState<string | null>(null);
    const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
    const [skillLevel, setSkillLevel] = useState(1);
    const [mobPack, setMobPack] = useState<Array<{ mobId: number; count: number }>>([
        { mobId: mob.id, count: 1 },
    ]);

    const build = usePlayerBuild(testLevel);
    const { isLoading, combatConfig, testProfiles: allProfiles, mobsRaw } = useBalanceData(testLevel);

    const { data: allSkillsData, isLoading: skillsLoading } = trpc.balance.getAllSkillsCalcData.useQuery(
        { level: skillLevel },
    );

    const mobProfile = useMemo(
        () => buildMobProfile(
            mob.name, mob.level,
            mob.attributes.map((a) => ({ attributeSlug: a.attributeSlug, flatValue: a.flatValue })),
            mob.attackCooldown ? Number(mob.attackCooldown) : undefined,
        ),
        [mob],
    );

    const baseXp = mob.baseXp ?? 0;

    const classOptions: ComboboxOption[] = useMemo(
        () => allProfiles.map((p) => ({ value: p.className, label: p.className })),
        [allProfiles],
    );

    const skillOptions: ComboboxOption[] = useMemo(() => [
        { value: '__auto__', label: t('skillAuto') },
        ...(allSkillsData ?? []).map((s) => ({ value: String(s.id), label: s.name })),
    ], [allSkillsData, t]);

    const selectedSkillData: SkillCalcData | undefined = useMemo(() => {
        if (!selectedSkillId || selectedSkillId === '__auto__') return undefined;
        const raw = (allSkillsData ?? []).find((s) => String(s.id) === selectedSkillId);
        if (!raw) return undefined;
        return {
            name: raw.name,
            scaleStatSlug: raw.scaleStatSlug,
            schoolSlug: raw.schoolSlug,
            flatAdd: raw.flatAdd,
            coeff: raw.coeff,
            castMs: raw.castMs,
            swingMs: raw.swingMs,
            cooldownMs: raw.cooldownMs,
            costMp: raw.costMp,
        };
    }, [selectedSkillId, allSkillsData]);

    const selectedProfile = useMemo(() => {
        if (selectedClassValue) {
            return allProfiles.find((p) => p.className === selectedClassValue) ?? allProfiles[0];
        }
        return allProfiles[0];
    }, [allProfiles, selectedClassValue]);

    const selectedProfileWithBuild = useMemo(() => {
        if (!selectedProfile || build.isEmpty) return selectedProfile ?? null;
        return { ...selectedProfile, profile: applyEquipment(selectedProfile.profile, build.buildBonuses) };
    }, [selectedProfile, build.isEmpty, build.buildBonuses]);

    const allResults = useMemo(
        () => allProfiles.map((p) => {
            const profile = build.isEmpty ? p.profile : applyEquipment(p.profile, build.buildBonuses);
            const s = simulateCombat(profile, mobProfile, selectedSkillData, combatConfig);
            const f = calcFarmEfficiency(s.timeToKillSec, baseXp, DEFAULT_DOWNTIME_SEC);
            return { className: p.className, sim: s, farm: f };
        }),
        [allProfiles, mobProfile, combatConfig, baseXp, build.isEmpty, build.buildBonuses, selectedSkillData],
    );

    const totalMobCount = useMemo(() => mobPack.reduce((s, e) => s + e.count, 0), [mobPack]);

    /** Build CombatantProfile for any mob by id from mobsRaw */
    const buildProfileForMob = useMemo(() => {
        const map = new Map<number, CombatantProfile>();
        // Always have the current mob available even before mobsRaw loads
        map.set(mob.id, mobProfile);
        for (const m of mobsRaw) {
            if (!map.has(m.id)) {
                map.set(m.id, buildMobProfile(m.name, m.level, m.attributes, m.attackCooldown));
            }
        }
        return map;
    }, [mob.id, mobProfile, mobsRaw]);

    /** Resolve mobPack entries into the format simulateMultiMobCombat expects */
    const resolvedPack = useMemo(() => {
        return mobPack
            .map((e) => {
                const profile = buildProfileForMob.get(e.mobId);
                if (!profile) return null;
                return { profile, count: e.count };
            })
            .filter((e): e is { profile: CombatantProfile; count: number } => e !== null);
    }, [mobPack, buildProfileForMob]);

    const multiMobResult = useMemo(() => {
        if (totalMobCount <= 1 || !selectedProfileWithBuild || resolvedPack.length === 0) return null;
        const profile = selectedProfileWithBuild.profile;
        if (!profile) return null;
        return simulateMultiMobCombat(profile, resolvedPack, selectedSkillData, combatConfig);
    }, [totalMobCount, selectedProfileWithBuild, resolvedPack, selectedSkillData, combatConfig]);

    /** Memoized all-classes multi-mob comparison */
    const allClassesMultiMob = useMemo(() => {
        if (totalMobCount <= 1 || resolvedPack.length === 0 || allProfiles.length <= 1) return [];
        return allProfiles.map((p) => {
            const profile = build.isEmpty ? p.profile : applyEquipment(p.profile, build.buildBonuses);
            const mr = simulateMultiMobCombat(profile, resolvedPack, selectedSkillData, combatConfig);
            return { className: p.className, result: mr };
        });
    }, [totalMobCount, resolvedPack, allProfiles, build.isEmpty, build.buildBonuses, selectedSkillData, combatConfig]);

    /** Combobox options for mobs (exclude already-added) */
    const addMobOptions: ComboboxOption[] = useMemo(() => {
        const addedIds = new Set(mobPack.map((e) => e.mobId));
        return mobsRaw
            .filter((m) => !addedIds.has(m.id))
            .map((m) => ({ value: String(m.id), label: `${m.name} (Lv${m.level})` }));
    }, [mobsRaw, mobPack]);

    if (isLoading) {
        return (
            <section className="space-y-4">
                <SectionHeader t={t} />
                <Card><CardContent className="pt-5 pb-5">
                    <div className="animate-pulse space-y-3">
                        <div className="h-5 w-32 bg-muted rounded" />
                        <div className="grid grid-cols-4 gap-2">{[1, 2, 3, 4].map((j) => <div key={j} className="h-16 bg-muted rounded-lg" />)}</div>
                    </div>
                </CardContent></Card>
            </section>
        );
    }

    const simProfile = selectedProfileWithBuild ?? selectedProfile;
    const sim = simProfile
        ? simulateCombat(simProfile.profile, mobProfile, selectedSkillData, combatConfig)
        : null;
    const farm = sim ? calcFarmEfficiency(sim.timeToKillSec, baseXp, DEFAULT_DOWNTIME_SEC) : null;

    const flags = sim && simProfile
        ? analyzeBalance(sim, {
            playerLevel: testLevel,
            mobLevel: mob.level,
            mobRankCode: mob.rankCode ?? 'normal',
            mobHp: mobProfile.stats['max_health'] ?? 0,
        })
        : [];

    return (
        <section className="space-y-4">
            <SectionHeader t={t} />

            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-muted-foreground">{t('playerLevel')}</span>
                        {TEST_LEVELS.map((lv) => (
                            <button
                                key={lv}
                                type="button"
                                onClick={() => setTestLevel(lv)}
                                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${testLevel === lv
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
                                    }`}
                            >
                                Lv {lv}
                            </button>
                        ))}
                    </div>
                    {classOptions.length > 1 && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">{t('class')}</span>
                            <Combobox
                                options={classOptions}
                                value={selectedClassValue ?? classOptions[0]?.value ?? null}
                                onChange={(v) => setSelectedClassValue(v)}
                                placeholder={t('selectClass')}
                                searchPlaceholder={t('searchClasses')}
                                triggerClassName="h-8 text-xs"
                                className="w-52"
                            />
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">{t('skill')}</span>
                        <Combobox
                            options={skillOptions}
                            value={selectedSkillId ?? '__auto__'}
                            onChange={(v) => setSelectedSkillId(v)}
                            placeholder={t('selectSkill')}
                            searchPlaceholder={t('searchSkills')}
                            triggerClassName="h-8 text-xs"
                            className="w-52"
                        />
                        {selectedSkillId && selectedSkillId !== '__auto__' && (
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs text-muted-foreground">{t('skillLevel')}</span>
                                {[1, 2, 3, 4, 5].map((lvl) => (
                                    <button
                                        key={lvl}
                                        type="button"
                                        onClick={() => setSkillLevel(lvl)}
                                        className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${skillLevel === lvl
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
                                            }`}
                                    >
                                        {lvl}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <PlayerBuildSection build={build} testLevel={testLevel} />
            </div>

            {sim && simProfile && (
                <Card>
                    <CardContent className="pt-5 pb-5 space-y-4">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-medium text-xs">{simProfile.className} Lv{testLevel}</Badge>
                            <span className="text-xs text-muted-foreground">vs {mob.name} Lv{mob.level}</span>
                            {mob.rankCode && mob.rankCode !== 'normal' && (
                                <Badge variant="secondary" className="text-[10px]">{mob.rankCode}</Badge>
                            )}
                            {!build.isEmpty && (
                                <Badge variant="secondary" className="text-[10px]">{t('withBuild')}</Badge>
                            )}
                            {selectedSkillData && (
                                <Badge variant="secondary" className="text-[10px]">{t('withSkill')}: {selectedSkillData.name}</Badge>
                            )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <MetricCard icon={Swords} label={t('metricDmgHit')} value={sim.damagePerHit.toFixed(1)}
                                subValue={`${t('subRaw')} ${sim.rawDamage.toFixed(1)} · DR: ${(sim.defenseReduction * 100).toFixed(0)}%`} />
                            <MetricCard icon={TrendingUp} label={t('metricHitsToKill')} value={sim.hitsToKill}
                                subValue={`${sim.attackIntervalSec.toFixed(2)}s ${t('subPerHit')}`} />
                            <MetricCard icon={Clock} label={t('metricTTK')} value={formatTime(sim.timeToKillSec)}
                                colorClass={sim.timeToKillSec < 5 ? 'text-emerald-600 dark:text-emerald-400' : sim.timeToKillSec > 30 ? 'text-destructive' : ''} />
                            <MetricCard icon={Flame} label={t('metricDPS')} value={sim.dps.toFixed(1)}
                                subValue={`${sim.manaUsed} ${t('subMPUsed')}`} />
                            <MetricCard icon={Heart} label={t('metricDamageTaken')} value={sim.damageTakenDuringFight.toFixed(0)}
                                subValue={`${((sim.damageTakenDuringFight / (simProfile.profile.stats['max_health'] ?? 100)) * 100).toFixed(0)}${t('subPctHP')}`}
                                colorClass={sim.damageTakenDuringFight / (simProfile.profile.stats['max_health'] ?? 100) > 0.6 ? 'text-destructive' : ''} />
                            <MetricCard icon={Activity} label={t('metricHPRemaining')} value={sim.hpRemaining.toFixed(0)}
                                subValue={sim.canSustain ? t('subCanSustain') : t('subNeedsHealing')}
                                colorClass={sim.canSustain ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'} />
                            <MetricCard icon={Star} label={t('metricEXPMin')} value={farm!.expPerMinute.toFixed(1)}
                                subValue={`${farm!.killsPerMinute.toFixed(1)} ${t('subKillsMin')}`}
                                colorClass="text-amber-600 dark:text-amber-400" />
                            <MetricCard icon={Shield} label={t('metricHitChance')} value={`${(sim.hitChance * 100).toFixed(0)}%`}
                                subValue={`Crit: ×${sim.effectiveCritMult.toFixed(2)}`} />
                        </div>

                        {flags.length > 0 && (
                            <div className="space-y-1.5">
                                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{t('balanceAssessment')}</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                    {flags.map((f) => <BalanceFlagCard key={f.key} flag={f} t={t} />)}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {allProfiles.length > 1 && (
                <Card>
                    <CardContent className="pt-5 pb-5">
                        <CollapsibleSection
                            title={
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                    <h3 className="text-sm font-semibold">{t('allClassesComparison')}</h3>
                                </div>
                            }
                            defaultOpen={false}
                        >
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="text-left text-muted-foreground border-b">
                                            <th className="pb-2 pr-4 font-medium">{t('colClass')}</th>
                                            <th className="pb-2 pr-3 font-medium text-right">{t('colDmgHit')}</th>
                                            <th className="pb-2 pr-3 font-medium text-right">{t('colDPS')}</th>
                                            <th className="pb-2 pr-3 font-medium text-right">{t('colTTK')}</th>
                                            <th className="pb-2 pr-3 font-medium text-right">{t('colDmgTaken')}</th>
                                            <th className="pb-2 pr-3 font-medium text-right">{t('colHPLeft')}</th>
                                            <th className="pb-2 pr-3 font-medium text-center">{t('colSustain')}</th>
                                            <th className="pb-2 font-medium text-right">{t('colEXPMin')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {allResults.map((r) => (
                                            <tr key={r.className} className={r.className === simProfile?.className ? 'bg-primary/5' : ''}>
                                                <td className="py-1.5 pr-4 font-medium">{r.className}</td>
                                                <td className="py-1.5 pr-3 text-right tabular-nums font-mono">{r.sim.damagePerHit.toFixed(1)}</td>
                                                <td className="py-1.5 pr-3 text-right tabular-nums font-mono">{r.sim.dps.toFixed(1)}</td>
                                                <td className="py-1.5 pr-3 text-right tabular-nums font-mono">{formatTime(r.sim.timeToKillSec)}</td>
                                                <td className="py-1.5 pr-3 text-right tabular-nums font-mono">{r.sim.damageTakenDuringFight.toFixed(0)}</td>
                                                <td className="py-1.5 pr-3 text-right tabular-nums font-mono">{r.sim.hpRemaining.toFixed(0)}</td>
                                                <td className={`py-1.5 pr-3 text-center font-medium ${r.sim.canSustain ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                                                    {r.sim.canSustain ? '✓' : '✗'}
                                                </td>
                                                <td className="py-1.5 text-right tabular-nums font-mono font-medium text-amber-600 dark:text-amber-400">{r.farm.expPerMinute.toFixed(1)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CollapsibleSection>
                    </CardContent>
                </Card>
            )}

            {/* Multi-mob encounter section */}
            {sim && simProfile && (
                <Card>
                    <CardContent className="pt-5 pb-5 space-y-4">
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <h3 className="text-sm font-semibold">{tf('multiMob_title')}</h3>
                            <span className="text-xs text-muted-foreground">{tf('multiMob_subtitle')}</span>
                        </div>

                        {/* Mob pack builder */}
                        <div className="space-y-2">
                            {mobPack.map((entry, idx) => {
                                const mobData = idx === 0
                                    ? { name: mob.name, level: mob.level }
                                    : (() => {
                                        const m = mobsRaw.find((x) => x.id === entry.mobId);
                                        return m ? { name: m.name, level: m.level } : { name: `#${entry.mobId}`, level: 0 };
                                    })();
                                return (
                                    <div key={entry.mobId} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5">
                                        <div className="flex-1 min-w-0">
                                            <span className="text-xs font-medium truncate">{mobData.name}</span>
                                            <span className="text-[11px] text-muted-foreground ml-1">Lv{mobData.level}</span>
                                            {idx === 0 && <Badge variant="outline" className="ml-2 text-[10px] py-0">{tf('multiMob_currentMob')}</Badge>}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="h-6 w-6"
                                                disabled={entry.count <= 0}
                                                onClick={() => setMobPack((prev) =>
                                                    prev.map((e, i) => i === idx ? { ...e, count: Math.max(0, e.count - 1) } : e)
                                                        .filter((e, i) => i === 0 || e.count > 0)
                                                )}
                                            >
                                                <Minus className="h-3 w-3" />
                                            </Button>
                                            <Input
                                                type="number"
                                                min={idx === 0 ? 0 : 1}
                                                max={20}
                                                className="h-6 w-12 text-center text-xs font-mono"
                                                value={entry.count}
                                                onChange={(e) => {
                                                    const v = parseInt(e.target.value);
                                                    if (Number.isFinite(v) && v >= 0 && v <= 20) {
                                                        setMobPack((prev) =>
                                                            prev.map((ee, i) => i === idx ? { ...ee, count: v } : ee)
                                                                .filter((ee, i) => i === 0 || ee.count > 0)
                                                        );
                                                    }
                                                }}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="h-6 w-6"
                                                disabled={entry.count >= 20}
                                                onClick={() => setMobPack((prev) =>
                                                    prev.map((e, i) => i === idx ? { ...e, count: Math.min(20, e.count + 1) } : e)
                                                )}
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        {idx > 0 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                onClick={() => setMobPack((prev) => prev.filter((_, i) => i !== idx))}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Quick presets row */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[11px] text-muted-foreground">{tf('multiMob_quickPresets')}:</span>
                                {[2, 3, 5, 8].map((n) => (
                                    <button
                                        key={n}
                                        type="button"
                                        onClick={() => setMobPack([{ mobId: mob.id, count: n }])}
                                        className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${mobPack.length === 1 && mobPack[0].count === n
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
                                            }`}
                                    >
                                        {n}x {mob.name}
                                    </button>
                                ))}
                            </div>

                            {/* Add mob type */}
                            {mobsRaw.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    <Combobox
                                        options={addMobOptions}
                                        value={null}
                                        onChange={(val) => {
                                            if (!val) return;
                                            const id = parseInt(val);
                                            if (!Number.isFinite(id)) return;
                                            setMobPack((prev) => {
                                                if (prev.some((e) => e.mobId === id)) return prev;
                                                return [...prev, { mobId: id, count: 1 }];
                                            });
                                        }}
                                        placeholder={tf('multiMob_addMob')}
                                        searchPlaceholder={tf('multiMob_searchMobs')}
                                        emptyText={tf('multiMob_noMobsFound')}
                                        className="flex-1"
                                    />
                                </div>
                            )}

                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Users className="h-3 w-3" />
                                <span>{tf('multiMob_totalMobs')}: <span className="font-mono font-medium text-foreground">{totalMobCount}</span></span>
                            </div>
                        </div>

                        {totalMobCount <= 1 && (
                            <p className="text-xs text-muted-foreground py-2">{tf('multiMob_subtitle')}</p>
                        )}

                        {multiMobResult && totalMobCount > 1 && (
                            <div className="space-y-3">
                                {/* Verdict banner */}
                                <div className={`flex items-center gap-2 p-3 rounded-lg ${multiMobResult.survives
                                        ? multiMobResult.hpRemainingPct > 30
                                            ? 'bg-emerald-500/10'
                                            : 'bg-orange-500/10'
                                        : 'bg-destructive/10'
                                    }`}>
                                    {multiMobResult.survives ? (
                                        multiMobResult.hpRemainingPct > 30 ? (
                                            <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                        ) : (
                                            <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0" />
                                        )
                                    ) : (
                                        <XCircle className="h-4 w-4 text-destructive shrink-0" />
                                    )}
                                    <div>
                                        <p className={`text-xs font-semibold ${multiMobResult.survives
                                                ? multiMobResult.hpRemainingPct > 30
                                                    ? 'text-emerald-600 dark:text-emerald-400'
                                                    : 'text-orange-600 dark:text-orange-400'
                                                : 'text-destructive'
                                            }`}>
                                            {multiMobResult.survives ? tf('multiMob_survives') : tf('multiMob_dies')}
                                            {' — '}
                                            {simProfile.className} Lv{testLevel} vs{' '}
                                            {mobPack.length === 1
                                                ? `${totalMobCount}x ${mob.name} Lv${mob.level}`
                                                : `${totalMobCount} ${tf('multiMob_mixedPack')}`}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">
                                            {multiMobResult.survives
                                                ? tf('multiMob_verdict_easy')
                                                : multiMobResult.mobsKilled > 0
                                                    ? tf('multiMob_verdict_ok')
                                                    : tf('multiMob_verdict_hard')}
                                        </p>
                                    </div>
                                </div>

                                {/* Per mob type breakdown (if mixed pack) */}
                                {mobPack.length > 1 && (
                                    <div className="grid gap-1.5">
                                        {multiMobResult.perMob.map((pm) => (
                                            <div key={pm.name} className="flex items-center justify-between text-xs bg-muted/30 rounded px-2.5 py-1.5">
                                                <span className="font-medium">{pm.count}x {pm.name} <span className="text-muted-foreground">Lv{pm.level}</span></span>
                                                <div className="flex items-center gap-3 text-muted-foreground">
                                                    <span>DPS: <span className="font-mono text-foreground">{pm.mobDps.toFixed(1)}</span></span>
                                                    <span>TTK: <span className="font-mono text-foreground">{formatTime(pm.sim.timeToKillSec)}</span></span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Metrics grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <MetricCard
                                        icon={Users}
                                        label={tf('multiMob_totalMobs')}
                                        value={multiMobResult.totalMobs}
                                        subValue={tf('multiMob_subKilledOfTotal', { killed: multiMobResult.mobsKilled, total: multiMobResult.totalMobs })}
                                    />
                                    <MetricCard
                                        icon={Clock}
                                        label={tf('multiMob_totalTime')}
                                        value={formatTime(multiMobResult.totalTimeSec)}
                                        subValue={!multiMobResult.survives ? `${tf('multiMob_timeOfDeath')}: ${formatTime(multiMobResult.timeOfDeathSec)}` : undefined}
                                        colorClass={!multiMobResult.survives ? 'text-destructive' : ''}
                                    />
                                    <MetricCard
                                        icon={Flame}
                                        label={tf('multiMob_peakDPS')}
                                        value={multiMobResult.peakIncomingDps.toFixed(1)}
                                        subValue={`${tf('multiMob_playerDPS')}: ${multiMobResult.playerDps.toFixed(1)}`}
                                        colorClass={multiMobResult.peakIncomingDps > multiMobResult.playerDps ? 'text-destructive' : ''}
                                    />
                                    <MetricCard
                                        icon={Heart}
                                        label={tf('multiMob_hpRemaining')}
                                        value={multiMobResult.hpRemaining.toFixed(0)}
                                        subValue={`${multiMobResult.hpRemainingPct.toFixed(0)}% HP`}
                                        colorClass={multiMobResult.hpRemainingPct > 30
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : multiMobResult.hpRemainingPct > 0
                                                ? 'text-orange-600 dark:text-orange-400'
                                                : 'text-destructive'}
                                    />
                                    <MetricCard
                                        icon={Swords}
                                        label={tf('multiMob_damageTaken')}
                                        value={multiMobResult.totalDamageTaken.toFixed(0)}
                                        subValue={`${multiMobResult.totalDamageDealt.toFixed(0)} ${tf('multiMob_subDealtVsTaken')}`}
                                    />
                                    <MetricCard
                                        icon={Shield}
                                        label={tf('multiMob_mobsKilled')}
                                        value={`${multiMobResult.mobsKilled} / ${multiMobResult.totalMobs}`}
                                        colorClass={multiMobResult.mobsKilled === multiMobResult.totalMobs
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-destructive'}
                                    />
                                </div>

                                {/* All classes comparison for multi-mob (memoized) */}
                                {allClassesMultiMob.length > 0 && (
                                    <CollapsibleSection
                                        title={
                                            <div className="flex items-center gap-2">
                                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                                <h3 className="text-sm font-semibold">{tf('allClassesComparison')} ({totalMobCount}x)</h3>
                                            </div>
                                        }
                                        defaultOpen={false}
                                    >
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="text-left text-muted-foreground border-b">
                                                        <th className="pb-2 pr-4 font-medium">{tf('colClass')}</th>
                                                        <th className="pb-2 pr-3 font-medium text-center">{tf('multiMob_survives')}</th>
                                                        <th className="pb-2 pr-3 font-medium text-right">{tf('multiMob_totalTime')}</th>
                                                        <th className="pb-2 pr-3 font-medium text-right">{tf('colDmgTaken')}</th>
                                                        <th className="pb-2 pr-3 font-medium text-right">{tf('colHPLeft')}</th>
                                                        <th className="pb-2 pr-3 font-medium text-right">{tf('multiMob_mobsKilled')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {allClassesMultiMob.map((row) => (
                                                        <tr key={row.className} className={row.className === simProfile?.className ? 'bg-primary/5' : ''}>
                                                            <td className="py-1.5 pr-4 font-medium">{row.className}</td>
                                                            <td className={`py-1.5 pr-3 text-center font-medium ${row.result.survives ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                                                                {row.result.survives ? '✓' : '✗'}
                                                            </td>
                                                            <td className="py-1.5 pr-3 text-right tabular-nums font-mono">{formatTime(row.result.totalTimeSec)}</td>
                                                            <td className="py-1.5 pr-3 text-right tabular-nums font-mono">{row.result.totalDamageTaken.toFixed(0)}</td>
                                                            <td className="py-1.5 pr-3 text-right tabular-nums font-mono">{row.result.hpRemaining.toFixed(0)}</td>
                                                            <td className="py-1.5 pr-3 text-right tabular-nums font-mono">{row.result.mobsKilled}/{row.result.totalMobs}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CollapsibleSection>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </section>
    );
}

function SectionHeader({ t }: { t: ReturnType<typeof useTranslations<'balance'>> }) {
    return (
        <div className="flex items-start gap-3 pb-1">
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-muted text-muted-foreground mt-0.5 shrink-0">
                <Calculator className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold">{t('mobBalance_title')}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {t('mobBalance_subtitle')}
                </p>
            </div>
            <Separator className="self-center flex-1 max-w-[60%]" />
        </div>
    );
}
