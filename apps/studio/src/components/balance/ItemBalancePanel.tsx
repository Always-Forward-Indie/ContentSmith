'use client';

import { useMemo, useState } from 'react';
import {
    Swords, Clock, TrendingUp, Calculator, Shield, Flame,
    Activity, ChevronDown, ChevronUp, Target, Gem, Wrench,
    AlertTriangle, CheckCircle, Info, XCircle,
    ArrowRight, ArrowDown, ArrowUp, Minus,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Combobox } from '@/components/ui/combobox';
import { useBalanceData, type ClassTestProfile } from '@/hooks/useBalanceData';
import {
    simulateCombat,
    compareCombat,
    applyEquipment,
    calcDurability,
    buildMobProfile,
    type CombatantProfile,
    type CombatSimResult,
    type CombatComparison,
    type DurabilityResult,
} from '@/lib/balance-calc';

interface ItemBalancePanelProps {
    item: {
        id: number;
        name: string;
        levelRequirement: number | null;
        vendorPriceBuy?: number;
        durabilityMax?: number | null;
        isDurable?: boolean;
        attributes: Array<{
            attributeId: number;
            attributeSlug: string;
            attributeName: string;
            value: number;
        }>;
    };
}

const TEST_LEVELS = [1, 5, 10, 20, 30, 50];
const DEFAULT_DOWNTIME_SEC = 3;

// ── Shared UI ────────────────────────────────────────────────────────────────

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

function DeltaIndicator({ value, suffix = '', invert = false }: { value: number; suffix?: string; invert?: boolean }) {
    const isPositive = invert ? value < 0 : value > 0;
    const isNeutral = Math.abs(value) < 0.01;
    if (isNeutral) return <span className="text-muted-foreground">—</span>;
    const color = isPositive
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-destructive';
    const Icon = value > 0 ? ArrowUp : ArrowDown;
    return (
        <span className={`inline-flex items-center gap-0.5 font-medium ${color}`}>
            <Icon className="h-3 w-3" />
            {Math.abs(value).toFixed(1)}{suffix}
        </span>
    );
}

function ComparisonRow({ label, baseFmt, modFmt, delta, suffix = '', invert = false }: {
    label: string; baseFmt: string; modFmt: string; delta: number; suffix?: string; invert?: boolean;
}) {
    return (
        <tr className="border-b last:border-0">
            <td className="py-2 pr-4 text-xs font-medium text-muted-foreground">{label}</td>
            <td className="py-2 pr-2 text-xs tabular-nums text-right">{baseFmt}</td>
            <td className="py-2 px-2 text-center"><ArrowRight className="h-3 w-3 text-muted-foreground inline" /></td>
            <td className="py-2 pr-2 text-xs tabular-nums text-right font-medium">{modFmt}</td>
            <td className="py-2 text-xs tabular-nums text-right"><DeltaIndicator value={delta} suffix={suffix} invert={invert} /></td>
        </tr>
    );
}

function formatTime(seconds: number): string {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs.toFixed(0)}s`;
}

function formatTimeCompact(seconds: number): string {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
}

// ── Main component ───────────────────────────────────────────────────────────

export function ItemBalancePanel({ item }: ItemBalancePanelProps) {
    const t = useTranslations('balance');
    const defaultLevel = Math.max(1, item.levelRequirement ?? 1);
    const [testLevel, setTestLevel] = useState(defaultLevel);
    const [selectedClassIdx, setSelectedClassIdx] = useState(0);
    const [selectedMobIdx, setSelectedMobIdx] = useState(0);
    const [showDetails, setShowDetails] = useState(false);

    const { isLoading, combatConfig, testProfiles: allProfiles, mobTargets } = useBalanceData(testLevel);

    if (isLoading) {
        return (
            <section className="space-y-4">
                <SectionHeader t={t} />
                <Card><CardContent className="pt-5 pb-5">
                    <div className="animate-pulse space-y-3">
                        <div className="h-5 w-48 bg-muted rounded" />
                        <div className="grid grid-cols-2 gap-2">{[1, 2, 3, 4].map((j) => <div key={j} className="h-12 bg-muted rounded-lg" />)}</div>
                    </div>
                </CardContent></Card>
            </section>
        );
    }

    if (allProfiles.length === 0) return null;

    const selectedProfile = allProfiles[selectedClassIdx] ?? allProfiles[0];
    const selectedMob = mobTargets[selectedMobIdx] ?? mobTargets[0];

    if (!selectedProfile || !selectedMob) return null;

    // Build modified profile with item equipped
    const modifiedProfile = applyEquipment(
        selectedProfile.profile,
        item.attributes.map((a) => ({ attributeSlug: a.attributeSlug, value: a.value })),
    );

    // Full comparison: base vs with-item
    const comparison = compareCombat(selectedProfile.profile, modifiedProfile, selectedMob, undefined, combatConfig);
    const { base, modified } = comparison;

    // Durability calc if applicable
    const durability = (item.isDurable && item.durabilityMax && item.durabilityMax > 0)
        ? calcDurability(
            item.durabilityMax,
            item.vendorPriceBuy ?? 0,
            base.hitsToKill,
            Math.ceil(base.timeToKillSec / (selectedMob.stats['attack_speed'] ? 1000 / selectedMob.stats['attack_speed'] : 2)),
            base.timeToKillSec,
            DEFAULT_DOWNTIME_SEC,
            true,
        )
        : null;

    return (
        <section className="space-y-4">
            <SectionHeader t={t} />

            {/* Selectors */}
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

            {/* Summary card — key deltas */}
            <Card>
                <CardContent className="pt-5 pb-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs font-medium">
                                {selectedProfile.className} Lv{testLevel}
                            </Badge>
                            <span className="text-xs text-muted-foreground">vs {selectedMob.name} Lv{selectedMob.level}</span>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">
                            {t('equipping')} {item.name}
                        </Badge>
                    </div>

                    {/* Quick impact overview — 4 key metrics with base → mod */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <ImpactMetric
                            icon={Swords}
                            label={t('metricDPS')}
                            baseFmt={base.dps.toFixed(1)}
                            modFmt={modified.dps.toFixed(1)}
                            delta={comparison.dpsChange}
                            deltaPct={comparison.dpsChangePct}
                        />
                        <ImpactMetric
                            icon={Clock}
                            label={t('metricTTK')}
                            baseFmt={formatTime(base.timeToKillSec)}
                            modFmt={formatTime(modified.timeToKillSec)}
                            delta={comparison.timeToKillChange}
                            invert
                        />
                        <ImpactMetric
                            icon={Shield}
                            label={t('metricDamageTaken')}
                            baseFmt={base.damageTakenDuringFight.toFixed(0)}
                            modFmt={modified.damageTakenDuringFight.toFixed(0)}
                            delta={comparison.damageTakenChange}
                            invert
                        />
                        <ImpactMetric
                            icon={Activity}
                            label={t('metricHPRemaining')}
                            baseFmt={base.hpRemaining.toFixed(0)}
                            modFmt={modified.hpRemaining.toFixed(0)}
                            delta={comparison.hpRemainingChange}
                        />
                    </div>

                    {/* Stat deltas from the item */}
                    {Object.keys(comparison.statDeltas).length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {Object.entries(comparison.statDeltas).map(([slug, delta]) => (
                                <Badge
                                    key={slug}
                                    variant="outline"
                                    className={`text-[10px] tabular-nums ${delta > 0 ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30' : 'text-destructive border-destructive/30'}`}
                                >
                                    {slug}: {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                                </Badge>
                            ))}
                        </div>
                    )}

                    {/* Expandable detailed comparison table */}
                    <button
                        onClick={() => setShowDetails(!showDetails)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        {showDetails ? t('hideDetails') : t('showDetails')}
                    </button>

                    {showDetails && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-muted-foreground border-b">
                                        <th className="pb-1.5 text-left font-medium">{t('colMetric')}</th>
                                        <th className="pb-1.5 text-right font-medium">{t('colBase')}</th>
                                        <th className="pb-1.5 text-center w-8"></th>
                                        <th className="pb-1.5 text-right font-medium">{t('colWithItem')}</th>
                                        <th className="pb-1.5 text-right font-medium">{t('colChange')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <ComparisonRow label={t('metricDmgHit')} baseFmt={base.damagePerHit.toFixed(1)} modFmt={modified.damagePerHit.toFixed(1)} delta={comparison.damageChange} />
                                    <ComparisonRow label={t('metricDPS')} baseFmt={base.dps.toFixed(1)} modFmt={modified.dps.toFixed(1)} delta={comparison.dpsChange} />
                                    <ComparisonRow label={t('metricHitsToKill')} baseFmt={String(base.hitsToKill)} modFmt={String(modified.hitsToKill)} delta={comparison.hitsToKillChange} invert />
                                    <ComparisonRow label={t('metricTTK')} baseFmt={formatTime(base.timeToKillSec)} modFmt={formatTime(modified.timeToKillSec)} delta={comparison.timeToKillChange} suffix="s" invert />
                                    <ComparisonRow label={t('metricHitChance')} baseFmt={`${(base.hitChance * 100).toFixed(0)}%`} modFmt={`${(modified.hitChance * 100).toFixed(0)}%`} delta={(modified.hitChance - base.hitChance) * 100} suffix="%" />
                                    <ComparisonRow label={t('metricCritMult')} baseFmt={`×${base.effectiveCritMult.toFixed(2)}`} modFmt={`×${modified.effectiveCritMult.toFixed(2)}`} delta={modified.effectiveCritMult - base.effectiveCritMult} />
                                    <ComparisonRow label={t('metricDamageTaken')} baseFmt={base.damageTakenDuringFight.toFixed(0)} modFmt={modified.damageTakenDuringFight.toFixed(0)} delta={comparison.damageTakenChange} invert />
                                    <ComparisonRow label={t('metricHPRemaining')} baseFmt={base.hpRemaining.toFixed(0)} modFmt={modified.hpRemaining.toFixed(0)} delta={comparison.hpRemainingChange} />
                                    <ComparisonRow label={t('metricDefenseReduction')} baseFmt={`${(base.defenseReduction * 100).toFixed(0)}%`} modFmt={`${(modified.defenseReduction * 100).toFixed(0)}%`} delta={(modified.defenseReduction - base.defenseReduction) * 100} suffix="%" />
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Durability section */}
            {durability && (
                <Card>
                    <CardContent className="pt-5 pb-5 space-y-3">
                        <div className="flex items-center gap-2">
                            <Wrench className="h-4 w-4 text-muted-foreground" />
                            <h3 className="text-sm font-semibold">{t('durabilityRepair')}</h3>
                            <Badge variant="outline" className="text-[10px]">{item.durabilityMax} max</Badge>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <DurabilityMetric
                                label={t('metricWeaponFightsShort')}
                                value={durability.weaponFightsToBreak === Infinity ? '∞' : String(durability.weaponFightsToBreak)}
                                subValue={durability.weaponFightsToBreak !== Infinity ? `~${formatTimeCompact(durability.weaponTimeToBreakSec)}` : undefined}
                            />
                            <DurabilityMetric
                                label={t('metricArmorFightsShort')}
                                value={durability.armorFightsToBreak === Infinity ? '∞' : String(durability.armorFightsToBreak)}
                                subValue={durability.armorFightsToBreak !== Infinity ? `~${formatTimeCompact(durability.armorTimeToBreakSec)}` : undefined}
                            />
                            <DurabilityMetric
                                label={t('metricWeaponRepair')}
                                value={`${durability.weaponFullRepairCost}g`}
                                subValue={t('subFullRepairCost')}
                            />
                            <DurabilityMetric
                                label={t('metricDurFight')}
                                value={durability.weaponDurPerFight.toFixed(1)}
                                subValue={`${durability.armorDurPerFight.toFixed(1)} ${t('subArmorSuffix')}`}
                            />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* All-class impact comparison */}
            {allProfiles.length > 1 && (
                <Card>
                    <CardContent className="pt-5 pb-5">
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            <h3 className="text-sm font-semibold">{t('impactByClass')}</h3>
                        </div>
                        <AllClassImpactTable
                            profiles={allProfiles}
                            mob={selectedMob}
                            itemAttributes={item.attributes}
                            combatConfig={combatConfig}
                            selectedClassName={selectedProfile.className}
                            t={t}
                        />
                    </CardContent>
                </Card>
            )}
        </section>
    );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function ImpactMetric({ icon: Icon, label, baseFmt, modFmt, delta, deltaPct, invert = false }: {
    icon: React.ElementType; label: string; baseFmt: string; modFmt: string; delta: number; deltaPct?: number; invert?: boolean;
}) {
    const isPositive = invert ? delta < 0 : delta > 0;
    const isNeutral = Math.abs(delta) < 0.01;
    const color = isNeutral ? '' : isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive';

    return (
        <div className="flex flex-col gap-1 p-3 rounded-lg bg-muted/40 border border-transparent hover:border-border transition-colors">
            <div className="flex items-center gap-1.5 text-muted-foreground">
                <Icon className="h-3 w-3 shrink-0" />
                <span className="text-[11px] font-medium uppercase tracking-wide leading-none">{label}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
                <span className="text-xs text-muted-foreground tabular-nums">{baseFmt}</span>
                <ArrowRight className="h-2.5 w-2.5 text-muted-foreground/60" />
                <span className={`text-sm font-bold tabular-nums ${color}`}>{modFmt}</span>
            </div>
            {!isNeutral && deltaPct !== undefined && (
                <span className={`text-[10px] font-medium ${color}`}>
                    {deltaPct > 0 ? '+' : ''}{deltaPct.toFixed(1)}%
                </span>
            )}
        </div>
    );
}

function DurabilityMetric({ label, value, subValue }: { label: string; value: string; subValue?: string }) {
    return (
        <div className="flex flex-col gap-1 p-3 rounded-lg bg-muted/40">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
            <span className="text-lg font-bold tabular-nums">{value}</span>
            {subValue && <span className="text-[10px] text-muted-foreground">{subValue}</span>}
        </div>
    );
}

function AllClassImpactTable({ profiles, mob, itemAttributes, combatConfig, selectedClassName, t }: {
    profiles: ClassTestProfile[];
    mob: CombatantProfile;
    itemAttributes: Array<{ attributeSlug: string; value: number }>;
    combatConfig: any;
    selectedClassName: string;
    t: (key: string) => string;
}) {
    const rows = useMemo(() => {
        return profiles.map((p) => {
            const modifiedProfile = applyEquipment(
                p.profile,
                itemAttributes.map((a) => ({ attributeSlug: a.attributeSlug, value: a.value })),
            );
            const cmp = compareCombat(p.profile, modifiedProfile, mob, undefined, combatConfig);
            return { className: p.className, cmp };
        });
    }, [profiles, mob, itemAttributes, combatConfig]);

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-xs">
                <thead>
                    <tr className="text-left text-muted-foreground border-b">
                        <th className="pb-2 pr-3 font-medium">{t('colClass')}</th>
                        <th className="pb-2 pr-3 font-medium text-right">{t('colDPSDelta')}</th>
                        <th className="pb-2 pr-3 font-medium text-right">{t('colTTKDelta')}</th>
                        <th className="pb-2 pr-3 font-medium text-right">{t('colDmgTakenDelta')}</th>
                        <th className="pb-2 font-medium text-right">{t('colHPLeftDelta')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {rows.map((r) => (
                        <tr key={r.className} className={r.className === selectedClassName ? 'bg-primary/5' : ''}>
                            <td className="py-1.5 pr-3 font-medium">{r.className}</td>
                            <td className="py-1.5 pr-3 text-right"><DeltaIndicator value={r.cmp.dpsChange} /></td>
                            <td className="py-1.5 pr-3 text-right"><DeltaIndicator value={r.cmp.timeToKillChange} suffix="s" invert /></td>
                            <td className="py-1.5 pr-3 text-right"><DeltaIndicator value={r.cmp.damageTakenChange} invert /></td>
                            <td className="py-1.5 text-right"><DeltaIndicator value={r.cmp.hpRemainingChange} /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function SectionHeader({ t }: { t: ReturnType<typeof useTranslations<'balance'>> }) {
    return (
        <div className="flex items-start gap-3 pb-1">
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-muted text-muted-foreground mt-0.5 shrink-0">
                <Calculator className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold">{t('itemBalance_title')}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {t('itemBalance_subtitle')}
                </p>
            </div>
            <Separator className="self-center flex-1 max-w-[60%]" />
        </div>
    );
}
