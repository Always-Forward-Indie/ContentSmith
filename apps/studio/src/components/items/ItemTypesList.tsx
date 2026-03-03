"use client";

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
    Plus, Search, Edit, Trash2, Layers, AlertCircle,
    ChevronLeft, ChevronRight, X,
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
import { ItemTypesForm } from './ItemTypesForm';

type SortBy = 'id' | 'name' | 'slug';
type SortOrder = 'asc' | 'desc';

interface ItemType {
    id: number;
    name: string;
    slug: string;
}

function TableSkeleton() {
    return (
        <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4">
                    <div className="h-4 bg-muted rounded animate-pulse w-8" />
                    <div className="h-4 bg-muted rounded animate-pulse flex-1" />
                    <div className="h-5 bg-muted rounded animate-pulse w-28" />
                    <div className="h-8 bg-muted rounded animate-pulse w-20 ml-auto" />
                </div>
            ))}
        </div>
    );
}

export function ItemTypesList() {
    const t = useTranslations('itemTypes');
    const locale = useLocale();
    const router = useRouter();

    const [searchInput, setSearchInput] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [sortBy, setSortBy] = useState<SortBy>('name');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [editingType, setEditingType] = useState<ItemType | null>(null);
    const [deletingType, setDeletingType] = useState<ItemType | null>(null);

    const limit = 50;

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchTerm(searchInput);
            setPage(1);
        }, 350);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const {
        data: itemTypesData,
        isLoading,
        error,
        refetch,
    } = trpc.itemTypes.list.useQuery({
        search: searchTerm || undefined,
        page,
        limit,
        sortBy,
        sortOrder,
    });

    const deleteMutation = trpc.itemTypes.delete.useMutation({
        onSuccess: () => {
            refetch();
            setDeletingType(null);
        },
    });

    const handleSort = (column: SortBy) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('asc');
        }
        setPage(1);
    };

    const confirmDelete = () => {
        if (deletingType) {
            deleteMutation.mutate({ id: deletingType.id });
        }
    };

    const types = itemTypesData?.data || [];
    const totalCount = itemTypesData?.pagination?.total ?? null;

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
                <AlertCircle className="h-10 w-10 text-destructive/70" />
                <p className="text-destructive font-medium">{error.message}</p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                    {t('retry')}
                </Button>
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
                            <Layers className="h-5 w-5" />
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
                            <p className="text-sm text-muted-foreground mt-0.5">{t('description')}</p>
                        </div>
                    </div>
                    <Button size="sm" className="gap-1.5" onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="h-4 w-4" />
                        {t('create')}
                    </Button>
                </div>

                {/* Search */}
                <div className="relative max-w-sm">
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
                                    <TableHead
                                        className="pl-4 w-16 cursor-pointer select-none hover:text-foreground"
                                        onClick={() => handleSort('id')}
                                    >
                                        <span className="flex items-center gap-1">
                                            ID
                                            {sortBy === 'id' && <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                                        </span>
                                    </TableHead>
                                    <TableHead
                                        className="cursor-pointer select-none hover:text-foreground"
                                        onClick={() => handleSort('name')}
                                    >
                                        <span className="flex items-center gap-1">
                                            {t('name')}
                                            {sortBy === 'name' && <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                                        </span>
                                    </TableHead>
                                    <TableHead
                                        className="cursor-pointer select-none hover:text-foreground"
                                        onClick={() => handleSort('slug')}
                                    >
                                        <span className="flex items-center gap-1">
                                            Slug
                                            {sortBy === 'slug' && <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                                        </span>
                                    </TableHead>
                                    <TableHead className="text-right pr-4">{t('actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {types.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="py-16">
                                            <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                                <Layers className="h-10 w-10 opacity-30" />
                                                <p className="text-sm font-medium">
                                                    {searchTerm ? t('noSearchResults') : t('noData')}
                                                </p>
                                                {!searchTerm && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="mt-1 gap-1.5"
                                                        onClick={() => setIsCreateDialogOpen(true)}
                                                    >
                                                        <Plus className="h-3.5 w-3.5" />
                                                        {t('create')}
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    types.map((itemType) => (
                                        <TableRow
                                            key={itemType.id}
                                            className="group cursor-pointer"
                                            onClick={() => router.push(`/${locale}/item-types/${itemType.id}`)}
                                        >
                                            <TableCell className="pl-4">
                                                <span className="font-mono text-sm text-muted-foreground">
                                                    #{itemType.id}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-medium text-sm">{itemType.name}</span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="font-mono text-xs font-normal">
                                                    {itemType.slug}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="pr-4" onClick={e => e.stopPropagation()}>
                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                onClick={() => setEditingType(itemType)}
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>{t('edit')}</TooltipContent>
                                                    </Tooltip>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                onClick={() => setDeletingType(itemType)}
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
                    {!isLoading && types.length > 0 && itemTypesData?.pagination && (
                        <div className="flex items-center justify-between px-4 py-3 border-t">
                            <p className="text-sm text-muted-foreground">
                                {t('showingResults', {
                                    from: (itemTypesData.pagination.page - 1) * itemTypesData.pagination.limit + 1,
                                    to: Math.min(itemTypesData.pagination.page * itemTypesData.pagination.limit, itemTypesData.pagination.total),
                                    total: itemTypesData.pagination.total,
                                })}
                            </p>
                            {itemTypesData.pagination.totalPages > 1 && (
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
                                        disabled={page >= itemTypesData.pagination.totalPages}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Create Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary shrink-0">
                                <Layers className="h-5 w-5" />
                            </div>
                            <DialogTitle className="text-lg">{t('createTitle')}</DialogTitle>
                        </div>
                        <DialogDescription className="pt-1">{t('createDescription')}</DialogDescription>
                    </DialogHeader>
                    <ItemTypesForm
                        onSuccess={() => {
                            setIsCreateDialogOpen(false);
                            refetch();
                        }}
                    />
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={!!editingType} onOpenChange={(open) => !open && setEditingType(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary shrink-0">
                                <Edit className="h-5 w-5" />
                            </div>
                            <DialogTitle className="text-lg">{t('editTitle')}</DialogTitle>
                        </div>
                        <DialogDescription className="pt-1">{t('editDescription')}</DialogDescription>
                    </DialogHeader>
                    <ItemTypesForm
                        initialData={editingType ?? undefined}
                        onSuccess={() => {
                            setEditingType(null);
                            refetch();
                        }}
                    />
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deletingType} onOpenChange={(open) => !open && setDeletingType(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10 text-destructive shrink-0">
                                <Trash2 className="h-5 w-5" />
                            </div>
                            <DialogTitle className="text-lg">{t('deleteTitle')}</DialogTitle>
                        </div>
                        <DialogDescription className="pt-1">
                            {t('deleteConfirmation', { name: deletingType?.name || '' })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setDeletingType(null)}
                            disabled={deleteMutation.isLoading}
                        >
                            {t('cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDelete}
                            disabled={deleteMutation.isLoading}
                        >
                            {deleteMutation.isLoading ? t('deleting') : t('delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    );
}
