'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
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

// Схема валидации для формы
const createSkillSchoolFormSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255),
    slug: z.string().min(1, 'Slug is required').max(255),
});

type CreateSkillSchoolFormData = z.infer<typeof createSkillSchoolFormSchema>;

export default function CreateSkillSchoolPage() {
    const t = useTranslations('skillSchools');
    const commonT = useTranslations('common');
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form setup
    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<CreateSkillSchoolFormData>({
        resolver: zodResolver(createSkillSchoolFormSchema),
    });

    // Mutation для создания школы скилов
    const createSkillSchoolMutation = trpc.skillSchools.create.useMutation({
        onSuccess: () => {
            toast.success(t('skillSchoolCreated'));
            router.push('/skill-schools');
        },
        onError: (error) => {
            toast.error(commonT('error'), error.message);
            setIsSubmitting(false);
        },
    });

    const onSubmit = (data: CreateSkillSchoolFormData) => {
        setIsSubmitting(true);
        createSkillSchoolMutation.mutate(data);
    };

    const handleBack = () => {
        router.push('/skill-schools');
    };

    // Автогенерация slug из названия
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
        const slug = generateSlug(name);
        setValue('slug', slug);
    };

    return (
        <div className="container mx-auto p-6 max-w-2xl">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" onClick={handleBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {commonT('back')}
                </Button>
                <div>
                    <h1 className="text-3xl font-bold">{t('createSkillSchool')}</h1>
                    <p className="text-muted-foreground mt-1">
                        Создание новой школы скилов в системе
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('createSkillSchool')}</CardTitle>
                    <CardDescription>
                        Заполните информацию о новой школе скилов
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">{t('skillSchoolName')}</Label>
                            <Input
                                id="name"
                                {...register('name')}
                                onChange={(e) => {
                                    register('name').onChange(e);
                                    handleNameChange(e);
                                }}
                                placeholder="Введите название школы скилов"
                            />
                            {errors.name && (
                                <p className="text-sm text-red-600">{errors.name.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="slug">{t('skillSchoolSlug')}</Label>
                            <Input
                                id="slug"
                                {...register('slug')}
                                placeholder="skill-school-slug"
                            />
                            {errors.slug && (
                                <p className="text-sm text-red-600">{errors.slug.message}</p>
                            )}
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