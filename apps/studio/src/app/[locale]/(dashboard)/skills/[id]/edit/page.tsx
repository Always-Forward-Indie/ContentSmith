'use client';

import { useState, useEffect } from 'react';
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
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { z } from 'zod';

// Схема валидации для формы
const updateSkillFormSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255),
    slug: z.string().min(1, 'Slug is required').max(255),
    schoolId: z.number().int().positive('School is required'),
    scaleStatId: z.number().int().positive('Scale type is required'),
    isPassive: z.boolean().default(false),
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
        control,
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
                isPassive: skill.isPassive ?? false,
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

                        <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                            <p className="text-sm font-medium">{t('isPassive')}</p>
                            <Controller name="isPassive" control={control}
                                render={({ field }) => <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />} />
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

            {skill.isPassive && (
                <PassiveModifiersManager skillId={skillId} />
            )}
        </div>
    );
}

function PassiveModifiersManager({ skillId }: { skillId: number }) {
    const [attrSlug, setAttrSlug] = useState('');
    const [modType, setModType] = useState('flat');
    const [modValue, setModValue] = useState('');

    const { data: modifiers, refetch } = trpc.skills.getPassiveModifiers.useQuery(skillId);

    const addMutation = trpc.skills.addPassiveModifier.useMutation({
        onSuccess: () => { setAttrSlug(''); setModValue(''); refetch(); },
    });
    const removeMutation = trpc.skills.removePassiveModifier.useMutation({
        onSuccess: () => refetch(),
    });

    const handleAdd = () => {
        if (!attrSlug.trim() || modValue === '') return;
        addMutation.mutate({ skillId, attributeSlug: attrSlug.trim(), modifierType: modType, value: parseFloat(modValue) });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Passive Modifiers</CardTitle>
                <CardDescription>Attribute modifiers applied passively when this skill is learned</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {modifiers && modifiers.length > 0 && (
                    <div className="rounded-md border overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50">
                                    <th className="px-3 py-2 text-left font-medium text-xs">Attribute</th>
                                    <th className="px-3 py-2 text-left font-medium text-xs">Type</th>
                                    <th className="px-3 py-2 text-left font-medium text-xs">Value</th>
                                    <th className="px-2 py-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {modifiers.map((mod) => (
                                    <tr key={mod.id} className="border-b last:border-0 hover:bg-muted/30">
                                        <td className="px-3 py-2 font-mono text-xs">{mod.attributeSlug}</td>
                                        <td className="px-3 py-2 text-xs">{mod.modifierType}</td>
                                        <td className="px-3 py-2 text-xs">{mod.value}</td>
                                        <td className="px-2 py-2">
                                            <button
                                                type="button"
                                                onClick={() => removeMutation.mutate({ id: mod.id })}
                                                className="text-muted-foreground hover:text-destructive"
                                                disabled={removeMutation.isPending}
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="flex flex-wrap gap-2 items-end">
                    <div className="space-y-1">
                        <Label className="text-xs">Attribute Slug</Label>
                        <Input value={attrSlug} onChange={(e) => setAttrSlug(e.target.value)} placeholder="strength" className="h-8 w-36 text-sm" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Type</Label>
                        <select
                            value={modType}
                            onChange={(e) => setModType(e.target.value)}
                            className="flex h-8 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                            <option value="flat">flat</option>
                            <option value="percent">percent</option>
                            <option value="percent_all">percent_all</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Value</Label>
                        <Input value={modValue} onChange={(e) => setModValue(e.target.value)} type="number" placeholder="0" className="h-8 w-24" />
                    </div>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8"
                        disabled={!attrSlug.trim() || modValue === '' || addMutation.isPending}
                        onClick={handleAdd}
                    >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}