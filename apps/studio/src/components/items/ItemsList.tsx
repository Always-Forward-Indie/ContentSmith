'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Plus, Search, Filter, Trash2, Edit3, Eye } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';

interface ItemsListProps {
    onItemSelect?: (itemId: number) => void;
}

export function ItemsList({ onItemSelect }: ItemsListProps) {
    const t = useTranslations('items');
    const { toast } = useToast();
    const router = useRouter();

    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [itemType, setItemType] = useState<number | undefined>();
    const [rarityId, setRarityId] = useState<number | undefined>();
    const [isQuestItem, setIsQuestItem] = useState<boolean | undefined>();
    const [isEquippable, setIsEquippable] = useState<boolean | undefined>();
    const [sortBy, setSortBy] = useState<'name' | 'weight' | 'vendorPriceBuy' | 'vendorPriceSell' | 'levelRequirement'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [deleteConfirmItem, setDeleteConfirmItem] = useState<any>(null);

    // Queries
    const { data: itemsData, isLoading, refetch } = trpc.items.list.useQuery({
        page,
        limit: 20,
        search: search || undefined,
        itemType,
        rarityId,
        isQuestItem,
        isEquippable,
        sortBy,
        sortOrder,
    });

    const { data: itemTypes } = trpc.items.types.list.useQuery();
    const { data: rarities } = trpc.items.rarities.list.useQuery();

    // Mutations
    const deleteItemMutation = trpc.items.delete.useMutation({
        onSuccess: () => {
            toast({
                title: t('deleteSuccess'),
                description: t('deleteSuccessDescription'),
            });
            refetch();
            setDeleteConfirmItem(null);
        },
        onError: (error) => {
            toast({
                title: t('deleteError'),
                description: error.message,
                variant: 'error',
            });
        },
    });

    const handleDelete = (item: any) => {
        deleteItemMutation.mutate({ id: item.id });
    };

    const resetFilters = () => {
        setSearch('');
        setItemType(undefined);
        setRarityId(undefined);
        setIsQuestItem(undefined);
        setIsEquippable(undefined);
        setSortBy('name');
        setSortOrder('asc');
        setPage(1);
    };

    const getRarityColor = (colorHex: string | null) => {
        return colorHex || '#6b7280';
    };

    return (
        <TooltipProvider>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                        <p className="text-muted-foreground">{t('pageDescription')}</p>
                    </div>
                    <Button onClick={() => router.push('/items/create')}>
                        <Plus className="mr-2 h-4 w-4" />
                        {t('addItem')}
                    </Button>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            {t('filters')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="search">{t('search')}</Label>
                                <div className="relative">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="search"
                                        placeholder={t('searchPlaceholder')}
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="pl-8"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>{t('itemType')}</Label>
                                <Select value={itemType?.toString() || "all"} onValueChange={(value) => setItemType(value === "all" ? undefined : parseInt(value))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('selectItemType')} />
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

                            <div className="space-y-2">
                                <Label>{t('rarity')}</Label>
                                <Select value={rarityId?.toString() || "all"} onValueChange={(value) => setRarityId(value === "all" ? undefined : parseInt(value))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('selectRarity')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('allRarities')}</SelectItem>
                                        {rarities?.map((rarity) => (
                                            <SelectItem key={rarity.id} value={rarity.id.toString()}>
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-3 h-3 rounded-full"
                                                        style={{ backgroundColor: getRarityColor(rarity.colorHex) }}
                                                    />
                                                    {rarity.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>{t('sortBy')}</Label>
                                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="name">{t('sortByName')}</SelectItem>
                                        <SelectItem value="weight">{t('sortByWeight')}</SelectItem>
                                        <SelectItem value="vendorPriceBuy">{t('sortByBuyPrice')}</SelectItem>
                                        <SelectItem value="vendorPriceSell">{t('sortBySellPrice')}</SelectItem>
                                        <SelectItem value="levelRequirement">{t('sortByLevel')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 mt-4">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="questItem"
                                    checked={isQuestItem === true}
                                    onChange={(e) => setIsQuestItem(e.target.checked ? true : undefined)}
                                    className="rounded"
                                />
                                <Label htmlFor="questItem">{t('questItemsOnly')}</Label>
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="equippable"
                                    checked={isEquippable === true}
                                    onChange={(e) => setIsEquippable(e.target.checked ? true : undefined)}
                                    className="rounded"
                                />
                                <Label htmlFor="equippable">{t('equippableOnly')}</Label>
                            </div>

                            <Button variant="outline" onClick={resetFilters}>
                                {t('resetFilters')}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Items Table */}
                <Card>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-48">
                                <div className="text-muted-foreground">{t('loading')}</div>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('name')}</TableHead>
                                        <TableHead>{t('type')}</TableHead>
                                        <TableHead>{t('rarity')}</TableHead>
                                        <TableHead>{t('weight')}</TableHead>
                                        <TableHead>{t('buyPrice')}</TableHead>
                                        <TableHead>{t('sellPrice')}</TableHead>
                                        <TableHead>{t('level')}</TableHead>
                                        <TableHead>{t('properties')}</TableHead>
                                        <TableHead className="text-right">{t('actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {itemsData?.items.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">{item.name}</div>
                                                    <div className="text-sm text-muted-foreground">{item.slug}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{item.typeName}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-3 h-3 rounded-full"
                                                        style={{ backgroundColor: getRarityColor(item.rarityColorHex) }}
                                                    />
                                                    {item.rarityName}
                                                </div>
                                            </TableCell>
                                            <TableCell>{item.weight}kg</TableCell>
                                            <TableCell>{item.vendorPriceBuy}g</TableCell>
                                            <TableCell>{item.vendorPriceSell}g</TableCell>
                                            <TableCell>{item.levelRequirement}</TableCell>
                                            <TableCell>
                                                <div className="flex gap-1">
                                                    {item.isQuestItem && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            {t('quest')}
                                                        </Badge>
                                                    )}
                                                    {item.isEquippable && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            {t('equippable')}
                                                        </Badge>
                                                    )}
                                                    {item.isTradable && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            {t('tradable')}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => router.push(`/items/${item.id}`)}
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>{t('view')}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => router.push(`/items/${item.id}/edit`)}
                                                            >
                                                                <Edit3 className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>{t('edit')}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => setDeleteConfirmItem(item)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>{t('delete')}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Pagination */}
                {itemsData && (
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                            {t('showing')} {((itemsData.pagination.page - 1) * itemsData.pagination.limit) + 1} - {Math.min(itemsData.pagination.page * itemsData.pagination.limit, itemsData.pagination.total)} {t('of')} {itemsData.pagination.total} {t('items')}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={itemsData.pagination.page <= 1}
                                onClick={() => setPage(page - 1)}
                            >
                                {t('previous')}
                            </Button>
                            <span className="text-sm">
                                {t('page')} {itemsData.pagination.page} {t('of')} {itemsData.pagination.totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={itemsData.pagination.page >= itemsData.pagination.totalPages}
                                onClick={() => setPage(page + 1)}
                            >
                                {t('next')}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Dialog */}
                <Dialog open={!!deleteConfirmItem} onOpenChange={(open) => !open && setDeleteConfirmItem(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('deleteConfirmTitle')}</DialogTitle>
                            <DialogDescription>
                                {t('deleteConfirmDescription', { name: deleteConfirmItem?.name })}
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteConfirmItem(null)}>
                                {t('cancel')}
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => deleteConfirmItem && handleDelete(deleteConfirmItem)}
                                disabled={deleteItemMutation.isLoading}
                            >
                                {deleteItemMutation.isLoading ? t('deleting') : t('delete')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    );
}