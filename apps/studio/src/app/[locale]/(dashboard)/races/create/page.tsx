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
import { ArrowLeft } from 'lucide-react';

export default function CreateRacePage() {
    const t = useTranslations('races');
    const tCommon = useTranslations('common');
    const router = useRouter();
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        name: '',
        slug: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    // Мутация для создания расы
    const createRace = trpc.race.create.useMutation({
        onSuccess: () => {
            toast({
                title: tCommon('success'),
                description: t('raceCreated'),
            });
            router.push('/races');
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

        if (!formData.name.trim()) {
            newErrors.name = 'Название обязательно';
        }

        if (!formData.slug.trim()) {
            newErrors.slug = 'Слаг обязателен';
        }

        setErrors(newErrors);

        if (Object.keys(newErrors).length === 0) {
            createRace.mutate(formData);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Автоматическое создание slug из названия
        if (name === 'name') {
            const slug = value
                .toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .replace(/[\s_-]+/g, '-')
                .replace(/^-+|-+$/g, '');
            setFormData(prev => ({ ...prev, slug }));
        }

        // Очистка ошибок при вводе
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-2xl">
            <div className="mb-6">
                <Link href="/races">
                    <Button variant="ghost" size="sm" className="mb-4">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {tCommon('back')}
                    </Button>
                </Link>

                <h1 className="text-3xl font-bold">{t('createRace')}</h1>
                <p className="text-muted-foreground mt-2">
                    Создание новой расы в системе
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('newRace')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">{tCommon('name')} *</Label>
                            <Input
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                placeholder={t('enterRaceName')}
                                className={errors.name ? 'border-red-500' : ''}
                            />
                            {errors.name && (
                                <p className="text-sm text-red-500">{errors.name}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="slug">{tCommon('slug')} *</Label>
                            <Input
                                id="slug"
                                name="slug"
                                value={formData.slug}
                                onChange={handleInputChange}
                                placeholder={t('raceSlugPlaceholder')}
                                className={errors.slug ? 'border-red-500' : ''}
                            />
                            {errors.slug && (
                                <p className="text-sm text-red-500">{errors.slug}</p>
                            )}
                            <p className="text-sm text-muted-foreground">
                                {t('slugDescription')}
                            </p>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <Button
                                type="submit"
                                disabled={createRace.isPending}
                                className="flex-1"
                            >
                                {createRace.isPending ? tCommon('loading') : tCommon('create')}
                            </Button>
                            <Link href="/races">
                                <Button type="button" variant="outline" className="flex-1">
                                    {tCommon('cancel')}
                                </Button>
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}