'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
    Plus, Search, Edit, Trash2, Zap, AlertCircle,
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
import { ItemAttributeForm } from './ItemAttributeForm';

type Attribute = { id: number; name: string; slug: string; };

function TableSkeleton() {
    return (
        <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4">
                    <div className="h-4 bg-muted rounded animate-pulse flex-1" />
                    <div className="h-5 bg-muted rounded animate-pulse w-28" />
                    <div className="h-8 bg-muted rounded animate-pulse w-20 ml-auto" />
                </div>
            ))}
        </div>
    );
}

export function ItemAttributesList() {
    const t = useTranslations('itemAttributes');
    const locale = useLocale();
    const router = useRouter();

    const [searchInput, setSearchInput] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [sortBy, setSortBy] = useState<'name' | 'slug'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [editingAttribute, setEditingAttribute] = useState<Attribute | null>(null);
    const [deletingAttribute, setDeletingAttribute] = useState<Attribute | null>(null);

    const utils = trpc.useUtils();

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchTerm(searchInput);
            setPage(1);
        }, 350);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const { data, isLoading, error } = trpc.itemAttributes.list.useQuery({
        search: searchTerm || undefined,
        page,
        limit: 50,
        sortBy,
        sortOrder,
    });

    const deleteMutation = trpc.itemAttributes.delete.useMutation({
        onSuccess: () => {
            utils.itemAttributes.list.invalidate();
            setDeletingAttribute(null);
        },
    });

    const handleDelete = async () => {
        if (!deletingAttribute) return;
        await deleteMutation.mutateAsync({ id: deletingAttribute.id });
    };

    const handleSort = (field: 'name' | 'slug') => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
        setPage(1);
    };

    const attributes = data?.data || [];
    const totalCount = data?.pagination?.total ?? null;

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
                            <Zap className="h-5 w-5" />
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
                            <p className="text-sm text-muted-foreground mt-0.5">{t('createDescription')}</p>
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
                                        className="pl-4 cursor-pointer select-none hover:text-foreground"
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
                                {attributes.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="py-16">
                                            <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                                <Zap className="h-10 w-10 opacity-30" />
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
                                    attributes.map((attribute: Attribute) => (
                                        <TableRow
                                            key={attribute.id}
                                            className="group cursor-pointer"
                                            onClick={() => router.push(`/${locale}/item-attributes/${attribute.id}`)}
                                        >
                                            <TableCell className="pl-4">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm">{attribute.name}</span>
                                                    <span className="text-xs text-muted-foreground font-mono">#{attribute.id}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="font-mono text-xs font-normal">
                                                    {attribute.slug}
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
                                                                onClick={() => setEditingAttribute(attribute)}
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
                                                                onClick={() => setDeletingAttribute(attribute)}
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
                    {!isLoading && attributes.length > 0 && data?.pagination && (
                        <div className="flex items-center justify-between px-4 py-3 border-t">
                            <p className="text-sm text-muted-foreground">
                                {t('showingResults', {
                                    from: (data.pagination.page - 1) * data.pagination.limit + 1,
                                    to: Math.min(data.pagination.page * data.pagination.limit, data.pagination.total),
                                    total: data.pagination.total,
                                })}
                            </p>
                            {data.pagination.totalPages > 1 && (
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
                                        disabled={page >= data.pagination.totalPages}
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
                                <Zap className="h-5 w-5" />
                            </div>
                            <DialogTitle className="text-lg">{t('create')}</DialogTitle>
                        </div>
                        <DialogDescription className="pt-1">{t('createDescription')}</DialogDescription>
                    </DialogHeader>
                    <ItemAttributeForm
                        onSuccess={() => {
                            setIsCreateDialogOpen(false);
                            utils.itemAttributes.list.invalidate();
                        }}
                    />
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={!!editingAttribute} onOpenChange={(open) => !open && setEditingAttribute(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary shrink-0">
                                <Edit className="h-5 w-5" />
                            </div>
                            <DialogTitle className="text-lg">{t('edit')}</DialogTitle>
                        </div>
                        <DialogDescription className="pt-1">{t('editDescription')}</DialogDescription>
                    </DialogHeader>
                    {editingAttribute && (
                        <ItemAttributeForm
                            initialData={editingAttribute}
                            onSuccess={() => {
                                setEditingAttribute(null);
                                utils.itemAttributes.list.invalidate();
                            }}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deletingAttribute} onOpenChange={(open) => !open && setDeletingAttribute(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10 text-destructive shrink-0">
                                <Trash2 className="h-5 w-5" />
                            </div>
                            <DialogTitle className="text-lg">{t('deleteTitle')}</DialogTitle>
                        </div>
                        <DialogDescription className="pt-1">
                            {t('deleteConfirmation', { name: deletingAttribute?.name || '' })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setDeletingAttribute(null)}
                            disabled={deleteMutation.isPending}
                        >
                            {t('cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? t('deleting') : t('delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    );
}
