'use client';

import { useMemo, useState } from 'react';
import {
    Calculator, Swords, Heart, Shield, Zap, TrendingUp,
    Droplets, Activity, Flame, Clock,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CollapsibleSection } from '@/components/ui/collapsible';
import { useBalanceData } from '@/hooks/useBalanceData';
import {
    buildClassProfile,
    calcClassPowerCurve,
    simulateCombat,
    calcFarmEfficiency,
    calcEffectiveHp,
    type CombatantProfile,
    type CombatConfig,
    type ClassPowerEntry,
} from '@/lib/balance-calc';

interface ClassBalancePanelProps {
    classId: number;
    className: string;
    formulas: Array<{
        attributeId: number;
        attributeName: string | null;
        baseValue: number;
        multiplier: number;
        exponent: number;
    }>;
}

const LEVEL_BREAKPOINTS = [1, 5, 10, 20, 30, 50];

const KEY_STATS = [
    { slug: 'max_health', labelKey: 'statMaxHP', icon: Heart, color: 'text-red-500' },
    { slug: 'max_mana', labelKey: 'statMaxMP', icon: Droplets, color: 'text-blue-500' },
    { slug: 'physical_attack', labelKey: 'statPhysAtk', icon: Swords, color: 'text-orange-500' },
    { slug: 'magical_attack', labelKey: 'statMagAtk', icon: Zap, color: 'text-purple-500' },
    { slug: 'physical_defense', labelKey: 'statPhysDef', icon: Shield, color: 'text-slate-500' },
    { slug: 'magical_defense', labelKey: 'statMagDef', icon: Shield, color: 'text-indigo-500' },
    { slug: 'crit_chance', labelKey: 'statCritPct', icon: Flame, color: 'text-amber-500' },
    { slug: 'hp_regen_per_s', labelKey: 'statHPRegen', icon: Activity, color: 'text-emerald-500' },
    { slug: 'mp_regen_per_s', labelKey: 'statMPRegen', icon: Droplets, color: 'text-cyan-500' },
];

function formatNum(n: number): string {
    if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
    if (n >= 1000) return n.toFixed(0);
    if (Number.isInteger(n)) return String(n);
    return n.toFixed(1);
}

export function ClassBalancePanel({ classId, className, formulas }: ClassBalancePanelProps) {
    const t = useTranslations('balance');
    const { isLoading, combatConfig, mobTargets, mobsRaw, classProfiles } = useBalanceData(1);

    // Prefer formulas from the balance hook (they have proper attributeSlug),
    // fall back to normalizing the prop formulas if the hook data isn't available.
    const actualFormulas = useMemo(() => {
        if (classProfiles) {
            const cp = classProfiles.find(c => c.classId === classId);
            if (cp) return cp.formulas;
        }
        return formulas.map(f => ({
            attributeSlug: f.attributeName?.toLowerCase().replace(/\s+/g, '_') ?? '',
            baseValue: f.baseValue,
            multiplier: f.multiplier,
            exponent: f.exponent,
        }));
    }, [classProfiles, classId, formulas]);

    const testMob = mobTargets[0];

    const powerCurve = useMemo(() => {
        if (!testMob || actualFormulas.length === 0) return [];
        return calcClassPowerCurve(className, actualFormulas, LEVEL_BREAKPOINTS, testMob, combatConfig);
    }, [className, actualFormulas, testMob, combatConfig]);

    // Combat vs all mobs at recommended levels
    const mobMatchups = useMemo(() => {
        if (actualFormulas.length === 0 || mobsRaw.length === 0) return [];
        return mobsRaw.map((m, idx) => {
            const playerLevel = Math.max(1, m.level);
            const profile = buildClassProfile(className, playerLevel, actualFormulas);
            const mobTarget = mobTargets[idx];
            if (!mobTarget) return null;
            const sim = simulateCombat(profile, mobTarget, undefined, combatConfig);
            const farm = calcFarmEfficiency(sim.timeToKillSec, m.baseXp ?? 0, 3);
            return {
                mobName: m.name,
                mobLevel: m.level,
                rankCode: m.rankCode,
                playerLevel,
                sim,
                farm,
            };
        }).filter(Boolean);
    }, [className, actualFormulas, mobTargets, mobsRaw, combatConfig]);

    if (isLoading || actualFormulas.length === 0) {
        return (
            <section className="space-y-4 mt-6">
                <SectionHeader t={t} />
                <Card>
                    <CardContent className="pt-5 pb-5">
                        <div className="animate-pulse space-y-3">
                            <div className="h-5 w-40 bg-muted rounded" />
                            <div className="grid grid-cols-6 gap-2">
                                {[1, 2, 3, 4, 5, 6].map((j) => <div key={j} className="h-12 bg-muted rounded-lg" />)}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </section>
        );
    }

    return (
        <section className="space-y-4 mt-6">
            <SectionHeader t={t} />

            {/* Stat Growth Table */}
            <Card>
                <CardContent className="pt-5 pb-5">
                    <CollapsibleSection
                        title={
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                {t('statGrowthByLevel')}
                            </h3>
                        }
                        defaultOpen={false}
                    >
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-left text-muted-foreground border-b">
                                        <th className="pb-2 pr-4 font-medium">{t('colStat')}</th>
                                        {LEVEL_BREAKPOINTS.map(lvl => (
                                            <th key={lvl} className="pb-2 pr-3 font-medium text-right">{t('colLevel')} {lvl}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {KEY_STATS.map(stat => {
                                        const formula = actualFormulas.find(f => f.attributeSlug === stat.slug);
                                        if (!formula) return null;
                                        return (
                                            <tr key={stat.slug}>
                                                <td className="py-1.5 pr-4 font-medium flex items-center gap-1.5">
                                                    <stat.icon className={`h-3 w-3 ${stat.color}`} />
                                                    {t(stat.labelKey)}
                                                </td>
                                                {LEVEL_BREAKPOINTS.map(lvl => {
                                                    const entry = powerCurve.find(e => e.level === lvl);
                                                    const val = entry?.stats[stat.slug] ?? 0;
                                                    return (
                                                        <td key={lvl} className="py-1.5 pr-3 text-right tabular-nums font-mono">
                                                            {formatNum(val)}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CollapsibleSection>
                </CardContent>
            </Card>

            {/* Power Curve Summary */}
            <Card>
                <CardContent className="pt-5 pb-5">
                    <CollapsibleSection
                        title={
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                <Flame className="h-4 w-4 text-muted-foreground" />
                                {t('powerCurve')} {testMob && <span className="text-muted-foreground font-normal">(vs {testMob.name})</span>}
                            </h3>
                        }
                        defaultOpen={false}
                    >
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-left text-muted-foreground border-b">
                                        <th className="pb-2 pr-4 font-medium">{t('colLevel')}</th>
                                        <th className="pb-2 pr-3 font-medium text-right">{t('colDPS')}</th>
                                        <th className="pb-2 pr-3 font-medium text-right">{t('colEHP')}</th>
                                        <th className="pb-2 pr-3 font-medium text-right">{t('colMaxHP')}</th>
                                        <th className="pb-2 pr-3 font-medium text-right">{t('colMaxMP')}</th>
                                        <th className="pb-2 pr-3 font-medium text-right">{t('colHPRegen')}</th>
                                        <th className="pb-2 font-medium text-right">{t('colMPRegen')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {powerCurve.map(entry => (
                                        <tr key={entry.level}>
                                            <td className="py-1.5 pr-4 font-medium">Lv {entry.level}</td>
                                            <td className="py-1.5 pr-3 text-right tabular-nums font-mono font-semibold text-orange-600 dark:text-orange-400">{entry.dps.toFixed(1)}</td>
                                            <td className="py-1.5 pr-3 text-right tabular-nums font-mono">{formatNum(entry.effectiveHp)}</td>
                                            <td className="py-1.5 pr-3 text-right tabular-nums font-mono">{formatNum(entry.maxHp)}</td>
                                            <td className="py-1.5 pr-3 text-right tabular-nums font-mono">{formatNum(entry.maxMp)}</td>
                                            <td className="py-1.5 pr-3 text-right tabular-nums font-mono">{entry.hpRegen.toFixed(1)}</td>
                                            <td className="py-1.5 text-right tabular-nums font-mono">{entry.mpRegen.toFixed(1)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CollapsibleSection>
                </CardContent>
            </Card>

            {/* Combat vs All Mobs */}
            {mobMatchups.length > 0 && (
                <Card>
                    <CardContent className="pt-5 pb-5">
                        <CollapsibleSection
                            title={
                                <h3 className="text-sm font-semibold flex items-center gap-2">
                                    <Swords className="h-4 w-4 text-muted-foreground" />
                                    {t('combatVsMobs')}
                                    <span className="text-muted-foreground font-normal text-[11px]">{t('combatVsMobsNote')}</span>
                                </h3>
                            }
                            defaultOpen={false}
                        >
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="text-left text-muted-foreground border-b">
                                            <th className="pb-2 pr-4 font-medium">{t('colMob')}</th>
                                            <th className="pb-2 pr-3 font-medium text-center">{t('colLvl')}</th>
                                            <th className="pb-2 pr-3 font-medium text-right">{t('colDmgHit')}</th>
                                            <th className="pb-2 pr-3 font-medium text-right">{t('colTTK')}</th>
                                            <th className="pb-2 pr-3 font-medium text-right">{t('colDmgTaken')}</th>
                                            <th className="pb-2 pr-3 font-medium text-right">{t('colHPLeft')}</th>
                                            <th className="pb-2 pr-3 font-medium text-right">{t('colDPS')}</th>
                                            <th className="pb-2 font-medium text-right">{t('colEXPMin')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {mobMatchups.map((m) => {
                                            if (!m) return null;
                                            const hpPct = m.sim.hpRemaining / (m.sim.hpRemaining + m.sim.damageTakenDuringFight) * 100;
                                            const hpColor = hpPct > 70 ? 'text-emerald-600 dark:text-emerald-400'
                                                : hpPct > 30 ? 'text-orange-600 dark:text-orange-400'
                                                    : 'text-destructive';
                                            return (
                                                <tr key={m.mobName}>
                                                    <td className="py-1.5 pr-4 font-medium">
                                                        {m.mobName}
                                                        {m.rankCode !== 'normal' && (
                                                            <Badge variant="outline" className="ml-1.5 text-[9px] px-1 py-0">{m.rankCode}</Badge>
                                                        )}
                                                    </td>
                                                    <td className="py-1.5 pr-3 text-center tabular-nums">{m.mobLevel}</td>
                                                    <td className="py-1.5 pr-3 text-right tabular-nums font-mono">{m.sim.damagePerHit.toFixed(1)}</td>
                                                    <td className="py-1.5 pr-3 text-right tabular-nums font-mono">{formatTime(m.sim.timeToKillSec)}</td>
                                                    <td className="py-1.5 pr-3 text-right tabular-nums font-mono">{m.sim.damageTakenDuringFight.toFixed(0)}</td>
                                                    <td className={`py-1.5 pr-3 text-right tabular-nums font-mono font-semibold ${hpColor}`}>{m.sim.hpRemaining.toFixed(0)}</td>
                                                    <td className="py-1.5 pr-3 text-right tabular-nums font-mono">{m.sim.dps.toFixed(1)}</td>
                                                    <td className="py-1.5 text-right tabular-nums font-mono font-medium text-amber-600 dark:text-amber-400">{m.farm.expPerMinute.toFixed(1)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </CollapsibleSection>
                    </CardContent>
                </Card>
            )}
        </section>
    );
}

function formatTime(seconds: number): string {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs.toFixed(0)}s`;
}

function SectionHeader({ t }: { t: ReturnType<typeof useTranslations<'balance'>> }) {
    return (
        <div className="flex items-start gap-3 pb-1">
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-muted text-muted-foreground mt-0.5 shrink-0">
                <Calculator className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold">{t('classBalance_title')}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {t('classBalance_subtitle')}
                </p>
            </div>
            <Separator className="self-center flex-1 max-w-[60%]" />
        </div>
    );
}
