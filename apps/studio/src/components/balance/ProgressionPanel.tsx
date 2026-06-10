'use client';

import { useMemo, useState } from 'react';
import {
    Calculator, TrendingUp, Clock, Star, Swords,
    Timer, Target, CheckCircle, Info, AlertTriangle, XCircle,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Combobox } from '@/components/ui/combobox';
import { useBalanceData } from '@/hooks/useBalanceData';
import { trpc } from '@/lib/trpc';
import {
    calcLevelProgression,
    calcMobXp,
    simulateCombat,
    buildClassProfile,
    type LevelProgressionEntry,
    type SkillCalcData,
} from '@/lib/balance-calc';

function formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds <= 0) return '—';
    if (seconds < 60) return `${seconds.toFixed(0)}s`;
    if (seconds < 3600) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatNum(n: number): string {
    if (!isFinite(n)) return '∞';
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return n.toFixed(0);
}

export function ProgressionPanel() {
    const t = useTranslations('balance');
    const [selectedClassIdx, setSelectedClassIdx] = useState(0);
    const [selectedMobIdx, setSelectedMobIdx] = useState(0);
    const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
    const [skillLevel, setSkillLevel] = useState(1);

    const {
        isLoading: balanceLoading,
        combatConfig,
        testProfiles,
        mobTargets,
        mobsRaw,
    } = useBalanceData(1);

    const { data: xpTable, isLoading: xpLoading } =
        trpc.balance.getExpTable.useQuery();

    const { data: allSkillsData } = trpc.balance.getAllSkillsCalcData.useQuery(
        { level: skillLevel },
    );

    const skillOptions = useMemo(() => [
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

    const isLoading = balanceLoading || xpLoading;

    const selectedClass = testProfiles[selectedClassIdx];
    const selectedMob = mobTargets[selectedMobIdx];
    const selectedMobRaw = mobsRaw[selectedMobIdx];

    // Build progression for selected class vs selected mob
    const progression = useMemo(() => {
        if (!xpTable || !selectedClass || !selectedMob || !selectedMobRaw) return [];

        // Calculate TTK at each level
        const entries = xpTable.map(entry => {
            const profile = buildClassProfile(
                selectedClass.className,
                entry.level,
                selectedClass.formulas,
            );
            const sim = simulateCombat(profile, selectedMob, selectedSkillData, combatConfig);
            return {
                level: entry.level,
                xpRequired: entry.xpRequired,
                ttk: sim.timeToKillSec,
                canSustain: sim.canSustain,
            };
        });

        // Average TTK across levels for the progression calc
        const avgTtk = entries.length > 0
            ? entries.reduce((sum, e) => sum + e.ttk, 0) / entries.length
            : 5;

        return calcLevelProgression(
            xpTable,
            selectedMobRaw.baseXp ?? 0,
            selectedMobRaw.level,
            selectedMobRaw.rankMult ?? 1.0,
            avgTtk,
            3,
        );
    }, [xpTable, selectedClass, selectedMob, selectedMobRaw, combatConfig, selectedSkillData]);

    // Per-level TTK
    const perLevelData = useMemo(() => {
        if (!xpTable || !selectedClass || !selectedMob || !selectedMobRaw) return [];

        return xpTable.map(entry => {
            const profile = buildClassProfile(
                selectedClass.className,
                entry.level,
                selectedClass.formulas,
            );
            const sim = simulateCombat(profile, selectedMob, selectedSkillData, combatConfig);
            const xpPerKill = calcMobXp(
                selectedMobRaw.baseXp ?? 0,
                selectedMobRaw.level,
                entry.level,
                selectedMobRaw.rankMult ?? 1.0,
            );
            const prevXp = entry.level > 1
                ? (xpTable.find(e => e.level === entry.level - 1)?.xpRequired ?? 0)
                : 0;
            const xpForThisLevel = entry.xpRequired - prevXp;
            const killsNeeded = xpPerKill > 0 ? Math.ceil(xpForThisLevel / xpPerKill) : Infinity;
            const timeForLevel = killsNeeded * (sim.timeToKillSec + 3);

            return {
                level: entry.level,
                xpRequired: entry.xpRequired,
                xpForThisLevel,
                xpPerKill,
                killsNeeded,
                ttk: sim.timeToKillSec,
                timeForLevel,
                canSustain: sim.canSustain,
                hpRemaining: sim.hpRemaining,
            };
        });
    }, [xpTable, selectedClass, selectedMob, selectedMobRaw, combatConfig, selectedSkillData]);

    // Totals
    const totalTime = perLevelData.reduce((sum, e) => sum + (isFinite(e.timeForLevel) ? e.timeForLevel : 0), 0);
    const totalKills = perLevelData.reduce((sum, e) => sum + (isFinite(e.killsNeeded) ? e.killsNeeded : 0), 0);

    if (isLoading || !xpTable) {
        return (
            <section className="space-y-4 mt-6">
                <SectionHeader t={t} />
                <Card>
                    <CardContent className="pt-5 pb-5">
                        <div className="animate-pulse space-y-3">
                            <div className="h-5 w-40 bg-muted rounded" />
                            <div className="grid grid-cols-4 gap-2">
                                {[1, 2, 3, 4].map((j) => <div key={j} className="h-16 bg-muted rounded-lg" />)}
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

            {/* Class + Mob + Skill selectors */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">{t('class')}</span>
                    <Combobox
                        options={testProfiles.map((p, i) => ({ value: String(i), label: p.className }))}
                        value={String(selectedClassIdx)}
                        onChange={(v) => setSelectedClassIdx(v !== null ? Number(v) : 0)}
                        placeholder={t('selectClass')}
                        searchPlaceholder={t('searchClasses')}
                        triggerClassName="h-7 text-xs w-40"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">{t('farmMob')}</span>
                    <Combobox
                        options={mobsRaw.map((m, i) => ({ value: String(i), label: `${m.name} Lv${m.level}` }))}
                        value={String(selectedMobIdx)}
                        onChange={(v) => setSelectedMobIdx(v !== null ? Number(v) : 0)}
                        placeholder={t('selectMob')}
                        searchPlaceholder={t('searchMobs')}
                        triggerClassName="h-7 text-xs w-48"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">{t('skill')}</span>
                    <Combobox
                        options={skillOptions}
                        value={selectedSkillId ?? '__auto__'}
                        onChange={(v) => setSelectedSkillId(v)}
                        placeholder={t('selectSkill')}
                        searchPlaceholder={t('searchSkills')}
                        triggerClassName="h-7 text-xs w-48"
                    />
                    {selectedSkillId && selectedSkillId !== '__auto__' && (
                        <div className="flex items-center gap-1.5">
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

            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-muted/40 border">
                    <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                        <Clock className="h-3 w-3" />
                        <span className="text-[11px] font-medium uppercase tracking-wide">{t('metricTotalTime')}</span>
                    </div>
                    <p className="text-lg font-bold tabular-nums">{formatTime(totalTime)}</p>
                    <p className="text-[10px] text-muted-foreground">1 → {xpTable.length > 0 ? xpTable[xpTable.length - 1].level : '?'}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/40 border">
                    <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                        <Target className="h-3 w-3" />
                        <span className="text-[11px] font-medium uppercase tracking-wide">{t('metricTotalKills')}</span>
                    </div>
                    <p className="text-lg font-bold tabular-nums">{formatNum(totalKills)}</p>
                    <p className="text-[10px] text-muted-foreground">of {selectedMobRaw?.name ?? 'mob'}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/40 border">
                    <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                        <Star className="h-3 w-3" />
                        <span className="text-[11px] font-medium uppercase tracking-wide">{t('metricBaseXPKill')}</span>
                    </div>
                    <p className="text-lg font-bold tabular-nums">{selectedMobRaw?.baseXp ?? 0}</p>
                    <p className="text-[10px] text-muted-foreground">rank: {selectedMobRaw?.rankCode ?? 'normal'} (×{selectedMobRaw?.rankMult?.toFixed(1) ?? '1.0'})</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/40 border">
                    <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                        <Swords className="h-3 w-3" />
                        <span className="text-[11px] font-medium uppercase tracking-wide">{t('metricAvgTTK')}</span>
                    </div>
                    <p className="text-lg font-bold tabular-nums">
                        {perLevelData.length > 0
                            ? formatTime(perLevelData.reduce((s, e) => s + e.ttk, 0) / perLevelData.length)
                            : '—'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{t('subDowntime')}</p>
                </div>
            </div>

            {/* Progression hints */}
            {perLevelData.length > 0 && (
                <ProgressionHints perLevelData={perLevelData} totalTime={totalTime} t={t} />
            )}

            {/* Per-level progression table */}
            <Card>
                <CardContent className="pt-5 pb-5">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        {t('levelingProgression')}
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="text-left text-muted-foreground border-b">
                                    <th className="pb-2 pr-3 font-medium">{t('colLevel')}</th>
                                    <th className="pb-2 pr-3 font-medium text-right">{t('colXPNeeded')}</th>
                                    <th className="pb-2 pr-3 font-medium text-right">{t('colXPKill')}</th>
                                    <th className="pb-2 pr-3 font-medium text-right">{t('colKills')}</th>
                                    <th className="pb-2 pr-3 font-medium text-right">{t('colTTK')}</th>
                                    <th className="pb-2 pr-3 font-medium text-right">Time for Lvl</th>
                                    <th className="pb-2 font-medium text-center">Sustain</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {perLevelData.map((entry) => {
                                    const xpColor = entry.xpPerKill === 0 ? 'text-destructive' :
                                        entry.xpPerKill < 5 ? 'text-orange-600 dark:text-orange-400' : '';
                                    const sustainColor = entry.canSustain
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-destructive';

                                    return (
                                        <tr key={entry.level}>
                                            <td className="py-1.5 pr-3 font-medium">Lv {entry.level}</td>
                                            <td className="py-1.5 pr-3 text-right tabular-nums font-mono">{formatNum(entry.xpForThisLevel)}</td>
                                            <td className={`py-1.5 pr-3 text-right tabular-nums font-mono ${xpColor}`}>{entry.xpPerKill}</td>
                                            <td className="py-1.5 pr-3 text-right tabular-nums font-mono">{formatNum(entry.killsNeeded)}</td>
                                            <td className="py-1.5 pr-3 text-right tabular-nums font-mono">{formatTime(entry.ttk)}</td>
                                            <td className="py-1.5 pr-3 text-right tabular-nums font-mono">{formatTime(entry.timeForLevel)}</td>
                                            <td className={`py-1.5 text-center font-medium ${sustainColor}`}>
                                                {entry.canSustain ? '✓' : '✗'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
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
                <h2 className="text-sm font-semibold">{t('leveling_title')}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {t('leveling_subtitle')}
                </p>
            </div>
            <Separator className="self-center flex-1 max-w-[60%]" />
        </div>
    );
}

const VERDICT_STYLE: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    great: { icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
    ok: { icon: Info, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
    warn: { icon: AlertTriangle, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10' },
    danger: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
};

type LevelHintEntry = { key: string; verdict: 'great' | 'ok' | 'warn' | 'danger'; labelKey: string; detailKey: string; params?: Record<string, string | number> };

function ProgressionHints({
    perLevelData, totalTime, t,
}: {
    perLevelData: Array<{ level: number; canSustain: boolean; xpPerKill: number; ttk: number; timeForLevel: number }>;
    totalTime: number;
    t: ReturnType<typeof useTranslations<'balance'>>;
}) {
    const tf = t as unknown as (key: string, params?: Record<string, string | number>) => string;
    const hints: LevelHintEntry[] = [];

    // Total leveling time
    const totalHours = totalTime / 3600;
    if (totalHours < 1) {
        hints.push({ key: 'prog_time_fast', verdict: 'warn', labelKey: 'prog_time_fast_label', detailKey: 'prog_time_fast_detail', params: { time: formatTime(totalTime) } });
    } else if (totalHours <= 8) {
        hints.push({ key: 'prog_time_ok', verdict: 'great', labelKey: 'prog_time_ok_label', detailKey: 'prog_time_ok_detail', params: { time: formatTime(totalTime) } });
    } else if (totalHours <= 24) {
        hints.push({ key: 'prog_time_long', verdict: 'ok', labelKey: 'prog_time_long_label', detailKey: 'prog_time_long_detail', params: { time: formatTime(totalTime) } });
    } else {
        hints.push({ key: 'prog_time_grind', verdict: 'danger', labelKey: 'prog_time_grind_label', detailKey: 'prog_time_grind_detail', params: { time: formatTime(totalTime) } });
    }

    // Sustain issues
    const noSustainLevels = perLevelData.filter(e => !e.canSustain).length;
    const noSustainPct = (noSustainLevels / perLevelData.length) * 100;
    if (noSustainPct > 50) {
        hints.push({ key: 'prog_sustain_bad', verdict: 'danger', labelKey: 'prog_sustain_bad_label', detailKey: 'prog_sustain_bad_detail', params: { pct: noSustainPct.toFixed(0) } });
    } else if (noSustainPct > 20) {
        hints.push({ key: 'prog_sustain_warn', verdict: 'warn', labelKey: 'prog_sustain_warn_label', detailKey: 'prog_sustain_warn_detail', params: { pct: noSustainPct.toFixed(0) } });
    } else {
        hints.push({ key: 'prog_sustain_ok', verdict: 'great', labelKey: 'prog_sustain_ok_label', detailKey: 'prog_sustain_ok_detail' });
    }

    // XP drops to 0 (mob too low level)
    const zeroXpLevels = perLevelData.filter(e => e.xpPerKill === 0).length;
    if (zeroXpLevels > 0) {
        hints.push({ key: 'prog_xp_zero', verdict: 'warn', labelKey: 'prog_xp_zero_label', detailKey: 'prog_xp_zero_detail', params: { count: zeroXpLevels } });
    }

    // Very slow TTK on average
    const avgTtk = perLevelData.reduce((s, e) => s + e.ttk, 0) / perLevelData.length;
    if (avgTtk > 20) {
        hints.push({ key: 'prog_ttk_slow', verdict: 'warn', labelKey: 'prog_ttk_slow_label', detailKey: 'prog_ttk_slow_detail', params: { ttk: avgTtk.toFixed(1) } });
    }

    if (hints.length === 0) return null;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {hints.map((h) => {
                const style = VERDICT_STYLE[h.verdict];
                const Icon = style.icon;
                return (
                    <div key={h.key} className={`flex items-start gap-2 p-2.5 rounded-lg ${style.bg}`}>
                        <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${style.color}`} />
                        <div className="min-w-0">
                            <p className={`text-xs font-semibold ${style.color}`}>{tf(h.labelKey)}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{tf(h.detailKey, h.params)}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
