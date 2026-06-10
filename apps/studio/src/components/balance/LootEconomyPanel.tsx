'use client';

import { useMemo, useState } from 'react';
import {
    Gem, Clock, Coins, TrendingUp, Target,
    ShoppingBag, Calculator, CheckCircle, Info, AlertTriangle, XCircle,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Combobox } from '@/components/ui/combobox';
import { CollapsibleSection } from '@/components/ui/collapsible';
import { trpc } from '@/lib/trpc';
import { useBalanceData } from '@/hooks/useBalanceData';
import {
    simulateCombat,
    buildMobProfile,
    calcLootFarmTime,
    calcGoldPerKill,
    calcGoldFarmTime,
    calcVendorBuyPrice,
    type CombatantProfile,
    type LootDropInfo,
    type LootFarmResult,
    type GoldFarmResult,
} from '@/lib/balance-calc';

interface LootEconomyPanelProps {
    mob: {
        id: number;
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

export function LootEconomyPanel({ mob }: LootEconomyPanelProps) {
    const t = useTranslations('balance');
    const [testLevel, setTestLevel] = useState(Math.max(1, mob.level));
    const [selectedClassIdx, setSelectedClassIdx] = useState(0);

    const { isLoading: balanceLoading, combatConfig, testProfiles: allProfiles } = useBalanceData(testLevel);
    const { data: lootData, isLoading: lootLoading } = trpc.balance.getMobLoot.useQuery({ mobId: mob.id });
    const { data: vendorsData } = trpc.balance.getVendors.useQuery();

    const isLoading = balanceLoading || lootLoading;

    const mobProfile = useMemo(
        () => buildMobProfile(mob.name, mob.level, mob.attributes, mob.attackCooldown ? Number(mob.attackCooldown) : undefined),
        [mob],
    );

    const selectedProfile = allProfiles[selectedClassIdx] ?? allProfiles[0];

    const sim = useMemo(() => {
        if (!selectedProfile) return null;
        return simulateCombat(selectedProfile.profile, mobProfile, undefined, combatConfig);
    }, [selectedProfile, mobProfile, combatConfig]);

    // Loot farm calculations
    const lootCalcs = useMemo(() => {
        if (!lootData || !sim) return [];
        const cycleSec = sim.timeToKillSec + DEFAULT_DOWNTIME_SEC;
        return lootData.map((drop) => {
            const info: LootDropInfo = {
                itemId: drop.itemId,
                itemName: drop.itemName,
                dropChance: Number(drop.dropChance),
                minQuantity: drop.minQuantity,
                maxQuantity: drop.maxQuantity,
                lootTier: drop.lootTier,
            };
            const farm = calcLootFarmTime(info, sim.timeToKillSec, DEFAULT_DOWNTIME_SEC);
            return { ...drop, farm, info };
        });
    }, [lootData, sim]);

    // Gold per kill calculation
    const goldPerKill = useMemo(() => {
        if (!lootData) return 0;
        return calcGoldPerKill(
            lootData.map((d) => ({
                dropChance: Number(d.dropChance),
                minQuantity: d.minQuantity,
                maxQuantity: d.maxQuantity,
                vendorSellPrice: Number(d.vendorPriceSell ?? 0),
            })),
        );
    }, [lootData]);

    // Gold farm rate
    const goldPerMinute = sim && goldPerKill > 0
        ? (goldPerKill / (sim.timeToKillSec + DEFAULT_DOWNTIME_SEC)) * 60
        : 0;

    if (isLoading) {
        return (
            <section className="space-y-4">
                <SectionHeader t={t} />
                <Card><CardContent className="pt-5 pb-5">
                    <div className="animate-pulse space-y-3">
                        <div className="h-5 w-48 bg-muted rounded" />
                        <div className="h-24 bg-muted rounded-lg" />
                    </div>
                </CardContent></Card>
            </section>
        );
    }

    if (!lootData || lootData.length === 0) {
        return null; // No loot configured — nothing to show
    }

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
            </div>

            {/* Gold economy overview */}
            <Card>
                <CardContent className="pt-5 pb-5 space-y-3">
                    <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4 text-amber-500" />
                        <h3 className="text-sm font-semibold">{t('goldEconomy')}</h3>
                        {sim && (
                            <span className="text-xs text-muted-foreground">
                                TTK: {sim.timeToKillSec.toFixed(1)}s · Cycle: {(sim.timeToKillSec + DEFAULT_DOWNTIME_SEC).toFixed(1)}s
                            </span>
                        )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <GoldMetric label={t('metricGoldKill')} value={`${goldPerKill.toFixed(1)}g`} subValue={t('subExpectedAvg')} />
                        <GoldMetric label={t('metricGoldMin')} value={`${goldPerMinute.toFixed(1)}g`} subValue={t('subContinuousFarming')} />
                        <GoldMetric label={t('metricGoldHour')} value={`${(goldPerMinute * 60).toFixed(0)}g`} subValue={t('subTheoreticalMax')} />
                        <GoldMetric label={t('metricLootItems')} value={String(lootData.length)} subValue={t('subInLootTable')} />
                    </div>

                    {/* Vendor price targets */}
                    {vendorsData && vendorsData.length > 0 && sim && goldPerKill > 0 && (
                        <VendorTargets
                            vendors={vendorsData}
                            goldPerKill={goldPerKill}
                            timeToKillSec={sim.timeToKillSec}
                            t={t}
                        />
                    )}
                </CardContent>
            </Card>

            {/* Loot drop table with farm times */}
            <Card>
                <CardContent className="pt-5 pb-5 space-y-3">
                    <CollapsibleSection
                        title={
                            <div className="flex items-center gap-2">
                                <Gem className="h-4 w-4 text-muted-foreground" />
                                <h3 className="text-sm font-semibold">{t('lootFarmTimes')}</h3>
                            </div>
                        }
                        defaultOpen={false}
                    >
                        {/* Loot hints */}
                        {lootCalcs.length > 0 && (
                            <LootFarmHints lootCalcs={lootCalcs} t={t} />
                        )}

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-left text-muted-foreground border-b">
                                        <th className="pb-2 pr-3 font-medium">{t('colItem')}</th>
                                        <th className="pb-2 pr-3 font-medium text-right">{t('colDropPct')}</th>
                                        <th className="pb-2 pr-3 font-medium text-right">{t('colQty')}</th>
                                        <th className="pb-2 pr-3 font-medium text-right">{t('colExpKills')}</th>
                                        <th className="pb-2 pr-3 font-medium text-right">{t('colExpTime')}</th>
                                        <th className="pb-2 pr-3 font-medium text-right">{t('colPityMax')}</th>
                                        <th className="pb-2 pr-3 font-medium text-right">{t('colSellPrice')}</th>
                                        <th className="pb-2 font-medium">{t('colTier')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {lootCalcs.map((lc) => (
                                        <tr key={lc.itemId}>
                                            <td className="py-1.5 pr-3 font-medium">{lc.itemName}</td>
                                            <td className="py-1.5 pr-3 text-right tabular-nums font-mono">
                                                {(Number(lc.dropChance) * 100).toFixed(2)}%
                                            </td>
                                            <td className="py-1.5 pr-3 text-right tabular-nums font-mono">
                                                {lc.minQuantity === lc.maxQuantity ? lc.minQuantity : `${lc.minQuantity}-${lc.maxQuantity}`}
                                            </td>
                                            <td className="py-1.5 pr-3 text-right tabular-nums font-mono">
                                                {lc.farm.expectedKills.toLocaleString()}
                                            </td>
                                            <td className="py-1.5 pr-3 text-right tabular-nums font-mono">
                                                {formatTimeLong(lc.farm.expectedTimeSec)}
                                            </td>
                                            <td className="py-1.5 pr-3 text-right tabular-nums font-mono text-muted-foreground">
                                                {lc.farm.pityGuaranteedKills.toLocaleString()} kills
                                            </td>
                                            <td className="py-1.5 pr-3 text-right tabular-nums font-mono text-amber-600 dark:text-amber-400">
                                                {Number(lc.vendorPriceSell ?? 0) > 0 ? `${lc.vendorPriceSell}g` : '—'}
                                            </td>
                                            <td className="py-1.5">
                                                <Badge variant="outline" className="text-[9px]">{lc.lootTier}</Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CollapsibleSection>
                </CardContent>
            </Card>
        </section>
    );
}

function VendorTargets({ vendors, goldPerKill, timeToKillSec, t }: {
    vendors: Array<{ npcName: string; inventory: Array<{ itemId: number; itemName: string; price: number }> }>;
    goldPerKill: number;
    timeToKillSec: number;
    t: (key: string) => string;
}) {
    // Pick up to 5 most expensive vendor items to show as farming targets
    const allVendorItems = vendors
        .flatMap((v) => v.inventory.map((i) => ({ ...i, vendorName: v.npcName })))
        .filter((i) => i.price > 0)
        .sort((a, b) => a.price - b.price);

    const targets = allVendorItems.slice(0, 8);
    if (targets.length === 0) return null;

    return (
        <div className="mt-3 space-y-1.5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{t('farmTimeToBuy')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {targets.map((t) => {
                    const farm = calcGoldFarmTime(t.price, goldPerKill, timeToKillSec, DEFAULT_DOWNTIME_SEC);
                    return (
                        <div key={`${t.vendorName}-${t.itemId}`} className="flex items-center justify-between px-2 py-1 rounded bg-muted/40 text-xs">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <ShoppingBag className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="truncate" title={`${t.itemName} @ ${t.vendorName}`}>{t.itemName}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="tabular-nums text-amber-600 dark:text-amber-400">{t.price}g</span>
                                <span className="tabular-nums text-muted-foreground">{formatTimeLong(farm.timeSec)}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function GoldMetric({ label, value, subValue }: { label: string; value: string; subValue?: string }) {
    return (
        <div className="flex flex-col gap-1 p-3 rounded-lg bg-muted/40">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
            <span className="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">{value}</span>
            {subValue && <span className="text-[10px] text-muted-foreground">{subValue}</span>}
        </div>
    );
}

function SectionHeader({ t }: { t: ReturnType<typeof useTranslations<'balance'>> }) {
    return (
        <div className="flex items-start gap-3 pb-1">
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-muted text-muted-foreground mt-0.5 shrink-0">
                <Coins className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold">{t('lootEconomy_title')}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {t('lootEconomy_subtitle')}
                </p>
            </div>
            <Separator className="self-center flex-1 max-w-[60%]" />
        </div>
    );
}

const LOOT_VERDICT_STYLE: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    great: { icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
    ok: { icon: Info, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
    warn: { icon: AlertTriangle, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10' },
    danger: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
};

function LootFarmHints({
    lootCalcs,
    t,
}: {
    lootCalcs: Array<{ itemName: string; farm: { expectedTimeSec: number; expectedKills: number; pityGuaranteedKills: number }; dropChance: unknown }>;
    t: ReturnType<typeof useTranslations<'balance'>>;
}) {
    const tf = t as unknown as (key: string, params?: Record<string, string | number>) => string;

    const hints: Array<{ key: string; verdict: 'great' | 'ok' | 'warn' | 'danger'; labelKey: string; detailKey: string; params?: Record<string, string | number> }> = [];

    // Best drop item (least expected time)
    const sorted = [...lootCalcs].sort((a, b) => a.farm.expectedTimeSec - b.farm.expectedTimeSec);
    const best = sorted[0];
    if (best) {
        const hours = best.farm.expectedTimeSec / 3600;
        if (hours < 0.17) { // < 10 min
            hints.push({ key: 'loot_best_fast', verdict: 'great', labelKey: 'loot_best_fast_label', detailKey: 'loot_best_fast_detail', params: { item: best.itemName, time: formatTimeLong(best.farm.expectedTimeSec) } });
        } else if (hours < 1) {
            hints.push({ key: 'loot_best_ok', verdict: 'ok', labelKey: 'loot_best_ok_label', detailKey: 'loot_best_ok_detail', params: { item: best.itemName, time: formatTimeLong(best.farm.expectedTimeSec) } });
        } else if (hours < 4) {
            hints.push({ key: 'loot_best_long', verdict: 'warn', labelKey: 'loot_best_long_label', detailKey: 'loot_best_long_detail', params: { item: best.itemName, time: formatTimeLong(best.farm.expectedTimeSec) } });
        } else {
            hints.push({ key: 'loot_best_grind', verdict: 'danger', labelKey: 'loot_best_grind_label', detailKey: 'loot_best_grind_detail', params: { item: best.itemName, time: formatTimeLong(best.farm.expectedTimeSec) } });
        }
    }

    // Worst drop (if very different from best)
    const worst = sorted[sorted.length - 1];
    if (worst && worst !== best && worst.farm.expectedTimeSec / 3600 > 8) {
        hints.push({ key: 'loot_worst_rare', verdict: 'warn', labelKey: 'loot_worst_rare_label', detailKey: 'loot_worst_rare_detail', params: { item: worst.itemName, time: formatTimeLong(worst.farm.expectedTimeSec) } });
    }

    // Any item with drop chance < 0.5% 
    const veryRare = lootCalcs.filter(lc => Number(lc.dropChance) < 0.005);
    if (veryRare.length > 0) {
        hints.push({ key: 'loot_very_rare', verdict: 'warn', labelKey: 'loot_very_rare_label', detailKey: 'loot_very_rare_detail', params: { count: veryRare.length } });
    }

    // High pity kills
    const highPity = lootCalcs.filter(lc => lc.farm.pityGuaranteedKills > 5000);
    if (highPity.length > 0) {
        hints.push({ key: 'loot_high_pity', verdict: 'warn', labelKey: 'loot_high_pity_label', detailKey: 'loot_high_pity_detail', params: { item: highPity[0].itemName, kills: highPity[0].farm.pityGuaranteedKills.toLocaleString() } });
    }

    if (hints.length === 0) return null;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            {hints.map((h) => {
                const style = LOOT_VERDICT_STYLE[h.verdict];
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
