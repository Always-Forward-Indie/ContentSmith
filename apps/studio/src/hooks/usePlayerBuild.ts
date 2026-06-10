import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';

export interface PlayerBuild {
    titleId: number | null;
    equippedItems: Record<string, number | null>; // slotSlug → itemId
}

/**
 * Manages player build state (title + equipment) and computes bonus attributes.
 * Used by balance panels to test player performance with specific loadout.
 */
export function usePlayerBuild(testLevel: number) {
    const [titleId, setTitleId] = useState<number | null>(null);
    const [equippedItems, setEquippedItems] = useState<Record<string, number | null>>({});

    const { data: titlesData } = trpc.balance.getTitles.useQuery();
    const { data: equipData } = trpc.balance.getEquippableItems.useQuery();
    const { data: setsData } = trpc.balance.getItemSets.useQuery();

    const titles = useMemo(() => titlesData ?? [], [titlesData]);
    const slots = useMemo(() => equipData?.slots ?? [], [equipData]);
    const allItems = useMemo(() => equipData?.items ?? [], [equipData]);
    const sets = useMemo(() => setsData ?? [], [setsData]);

    // Items filtered to testLevel
    const availableItems = useMemo(
        () => allItems.filter((i) => i.levelRequirement <= testLevel),
        [allItems, testLevel],
    );

    const buildBonuses = useMemo(() => {
        const bonuses: Array<{ attributeSlug: string; value: number }> = [];

        // Title bonuses
        if (titleId) {
            const title = titles.find((t) => t.id === titleId);
            if (title) bonuses.push(...title.bonuses);
        }

        // Equipment bonuses
        for (const [_slot, itemId] of Object.entries(equippedItems)) {
            if (!itemId) continue;
            const item = availableItems.find((i) => i.id === itemId);
            if (item) bonuses.push(...item.attributes);
        }

        // Set bonuses
        const equippedItemIds = new Set(
            Object.values(equippedItems).filter((id): id is number => id != null),
        );
        for (const set of sets) {
            const count = set.memberItemIds.filter((id) => equippedItemIds.has(id)).length;
            for (const bonus of set.bonuses) {
                if (count >= bonus.piecesRequired) {
                    bonuses.push({ attributeSlug: bonus.attributeSlug, value: bonus.bonusValue });
                }
            }
        }

        return bonuses;
    }, [titleId, equippedItems, titles, availableItems, sets]);

    // Aggregate stat totals for display
    const statSummary = useMemo(() => {
        const totals: Record<string, number> = {};
        for (const b of buildBonuses) {
            totals[b.attributeSlug] = (totals[b.attributeSlug] ?? 0) + b.value;
        }
        return totals;
    }, [buildBonuses]);

    const isEmpty = titleId == null && Object.values(equippedItems).every((v) => !v);

    const setEquippedItem = (slotSlug: string, itemId: number | null) => {
        setEquippedItems((prev) => ({ ...prev, [slotSlug]: itemId }));
    };

    const clearBuild = () => {
        setTitleId(null);
        setEquippedItems({});
    };

    return {
        titleId,
        setTitleId,
        equippedItems,
        setEquippedItem,
        clearBuild,
        buildBonuses,
        statSummary,
        isEmpty,
        titles,
        slots,
        availableItems,
        sets,
    };
}
