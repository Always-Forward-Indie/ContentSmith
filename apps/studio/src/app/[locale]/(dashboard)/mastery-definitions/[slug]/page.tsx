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

const updateMasteryDefinitionFormSchema = z.object({
    slug: z.string().min(1, 'Slug is required').max(255),
    name: z.string().min(1, 'Name is required').max(255),
    weaponTypeSlug: z.string().optional(),
    maxValue: z.number().optional(),
});

type UpdateMasteryDefinitionFormData = z.infer<typeof updateMasteryDefinitionFormSchema>;

interface MasteryDefinitionEditPageProps {
    params: { slug: string };
}

export default function MasteryDefinitionEditPage({ params }: MasteryDefinitionEditPageProps) {
    const t = useTranslations('masteryDefinitions');
    const commonT = useTranslations('common');
    const router = useRouter();
    const locale = useLocale();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { data: item, isLoading } = trpc.masteryDefinitions.getBySlug.useQuery(
        { slug: params.slug },
        { enabled: !!params.slug }
    );

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<UpdateMasteryDefinitionFormData>({
        resolver: zodResolver(updateMasteryDefinitionFormSchema),
    });

    useEffect(() => {
        if (item) {
            reset({
                slug: item.slug,
                name: item.name,
                weaponTypeSlug: item.weaponTypeSlug ?? undefined,
                maxValue: item.maxValue ?? undefined,
            });
        }
    }, [item, reset]);

    const updateMutation = trpc.masteryDefinitions.update.useMutation({
        onSuccess: () => {
            toast.success(t('updateSuccess'));
            router.push(`/${locale}/mastery-definitions`);
        },
        onError: (error) => {
            toast.error(commonT('error'), error.message);
            setIsSubmitting(false);
        },
    });

    const onSubmit = (data: UpdateMasteryDefinitionFormData) => {
        setIsSubmitting(true);
        updateMutation.mutate({ ...data, slug: params.slug });
    };

    const handleBack = () => {
        router.push(`/${locale}/mastery-definitions`);
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
                    <p className="text-muted-foreground mt-1">{item.slug}</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('edit')}</CardTitle>
                    <CardDescription>{item.name}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="slug">{t('slug')}</Label>
                            <Input id="slug" {...register('slug')} disabled className="opacity-60 cursor-not-allowed" />
                            {errors.slug && (
                                <p className="text-sm text-red-600">{errors.slug.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="name">{t('name')}</Label>
                            <Input id="name" {...register('name')} />
                            {errors.name && (
                                <p className="text-sm text-red-600">{errors.name.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="weaponTypeSlug">{t('weaponTypeSlug')}</Label>
                            <Input id="weaponTypeSlug" {...register('weaponTypeSlug')} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="maxValue">{t('maxValue')}</Label>
                            <Input
                                id="maxValue"
                                type="number"
                                {...register('maxValue', { valueAsNumber: true })}
                            />
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
