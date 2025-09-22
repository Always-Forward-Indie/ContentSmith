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
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';

interface PageProps {
    params: {
        id: string;
    };
}

export default function EditRacePage({ params }: PageProps) {
    const t = useTranslations('races');
    const tCommon = useTranslations('common');
    const router = useRouter();
    const { toast } = useToast();
    const raceId = parseInt(params.id);

    const [formData, setFormData] = useState({
        name: '',
        slug: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    // Query для получения данных расы
    const { data: race, isLoading } = trpc.race.getById.useQuery({ id: raceId });

    // Мутация для обновления расы
    const updateRace = trpc.race.update.useMutation({
        onSuccess: () => {
            toast({
                title: tCommon('success'),
                description: t('raceUpdated'),
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

    // Заполнение формы при загрузке данных
    useEffect(() => {
        if (race) {
            setFormData({
                name: race.name,
                slug: race.slug,
            });
        }
    }, [race]);

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
            updateRace.mutate({ id: raceId, ...formData });
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Очистка ошибок при вводе
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-lg">{tCommon('loading')}</div>
            </div>
        );
    }

    if (!race) {
        return (
            <div className="container mx-auto p-6 max-w-2xl">
                <div className="text-center py-8">
                    <h1 className="text-2xl font-bold text-red-600">{t('raceNotFound')}</h1>
                    <Link href="/races">
                        <Button className="mt-4">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            {tCommon('back')}
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 max-w-2xl">
            <div className="mb-6">
                <Link href="/races">
                    <Button variant="ghost" size="sm" className="mb-4">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {tCommon('back')}
                    </Button>
                </Link>

                <h1 className="text-3xl font-bold">{t('editRace')}</h1>
                <p className="text-muted-foreground mt-2">
                    {t('editRaceDescription')} "{race.name}"
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('editRace')}</CardTitle>
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
                                disabled={updateRace.isPending}
                                className="flex-1"
                            >
                                {updateRace.isPending ? tCommon('loading') : tCommon('save')}
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