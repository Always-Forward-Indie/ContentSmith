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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, X, BookOpen, Zap } from 'lucide-react';
import { z } from 'zod';
import { SkillBalancePanel } from '@/components/balance/SkillBalancePanel';
import { PropertyEditor } from '@/components/skills/PropertyEditor';
import { EffectInstancesEditor } from '@/components/skills/EffectInstancesEditor';

const updateSkillFormSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255),
    slug: z.string().min(1, 'Slug is required').max(255),
    schoolId: z.number().int().positive('School is required'),
    scaleStatId: z.number().int().positive('Scale type is required'),
    isPassive: z.boolean().default(false),
    animationName: z.string().max(100).nullable().optional(),
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

    const { data: skill, isLoading: skillLoading } = trpc.skills.getById.useQuery(
        { id: skillId },
        { enabled: !!skillId }
    );
    const { data: schools, isLoading: schoolsLoading } = trpc.skills.getSchools.useQuery();
    const { data: scaleTypes, isLoading: scaleTypesLoading } = trpc.skills.getScaleTypes.useQuery();

    const {
        register,
        handleSubmit,
        setValue,
        reset,
        control,
        watch,
        formState: { errors },
    } = useForm<UpdateSkillFormData>({
        resolver: zodResolver(updateSkillFormSchema),
    });

    const isPassive = watch('isPassive', skill?.isPassive ?? false);

    useEffect(() => {
        if (skill) {
            reset({
                name: skill.name,
                slug: skill.slug,
                schoolId: skill.schoolId,
                scaleStatId: skill.scaleStatId,
                isPassive: skill.isPassive ?? false,
                animationName: (skill as any).animationName ?? '',
            });
        }
    }, [skill, reset]);

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
        updateSkillMutation.mutate({ id: skillId, ...data });
    };

    const handleBack = () => router.push('/skills');

    const generateSlug = (name: string) =>
        name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue('slug', generateSlug(e.target.value));
    };

    if (skillLoading || schoolsLoading || scaleTypesLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-sm text-muted-foreground">{commonT('loading')}</div>
            </div>
        );
    }

    if (!skill) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-sm text-destructive">{t('skillNotFound')}</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 max-w-6xl space-y-6">
            {/* Page header */}
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={handleBack} className="h-8">
                    <ArrowLeft className="h-4 w-4 mr-1.5" />
                    {commonT('back')}
                </Button>
                <div className="h-4 w-px bg-border" />
                <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center w-7 h-7 rounded-md bg-muted">
                        <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div>
                        <h1 className="text-sm font-semibold leading-none">{t('editSkill')}</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">{t('skillEditSubtitle', { name: skill.name })}</p>
                    </div>
                </div>
            </div>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-6 items-start">
                {/* Left — form */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="text-base">{t('editSkill')}</CardTitle>
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
                                        onChange={(e) => { register('name').onChange(e); handleNameChange(e); }}
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
                                                    key={`school-${schools?.length ?? 0}-${field.value}`}
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
                                                    key={`scale-${scaleTypes?.length ?? 0}-${field.value}`}
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
                                        {isSubmitting ? commonT('loading') : commonT('save')}
                                    </Button>
                                    <Button type="button" variant="outline" onClick={handleBack}>
                                        {commonT('cancel')}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Passive modifiers inline under form */}
                    {isPassive && <PassiveModifiersManager skillId={skillId} t={t} />}

                    {/* Property mappings per level */}
                    <PropertyEditor skillId={skillId} />

                    {/* Effect instances with per-level mappings */}
                    <EffectInstancesEditor skillId={skillId} />
                </div>

                {/* Right — live balance panel or passive info */}
                <div className="lg:sticky lg:top-6">
                    {!isPassive ? (
                        <SkillBalancePanel skillId={skillId} />
                    ) : (
                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-2">
                                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                                    <CardTitle className="text-sm">{t('passiveModifiers')}</CardTitle>
                                </div>
                                <CardDescription className="text-xs">
                                    {t('passiveModifiersDesc')}
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}

function PassiveModifiersManager({ skillId, t }: { skillId: number; t: ReturnType<typeof useTranslations<'skills'>> }) {
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
            <CardHeader className="pb-3">
                <CardTitle className="text-base">{t('passiveModifiers')}</CardTitle>
                <CardDescription>{t('passiveModifiersDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {modifiers && modifiers.length > 0 && (
                    <div className="rounded-md border overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50">
                                    <th className="px-3 py-2 text-left font-medium text-xs">{t('colAttribute')}</th>
                                    <th className="px-3 py-2 text-left font-medium text-xs">{t('colType')}</th>
                                    <th className="px-3 py-2 text-left font-medium text-xs">{t('colValue')}</th>
                                    <th className="px-2 py-2 w-8"></th>
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
                        <Label className="text-xs">{t('attrSlugLabel')}</Label>
                        <Input
                            value={attrSlug}
                            onChange={(e) => setAttrSlug(e.target.value)}
                            placeholder={t('attrSlugPlaceholder')}
                            className="h-8 w-36 text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">{t('colType')}</Label>
                        <Select value={modType} onValueChange={setModType}>
                            <SelectTrigger className="h-8 w-36">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="flat">flat</SelectItem>
                                <SelectItem value="percent">percent</SelectItem>
                                <SelectItem value="percent_all">percent_all</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">{t('colValue')}</Label>
                        <Input
                            value={modValue}
                            onChange={(e) => setModValue(e.target.value)}
                            type="number"
                            placeholder="0"
                            className="h-8 w-24"
                        />
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
                        {t('addModifier')}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
