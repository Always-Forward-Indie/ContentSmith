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

const createMasteryDefinitionFormSchema = z.object({
    slug: z.string().min(1, 'Slug is required').max(255),
    name: z.string().min(1, 'Name is required').max(255),
    weaponTypeSlug: z.string().optional(),
    maxValue: z.number().optional(),
});

type CreateMasteryDefinitionFormData = z.infer<typeof createMasteryDefinitionFormSchema>;

export default function CreateMasteryDefinitionPage() {
    const t = useTranslations('masteryDefinitions');
    const commonT = useTranslations('common');
    const router = useRouter();
    const locale = useLocale();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<CreateMasteryDefinitionFormData>({
        resolver: zodResolver(createMasteryDefinitionFormSchema),
    });

    const createMutation = trpc.masteryDefinitions.create.useMutation({
        onSuccess: () => {
            toast.success(t('createSuccess'));
            router.push(`/${locale}/mastery-definitions`);
        },
        onError: (error) => {
            toast.error(commonT('error'), error.message);
            setIsSubmitting(false);
        },
    });

    const onSubmit = (data: CreateMasteryDefinitionFormData) => {
        setIsSubmitting(true);
        createMutation.mutate(data);
    };

    const handleBack = () => {
        router.push(`/${locale}/mastery-definitions`);
    };

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue('slug', generateSlug(e.target.value));
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
                            <Label htmlFor="name">{t('name')}</Label>
                            <Input
                                id="name"
                                {...register('name')}
                                onChange={(e) => {
                                    register('name').onChange(e);
                                    handleNameChange(e);
                                }}
                            />
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
