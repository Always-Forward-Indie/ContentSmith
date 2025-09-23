'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Search, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { ItemAttributeForm } from './ItemAttributeForm';

export function ItemAttributesList() {
    const t = useTranslations('itemAttributes');
    const { toast } = useToast();

    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [sortBy, setSortBy] = useState<'name' | 'slug'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [editingAttribute, setEditingAttribute] = useState<{
        id: number;
        name: string;
        slug: string;
    } | null>(null);
    const [deletingAttribute, setDeletingAttribute] = useState<{
        id: number;
        name: string;
        slug: string;
    } | null>(null);

    const utils = trpc.useUtils();

    const { data, isLoading, error } = trpc.itemAttributes.list.useQuery({
        search,
        page,
        limit: 50,
        sortBy,
        sortOrder,
    });

    const deleteMutation = trpc.itemAttributes.delete.useMutation({
        onSuccess: () => {
            toast({
                title: t('success'),
                description: t('deleteSuccess'),
            });
            utils.itemAttributes.list.invalidate();
            setDeletingAttribute(null);
        },
        onError: (error) => {
            toast({
                title: t('error'),
                description: error.message || t('deleteError'),
            });
        },
    });

    const handleDelete = async () => {
        if (!deletingAttribute) return;

        await deleteMutation.mutateAsync({ id: deletingAttribute.id });
    };

    const handleSearch = (value: string) => {
        setSearch(value);
        setPage(1);
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

    if (error) {
        return (
            <div className="p-4 border border-red-200 bg-red-50 rounded-md">
                <h3 className="font-medium text-red-800">{t('error')}</h3>
                <p className="text-red-700">{error.message}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">{t('title')}</h1>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            {t('create')}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>{t('create')}</DialogTitle>
                            <DialogDescription>
                                {t('createDescription')}
                            </DialogDescription>
                        </DialogHeader>
                        <ItemAttributeForm
                            onSuccess={() => {
                                setIsCreateDialogOpen(false);
                                utils.itemAttributes.list.invalidate();
                            }}
                        />
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('listTitle')}</CardTitle>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <Label htmlFor="search">{t('search')}</Label>
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="search"
                                    placeholder={t('searchPlaceholder')}
                                    value={search}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="sort">{t('sortBy')}</Label>
                            <Select
                                value={`${sortBy}-${sortOrder}`}
                                onValueChange={(value) => {
                                    const [field, order] = value.split('-') as ['name' | 'slug', 'asc' | 'desc'];
                                    setSortBy(field);
                                    setSortOrder(order);
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger id="sort" className="w-[180px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="name-asc">{t('nameAsc')}</SelectItem>
                                    <SelectItem value="name-desc">{t('nameDesc')}</SelectItem>
                                    <SelectItem value="slug-asc">{t('slugAsc')}</SelectItem>
                                    <SelectItem value="slug-desc">{t('slugDesc')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : data?.data.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            {search ? t('noSearchResults') : t('noData')}
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => handleSort('name')}
                                        >
                                            {t('name')}
                                            {sortBy === 'name' && (
                                                <span className="ml-1">
                                                    {sortOrder === 'asc' ? '↑' : '↓'}
                                                </span>
                                            )}
                                        </TableHead>
                                        <TableHead
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => handleSort('slug')}
                                        >
                                            {t('slug')}
                                            {sortBy === 'slug' && (
                                                <span className="ml-1">
                                                    {sortOrder === 'asc' ? '↑' : '↓'}
                                                </span>
                                            )}
                                        </TableHead>
                                        <TableHead className="w-[100px]">{t('actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data?.data.map((attribute: { id: number; name: string; slug: string }) => (
                                        <TableRow key={attribute.id}>
                                            <TableCell className="font-medium">
                                                <Link
                                                    href={`/item-attributes/${attribute.id}`}
                                                    className="hover:underline"
                                                >
                                                    {attribute.name}
                                                </Link>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {attribute.slug}
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem
                                                            onClick={() => setEditingAttribute(attribute)}
                                                        >
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            {t('edit')}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => setDeletingAttribute(attribute)}
                                                            className="text-destructive"
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            {t('delete')}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {data && data.pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between px-2 py-4">
                            <div className="text-sm text-muted-foreground">
                                {t('showingResults', {
                                    from: (data.pagination.page - 1) * data.pagination.limit + 1,
                                    to: Math.min(data.pagination.page * data.pagination.limit, data.pagination.total),
                                    total: data.pagination.total,
                                })}
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(page - 1)}
                                    disabled={page <= 1}
                                >
                                    {t('previous')}
                                </Button>
                                <div className="text-sm">
                                    {t('pageOf', {
                                        current: data.pagination.page,
                                        total: data.pagination.totalPages
                                    })}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(page + 1)}
                                    disabled={page >= data.pagination.totalPages}
                                >
                                    {t('next')}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={!!editingAttribute} onOpenChange={() => setEditingAttribute(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{t('edit')}</DialogTitle>
                        <DialogDescription>
                            {t('editDescription')}
                        </DialogDescription>
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
            <Dialog open={!!deletingAttribute} onOpenChange={() => setDeletingAttribute(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('deleteTitle')}</DialogTitle>
                        <DialogDescription>
                            {t('deleteConfirmation', { name: deletingAttribute?.name || '' })}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setDeletingAttribute(null)}>
                            {t('cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? t('deleting') : t('delete')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}