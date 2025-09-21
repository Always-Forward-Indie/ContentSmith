'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface EditSkillEffectPageProps {
    params: { id: string };
}

export default function EditSkillEffectPage({ params }: EditSkillEffectPageProps) {
    const t = useTranslations('skillEffects');
    const tCommon = useTranslations('common');
    const router = useRouter();
    const { toast } = useToast();

    const skillEffectId = parseInt(params.id);

    const [formData, setFormData] = useState({
        slug: '',
        effectTypeId: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    // Получаем данные эффекта навыка
    const {
        data: skillEffect,
        isLoading,
        error,
    } = trpc.skillEffects.getById.useQuery(
        { id: skillEffectId },
        { enabled: !isNaN(skillEffectId) }
    );

    // Получаем список типов эффектов для селекта
    const {
        data: effectTypes,
        isLoading: effectTypesLoading,
    } = trpc.skillEffectsType.list.useQuery({});

    // Мутация для обновления
    const updateSkillEffect = trpc.skillEffects.update.useMutation({
        onSuccess: () => {
            toast({
                title: tCommon('success'),
                description: t('skillEffectUpdated'),
            });
            router.push('/skill-effects');
        },
        onError: (error) => {
            toast({
                title: tCommon('error'),
                description: error.message,
                variant: 'error',
            });
        },
    });

    // Заполняем форму когда данные загрузились
    useEffect(() => {
        if (skillEffect) {
            setFormData({
                slug: skillEffect.slug,
                effectTypeId: skillEffect.effectTypeId.toString(),
            });
        }
    }, [skillEffect]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Простая валидация
        const newErrors: Record<string, string> = {};

        if (!formData.slug.trim()) {
            newErrors.slug = t('slugRequired');
        }

        if (!formData.effectTypeId) {
            newErrors.effectTypeId = t('effectTypeRequired');
        }

        setErrors(newErrors);

        if (Object.keys(newErrors).length === 0) {
            updateSkillEffect.mutate({
                id: skillEffectId,
                slug: formData.slug.trim(),
                effectTypeId: parseInt(formData.effectTypeId),
            });
        }
    };

    const handleInputChange = (field: keyof typeof formData) => (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        setFormData({ ...formData, [field]: e.target.value });
        // Очищаем ошибку при вводе
        if (errors[field]) {
            setErrors({ ...errors, [field]: '' });
        }
    };

    const handleSelectChange = (field: keyof typeof formData) => (value: string) => {
        setFormData({ ...formData, [field]: value });
        // Очищаем ошибку при выборе
        if (errors[field]) {
            setErrors({ ...errors, [field]: '' });
        }
    };

    if (isNaN(skillEffectId)) {
        return (
            <div className="max-w-2xl mx-auto space-y-6">
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground">
                            {t('skillEffectNotFound')}
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (isLoading || effectTypesLoading) {
        return (
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-9 w-20" />
                    <Skeleton className="h-9 w-64" />
                </div>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <Skeleton className="h-10 w-20" />
                                <Skeleton className="h-10 w-20" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-2xl mx-auto space-y-6">
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground">
                            {t('skillEffectNotFound')}
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Заголовок */}
            <div className="flex items-center gap-4">
                <Button asChild variant="outline" size="sm">
                    <Link href="/skill-effects">{tCommon('back')}</Link>
                </Button>
                <h1 className="text-3xl font-bold">{t('editSkillEffect')}</h1>
            </div>

            {/* Форма */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('editSkillEffect')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Слаг */}
                        <div className="space-y-2">
                            <Label htmlFor="slug">{t('skillEffectSlug')}</Label>
                            <Input
                                id="slug"
                                value={formData.slug}
                                onChange={handleInputChange('slug')}
                                placeholder={t('skillEffectSlug')}
                                className={errors.slug ? 'border-red-500' : ''}
                            />
                            {errors.slug && (
                                <p className="text-sm text-red-500">{errors.slug}</p>
                            )}
                        </div>

                        {/* Тип эффекта */}
                        <div className="space-y-2">
                            <Label htmlFor="effectTypeId">{t('effectType')}</Label>
                            <select
                                id="effectTypeId"
                                value={formData.effectTypeId}
                                onChange={(e) => handleSelectChange('effectTypeId')(e.target.value)}
                                className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${errors.effectTypeId ? 'border-red-500' : ''
                                    }`}
                            >
                                <option value="">{t('effectType')}</option>
                                {effectTypes?.map((effectType) => (
                                    <option key={effectType.id} value={effectType.id.toString()}>
                                        {effectType.slug}
                                    </option>
                                ))}
                            </select>
                            {errors.effectTypeId && (
                                <p className="text-sm text-red-500">{errors.effectTypeId}</p>
                            )}
                        </div>

                        {/* Кнопки */}
                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" asChild>
                                <Link href="/skill-effects">{tCommon('cancel')}</Link>
                            </Button>
                            <Button
                                type="submit"
                                disabled={updateSkillEffect.isLoading}
                            >
                                {updateSkillEffect.isLoading ? tCommon('loading') : tCommon('save')}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}