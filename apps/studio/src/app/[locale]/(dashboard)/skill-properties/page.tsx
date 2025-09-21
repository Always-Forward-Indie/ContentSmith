'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

export default function SkillPropertiesPage() {
    const t = useTranslations('skillProperties');
    const tCommon = useTranslations('common');
    const { toast } = useToast();

    const [search, setSearch] = useState('');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedSkillProperty, setSelectedSkillProperty] = useState<{
        id: number;
        name: string;
    } | null>(null);

    // Получаем список свойств навыков
    const {
        data: skillProperties,
        isLoading,
        refetch,
    } = trpc.skillProperties.list.useQuery({
        search,
    });

    // Мутация для удаления
    const deleteSkillProperty = trpc.skillProperties.delete.useMutation({
        onSuccess: () => {
            toast({
                title: tCommon('success'),
                description: t('skillPropertyDeleted'),
            });
            refetch();
            setDeleteDialogOpen(false);
            setSelectedSkillProperty(null);
        },
        onError: (error) => {
            toast({
                title: tCommon('error'),
                description: error.message,
                variant: 'error',
            });
        },
    });

    const handleDelete = (skillProperty: { id: number; name: string }) => {
        setSelectedSkillProperty(skillProperty);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (selectedSkillProperty) {
            deleteSkillProperty.mutate({ id: selectedSkillProperty.id });
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <Skeleton className="h-10 w-full" />
                            <div className="space-y-2">
                                {[...Array(5)].map((_, i) => (
                                    <Skeleton key={i} className="h-16 w-full" />
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
            {/* Заголовок и кнопка создания */}
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">{t('title')}</h1>
                <Button asChild>
                    <Link href="/skill-properties/create">{t('createSkillProperty')}</Link>
                </Button>
            </div>

            {/* Карточка со списком */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('skillPropertiesManagement')}</CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Поиск */}
                    <div className="mb-6">
                        <Input
                            placeholder={t('searchSkillProperties')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>

                    {/* Таблица */}
                    {skillProperties?.length ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('skillPropertyName')}</TableHead>
                                    <TableHead>{t('skillPropertySlug')}</TableHead>
                                    <TableHead className="text-right">{tCommon('actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {skillProperties.map((skillProperty) => (
                                    <TableRow key={skillProperty.id}>
                                        <TableCell className="font-medium">
                                            {skillProperty.name}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {skillProperty.slug}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button asChild variant="outline" size="sm">
                                                    <Link href={`/skill-properties/${skillProperty.id}/edit`}>
                                                        {tCommon('edit')}
                                                    </Link>
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleDelete(skillProperty)}
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
                            {t('noSkillPropertiesFound')}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Диалог подтверждения удаления */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('deleteSkillPropertyTitle')}</DialogTitle>
                        <DialogDescription>
                            {selectedSkillProperty &&
                                t('deleteSkillPropertyDescription', {
                                    name: selectedSkillProperty.name,
                                })}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setDeleteDialogOpen(false)}
                        >
                            {tCommon('cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDelete}
                            disabled={deleteSkillProperty.isLoading}
                        >
                            {deleteSkillProperty.isLoading ? tCommon('loading') : tCommon('delete')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}