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
import {
    createItemAttributeSchema,
    updateItemAttributeSchema
} from '@contentsmith/validation';

interface ItemAttributeFormProps {
    initialData?: {
        id: number;
        name: string;
        slug: string;
    };
    onSuccess?: () => void;
}

type FormData = z.infer<typeof createItemAttributeSchema>;

export function ItemAttributeForm({ initialData, onSuccess }: ItemAttributeFormProps) {
    const t = useTranslations('itemAttributes');
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<FormData>({
        resolver: zodResolver(createItemAttributeSchema),
        defaultValues: {
            name: initialData?.name || '',
            slug: initialData?.slug || '',
        },
    });

    const createMutation = trpc.itemAttributes.create.useMutation({
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

    const updateMutation = trpc.itemAttributes.update.useMutation({
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
                <Label htmlFor="slug">{t('slug')} *</Label>
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