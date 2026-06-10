'use client';

import { useMemo, useState, useCallback } from 'react';
import {
    Shield, Swords, Clock, Flame, Heart, Activity,
    Star, Calculator, TrendingUp, X, Plus,
    AlertTriangle, CheckCircle, Info, XCircle,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Combobox } from '@/components/ui/combobox';
import { trpc } from '@/lib/trpc';
import { useBalanceData, type ClassTestProfile } from '@/hooks/useBalanceData';
import {
    simulateCombat,
    applyEquipment,
    analyzeBalance,
    type CombatantProfile,
    type CombatSimResult,
    type BalanceFlag,
    type SkillCalcData,
} from '@/lib/balance-calc';

const TEST_LEVELS = [1, 5, 10, 20, 30, 50];

// ── Types ────────────────────────────────────────────────────────────────────

interface EquipItem {
    id: number;
    name: string;
    slotSlug: string;
    slotId: number;
    levelRequirement: number;
    attributes: Array<{ attributeSlug: string; value: number }>;
}

interface SlotDef {
    id: number;
    slug: string;
    name: string;
}

interface TitleDef {
    id: number;
    slug: string;
    displayName: string;
    bonuses: Array<{ attributeSlug: string; value: number }>;
}

interface SetDef {
    id: number;
    name: string;
    slug: string;
    memberItemIds: number[];
    bonuses: Array<{ piecesRequired: number; attributeSlug: string; bonusValue: number }>;
}

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

function MetricCard({ icon: Icon, label, value, subValue, colorClass }: {
    icon: React.ElementType; label: string; value: string | number; subValue?: string; colorClass?: string;
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

// ── Main component ───────────────────────────────────────────────────────────

export function EquipmentLoadoutPanel() {
    const t = useTranslations('balance');
    const [testLevel, setTestLevel] = useState(10);
    const [selectedClassIdx, setSelectedClassIdx] = useState(0);
    const [selectedMobIdx, setSelectedMobIdx] = useState(0);
    const [selectedTitle, setSelectedTitle] = useState<number | null>(null);
    const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
    const [skillLevel, setSkillLevel] = useState(1);

    // Slot → equipped item id
    const [loadout, setLoadout] = useState<Record<string, number | null>>({});

    const { isLoading: balanceLoading, combatConfig, testProfiles: allProfiles, mobTargets } = useBalanceData(testLevel);

    const { data: equipData, isLoading: equipLoading } = trpc.balance.getEquippableItems.useQuery();
    const { data: titlesData } = trpc.balance.getTitles.useQuery();
    const { data: setsData } = trpc.balance.getItemSets.useQuery();
    const { data: allSkillsData } = trpc.balance.getAllSkillsCalcData.useQuery({ level: skillLevel });

    const isLoading = balanceLoading || equipLoading;

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

    const allItems: EquipItem[] = useMemo(() => equipData?.items ?? [], [equipData]);
    const slots: SlotDef[] = useMemo(() => equipData?.slots ?? [], [equipData]);
    const titles: TitleDef[] = useMemo(() => titlesData ?? [], [titlesData]);
    const sets: SetDef[] = useMemo(() => setsData ?? [], [setsData]);

    // Group items by slot
    const itemsBySlot = useMemo(() => {
        const map: Record<string, EquipItem[]> = {};
        for (const item of allItems) {
            if (item.levelRequirement > testLevel) continue;
            const arr = map[item.slotSlug] ?? [];
            arr.push(item);
            map[item.slotSlug] = arr;
        }
        return map;
    }, [allItems, testLevel]);

    // Build cumulative bonuses from loadout
    const equipmentBonuses = useMemo(() => {
        const bonuses: Array<{ attributeSlug: string; value: number }> = [];

        // Item bonuses
        for (const [_slot, itemId] of Object.entries(loadout)) {
            if (!itemId) continue;
            const item = allItems.find((i) => i.id === itemId);
            if (item) bonuses.push(...item.attributes);
        }

        // Title bonuses
        if (selectedTitle != null) {
            const title = titles.find((t) => t.id === selectedTitle);
            if (title) bonuses.push(...title.bonuses);
        }

        // Set bonuses
        const equippedItemIds = new Set(Object.values(loadout).filter((id): id is number => id != null));
        for (const set of sets) {
            const count = set.memberItemIds.filter((id) => equippedItemIds.has(id)).length;
            for (const bonus of set.bonuses) {
                if (count >= bonus.piecesRequired) {
                    bonuses.push({ attributeSlug: bonus.attributeSlug, value: bonus.bonusValue });
                }
            }
        }

        return bonuses;
    }, [loadout, allItems, titles, sets, selectedTitle]);

    // Active set bonuses info
    const activeSetBonuses = useMemo(() => {
        const equippedItemIds = new Set(Object.values(loadout).filter((id): id is number => id != null));
        const result: Array<{ setName: string; piecesEquipped: number; totalPieces: number; activeBonuses: Array<{ piecesRequired: number; attributeSlug: string; bonusValue: number }> }> = [];
        for (const set of sets) {
            const count = set.memberItemIds.filter((id) => equippedItemIds.has(id)).length;
            if (count > 0) {
                result.push({
                    setName: set.name,
                    piecesEquipped: count,
                    totalPieces: set.memberItemIds.length,
                    activeBonuses: set.bonuses.filter((b) => count >= b.piecesRequired),
                });
            }
        }
        return result;
    }, [loadout, sets]);

    const setSlotItem = useCallback((slotSlug: string, itemId: number | null) => {
        setLoadout((prev) => ({ ...prev, [slotSlug]: itemId }));
    }, []);

    if (isLoading) {
        return (
            <section className="space-y-4">
                <SectionHeader t={t} />
                <Card><CardContent className="pt-5 pb-5">
                    <div className="animate-pulse space-y-3">
                        <div className="h-5 w-48 bg-muted rounded" />
                        <div className="grid grid-cols-3 gap-2">{[1, 2, 3].map((j) => <div key={j} className="h-20 bg-muted rounded-lg" />)}</div>
                    </div>
                </CardContent></Card>
            </section>
        );
    }

    if (allProfiles.length === 0) return null;

    const selectedProfile = allProfiles[selectedClassIdx] ?? allProfiles[0];
    const selectedMob = mobTargets[selectedMobIdx] ?? mobTargets[0];
    if (!selectedProfile || !selectedMob) return null;

    // Build base and equipped profiles
    const baseProfile = selectedProfile.profile;
    const equippedProfile = equipmentBonuses.length > 0
        ? applyEquipment(baseProfile, equipmentBonuses)
        : baseProfile;

    const baseSim = simulateCombat(baseProfile, selectedMob, selectedSkillData, combatConfig);
    const equippedSim = simulateCombat(equippedProfile, selectedMob, selectedSkillData, combatConfig);

    const flags = analyzeBalance(equippedSim, {
        playerLevel: testLevel,
        mobLevel: selectedMob.level,
        mobRankCode: 'normal',
        mobHp: selectedMob.stats['max_health'] ?? 0,
    });

    // Aggregate stat deltas
    const statTotals: Record<string, number> = {};
    for (const b of equipmentBonuses) {
        statTotals[b.attributeSlug] = (statTotals[b.attributeSlug] ?? 0) + b.value;
    }

    const equippedCount = Object.values(loadout).filter((v) => v != null).length;

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
                {mobTargets.length > 0 && (
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

            {/* Equipment slots */}
            <Card>
                <CardContent className="pt-5 pb-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-muted-foreground" />
                            <h3 className="text-sm font-semibold">{t('equipmentSlots')}</h3>
                            {equippedCount > 0 && (
                                <Badge variant="secondary" className="text-[10px]">{t('equippedCount', { count: equippedCount })}</Badge>
                            )}
                        </div>
                        {equippedCount > 0 && (
                            <button
                                onClick={() => setLoadout({})}
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {t('clearAll')}
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {slots.map((slot) => {
                            const equipped = loadout[slot.slug] != null
                                ? allItems.find((i) => i.id === loadout[slot.slug])
                                : null;
                            const available = itemsBySlot[slot.slug] ?? [];

                            return (
                                <div key={slot.slug} className="flex flex-col gap-1 p-2 rounded-lg border bg-card">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{slot.name}</span>
                                        {equipped && (
                                            <button
                                                onClick={() => setSlotItem(slot.slug, null)}
                                                className="text-muted-foreground hover:text-destructive transition-colors"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        )}
                                    </div>
                                    {equipped ? (
                                        <p className="text-xs font-medium truncate" title={equipped.name}>{equipped.name}</p>
                                    ) : (
                                        <Combobox
                                            options={available.map((item) => ({
                                                value: String(item.id),
                                                label: item.name,
                                                sublabel: `Lv${item.levelRequirement}`,
                                            }))}
                                            value={null}
                                            onChange={(v) => { if (v) setSlotItem(slot.slug, Number(v)); }}
                                            placeholder="— empty —"
                                            searchPlaceholder={t('searchItems')}
                                            triggerClassName="h-7 text-xs w-full"
                                            className="w-56"
                                        />
                                    )}
                                    {equipped && equipped.attributes.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-0.5">
                                            {equipped.attributes.map((a) => (
                                                <span key={a.attributeSlug} className="text-[9px] text-emerald-600 dark:text-emerald-400">
                                                    +{a.value} {a.attributeSlug}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Title selector */}
                    {titles.length > 0 && (
                        <div className="flex items-center gap-2">
                            <Star className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground">{t('titleLabel')}</span>
                            <Combobox
                                options={[
                                    ...titles.map((t) => ({
                                        value: String(t.id),
                                        label: t.displayName,
                                        sublabel: t.bonuses.map((b) => `+${b.value} ${b.attributeSlug}`).join(', '),
                                    })),
                                ]}
                                value={selectedTitle != null ? String(selectedTitle) : null}
                                onChange={(v) => setSelectedTitle(v ? Number(v) : null)}
                                placeholder={t('emptySlot')}
                                searchPlaceholder={t('searchTitles')}
                                triggerClassName="h-8 text-xs"
                                className="w-72"
                            />
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Set bonuses */}
            {activeSetBonuses.length > 0 && (
                <Card>
                    <CardContent className="pt-4 pb-4 space-y-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('activeSetBonuses')}</h4>
                        {activeSetBonuses.map((set) => (
                            <div key={set.setName} className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px]">{set.setName} ({set.piecesEquipped}/{set.totalPieces})</Badge>
                                {set.activeBonuses.map((b) => (
                                    <span key={b.attributeSlug + b.piecesRequired} className="text-[10px] text-emerald-600 dark:text-emerald-400">
                                        +{b.bonusValue} {b.attributeSlug} ({b.piecesRequired}pc)
                                    </span>
                                ))}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Cumulative stat totals */}
            {Object.keys(statTotals).length > 0 && (
                <Card>
                    <CardContent className="pt-4 pb-4">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t('totalBonusesFromEquipment')}</h4>
                        <div className="flex flex-wrap gap-1.5">
                            {Object.entries(statTotals)
                                .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                                .map(([slug, val]) => (
                                    <Badge key={slug} variant="outline"
                                        className={`text-[10px] tabular-nums ${val > 0 ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30' : 'text-destructive border-destructive/30'}`}
                                    >
                                        {slug}: {val > 0 ? '+' : ''}{val.toFixed(1)}
                                    </Badge>
                                ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Combat results: base vs equipped */}
            <Card>
                <CardContent className="pt-5 pb-5 space-y-4">
                    <div className="flex items-center gap-2">
                        <Calculator className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold">Combat Simulation</h3>
                        <span className="text-xs text-muted-foreground">
                            {selectedProfile.className} Lv{testLevel} vs {selectedMob.name} Lv{selectedMob.level}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <SimColumn label={t('baseNoEquipment')} sim={baseSim} />
                        <SimColumn label={t('withEquipment')} sim={equippedSim} highlight />
                    </div>

                    {/* Balance flags */}
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
        </section>
    );
}

function SimColumn({ label, sim, highlight }: { label: string; sim: CombatSimResult; highlight?: boolean }) {
    const t = useTranslations('balance');
    return (
        <div className={`space-y-2 p-3 rounded-lg ${highlight ? 'bg-primary/5 border border-primary/20' : 'bg-muted/30'}`}>
            <p className="text-xs font-semibold text-muted-foreground">{label}</p>
            <div className="grid grid-cols-2 gap-2">
                <MiniMetric label={t('metricDPS')} value={sim.dps.toFixed(1)} />
                <MiniMetric label={t('metricTTKShort')} value={formatTime(sim.timeToKillSec)} />
                <MiniMetric label={t('metricDmgHitShort')} value={sim.damagePerHit.toFixed(1)} />
                <MiniMetric label={t('metricHits')} value={String(sim.hitsToKill)} />
                <MiniMetric label={t('metricDmgTakenShort')} value={sim.damageTakenDuringFight.toFixed(0)} />
                <MiniMetric label={t('metricHPLeft')} value={sim.hpRemaining.toFixed(0)} />
                <MiniMetric label={t('metricHitPct')} value={`${(sim.hitChance * 100).toFixed(0)}%`} />
                <MiniMetric label={t('metricSustain')} value={sim.canSustain ? t('sustainYes') : t('sustainNo')}
                    color={sim.canSustain ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'} />
            </div>
        </div>
    );
}

function MiniMetric({ label, value, color }: { label: string; value: string; color?: string }) {
    return (
        <div>
            <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
            <p className={`text-xs font-bold tabular-nums ${color ?? ''}`}>{value}</p>
        </div>
    );
}

function SectionHeader({ t }: { t: ReturnType<typeof useTranslations<'balance'>> }) {
    return (
        <div className="flex items-start gap-3 pb-1">
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-muted text-muted-foreground mt-0.5 shrink-0">
                <Shield className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold">{t('equipmentLoadout_title')}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {t('equipmentLoadout_subtitle')}
                </p>
            </div>
            <Separator className="self-center flex-1 max-w-[60%]" />
        </div>
    );
}
