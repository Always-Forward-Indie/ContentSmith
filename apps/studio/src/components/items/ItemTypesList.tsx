"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';
import { ItemTypesForm } from './ItemTypesForm';

type SortBy = 'id' | 'name' | 'slug';
type SortOrder = 'asc' | 'desc';

interface ItemType {
    id: number;
    name: string;
    slug: string;
}

export function ItemTypesList() {
    const t = useTranslations('itemTypes');
    const { toast } = useToast();

    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [sortBy, setSortBy] = useState<SortBy>('name');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedItemType, setSelectedItemType] = useState<ItemType | null>(null);

    const limit = 50;

    const {
        data: itemTypesData,
        isLoading,
        error,
        refetch,
    } = trpc.itemTypes.list.useQuery({
        search,
        page,
        limit,
        sortBy,
        sortOrder,
    });

    const deleteMutation = trpc.itemTypes.delete.useMutation({
        onSuccess: () => {
            toast({
                title: t('success'),
                description: t('deleteSuccess'),
            });
            refetch();
            setIsDeleteDialogOpen(false);
            setSelectedItemType(null);
        },
        onError: (error) => {
            toast({
                title: t('error'),
                description: error.message || t('deleteError'),
                variant: 'error',
            });
        },
    });

    const handleEdit = (itemType: ItemType) => {
        setSelectedItemType(itemType);
        setIsEditDialogOpen(true);
    };

    const handleDelete = (itemType: ItemType) => {
        setSelectedItemType(itemType);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (selectedItemType) {
            deleteMutation.mutate({ id: selectedItemType.id });
        }
    };

    const handleSort = (column: SortBy) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('asc');
        }
    };

    const getSortLabel = (column: SortBy) => {
        if (sortBy !== column) return '';
        return sortOrder === 'asc' ? ' ↑' : ' ↓';
    };

    if (error) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <div className="text-center">
                        <p className="text-destructive">{t('error')}: {error.message}</p>
                        <Button variant="outline" onClick={() => refetch()} className="mt-4">
                            {t('retry')}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{t('listTitle')}</h2>
                    <p className="text-muted-foreground">{t('listDescription')}</p>
                </div>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('create')}
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">{t('filters')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
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
                        <div className="sm:w-48">
                            <Label>{t('sortBy')}</Label>
                            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                                const [newSortBy, newSortOrder] = value.split('-') as [SortBy, SortOrder];
                                setSortBy(newSortBy);
                                setSortOrder(newSortOrder);
                            }}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="name-asc">{t('nameAsc')}</SelectItem>
                                    <SelectItem value="name-desc">{t('nameDesc')}</SelectItem>
                                    <SelectItem value="slug-asc">{t('slugAsc')}</SelectItem>
                                    <SelectItem value="slug-desc">{t('slugDesc')}</SelectItem>
                                    <SelectItem value="id-asc">{t('idAsc')}</SelectItem>
                                    <SelectItem value="id-desc">{t('idDesc')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead
                                className="cursor-pointer select-none hover:bg-muted/50"
                                onClick={() => handleSort('id')}
                            >
                                {t('id')}{getSortLabel('id')}
                            </TableHead>
                            <TableHead
                                className="cursor-pointer select-none hover:bg-muted/50"
                                onClick={() => handleSort('name')}
                            >
                                {t('name')}{getSortLabel('name')}
                            </TableHead>
                            <TableHead
                                className="cursor-pointer select-none hover:bg-muted/50"
                                onClick={() => handleSort('slug')}
                            >
                                {t('slug')}{getSortLabel('slug')}
                            </TableHead>
                            <TableHead className="text-right">{t('actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Skeleton className="h-8 w-16" />
                                            <Skeleton className="h-8 w-16" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : itemTypesData?.data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8">
                                    <p className="text-muted-foreground">
                                        {search ? t('noSearchResults') : t('noData')}
                                    </p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            itemTypesData?.data.map((itemType) => (
                                <TableRow key={itemType.id}>
                                    <TableCell className="font-mono">{itemType.id}</TableCell>
                                    <TableCell className="font-medium">{itemType.name}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{itemType.slug}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleEdit(itemType)}
                                            >
                                                <Edit className="h-4 w-4" />
                                                <span className="sr-only">{t('edit')}</span>
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDelete(itemType)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                <span className="sr-only">{t('delete')}</span>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                {/* Pagination */}
                {itemTypesData && itemTypesData.pagination.pages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t">
                        <div className="text-sm text-muted-foreground">
                            {t('showingResults', {
                                from: (itemTypesData.pagination.page - 1) * itemTypesData.pagination.limit + 1,
                                to: Math.min(
                                    itemTypesData.pagination.page * itemTypesData.pagination.limit,
                                    itemTypesData.pagination.total
                                ),
                                total: itemTypesData.pagination.total,
                            })}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(page - 1)}
                                disabled={page <= 1}
                            >
                                {t('previous')}
                            </Button>
                            <span className="text-sm">
                                {t('pageOf', {
                                    current: itemTypesData.pagination.page,
                                    total: itemTypesData.pagination.pages,
                                })}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(page + 1)}
                                disabled={page >= itemTypesData.pagination.pages}
                            >
                                {t('next')}
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Create Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{t('createTitle')}</DialogTitle>
                        <DialogDescription>
                            {t('createDescription')}
                        </DialogDescription>
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
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{t('editTitle')}</DialogTitle>
                        <DialogDescription>
                            {t('editDescription')}
                        </DialogDescription>
                    </DialogHeader>
                    <ItemTypesForm
                        initialData={selectedItemType}
                        onSuccess={() => {
                            setIsEditDialogOpen(false);
                            setSelectedItemType(null);
                            refetch();
                        }}
                    />
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('deleteTitle')}</DialogTitle>
                        <DialogDescription>
                            {t('deleteConfirmation', { name: selectedItemType?.name || '' })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteDialogOpen(false)}
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
        </div>
    );
}