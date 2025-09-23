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
const createItemTypesSchema = z.object({
    name: z.string().min(1).max(50),
    slug: z.string().min(1).max(50),
});

interface ItemTypesFormProps {
    initialData?: {
        id: number;
        name: string;
        slug: string;
    };
    onSuccess?: () => void;
}

type FormData = z.infer<typeof createItemTypesSchema>;

export function ItemTypesForm({ initialData, onSuccess }: ItemTypesFormProps) {
    const t = useTranslations('itemTypes');
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<FormData>({
        resolver: zodResolver(createItemTypesSchema),
        defaultValues: {
            name: initialData?.name || '',
            slug: initialData?.slug || '',
        },
    });

    const createMutation = trpc.itemTypes.create.useMutation({
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
                variant: 'error',
            });
        },
        onSettled: () => {
            setIsSubmitting(false);
        },
    });

    const updateMutation = trpc.itemTypes.update.useMutation({
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
                variant: 'error',
            });
        },
        onSettled: () => {
            setIsSubmitting(false);
        },
    });

    const onSubmit = (data: FormData) => {
        setIsSubmitting(true);

        if (initialData) {
            updateMutation.mutate({
                id: initialData.id,
                ...data,
            });
        } else {
            createMutation.mutate(data);
        }
    };

    // Auto-generate slug from name
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        form.setValue('name', name);

        // Auto-generate slug only if we're creating a new item type
        if (!initialData) {
            const slug = name
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .trim();
            form.setValue('slug', slug);
        }
    };

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4">
                <div>
                    <Label htmlFor="name">{t('name')}</Label>
                    <Input
                        id="name"
                        placeholder={t('namePlaceholder')}
                        {...form.register('name')}
                        onChange={handleNameChange}
                        disabled={isSubmitting}
                    />
                    {form.formState.errors.name && (
                        <p className="text-sm text-destructive mt-1">
                            {form.formState.errors.name.message}
                        </p>
                    )}
                </div>

                <div>
                    <Label htmlFor="slug">{t('slug')}</Label>
                    <Input
                        id="slug"
                        placeholder={t('slugPlaceholder')}
                        {...form.register('slug')}
                        disabled={isSubmitting}
                    />
                    {form.formState.errors.slug && (
                        <p className="text-sm text-destructive mt-1">
                            {form.formState.errors.slug.message}
                        </p>
                    )}
                </div>
            </div>

            <div className="flex justify-end gap-2">
                <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="min-w-24"
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