'use client';

import { useState, useEffect } from 'react';
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
const updateSkillSchoolFormSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255),
    slug: z.string().min(1, 'Slug is required').max(255),
});

type UpdateSkillSchoolFormData = z.infer<typeof updateSkillSchoolFormSchema>;

interface SkillSchoolEditPageProps {
    params: {
        id: string;
    };
}

export default function SkillSchoolEditPage({ params }: SkillSchoolEditPageProps) {
    const t = useTranslations('skillSchools');
    const commonT = useTranslations('common');
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const skillSchoolId = parseInt(params.id);

    // Query для получения данных школы скилов
    const { data: skillSchool, isLoading: skillSchoolLoading } = trpc.skillSchools.getById.useQuery(
        { id: skillSchoolId },
        { enabled: !!skillSchoolId }
    );

    // Form setup
    const {
        register,
        handleSubmit,
        setValue,
        reset,
        formState: { errors },
    } = useForm<UpdateSkillSchoolFormData>({
        resolver: zodResolver(updateSkillSchoolFormSchema),
    });

    // Заполнение формы данными школы скилов при загрузке
    useEffect(() => {
        if (skillSchool) {
            reset({
                name: skillSchool.name,
                slug: skillSchool.slug,
            });
        }
    }, [skillSchool, reset]);

    // Mutation для обновления школы скилов
    const updateSkillSchoolMutation = trpc.skillSchools.update.useMutation({
        onSuccess: () => {
            toast.success(t('skillSchoolUpdated'));
            router.push('/skill-schools');
        },
        onError: (error) => {
            toast.error(commonT('error'), error.message);
            setIsSubmitting(false);
        },
    });

    const onSubmit = (data: UpdateSkillSchoolFormData) => {
        setIsSubmitting(true);
        updateSkillSchoolMutation.mutate({
            id: skillSchoolId,
            ...data,
        });
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

    if (skillSchoolLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-lg">{commonT('loading')}</div>
            </div>
        );
    }

    if (!skillSchool) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-lg text-red-600">{t('skillSchoolNotFound')}</div>
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
                    <h1 className="text-3xl font-bold">{t('editSkillSchool')}</h1>
                    <p className="text-muted-foreground mt-1">
                        Редактирование школы скилов: {skillSchool.name}
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('editSkillSchool')}</CardTitle>
                    <CardDescription>
                        Обновите информацию о школе скилов
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