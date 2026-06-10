'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, X, Shield, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { useTranslations } from 'next-intl';
import type { usePlayerBuild } from '@/hooks/usePlayerBuild';

type PlayerBuildState = ReturnType<typeof usePlayerBuild>;

interface PlayerBuildSectionProps {
    build: PlayerBuildState;
    testLevel: number;
}

// PlayerBuildSection i18n
export function PlayerBuildSection({ build, testLevel }: PlayerBuildSectionProps) {
    const t = useTranslations('balance');
    const [expanded, setExpanded] = useState(false);

    const { titleId, setTitleId, equippedItems, setEquippedItem, clearBuild, statSummary, isEmpty, titles, slots, availableItems } = build;

    const titleOptions: ComboboxOption[] = titles.map((t) => ({
        value: String(t.id),
        label: t.displayName,
        sublabel: t.bonuses.map((b) => `+${b.value} ${b.attributeSlug}`).join(', '),
    }));

    // Items grouped by slot
    const itemsBySlot: Record<string, ComboboxOption[]> = {};
    for (const slot of slots) {
        itemsBySlot[slot.slug] = availableItems
            .filter((i) => i.slotSlug === slot.slug)
            .map((i) => ({
                value: String(i.id),
                label: i.name,
                sublabel: `Lv${i.levelRequirement} · ${i.attributes.map((a) => `+${a.value} ${a.attributeSlug}`).join(', ')}`,
            }));
    }

    const equippedCount = Object.values(equippedItems).filter(Boolean).length;
    const hasBuild = !isEmpty;

    return (
        <div className="rounded-lg border bg-card overflow-hidden">
            {/* Header */}
            <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-muted/40 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium text-sm">{t('playerBuild')}</span>
                    {hasBuild ? (
                        <div className="flex items-center gap-1.5">
                            {titleId && (
                                <Badge variant="secondary" className="text-[10px] py-0">
                                    <Star className="h-2.5 w-2.5 mr-0.5" />
                                    {titles.find((t) => t.id === titleId)?.displayName}
                                </Badge>
                            )}
                            {equippedCount > 0 && (
                                <Badge variant="secondary" className="text-[10px] py-0">
                                    {equippedCount} item{equippedCount !== 1 ? 's' : ''}
                                </Badge>
                            )}
                        </div>
                    ) : (
                        <span className="text-xs text-muted-foreground">{t('noBuildBaseStats')}</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {hasBuild && (
                        <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => { e.stopPropagation(); clearBuild(); }}
                            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors px-1"
                        >
                            Clear
                        </span>
                    )}
                    {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>
            </button>

            {expanded && (
                <div className="px-4 pb-4 space-y-4 border-t">
                    {/* Title */}
                    {titles.length > 0 && (
                        <div className="pt-3 flex items-center gap-2">
                            <Star className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-xs font-medium text-muted-foreground w-12 shrink-0">Title</span>
                            <Combobox
                                options={titleOptions}
                                value={titleId != null ? String(titleId) : null}
                                onChange={(v) => setTitleId(v ? Number(v) : null)}
                                placeholder={t('emptySlot')}
                                searchPlaceholder={t('searchTitles')}
                                triggerClassName="h-7 text-xs"
                                className="w-72"
                            />
                        </div>
                    )}

                    {/* Equipment slots */}
                    {slots.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{t('equipmentLabel')}</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                {slots.map((slot) => {
                                    const opts = itemsBySlot[slot.slug] ?? [];
                                    const currentId = equippedItems[slot.slug];
                                    if (opts.length === 0) return null;
                                    return (
                                        <div key={slot.slug} className="flex items-center gap-1.5">
                                            <span className="text-[10px] text-muted-foreground w-16 shrink-0 truncate" title={slot.name}>
                                                {slot.name}
                                            </span>
                                            <div className="flex items-center gap-0.5 min-w-0 flex-1">
                                                <Combobox
                                                    options={opts}
                                                    value={currentId != null ? String(currentId) : null}
                                                    onChange={(v) => setEquippedItem(slot.slug, v ? Number(v) : null)}
                                                    placeholder={t('emptySlot')}
                                                    searchPlaceholder={t('searchItems')}
                                                    triggerClassName="h-7 text-xs flex-1 min-w-0 w-full"
                                                    className="w-64"
                                                />
                                                {currentId && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setEquippedItem(slot.slug, null)}
                                                        className="text-muted-foreground hover:text-destructive shrink-0 ml-0.5"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Stat summary */}
                    {Object.keys(statSummary).length > 0 && (
                        <div className="space-y-1">
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{t('totalBonuses')}</p>
                            <div className="flex flex-wrap gap-1">
                                {Object.entries(statSummary)
                                    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                                    .map(([slug, val]) => (
                                        <Badge
                                            key={slug}
                                            variant="outline"
                                            className={`text-[10px] tabular-nums ${val > 0 ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30' : 'text-destructive border-destructive/30'}`}
                                        >
                                            {slug}: {val > 0 ? '+' : ''}{val.toFixed(1)}
                                        </Badge>
                                    ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
