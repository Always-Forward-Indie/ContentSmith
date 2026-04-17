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

const updateEmoteDefinitionFormSchema = z.object({
    slug: z.string().min(1, 'Slug is required').max(64),
    displayName: z.string().min(1, 'Display name is required').max(128),
    animationName: z.string().min(1, 'Animation name is required').max(128),
    category: z.string().optional(),
    isDefault: z.boolean().default(false),
    sortOrder: z.number().int().optional(),
});

type UpdateEmoteDefinitionFormData = z.infer<typeof updateEmoteDefinitionFormSchema>;

interface EmoteDefinitionEditPageProps {
    params: { id: string };
}

export default function EmoteDefinitionEditPage({ params }: EmoteDefinitionEditPageProps) {
    const t = useTranslations('emoteDefinitions');
    const commonT = useTranslations('common');
    const router = useRouter();
    const locale = useLocale();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const emoteId = Number(params.id);

    const { data: item, isLoading } = trpc.emoteDefinitions.getById.useQuery(
        { id: emoteId },
        { enabled: !!emoteId }
    );

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<UpdateEmoteDefinitionFormData>({
        resolver: zodResolver(updateEmoteDefinitionFormSchema),
    });

    useEffect(() => {
        if (item) {
            reset({
                slug: item.slug,
                displayName: item.displayName,
                animationName: item.animationName,
                category: item.category ?? undefined,
                isDefault: item.isDefault ?? false,
                sortOrder: item.sortOrder ?? undefined,
            });
        }
    }, [item, reset]);

    const updateMutation = trpc.emoteDefinitions.update.useMutation({
        onSuccess: () => {
            toast.success(t('updateSuccess'));
            router.push(`/${locale}/emote-definitions`);
        },
        onError: (error) => {
            toast.error(commonT('error'), error.message);
            setIsSubmitting(false);
        },
    });

    const onSubmit = (data: UpdateEmoteDefinitionFormData) => {
        setIsSubmitting(true);
        updateMutation.mutate({ id: emoteId, ...data });
    };

    const handleBack = () => {
        router.push(`/${locale}/emote-definitions`);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-lg">{commonT('loading')}</div>
            </div>
        );
    }

    if (!item) {
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
                    <p className="text-muted-foreground mt-1">ID: {emoteId}</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('edit')}</CardTitle>
                    <CardDescription>{item.slug}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="slug">{t('slug')}</Label>
                            <Input id="slug" {...register('slug')} />
                            {errors.slug && (
                                <p className="text-sm text-red-600">{errors.slug.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="displayName">{t('displayName')}</Label>
                            <Input id="displayName" {...register('displayName')} />
                            {errors.displayName && (
                                <p className="text-sm text-red-600">{errors.displayName.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="animationName">{t('animationName')}</Label>
                            <Input id="animationName" {...register('animationName')} />
                            {errors.animationName && (
                                <p className="text-sm text-red-600">{errors.animationName.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="category">{t('category')}</Label>
                            <Input id="category" {...register('category')} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="sortOrder">{t('sortOrder')}</Label>
                            <Input
                                id="sortOrder"
                                type="number"
                                {...register('sortOrder', { valueAsNumber: true })}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isDefault"
                                {...register('isDefault')}
                                className="h-4 w-4"
                            />
                            <Label htmlFor="isDefault">{t('isDefault')}</Label>
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
