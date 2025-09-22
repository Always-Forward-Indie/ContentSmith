'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

export default function EntityAttributesPage() {
    const t = useTranslations('entityAttributes');
    const tCommon = useTranslations('common');
    const { toast } = useToast();

    const [search, setSearch] = useState('');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [attributeToDelete, setAttributeToDelete] = useState<number | null>(null);

    // Получаем список атрибутов сущностей
    const {
        data: entityAttributes,
        isLoading,
        refetch,
    } = trpc.entityAttributes.list.useQuery({
        search: search.trim() || undefined,
    });

    // Мутация для удаления
    const deleteEntityAttribute = trpc.entityAttributes.delete.useMutation({
        onSuccess: () => {
            toast({
                title: tCommon('success'),
                description: t('entityAttributeDeleted'),
            });
            refetch();
            setDeleteDialogOpen(false);
            setAttributeToDelete(null);
        },
        onError: (error) => {
            toast({
                title: tCommon('error'),
                description: error.message,
                variant: 'error',
            });
        },
    });

    const handleDelete = (id: number) => {
        setAttributeToDelete(id);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (attributeToDelete) {
            deleteEntityAttribute.mutate({ id: attributeToDelete });
        }
    };

    const handleSearch = (value: string) => {
        setSearch(value);
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-4 w-64" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <Skeleton className="h-10 w-full" />
                            <div className="space-y-2">
                                {[...Array(5)].map((_, i) => (
                                    <Skeleton key={i} className="h-12 w-full" />
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Заголовок */}
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">{t('entityAttributes')}</h1>
                <Button asChild>
                    <Link href="/entity-attributes/create">{t('addEntityAttribute')}</Link>
                </Button>
            </div>

            {/* Основной контент */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('entityAttributesList')}</CardTitle>
                    <CardDescription>
                        {t('title')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Поиск */}
                    <div className="mb-4">
                        <Input
                            placeholder={t('search')}
                            value={search}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>

                    {/* Таблица */}
                    {entityAttributes && entityAttributes.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>{t('entityAttributeName')}</TableHead>
                                    <TableHead>{t('entityAttributeSlug')}</TableHead>
                                    <TableHead>{t('actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {entityAttributes.map((attribute) => (
                                    <TableRow key={attribute.id}>
                                        <TableCell>{attribute.id}</TableCell>
                                        <TableCell className="font-medium">{attribute.name}</TableCell>
                                        <TableCell>{attribute.slug}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Button asChild variant="outline" size="sm">
                                                    <Link href={`/entity-attributes/${attribute.id}/edit`}>
                                                        {tCommon('edit')}
                                                    </Link>
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDelete(attribute.id)}
                                                    className="text-red-600 hover:text-red-700"
                                                >
                                                    {tCommon('delete')}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            {t('noEntityAttributes')}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Диалог подтверждения удаления */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('deleteEntityAttribute')}</DialogTitle>
                        <DialogDescription>
                            {t('deleteEntityAttributeConfirm')}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                            {tCommon('cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDelete}
                            disabled={deleteEntityAttribute.isLoading}
                        >
                            {deleteEntityAttribute.isLoading ? tCommon('loading') : tCommon('delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}