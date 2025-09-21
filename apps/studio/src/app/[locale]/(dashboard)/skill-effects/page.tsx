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

export default function SkillEffectsPage() {
    const t = useTranslations('skillEffects');
    const tCommon = useTranslations('common');
    const { toast } = useToast();

    const [search, setSearch] = useState('');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [skillEffectToDelete, setSkillEffectToDelete] = useState<number | null>(null);

    // Получаем список эффектов навыков
    const {
        data: skillEffects,
        isLoading,
        refetch,
    } = trpc.skillEffects.list.useQuery({
        search: search.trim() || undefined,
    });

    // Мутация для удаления
    const deleteSkillEffect = trpc.skillEffects.delete.useMutation({
        onSuccess: () => {
            toast({
                title: tCommon('success'),
                description: t('skillEffectDeleted'),
            });
            refetch();
            setDeleteDialogOpen(false);
            setSkillEffectToDelete(null);
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
        setSkillEffectToDelete(id);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (skillEffectToDelete) {
            deleteSkillEffect.mutate({ id: skillEffectToDelete });
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
                <h1 className="text-3xl font-bold">{t('skillEffects')}</h1>
                <Button asChild>
                    <Link href="/skill-effects/create">{t('addSkillEffect')}</Link>
                </Button>
            </div>

            {/* Основной контент */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('skillEffectsList')}</CardTitle>
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
                    {skillEffects && skillEffects.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>{t('skillEffectSlug')}</TableHead>
                                    <TableHead>{t('effectType')}</TableHead>
                                    <TableHead>{t('actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {skillEffects.map((skillEffect) => (
                                    <TableRow key={skillEffect.id}>
                                        <TableCell>{skillEffect.id}</TableCell>
                                        <TableCell className="font-medium">{skillEffect.slug}</TableCell>
                                        <TableCell>
                                            {skillEffect.effectType ? skillEffect.effectType.slug : '-'}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Button asChild variant="outline" size="sm">
                                                    <Link href={`/skill-effects/${skillEffect.id}/edit`}>
                                                        {tCommon('edit')}
                                                    </Link>
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDelete(skillEffect.id)}
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
                            {t('noSkillEffects')}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Диалог подтверждения удаления */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('deleteSkillEffect')}</DialogTitle>
                        <DialogDescription>
                            {t('deleteSkillEffectConfirm')}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                            {tCommon('cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDelete}
                            disabled={deleteSkillEffect.isLoading}
                        >
                            {deleteSkillEffect.isLoading ? tCommon('loading') : tCommon('delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}