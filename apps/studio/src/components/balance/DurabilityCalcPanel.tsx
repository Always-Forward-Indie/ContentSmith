'use client';

import { useMemo, useState } from 'react';
import {
    Wrench, Clock, Coins, Shield, Swords,
    AlertTriangle, CheckCircle, Info,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Combobox } from '@/components/ui/combobox';
import { useBalanceData } from '@/hooks/useBalanceData';
import {
    simulateCombat,
    buildMobProfile,
    calcDurability,
    type DurabilityResult,
} from '@/lib/balance-calc';

interface DurabilityCalcPanelProps {
    item: {
        name: string;
        durabilityMax: number;
        vendorPriceBuy: number;
        isWeapon?: boolean;
    };
    /** Optional: pre-selected mob for context */
    mob?: {
        name: string;
        level: number;
        attributes: Array<{ attributeSlug: string; flatValue: number }>;
        attackCooldown?: number | null;
    };
}

const TEST_LEVELS = [1, 5, 10, 20, 30, 50];
const DEFAULT_DOWNTIME_SEC = 3;

function formatTimeLong(seconds: number): string {
    if (!isFinite(seconds)) return '∞';
    if (seconds < 60) return `${seconds.toFixed(0)}s`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)} min`;
    return `${(seconds / 3600).toFixed(1)} hr`;
}

function PillSelector<T extends string | number>({
    label, options, value, onChange, renderLabel,
}: {
    label: string; options: T[]; value: T; onChange: (v: T) => void; renderLabel: (v: T) => string;
}) {
    return (
        <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground">{label}:</span>
            {options.map((opt) => (
                <button
                    key={String(opt)}
                    onClick={() => onChange(opt)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${value === opt
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
                        }`}
                >
                    {renderLabel(opt)}
                </button>
            ))}
        </div>
    );
}

export function DurabilityCalcPanel({ item, mob: defaultMob }: DurabilityCalcPanelProps) {
    const t = useTranslations('balance');
    const [testLevel, setTestLevel] = useState(10);
    const [selectedClassIdx, setSelectedClassIdx] = useState(0);
    const [selectedMobIdx, setSelectedMobIdx] = useState(0);

    const { isLoading, combatConfig, testProfiles: allProfiles, mobTargets } = useBalanceData(testLevel);

    if (isLoading) {
        return (
            <section className="space-y-4">
                <SectionHeader t={t} />
                <Card><CardContent className="pt-5 pb-5">
                    <div className="animate-pulse space-y-2">
                        <div className="h-5 w-40 bg-muted rounded" />
                        <div className="grid grid-cols-4 gap-2">{[1, 2, 3, 4].map((j) => <div key={j} className="h-16 bg-muted rounded-lg" />)}</div>
                    </div>
                </CardContent></Card>
            </section>
        );
    }

    if (allProfiles.length === 0 || mobTargets.length === 0) return null;

    const selectedProfile = allProfiles[selectedClassIdx] ?? allProfiles[0];
    const selectedMob = mobTargets[selectedMobIdx] ?? mobTargets[0];
    if (!selectedProfile || !selectedMob) return null;

    const sim = simulateCombat(selectedProfile.profile, selectedMob, undefined, combatConfig);

    // Estimate mob hits per fight: fight duration / mob attack interval
    const mobAttackInterval = selectedMob.stats['attack_speed'] ? 1000 / selectedMob.stats['attack_speed'] : 2;
    const mobHitsPerFight = Math.ceil(sim.timeToKillSec / mobAttackInterval);

    const dur = calcDurability(
        item.durabilityMax,
        item.vendorPriceBuy,
        sim.hitsToKill,
        mobHitsPerFight,
        sim.timeToKillSec,
        DEFAULT_DOWNTIME_SEC,
        item.isWeapon ?? true,
    );

    // Durability severity
    const weaponSeverity = dur.weaponFightsToBreak < 20 ? 'text-destructive' :
        dur.weaponFightsToBreak < 50 ? 'text-orange-600 dark:text-orange-400' :
            'text-emerald-600 dark:text-emerald-400';
    const armorSeverity = dur.armorFightsToBreak < 20 ? 'text-destructive' :
        dur.armorFightsToBreak < 50 ? 'text-orange-600 dark:text-orange-400' :
            'text-emerald-600 dark:text-emerald-400';

    return (
        <section className="space-y-4">
            <SectionHeader t={t} />

            <div className="flex flex-wrap items-center gap-3">
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
                {allProfiles.length > 1 && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">{t('class')}</span>
                        <Combobox
                            options={allProfiles.map((p) => ({ value: p.className, label: p.className }))}
                            value={allProfiles[selectedClassIdx]?.className ?? null}
                            onChange={(v) => {
                                const idx = allProfiles.findIndex((p) => p.className === v);
                                setSelectedClassIdx(idx >= 0 ? idx : 0);
                            }}
                            placeholder={t('selectClass')}
                            searchPlaceholder={t('searchClasses')}
                            triggerClassName="h-8 text-xs"
                            className="w-52"
                        />
                    </div>
                )}
                {mobTargets.length > 1 && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">{t('targetMob')}</span>
                        <Combobox
                            options={mobTargets.map((m, i) => ({ value: String(i), label: `${m.name} Lv${m.level}` }))}
                            value={String(selectedMobIdx)}
                            onChange={(v) => setSelectedMobIdx(v !== null ? Number(v) : 0)}
                            placeholder={t('selectMob')}
                            searchPlaceholder={t('searchMobs')}
                            triggerClassName="h-8 text-xs"
                            className="w-64"
                        />
                    </div>
                )}
            </div>

            <Card>
                <CardContent className="pt-5 pb-5 space-y-4">
                    <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold">{item.name}</h3>
                        <Badge variant="outline" className="text-[10px]">
                            {item.durabilityMax} durability
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                            vs {selectedMob.name} Lv{selectedMob.level}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <DurMetric label={t('metricWeaponFights')} value={dur.weaponFightsToBreak === Infinity ? '∞' : String(dur.weaponFightsToBreak)}
                            subValue={dur.weaponFightsToBreak !== Infinity ? formatTimeLong(dur.weaponTimeToBreakSec) : undefined}
                            colorClass={weaponSeverity} />
                        <DurMetric label={t('metricArmorFights')} value={dur.armorFightsToBreak === Infinity ? '∞' : String(dur.armorFightsToBreak)}
                            subValue={dur.armorFightsToBreak !== Infinity ? formatTimeLong(dur.armorTimeToBreakSec) : undefined}
                            colorClass={armorSeverity} />
                        <DurMetric label={t('metricRepairCost')} value={`${dur.weaponFullRepairCost}g`}
                            subValue={t('subFullRepair')} />
                        <DurMetric label={t('metricDurFight')} value={dur.weaponDurPerFight.toFixed(1)}
                            subValue={`Armor: ${dur.armorDurPerFight.toFixed(1)}`} />
                    </div>

                    {/* Context info */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-t pt-3">
                        <ContextMetric label={t('ctxPlayerHits')} value={String(sim.hitsToKill)} />
                        <ContextMetric label={t('ctxMobHits')} value={String(mobHitsPerFight)} />
                        <ContextMetric label={t('ctxFightDuration')} value={`${sim.timeToKillSec.toFixed(1)}s`} />
                        <ContextMetric label={t('ctxDeathPenalty')} value={`${(0.05 * 100).toFixed(0)}% dur`} />
                    </div>

                    {/* Warnings */}
                    {dur.weaponFightsToBreak < 20 && (
                        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10">
                            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
                            <div>
                                <p className="text-xs font-semibold text-destructive">{t('warnBreaksQuickly')}</p>
                                <p className="text-[11px] text-muted-foreground">
                                    Only {dur.weaponFightsToBreak} fights as weapon. Player will spend a lot of time/gold repairing.
                                    Consider increasing durability or reducing hits-to-kill.
                                </p>
                            </div>
                        </div>
                    )}
                    {dur.weaponFightsToBreak >= 100 && (
                        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-emerald-500/10">
                            <CheckCircle className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <div>
                                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{t('warnDurable')}</p>
                                <p className="text-[11px] text-muted-foreground">
                                    {dur.weaponFightsToBreak} fights — lasts a long time. Good for sustained farming.
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </section>
    );
}

function DurMetric({ label, value, subValue, colorClass }: { label: string; value: string; subValue?: string; colorClass?: string }) {
    return (
        <div className="flex flex-col gap-1 p-3 rounded-lg bg-muted/40">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
            <span className={`text-lg font-bold tabular-nums ${colorClass ?? ''}`}>{value}</span>
            {subValue && <span className="text-[10px] text-muted-foreground">{subValue}</span>}
        </div>
    );
}

function ContextMetric({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase">{label}</span>
            <span className="text-xs font-medium tabular-nums">{value}</span>
        </div>
    );
}

function SectionHeader({ t }: { t: ReturnType<typeof useTranslations<'balance'>> }) {
    return (
        <div className="flex items-start gap-3 pb-1">
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-muted text-muted-foreground mt-0.5 shrink-0">
                <Wrench className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold">{t('durability_title')}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {t('durability_subtitle')}
                </p>
            </div>
            <Separator className="self-center flex-1 max-w-[60%]" />
        </div>
    );
}
