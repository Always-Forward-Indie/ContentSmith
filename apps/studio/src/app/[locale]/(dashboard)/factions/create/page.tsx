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

const createFactionFormSchema = z.object({
    slug: z.string().min(1, 'Slug is required').max(255),
    name: z.string().min(1, 'Name is required').max(255),
    description: z.string().optional(),
    isPlayerFaction: z.boolean().default(false),
    isNeutral: z.boolean().default(false),
});

type CreateFactionFormData = z.infer<typeof createFactionFormSchema>;

export default function CreateFactionPage() {
    const t = useTranslations('factions');
    const commonT = useTranslations('common');
    const router = useRouter();
    const locale = useLocale();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<CreateFactionFormData>({
        resolver: zodResolver(createFactionFormSchema),
        defaultValues: {
            isPlayerFaction: false,
            isNeutral: false,
        },
    });

    const createMutation = trpc.factions.create.useMutation({
        onSuccess: () => {
            toast.success(t('createSuccess'));
            router.push(`/${locale}/factions`);
        },
        onError: (error) => {
            toast.error(commonT('error'), error.message);
            setIsSubmitting(false);
        },
    });

    const onSubmit = (data: CreateFactionFormData) => {
        setIsSubmitting(true);
        createMutation.mutate(data);
    };

    const handleBack = () => {
        router.push(`/${locale}/factions`);
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
        const name = e.target.value;
        setValue('slug', generateSlug(name));
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
                            <Label htmlFor="description">{t('description')}</Label>
                            <textarea
                                id="description"
                                {...register('description')}
                                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isPlayerFaction"
                                {...register('isPlayerFaction')}
                                className="h-4 w-4"
                            />
                            <Label htmlFor="isPlayerFaction">{t('isPlayerFaction')}</Label>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isNeutral"
                                {...register('isNeutral')}
                                className="h-4 w-4"
                            />
                            <Label htmlFor="isNeutral">{t('isNeutral')}</Label>
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
