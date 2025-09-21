'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function CreateSkillEffectsTypePage() {
    const t = useTranslations('skillEffectsType');
    const tCommon = useTranslations('common');
    const router = useRouter();
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        slug: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    // Мутация для создания
    const createSkillEffectsType = trpc.skillEffectsType.create.useMutation({
        onSuccess: () => {
            toast({
                title: tCommon('success'),
                description: t('skillEffectsTypeCreated'),
            });
            router.push('/skill-effects-type');
        },
        onError: (error) => {
            toast({
                title: tCommon('error'),
                description: error.message,
                variant: 'error',
            });
        },
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Простая валидация
        const newErrors: Record<string, string> = {};

        if (!formData.slug.trim()) {
            newErrors.slug = t('slugRequired');
        }

        setErrors(newErrors);

        if (Object.keys(newErrors).length === 0) {
            createSkillEffectsType.mutate({
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

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Заголовок */}
            <div className="flex items-center gap-4">
                <Button asChild variant="outline" size="sm">
                    <Link href="/skill-effects-type">{tCommon('back')}</Link>
                </Button>
                <h1 className="text-3xl font-bold">{t('createSkillEffectsType')}</h1>
            </div>

            {/* Форма */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('createSkillEffectsType')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Слаг */}
                        <div className="space-y-2">
                            <Label htmlFor="slug">{t('skillEffectsTypeSlug')}</Label>
                            <Input
                                id="slug"
                                value={formData.slug}
                                onChange={handleInputChange('slug')}
                                placeholder={t('skillEffectsTypeSlug')}
                                className={errors.slug ? 'border-red-500' : ''}
                            />
                            {errors.slug && (
                                <p className="text-sm text-red-500">{errors.slug}</p>
                            )}
                        </div>

                        {/* Кнопки */}
                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" asChild>
                                <Link href="/skill-effects-type">{tCommon('cancel')}</Link>
                            </Button>
                            <Button
                                type="submit"
                                disabled={createSkillEffectsType.isLoading}
                            >
                                {createSkillEffectsType.isLoading ? tCommon('loading') : tCommon('create')}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}