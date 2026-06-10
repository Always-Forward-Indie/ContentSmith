'use client';

import { useMemo, useState } from 'react';
import {
    Calculator, Swords, Clock, Flame,
    TrendingUp, Droplets, Timer,
    CheckCircle, Info, AlertTriangle, XCircle,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { CollapsibleSection } from '@/components/ui/collapsible';
import { trpc } from '@/lib/trpc';
import { useBalanceData } from '@/hooks/useBalanceData';
import {
    calcSkillEfficiency,
    type SkillCalcData,
    type CombatantProfile,
    type SkillEfficiencyResult,
} from '@/lib/balance-calc';

interface SkillBalancePanelProps {
    skillId: number;
}

const TEST_LEVELS = [1, 5, 10, 20, 30, 50];

function formatMs(ms: number): string {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
}

function MetricCard({
    icon: Icon,
    label,
    value,
    subValue,
    colorClass,
}: {
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
            <p className={`text-base font-bold tabular-nums ${colorClass ?? ''}`}>
                {value}
            </p>
            {subValue && (
                <p className="text-[10px] text-muted-foreground leading-tight">{subValue}</p>
            )}
        </div>
    );
}

const VERDICT_STYLE: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    great: { icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
    ok: { icon: Info, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
    warn: { icon: AlertTriangle, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10' },
    danger: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
};

function SkillHints({
    eff,
    skill,
    t,
}: {
    eff: SkillEfficiencyResult;
    skill: SkillCalcData;
    t: ReturnType<typeof useTranslations<'balance'>>;
}) {
    const tf = t as unknown as (key: string, params?: Record<string, string | number>) => string;

    const hints: Array<{ key: string; verdict: 'great' | 'ok' | 'warn' | 'danger'; labelKey: string; detailKey: string; params?: Record<string, string | number> }> = [];

    // DPS vs auto-attack
    const ratio = eff.dpsVsAutoAttack;
    if (ratio >= 1.5) {
        hints.push({ key: 'dps_great', verdict: 'great', labelKey: 'skill_dps_great_label', detailKey: 'skill_dps_great_detail', params: { ratio: ratio.toFixed(2) } });
    } else if (ratio >= 1.0) {
        hints.push({ key: 'dps_ok', verdict: 'ok', labelKey: 'skill_dps_ok_label', detailKey: 'skill_dps_ok_detail', params: { ratio: ratio.toFixed(2) } });
    } else if (ratio >= 0.7) {
        hints.push({ key: 'dps_warn', verdict: 'warn', labelKey: 'skill_dps_warn_label', detailKey: 'skill_dps_warn_detail', params: { ratio: ratio.toFixed(2) } });
    } else {
        hints.push({ key: 'dps_bad', verdict: 'danger', labelKey: 'skill_dps_bad_label', detailKey: 'skill_dps_bad_detail', params: { ratio: ratio.toFixed(2) } });
    }

    // Mana efficiency
    if (skill.costMp === 0) {
        hints.push({ key: 'mana_free', verdict: 'great', labelKey: 'skill_mana_free_label', detailKey: 'skill_mana_free_detail' });
    } else {
        const dpm = eff.damagePerMana;
        if (dpm >= 5) {
            hints.push({ key: 'mana_great', verdict: 'great', labelKey: 'skill_mana_great_label', detailKey: 'skill_mana_great_detail', params: { dpm: dpm.toFixed(1) } });
        } else if (dpm >= 2) {
            hints.push({ key: 'mana_ok', verdict: 'ok', labelKey: 'skill_mana_ok_label', detailKey: 'skill_mana_ok_detail', params: { dpm: dpm.toFixed(1) } });
        } else {
            hints.push({ key: 'mana_warn', verdict: 'warn', labelKey: 'skill_mana_warn_label', detailKey: 'skill_mana_warn_detail', params: { dpm: dpm.toFixed(1) } });
        }
    }

    // Cycle time
    if (eff.totalCycleTimeSec > 10) {
        hints.push({ key: 'cycle_long', verdict: 'warn', labelKey: 'skill_cycle_long_label', detailKey: 'skill_cycle_long_detail', params: { cycle: eff.totalCycleTimeSec.toFixed(1) } });
    }

    return (
        <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{tf('balanceAssessment')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
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
        </div>
    );
}

export function SkillBalancePanel({ skillId }: SkillBalancePanelProps) {
    const t = useTranslations('balance');
    const [testLevel, setTestLevel] = useState(1);
    const [skillLevel, setSkillLevel] = useState(1);
    const [selectedClassValue, setSelectedClassValue] = useState<string | null>(null);
    const [selectedMobName, setSelectedMobName] = useState<string | null>(null);

    const { data: skillData, isLoading: skillLoading } =
        trpc.balance.getSkillCalcData.useQuery({ skillId, level: skillLevel });

    const {
        isLoading: balanceLoading,
        combatConfig,
        testProfiles,
        mobTargets,
        mobsRaw,
    } = useBalanceData(testLevel);

    const isLoading = skillLoading || balanceLoading;

    const skill: SkillCalcData | null = useMemo(() => {
        if (!skillData) return null;
        return {
            name: skillData.name,
            scaleStatSlug: skillData.scaleStatSlug,
            schoolSlug: skillData.schoolSlug,
            flatAdd: skillData.flatAdd,
            coeff: skillData.coeff,
            castMs: skillData.castMs,
            swingMs: skillData.swingMs,
            cooldownMs: skillData.cooldownMs,
            costMp: skillData.costMp,
        };
    }, [skillData]);

    const classOptions: ComboboxOption[] = useMemo(
        () => testProfiles.map((p) => ({ value: p.className, label: p.className })),
        [testProfiles],
    );

    const mobOptions: ComboboxOption[] = useMemo(
        () => mobsRaw.map((m) => ({ value: m.name, label: `${m.name} (Lv ${m.level})` })),
        [mobsRaw],
    );

    const selectedProfile = useMemo(() => {
        if (selectedClassValue) return testProfiles.find((p) => p.className === selectedClassValue) ?? testProfiles[0];
        return testProfiles[0];
    }, [testProfiles, selectedClassValue]);

    const selectedMob: CombatantProfile | null = useMemo(() => {
        if (selectedMobName) return mobTargets.find((m) => m.name === selectedMobName) ?? mobTargets[0] ?? null;
        return mobTargets[0] ?? null;
    }, [mobTargets, selectedMobName]);

    const allResults = useMemo(() => {
        if (!skill || !selectedMob) return [];
        return testProfiles.map((p) => {
            const eff = calcSkillEfficiency(p.profile, selectedMob, skill, combatConfig);
            return { className: p.className, eff };
        });
    }, [testProfiles, selectedMob, skill, combatConfig]);

    if (isLoading || !skill) {
        return (
            <section className="space-y-4 mt-6">
                <SectionHeader t={t} />
                <Card>
                    <CardContent className="pt-5 pb-5">
                        <div className="animate-pulse space-y-3">
                            <div className="h-5 w-32 bg-muted rounded" />
                            <div className="grid grid-cols-3 gap-2">
                                {[1, 2, 3].map((j) => <Skeleton key={j} className="h-16 rounded-lg" />)}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </section>
        );
    }

    if (skillData?.isPassive) return null;

    const eff = selectedProfile && selectedMob
        ? calcSkillEfficiency(selectedProfile.profile, selectedMob, skill, combatConfig)
        : null;

    const dpsRatioColor =
        eff
            ? eff.dpsVsAutoAttack > 1.5 ? 'text-emerald-600 dark:text-emerald-400'
                : eff.dpsVsAutoAttack > 1.0 ? 'text-blue-600 dark:text-blue-400'
                    : eff.dpsVsAutoAttack > 0.7 ? 'text-orange-600 dark:text-orange-400'
                        : 'text-destructive'
            : '';

    const dpmColor =
        eff
            ? eff.damagePerMana === Infinity ? 'text-emerald-600 dark:text-emerald-400'
                : eff.damagePerMana > 5 ? 'text-emerald-600 dark:text-emerald-400'
                    : eff.damagePerMana > 2 ? 'text-foreground'
                        : 'text-orange-600 dark:text-orange-400'
            : '';

    return (
        <section className="space-y-4 mt-6">
            <SectionHeader t={t} />

            {/* Selectors row */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Player level pills */}
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-muted-foreground">{t('playerLevel')}</span>
                    {TEST_LEVELS.map((lvl) => (
                        <button
                            key={lvl}
                            type="button"
                            onClick={() => setTestLevel(lvl)}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${testLevel === lvl
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
                                }`}
                        >
                            Lv {lvl}
                        </button>
                    ))}
                </div>
                {/* Skill level pills */}
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">{t('skillLevel')}</span>
                    {[1, 2, 3, 4, 5].map((lvl) => (
                        <button
                            key={lvl}
                            type="button"
                            onClick={() => setSkillLevel(lvl)}
                            className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${skillLevel === lvl
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
                                }`}
                        >
                            {lvl}
                        </button>
                    ))}
                </div>
            </div>

            {/* Class + Mob selectors */}
            <div className="flex flex-wrap items-center gap-3">
                {classOptions.length > 1 && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">{t('class')}</span>
                        <Combobox
                            options={classOptions}
                            value={selectedClassValue ?? classOptions[0]?.value ?? null}
                            onChange={setSelectedClassValue}
                            placeholder={t('selectClass')}
                            searchPlaceholder={t('searchClasses')}
                            triggerClassName="h-8 text-xs"
                            className="w-48"
                        />
                    </div>
                )}
                {mobOptions.length > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">{t('mob')}</span>
                        <Combobox
                            options={mobOptions}
                            value={selectedMobName ?? mobOptions[0]?.value ?? null}
                            onChange={setSelectedMobName}
                            placeholder={t('selectMob')}
                            searchPlaceholder={t('searchMobs')}
                            triggerClassName="h-8 text-xs"
                            className="w-52"
                        />
                    </div>
                )}
            </div>

            {/* Skill info badges */}
            <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                    {skillData?.schoolSlug ?? 'physical'}
                </Badge>
                <Badge variant="outline" className="text-xs font-mono">
                    {skill.flatAdd} + {skill.coeff}× {skill.scaleStatSlug.replace(/_/g, ' ')}
                </Badge>
                {skill.costMp > 0 && (
                    <Badge variant="outline" className="text-xs text-blue-600 dark:text-blue-400">
                        {skill.costMp} MP
                    </Badge>
                )}
                {selectedProfile && (
                    <Badge variant="outline" className="text-xs">
                        {selectedProfile.className} Lv{testLevel}
                    </Badge>
                )}
                {selectedMob && (
                    <span className="text-xs text-muted-foreground">vs {selectedMob.name}</span>
                )}
            </div>

            {/* Main metrics */}
            {eff && selectedProfile && selectedMob && (
                <Card>
                    <CardContent className="pt-5 pb-5 space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            <MetricCard
                                icon={Swords}
                                label={t('metricTotalDamage')}
                                value={eff.totalDamage.toFixed(1)}
                                subValue={`${t('subRaw')} ${skill.flatAdd} + ${skill.coeff}× scale`}
                            />
                            <MetricCard
                                icon={Flame}
                                label={t('metricDPS')}
                                value={eff.damagePerSecond.toFixed(1)}
                                subValue={`Cycle: ${eff.totalCycleTimeSec.toFixed(2)}s`}
                            />
                            <MetricCard
                                icon={TrendingUp}
                                label={t('metricVsAutoAttack')}
                                value={`×${eff.dpsVsAutoAttack.toFixed(2)}`}
                                subValue={eff.dpsVsAutoAttack > 1 ? t('subBetterThanAuto') : t('subWorseThanAuto')}
                                colorClass={dpsRatioColor}
                            />
                            <MetricCard
                                icon={Droplets}
                                label={t('metricDmgMana')}
                                value={eff.damagePerMana === Infinity ? '∞' : eff.damagePerMana.toFixed(1)}
                                subValue={skill.costMp > 0 ? `${skill.costMp} MP cost` : t('subFree')}
                                colorClass={dpmColor}
                            />
                            <MetricCard
                                icon={Timer}
                                label={t('metricCastTime')}
                                value={formatMs(eff.effectiveCastMs)}
                                subValue={`Swing: ${formatMs(eff.effectiveSwingMs)}`}
                            />
                            <MetricCard
                                icon={Clock}
                                label={t('metricCooldown')}
                                value={formatMs(skill.cooldownMs)}
                                subValue={t('subGCDIncluded')}
                            />
                        </div>

                        <SkillHints eff={eff} skill={skill} t={t} />
                    </CardContent>
                </Card>
            )}

            {/* All classes comparison */}
            {allResults.length > 1 && (
                <Card>
                    <CardContent className="pt-5 pb-5">
                        <CollapsibleSection
                            title={
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                    <h3 className="text-sm font-semibold">{t('allClassesSkillComparison')}</h3>
                                </div>
                            }
                        >
                            <div className="overflow-x-auto mt-2">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="text-left text-muted-foreground border-b">
                                            <th className="pb-2 pr-4 font-medium">{t('class')}</th>
                                            <th className="pb-2 pr-3 font-medium text-right">{t('metricTotalDamage')}</th>
                                            <th className="pb-2 pr-3 font-medium text-right">{t('metricDPS')}</th>
                                            <th className="pb-2 pr-3 font-medium text-right">{t('metricVsAutoAttack')}</th>
                                            <th className="pb-2 font-medium text-right">{t('metricDmgMana')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {allResults.map(({ className, eff: e }) => (
                                            <tr key={className}>
                                                <td className="py-1.5 pr-4 font-medium">{className}</td>
                                                <td className="py-1.5 pr-3 text-right tabular-nums font-mono">{e.totalDamage.toFixed(1)}</td>
                                                <td className="py-1.5 pr-3 text-right tabular-nums font-mono">{e.damagePerSecond.toFixed(1)}</td>
                                                <td className={`py-1.5 pr-3 text-right tabular-nums font-mono font-semibold ${e.dpsVsAutoAttack >= 1.5 ? 'text-emerald-600 dark:text-emerald-400' : e.dpsVsAutoAttack >= 1.0 ? 'text-blue-600 dark:text-blue-400' : 'text-destructive'}`}>
                                                    ×{e.dpsVsAutoAttack.toFixed(2)}
                                                </td>
                                                <td className="py-1.5 text-right tabular-nums font-mono text-muted-foreground">
                                                    {e.damagePerMana === Infinity ? '∞' : e.damagePerMana.toFixed(1)}
                                                </td>
                                            </tr>
                                        ))}
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

function SectionHeader({ t }: { t: ReturnType<typeof useTranslations<'balance'>> }) {
    return (
        <div className="flex items-start gap-3 pb-1">
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-muted text-muted-foreground mt-0.5 shrink-0">
                <Calculator className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold">{t('skillEfficiency_title')}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {t('skillEfficiency_subtitle')}
                </p>
            </div>
            <Separator className="self-center flex-1 max-w-[60%]" />
        </div>
    );
}
