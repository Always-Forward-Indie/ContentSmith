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

interface EditSkillPropertyPageProps {
    params: { id: string };
}

export default function EditSkillPropertyPage({ params }: EditSkillPropertyPageProps) {
    const t = useTranslations('skillProperties');
    const tCommon = useTranslations('common');
    const router = useRouter();
    const { toast } = useToast();

    const skillPropertyId = parseInt(params.id);

    const [formData, setFormData] = useState({
        name: '',
        slug: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    // Получаем данные свойства навыка
    const {
        data: skillProperty,
        isLoading,
        error,
    } = trpc.skillProperties.getById.useQuery(
        { id: skillPropertyId },
        { enabled: !isNaN(skillPropertyId) }
    );

    // Мутация для обновления
    const updateSkillProperty = trpc.skillProperties.update.useMutation({
        onSuccess: () => {
            toast({
                title: tCommon('success'),
                description: t('skillPropertyUpdated'),
            });
            router.push('/skill-properties');
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
        if (skillProperty) {
            setFormData({
                name: skillProperty.name,
                slug: skillProperty.slug,
            });
        }
    }, [skillProperty]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Простая валидация
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = t('nameRequired');
        }

        if (!formData.slug.trim()) {
            newErrors.slug = t('slugRequired');
        }

        setErrors(newErrors);

        if (Object.keys(newErrors).length === 0) {
            updateSkillProperty.mutate({
                id: skillPropertyId,
                name: formData.name.trim(),
                slug: formData.slug.trim(),
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

    if (isNaN(skillPropertyId)) {
        return (
            <div className="max-w-2xl mx-auto space-y-6">
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground">
                            {t('skillPropertyNotFound')}
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (isLoading) {
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
                                <Skeleton className="h-4 w-32" />
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
                            {t('skillPropertyNotFound')}
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
                    <Link href="/skill-properties">{tCommon('back')}</Link>
                </Button>
                <h1 className="text-3xl font-bold">{t('editSkillProperty')}</h1>
            </div>

            {/* Форма */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('editSkillProperty')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Название */}
                        <div className="space-y-2">
                            <Label htmlFor="name">{t('skillPropertyName')}</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={handleInputChange('name')}
                                placeholder={t('skillPropertyName')}
                                className={errors.name ? 'border-red-500' : ''}
                            />
                            {errors.name && (
                                <p className="text-sm text-red-500">{errors.name}</p>
                            )}
                        </div>

                        {/* Слаг */}
                        <div className="space-y-2">
                            <Label htmlFor="slug">{t('skillPropertySlug')}</Label>
                            <Input
                                id="slug"
                                value={formData.slug}
                                onChange={handleInputChange('slug')}
                                placeholder={t('skillPropertySlug')}
                                className={errors.slug ? 'border-red-500' : ''}
                            />
                            {errors.slug && (
                                <p className="text-sm text-red-500">{errors.slug}</p>
                            )}
                        </div>

                        {/* Кнопки */}
                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" asChild>
                                <Link href="/skill-properties">{tCommon('cancel')}</Link>
                            </Button>
                            <Button
                                type="submit"
                                disabled={updateSkillProperty.isLoading}
                            >
                                {updateSkillProperty.isLoading ? tCommon('loading') : tCommon('save')}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}