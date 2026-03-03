'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
    Plus, Search, Trash2, Edit, Eye, Package,
    AlertCircle, ChevronLeft, ChevronRight, SlidersHorizontal, X,
    Sword, Crown, ScrollText, ShoppingBag
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { trpc } from '@/lib/trpc';
import { getRarityStyle } from '@/lib/utils';

function TableSkeleton() {
    return (
        <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4">
                    <div className="h-4 bg-muted rounded animate-pulse w-48" />
                    <div className="h-5 bg-muted rounded animate-pulse w-20" />
                    <div className="h-4 bg-muted rounded animate-pulse w-28" />
                    <div className="h-4 bg-muted rounded animate-pulse w-8" />
                    <div className="h-5 bg-muted rounded animate-pulse w-32 ml-auto" />
                    <div className="h-8 bg-muted rounded animate-pulse w-24" />
                </div>
            ))}
        </div>
    );
}

export function ItemsList() {
    const t = useTranslations('items');
    const locale = useLocale();
    const router = useRouter();

    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [itemType, setItemType] = useState<number | undefined>();
    const [rarityId, setRarityId] = useState<number | undefined>();
    const [isQuestItem, setIsQuestItem] = useState<boolean | undefined>();
    const [isEquippable, setIsEquippable] = useState<boolean | undefined>();
    const [showFilters, setShowFilters] = useState(false);
    const [deleteConfirmItem, setDeleteConfirmItem] = useState<any>(null);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchTerm(searchInput);
            setPage(1);
        }, 350);
        return () => clearTimeout(timer);
    }, [searchInput]);

    // Queries
    const { data: itemsData, isLoading, error, refetch } = trpc.items.list.useQuery({
        page,
        limit: 20,
        search: searchTerm || undefined,
        itemType,
        rarityId,
        isQuestItem,
        isEquippable,
        sortBy: 'name',
        sortOrder: 'asc',
    });

    const { data: itemTypes } = trpc.items.types.list.useQuery();
    const { data: rarities } = trpc.items.rarities.list.useQuery();

    // Mutations
    const deleteItemMutation = trpc.items.delete.useMutation({
        onSuccess: () => {
            refetch();
            setDeleteConfirmItem(null);
        },
    });

    const handleDelete = async () => {
        if (!deleteConfirmItem?.id) return;
        await deleteItemMutation.mutateAsync({ id: deleteConfirmItem.id });
    };

    const resetFilters = () => {
        setSearchInput('');
        setSearchTerm('');
        setItemType(undefined);
        setRarityId(undefined);
        setIsQuestItem(undefined);
        setIsEquippable(undefined);
        setPage(1);
    };

    const hasActiveFilters = !!itemType || !!rarityId || !!isQuestItem || !!isEquippable;

    const items = itemsData?.items || [];
    const totalCount = itemsData?.pagination?.total ?? null;

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
                <AlertCircle className="h-10 w-10 text-destructive/70" />
                <p className="text-destructive font-medium">{error.message}</p>
            </div>
        );
    }

    return (
        <TooltipProvider delayDuration={300}>
            <div className="space-y-6">
                {/* Page Header */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                            <Package className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
                                {totalCount !== null && (
                                    <Badge variant="secondary" className="text-xs font-normal">
                                        {totalCount}
                                    </Badge>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">{t('pageDescription')}</p>
                        </div>
                    </div>
                    <Link href={`/${locale}/items/create`}>
                        <Button size="sm" className="gap-1.5">
                            <Plus className="h-4 w-4" />
                            {t('addItem')}
                        </Button>
                    </Link>
                </div>

                {/* Search + Filter bar */}
                <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                            placeholder={t('searchPlaceholder')}
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="pl-9 pr-8"
                        />
                        {searchInput && (
                            <button
                                onClick={() => setSearchInput('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                    <Button
                        variant={showFilters || hasActiveFilters ? 'secondary' : 'outline'}
                        size="sm"
                        className="gap-1.5 shrink-0"
                        onClick={() => setShowFilters(v => !v)}
                    >
                        <SlidersHorizontal className="h-4 w-4" />
                        {t('filters')}
                        {hasActiveFilters && (
                            <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-medium">
                                {[itemType, rarityId, isQuestItem, isEquippable].filter(Boolean).length}
                            </span>
                        )}
                    </Button>
                    {hasActiveFilters && (
                        <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={resetFilters}>
                            <X className="h-3.5 w-3.5" />
                            {t('resetFilters')}
                        </Button>
                    )}
                </div>

                {/* Expanded filters */}
                {showFilters && (
                    <div className="rounded-lg border bg-muted/30 p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-1.5">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('itemType')}</p>
                                <Select
                                    value={itemType?.toString() || 'all'}
                                    onValueChange={(v) => { setItemType(v === 'all' ? undefined : parseInt(v)); setPage(1); }}
                                >
                                    <SelectTrigger className="h-8 bg-background">
                                        <SelectValue placeholder={t('allItemTypes')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('allItemTypes')}</SelectItem>
                                        {itemTypes?.map((type) => (
                                            <SelectItem key={type.id} value={type.id.toString()}>
                                                {type.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('rarity')}</p>
                                <Select
                                    value={rarityId?.toString() || 'all'}
                                    onValueChange={(v) => { setRarityId(v === 'all' ? undefined : parseInt(v)); setPage(1); }}
                                >
                                    <SelectTrigger className="h-8 bg-background">
                                        <SelectValue placeholder={t('allRarities')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('allRarities')}</SelectItem>
                                        {rarities?.map((rarity) => (
                                            <SelectItem key={rarity.id} value={rarity.id.toString()}>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: rarity.colorHex || '#6b7280' }} />
                                                    {rarity.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('properties')}</p>
                                <div className="flex flex-wrap gap-2 pt-0.5">
                                    <button
                                        onClick={() => { setIsQuestItem(isQuestItem ? undefined : true); setPage(1); }}
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${isQuestItem
                                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                                            : 'bg-background text-muted-foreground border-border hover:border-foreground/30'
                                            }`}
                                    >
                                        <ScrollText className="h-3 w-3" />
                                        {t('quest')}
                                    </button>
                                    <button
                                        onClick={() => { setIsEquippable(isEquippable ? undefined : true); setPage(1); }}
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${isEquippable
                                            ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30'
                                            : 'bg-background text-muted-foreground border-border hover:border-foreground/30'
                                            }`}
                                    >
                                        <Sword className="h-3 w-3" />
                                        {t('equippable')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="rounded-lg border bg-card">
                    {isLoading ? (
                        <div className="p-6">
                            <TableSkeleton />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="pl-4">{t('name')}</TableHead>
                                    <TableHead>{t('type')}</TableHead>
                                    <TableHead>{t('rarity')}</TableHead>
                                    <TableHead className="w-16 text-center">{t('level')}</TableHead>
                                    <TableHead>{t('properties')}</TableHead>
                                    <TableHead className="text-right pr-4">{t('actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-16">
                                            <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                                <ShoppingBag className="h-10 w-10 opacity-30" />
                                                <p className="text-sm font-medium">
                                                    {searchTerm || hasActiveFilters ? t('searchPlaceholder') : t('pageDescription')}
                                                </p>
                                                {!searchTerm && !hasActiveFilters && (
                                                    <Link href={`/${locale}/items/create`}>
                                                        <Button variant="outline" size="sm" className="mt-1 gap-1.5">
                                                            <Plus className="h-3.5 w-3.5" />
                                                            {t('addItem')}
                                                        </Button>
                                                    </Link>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    items.map((item) => (
                                        <TableRow
                                            key={item.id}
                                            className="group cursor-pointer"
                                            onClick={() => router.push(`/${locale}/items/${item.id}`)}
                                        >
                                            <TableCell className="pl-4">
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{item.name}</span>
                                                    <span className="text-xs text-muted-foreground font-mono">
                                                        {item.slug} · #{item.id}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-xs font-normal">
                                                    {item.typeName}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {(() => {
                                                    const rs = getRarityStyle(item.rarityColorHex); return (
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                                                style={{ backgroundColor: rs.color, boxShadow: rs.dotShadow }}
                                                            />
                                                            <span
                                                                className="text-sm font-medium"
                                                                style={{ color: rs.textColor }}
                                                            >
                                                                {item.rarityName}
                                                            </span>
                                                        </div>
                                                    );
                                                })()}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="text-sm tabular-nums">{item.levelRequirement}</span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 flex-wrap">
                                                    {item.isQuestItem && (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400">
                                                            <ScrollText className="h-2.5 w-2.5" />
                                                            {t('quest')}
                                                        </span>
                                                    )}
                                                    {item.isEquippable && (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-700 dark:text-blue-400">
                                                            <Sword className="h-2.5 w-2.5" />
                                                            {t('equippable')}
                                                        </span>
                                                    )}
                                                    {item.isTradable && (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                                                            <ShoppingBag className="h-2.5 w-2.5" />
                                                            {t('tradable')}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="pr-4" onClick={e => e.stopPropagation()}>
                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Link href={`/${locale}/items/${item.id}`}>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                    <Eye className="h-4 w-4" />
                                                                </Button>
                                                            </Link>
                                                        </TooltipTrigger>
                                                        <TooltipContent>{t('view')}</TooltipContent>
                                                    </Tooltip>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Link href={`/${locale}/items/${item.id}/edit`}>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                            </Link>
                                                        </TooltipTrigger>
                                                        <TooltipContent>{t('edit')}</TooltipContent>
                                                    </Tooltip>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                onClick={() => setDeleteConfirmItem(item)}
                                                                disabled={deleteItemMutation.isLoading}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>{t('delete')}</TooltipContent>
                                                    </Tooltip>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}

                    {/* Pagination */}
                    {!isLoading && items.length > 0 && itemsData?.pagination && (
                        <div className="flex items-center justify-between px-4 py-3 border-t">
                            <p className="text-sm text-muted-foreground">
                                {t('showing')}{' '}
                                {((itemsData.pagination.page - 1) * itemsData.pagination.limit) + 1}–
                                {Math.min(itemsData.pagination.page * itemsData.pagination.limit, itemsData.pagination.total)}{' '}
                                {t('of')} {itemsData.pagination.total}
                            </p>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-sm font-medium px-2">{page}</span>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={page >= (itemsData.pagination.totalPages ?? 1)}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Delete confirmation dialog */}
            <Dialog open={!!deleteConfirmItem} onOpenChange={(open) => !open && setDeleteConfirmItem(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10 text-destructive shrink-0">
                                <Trash2 className="h-5 w-5" />
                            </div>
                            <DialogTitle className="text-lg">{t('deleteConfirmTitle')}</DialogTitle>
                        </div>
                        <DialogDescription className="pt-1">
                            {t('deleteConfirmDescription', { name: deleteConfirmItem?.name || '' })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setDeleteConfirmItem(null)}
                            disabled={deleteItemMutation.isLoading}
                        >
                            {t('cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleteItemMutation.isLoading}
                        >
                            {deleteItemMutation.isLoading ? t('deleting') : t('delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    );
}

