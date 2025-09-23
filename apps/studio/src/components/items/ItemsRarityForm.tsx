'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';

// Form schema
const createItemsRaritySchema = z.object({
    name: z.string().min(1).max(30),
    colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
    slug: z.string().min(1).max(30).optional(),
});

interface ItemsRarityFormProps {
    initialData?: {
        id: number;
        name: string;
        colorHex: string;
        slug: string | null;
    };
    onSuccess?: () => void;
}

type FormData = z.infer<typeof createItemsRaritySchema>;

export function ItemsRarityForm({ initialData, onSuccess }: ItemsRarityFormProps) {
    const t = useTranslations('itemsRarity');
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<FormData>({
        resolver: zodResolver(createItemsRaritySchema),
        defaultValues: {
            name: initialData?.name || '',
            colorHex: initialData?.colorHex || '#ffffff',
            slug: initialData?.slug || '',
        },
    });

    const createMutation = trpc.itemsRarity.create.useMutation({
        onSuccess: () => {
            toast({
                title: t('success'),
                description: t('createSuccess'),
            });
            form.reset();
            onSuccess?.();
        },
        onError: (error) => {
            toast({
                title: t('error'),
                description: error.message || t('createError'),
            });
        },
    });

    const updateMutation = trpc.itemsRarity.update.useMutation({
        onSuccess: () => {
            toast({
                title: t('success'),
                description: t('updateSuccess'),
            });
            onSuccess?.();
        },
        onError: (error) => {
            toast({
                title: t('error'),
                description: error.message || t('updateError'),
            });
        },
    });

    const onSubmit = async (data: FormData) => {
        setIsSubmitting(true);

        try {
            if (initialData) {
                await updateMutation.mutateAsync({
                    id: initialData.id,
                    ...data,
                });
            } else {
                await createMutation.mutateAsync(data);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Auto-generate slug from name
    const handleNameChange = (value: string) => {
        form.setValue('name', value);

        if (!initialData) { // Only auto-generate for new items
            const slug = value
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
            form.setValue('slug', slug);
        }
    };

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="name">{t('name')} *</Label>
                <Input
                    id="name"
                    {...form.register('name')}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder={t('namePlaceholder')}
                />
                {form.formState.errors.name && (
                    <p className="text-sm text-destructive">
                        {form.formState.errors.name.message}
                    </p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="slug">{t('slug')}</Label>
                <Input
                    id="slug"
                    {...form.register('slug')}
                    placeholder={t('slugPlaceholder')}
                />
                {form.formState.errors.slug && (
                    <p className="text-sm text-destructive">
                        {form.formState.errors.slug.message}
                    </p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="colorHex">{t('color')} *</Label>
                <div className="flex gap-2">
                    <Input
                        id="colorHex"
                        type="color"
                        {...form.register('colorHex')}
                        className="w-16 h-10 p-1 rounded"
                    />
                    <Input
                        {...form.register('colorHex')}
                        placeholder="#ffffff"
                        className="flex-1"
                    />
                </div>
                {form.formState.errors.colorHex && (
                    <p className="text-sm text-destructive">
                        {form.formState.errors.colorHex.message}
                    </p>
                )}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
                <Button
                    type="submit"
                    disabled={isSubmitting}
                >
                    {isSubmitting
                        ? (initialData ? t('updating') : t('creating'))
                        : (initialData ? t('update') : t('create'))
                    }
                </Button>
            </div>
        </form>
    );
}