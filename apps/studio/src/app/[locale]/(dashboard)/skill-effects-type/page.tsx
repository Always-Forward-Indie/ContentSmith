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

export default function SkillEffectsTypePage() {
    const t = useTranslations('skillEffectsType');
    const tCommon = useTranslations('common');
    const { toast } = useToast();

    const [search, setSearch] = useState('');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedSkillEffectsType, setSelectedSkillEffectsType] = useState<{
        id: number;
        slug: string;
    } | null>(null);

    // Получаем список типов эффектов навыков
    const {
        data: skillEffectsTypes,
        isLoading,
        refetch,
    } = trpc.skillEffectsType.list.useQuery({
        search,
    });

    // Мутация для удаления
    const deleteSkillEffectsType = trpc.skillEffectsType.delete.useMutation({
        onSuccess: () => {
            toast({
                title: tCommon('success'),
                description: t('skillEffectsTypeDeleted'),
            });
            refetch();
            setDeleteDialogOpen(false);
            setSelectedSkillEffectsType(null);
        },
        onError: (error) => {
            toast({
                title: tCommon('error'),
                description: error.message,
                variant: 'error',
            });
        },
    });

    const handleDelete = (skillEffectsType: { id: number; slug: string }) => {
        setSelectedSkillEffectsType(skillEffectsType);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (selectedSkillEffectsType) {
            deleteSkillEffectsType.mutate({ id: selectedSkillEffectsType.id });
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
                    <Link href="/skill-effects-type/create">{t('createSkillEffectsType')}</Link>
                </Button>
            </div>

            {/* Карточка со списком */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('skillEffectsTypesManagement')}</CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Поиск */}
                    <div className="mb-6">
                        <Input
                            placeholder={t('searchSkillEffectsTypes')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>

                    {/* Таблица */}
                    {skillEffectsTypes?.length ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('skillEffectsTypeSlug')}</TableHead>
                                    <TableHead className="text-right">{tCommon('actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {skillEffectsTypes.map((skillEffectsType) => (
                                    <TableRow key={skillEffectsType.id}>
                                        <TableCell className="font-medium">
                                            {skillEffectsType.slug}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button asChild variant="outline" size="sm">
                                                    <Link href={`/skill-effects-type/${skillEffectsType.id}/edit`}>
                                                        {tCommon('edit')}
                                                    </Link>
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleDelete(skillEffectsType)}
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
                            {t('noSkillEffectsTypesFound')}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Диалог подтверждения удаления */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('deleteSkillEffectsTypeTitle')}</DialogTitle>
                        <DialogDescription>
                            {selectedSkillEffectsType &&
                                t('deleteSkillEffectsTypeDescription', {
                                    slug: selectedSkillEffectsType.slug,
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
                            disabled={deleteSkillEffectsType.isLoading}
                        >
                            {deleteSkillEffectsType.isLoading ? tCommon('loading') : tCommon('delete')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}