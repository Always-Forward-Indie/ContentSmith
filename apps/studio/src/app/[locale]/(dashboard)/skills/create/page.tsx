'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { z } from 'zod';

const createSkillFormSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255),
    slug: z.string().min(1, 'Slug is required').max(255),
    schoolId: z.number().int().positive('School is required'),
    scaleStatId: z.number().int().positive('Scale type is required'),
    isPassive: z.boolean().default(false),
    animationName: z.string().max(100).nullable().optional(),
});

type CreateSkillFormData = z.infer<typeof createSkillFormSchema>;

export default function CreateSkillPage() {
    const t = useTranslations('skills');
    const commonT = useTranslations('common');
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { data: schools, isLoading: schoolsLoading } = trpc.skills.getSchools.useQuery();
    const { data: scaleTypes, isLoading: scaleTypesLoading } = trpc.skills.getScaleTypes.useQuery();

    const {
        register,
        handleSubmit,
        setValue,
        control,
        formState: { errors },
    } = useForm<CreateSkillFormData>({
        resolver: zodResolver(createSkillFormSchema),
        defaultValues: { isPassive: false },
    });

    const createSkillMutation = trpc.skills.create.useMutation({
        onSuccess: () => {
            toast.success(t('skillCreated'));
            router.push('/skills');
        },
        onError: (error) => {
            toast.error(commonT('error'), error.message);
            setIsSubmitting(false);
        },
    });

    const onSubmit = (data: CreateSkillFormData) => {
        setIsSubmitting(true);
        createSkillMutation.mutate(data);
    };

    const handleBack = () => router.push('/skills');

    const generateSlug = (name: string) =>
        name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue('slug', generateSlug(e.target.value));
    };

    if (schoolsLoading || scaleTypesLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-sm text-muted-foreground">{commonT('loading')}</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
                <Button variant="ghost" size="sm" onClick={handleBack} className="h-8">
                    <ArrowLeft className="h-4 w-4 mr-1.5" />
                    {commonT('back')}
                </Button>
                <div className="h-4 w-px bg-border" />
                <h1 className="text-sm font-semibold">{t('createSkill')}</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{t('createSkill')}</CardTitle>
                    <CardDescription>{t('skillEditCardDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        {/* Name */}
                        <div className="space-y-1.5">
                            <Label htmlFor="name">{t('skillName')}</Label>
                            <Input
                                id="name"
                                {...register('name')}
                                onChange={(e) => {
                                    register('name').onChange(e);
                                    handleNameChange(e);
                                }}
                                placeholder={t('skillNamePlaceholder')}
                            />
                            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                        </div>

                        {/* Slug */}
                        <div className="space-y-1.5">
                            <Label htmlFor="slug">{t('skillSlug')}</Label>
                            <Input
                                id="slug"
                                {...register('slug')}
                                placeholder="skill-slug"
                                className="font-mono text-sm"
                            />
                            {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
                        </div>

                        {/* School + Scale stat in a row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>{t('skillSchool')}</Label>
                                <Controller
                                    name="schoolId"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            value={field.value ? String(field.value) : ''}
                                            onValueChange={(v) => field.onChange(parseInt(v))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('selectSchool')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {schools?.map((s) => (
                                                    <SelectItem key={s.id} value={String(s.id)}>
                                                        {s.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {errors.schoolId && <p className="text-xs text-destructive">{t('schoolRequired')}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <Label>{t('skillScaleType')}</Label>
                                <Controller
                                    name="scaleStatId"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            value={field.value ? String(field.value) : ''}
                                            onValueChange={(v) => field.onChange(parseInt(v))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('selectScaleType')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {scaleTypes?.map((st) => (
                                                    <SelectItem key={st.id} value={String(st.id)}>
                                                        {st.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {errors.scaleStatId && <p className="text-xs text-destructive">{t('scaleTypeRequired')}</p>}
                            </div>
                        </div>

                        {/* Is Passive toggle */}
                        <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                            <p className="text-sm font-medium">{t('isPassive')}</p>
                            <Controller
                                name="isPassive"
                                control={control}
                                render={({ field }) => (
                                    <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                                )}
                            />
                        </div>

                        {/* Animation Name */}
                        <div className="space-y-1.5">
                            <Label htmlFor="animationName">{t('animationName')}</Label>
                            <Input
                                id="animationName"
                                {...register('animationName')}
                                placeholder={t('animationNamePlaceholder')}
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-1">
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
