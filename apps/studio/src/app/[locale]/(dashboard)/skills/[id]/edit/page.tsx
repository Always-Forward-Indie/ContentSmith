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
const updateSkillFormSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255),
    slug: z.string().min(1, 'Slug is required').max(255),
    schoolId: z.number().int().positive('School is required'),
    scaleStatId: z.number().int().positive('Scale type is required'),
});

type UpdateSkillFormData = z.infer<typeof updateSkillFormSchema>;

interface SkillEditPageProps {
    params: {
        id: string;
    };
}

export default function SkillEditPage({ params }: SkillEditPageProps) {
    const t = useTranslations('skills');
    const commonT = useTranslations('common');
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const skillId = parseInt(params.id);

    // Query для получения данных скила
    const { data: skill, isLoading: skillLoading } = trpc.skills.getById.useQuery(
        { id: skillId },
        { enabled: !!skillId }
    );

    // Query для получения школ скилов
    const { data: schools, isLoading: schoolsLoading } = trpc.skills.getSchools.useQuery();

    // Query для получения типов масштабирования
    const { data: scaleTypes, isLoading: scaleTypesLoading } = trpc.skills.getScaleTypes.useQuery();

    // Form setup
    const {
        register,
        handleSubmit,
        setValue,
        reset,
        formState: { errors },
    } = useForm<UpdateSkillFormData>({
        resolver: zodResolver(updateSkillFormSchema),
    });

    // Заполнение формы данными скила при загрузке
    useEffect(() => {
        if (skill) {
            reset({
                name: skill.name,
                slug: skill.slug,
                schoolId: skill.schoolId,
                scaleStatId: skill.scaleStatId,
            });
        }
    }, [skill, reset]);

    // Mutation для обновления скила
    const updateSkillMutation = trpc.skills.update.useMutation({
        onSuccess: () => {
            toast.success(t('skillUpdated'));
            router.push('/skills');
        },
        onError: (error) => {
            toast.error(commonT('error'), error.message);
            setIsSubmitting(false);
        },
    });

    const onSubmit = (data: UpdateSkillFormData) => {
        setIsSubmitting(true);
        updateSkillMutation.mutate({
            id: skillId,
            ...data,
        });
    };

    const handleBack = () => {
        router.push('/skills');
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

    if (skillLoading || schoolsLoading || scaleTypesLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-lg">{commonT('loading')}</div>
            </div>
        );
    }

    if (!skill) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-lg text-red-600">{t('skillNotFound')}</div>
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
                    <h1 className="text-3xl font-bold">{t('editSkill')}</h1>
                    <p className="text-muted-foreground mt-1">
                        Редактирование скила: {skill.name}
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('editSkill')}</CardTitle>
                    <CardDescription>
                        Обновите информацию о скиле
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">{t('skillName')}</Label>
                            <Input
                                id="name"
                                {...register('name')}
                                onChange={(e) => {
                                    register('name').onChange(e);
                                    handleNameChange(e);
                                }}
                                placeholder="Введите название скила"
                            />
                            {errors.name && (
                                <p className="text-sm text-red-600">{errors.name.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="slug">{t('skillSlug')}</Label>
                            <Input
                                id="slug"
                                {...register('slug')}
                                placeholder="skill-slug"
                            />
                            {errors.slug && (
                                <p className="text-sm text-red-600">{errors.slug.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="schoolId">{t('skillSchool')}</Label>
                            <select
                                id="schoolId"
                                {...register('schoolId', { valueAsNumber: true })}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="">{t('selectSchool')}</option>
                                {schools?.map((school) => (
                                    <option key={school.id} value={school.id}>
                                        {school.name}
                                    </option>
                                ))}
                            </select>
                            {errors.schoolId && (
                                <p className="text-sm text-red-600">{t('schoolRequired')}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="scaleStatId">{t('skillScaleType')}</Label>
                            <select
                                id="scaleStatId"
                                {...register('scaleStatId', { valueAsNumber: true })}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="">{t('selectScaleType')}</option>
                                {scaleTypes?.map((scaleType) => (
                                    <option key={scaleType.id} value={scaleType.id}>
                                        {scaleType.name}
                                    </option>
                                ))}
                            </select>
                            {errors.scaleStatId && (
                                <p className="text-sm text-red-600">{t('scaleTypeRequired')}</p>
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