'use client';

import { useState } from 'react';
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

const createTitleDefinitionFormSchema = z.object({
    slug: z.string().min(1, 'Slug is required').max(80),
    displayName: z.string().min(1, 'Display name is required').max(120),
    description: z.string().optional(),
    earnCondition: z.string().optional(),
});

type CreateTitleDefinitionFormData = z.infer<typeof createTitleDefinitionFormSchema>;

export default function CreateTitleDefinitionPage() {
    const t = useTranslations('titleDefinitions');
    const commonT = useTranslations('common');
    const router = useRouter();
    const locale = useLocale();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<CreateTitleDefinitionFormData>({
        resolver: zodResolver(createTitleDefinitionFormSchema),
    });

    const createMutation = trpc.titleDefinitions.create.useMutation({
        onSuccess: () => {
            toast.success(t('createSuccess'));
            router.push(`/${locale}/title-definitions`);
        },
        onError: (error) => {
            toast.error(commonT('error'), error.message);
            setIsSubmitting(false);
        },
    });

    const onSubmit = (data: CreateTitleDefinitionFormData) => {
        setIsSubmitting(true);
        createMutation.mutate(data);
    };

    const handleBack = () => {
        router.push(`/${locale}/title-definitions`);
    };

    return (
        <div className="container mx-auto p-6 max-w-2xl">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" onClick={handleBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {commonT('back')}
                </Button>
                <div>
                    <h1 className="text-3xl font-bold">{t('createNew')}</h1>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('createNew')}</CardTitle>
                    <CardDescription>{t('createNew')}</CardDescription>
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
                            <Label htmlFor="description">{t('description')}</Label>
                            <Input id="description" {...register('description')} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="earnCondition">{t('earnCondition')}</Label>
                            <Input id="earnCondition" {...register('earnCondition')} />
                        </div>

                        <div className="flex gap-4 pt-4">
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? commonT('loading') : commonT('create')}
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
