'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { z } from 'zod';

const updateFactionFormSchema = z.object({
    slug: z.string().min(1, 'Slug is required').max(255),
    name: z.string().min(1, 'Name is required').max(255),
});

type UpdateFactionFormData = z.infer<typeof updateFactionFormSchema>;

interface FactionEditPageProps {
    params: { id: string };
}

export default function FactionEditPage({ params }: FactionEditPageProps) {
    const t = useTranslations('factions');
    const commonT = useTranslations('common');
    const router = useRouter();
    const locale = useLocale();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const factionId = parseInt(params.id);

    const { data: faction, isLoading } = trpc.factions.getById.useQuery(
        { id: factionId },
        { enabled: !!factionId }
    );

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<UpdateFactionFormData>({
        resolver: zodResolver(updateFactionFormSchema),
    });

    useEffect(() => {
        if (faction) {
            reset({
                slug: faction.slug,
                name: faction.name,
            });
        }
    }, [faction, reset]);

    const updateMutation = trpc.factions.update.useMutation({
        onSuccess: () => {
            toast.success(t('updateSuccess'));
            router.push(`/${locale}/factions`);
        },
        onError: (error) => {
            toast.error(commonT('error'), error.message);
            setIsSubmitting(false);
        },
    });

    const onSubmit = (data: UpdateFactionFormData) => {
        setIsSubmitting(true);
        updateMutation.mutate({ id: factionId, ...data });
    };

    const handleBack = () => {
        router.push(`/${locale}/factions`);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-lg">{commonT('loading')}</div>
            </div>
        );
    }

    if (!faction) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-lg text-red-600">{t('notFound')}</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 max-w-2xl">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" onClick={handleBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {commonT('back')}
                </Button>
                <div>
                    <h1 className="text-3xl font-bold">{t('edit')}</h1>
                    <p className="text-muted-foreground mt-1">ID: {factionId}</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('edit')}</CardTitle>
                    <CardDescription>{faction.name}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">{t('name')}</Label>
                            <Input id="name" {...register('name')} />
                            {errors.name && (
                                <p className="text-sm text-red-600">{errors.name.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="slug">{t('slug')}</Label>
                            <Input id="slug" {...register('slug')} />
                            {errors.slug && (
                                <p className="text-sm text-red-600">{errors.slug.message}</p>
                            )}
                        </div>

                        <div className="flex gap-4 pt-4">
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? commonT('loading') : commonT('save')}
                            </Button>
                            <Button type="button" variant="outline" onClick={handleBack}>
                                {commonT('cancel')}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
