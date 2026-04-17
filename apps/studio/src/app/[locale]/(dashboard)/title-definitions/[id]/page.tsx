'use client';

import { useState, useEffect } from 'react';
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
import { ArrowLeft, Plus, X } from 'lucide-react';
import { z } from 'zod';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const updateTitleDefinitionFormSchema = z.object({
    slug: z.string().min(1, 'Slug is required').max(80),
    displayName: z.string().min(1, 'Display name is required').max(120),
    description: z.string().optional(),
    earnCondition: z.string().optional(),
});

type UpdateTitleDefinitionFormData = z.infer<typeof updateTitleDefinitionFormSchema>;

type TitleBonus = { attributeSlug: string; value: number };

const EARN_CONDITION_OPTIONS = [
    { value: '', label: '— не задано —' },
    { value: 'bestiary', label: 'bestiary – убийства мобов' },
    { value: 'mastery', label: 'mastery – мастерство' },
    { value: 'reputation', label: 'reputation – репутация' },
    { value: 'level', label: 'level – уровень персонажа' },
    { value: 'quest', label: 'quest – выполнение квеста' },
];

interface TitleDefinitionEditPageProps {
    params: { id: string };
}

export default function TitleDefinitionEditPage({ params }: TitleDefinitionEditPageProps) {
    const t = useTranslations('titleDefinitions');
    const commonT = useTranslations('common');
    const router = useRouter();
    const locale = useLocale();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const titleId = Number(params.id);

    // JSONB states
    const [bonuses, setBonuses] = useState<TitleBonus[]>([]);
    const [conditionParams, setConditionParams] = useState<Record<string, unknown>>({});

    const { data: item, isLoading } = trpc.titleDefinitions.getById.useQuery(
        { id: titleId },
        { enabled: !!titleId }
    );

    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors },
    } = useForm<UpdateTitleDefinitionFormData>({
        resolver: zodResolver(updateTitleDefinitionFormSchema),
    });

    const earnCondition = watch('earnCondition') ?? '';

    useEffect(() => {
        if (item) {
            reset({
                slug: item.slug,
                displayName: item.displayName,
                description: item.description ?? undefined,
                earnCondition: item.earnCondition ?? undefined,
            });
            setBonuses((item.bonuses as TitleBonus[]) ?? []);
            setConditionParams((item.conditionParams as Record<string, unknown>) ?? {});
        }
    }, [item, reset]);

    const updateMutation = trpc.titleDefinitions.update.useMutation({
        onSuccess: () => {
            toast.success(t('updateSuccess'));
            router.push(`/${locale}/title-definitions`);
        },
        onError: (error) => {
            toast.error(commonT('error'), error.message);
            setIsSubmitting(false);
        },
    });

    const onSubmit = (data: UpdateTitleDefinitionFormData) => {
        setIsSubmitting(true);
        updateMutation.mutate({ id: titleId, ...data, bonuses, conditionParams });
    };

    const handleBack = () => {
        router.push(`/${locale}/title-definitions`);
    };

    // ── Bonus helpers ───────────────────────────────────────────────────────
    const addBonus = () => setBonuses(prev => [...prev, { attributeSlug: '', value: 0 }]);
    const removeBonus = (i: number) => setBonuses(prev => prev.filter((_, idx) => idx !== i));
    const updateBonus = (i: number, field: keyof TitleBonus, val: string | number) =>
        setBonuses(prev => prev.map((b, idx) => idx === i ? { ...b, [field]: val } : b));

    // ── conditionParams helpers ─────────────────────────────────────────────
    const renderConditionParams = () => {
        switch (earnCondition) {
            case 'bestiary':
                return (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>mobSlug</Label>
                            <Input
                                value={(conditionParams.mobSlug as string) ?? ''}
                                onChange={(e) => setConditionParams(prev => ({ ...prev, mobSlug: e.target.value }))}
                                placeholder="skeleton_warrior"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>minTier (1–5)</Label>
                            <Input
                                type="number" min={1} max={5}
                                value={(conditionParams.minTier as number) ?? 1}
                                onChange={(e) => setConditionParams(prev => ({ ...prev, minTier: parseInt(e.target.value) || 1 }))}
                            />
                        </div>
                    </div>
                );
            case 'mastery':
                return (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>masterySlug</Label>
                            <Input
                                value={(conditionParams.masterySlug as string) ?? ''}
                                onChange={(e) => setConditionParams(prev => ({ ...prev, masterySlug: e.target.value }))}
                                placeholder="smithing"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>minTier (индекс 1–4)</Label>
                            <Input
                                type="number" min={1} max={4}
                                value={(conditionParams.minTier as number) ?? 1}
                                onChange={(e) => setConditionParams(prev => ({ ...prev, minTier: parseInt(e.target.value) || 1 }))}
                            />
                        </div>
                    </div>
                );
            case 'reputation':
                return (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>factionSlug</Label>
                            <Input
                                value={(conditionParams.factionSlug as string) ?? ''}
                                onChange={(e) => setConditionParams(prev => ({ ...prev, factionSlug: e.target.value }))}
                                placeholder="guards"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>minTierName</Label>
                            <Select
                                value={(conditionParams.minTierName as string) ?? 'neutral'}
                                onValueChange={(v) => setConditionParams(prev => ({ ...prev, minTierName: v }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {['enemy', 'stranger', 'neutral', 'friendly', 'ally'].map(tier => (
                                        <SelectItem key={tier} value={tier}>{tier}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                );
            case 'level':
                return (
                    <div className="space-y-2 max-w-xs">
                        <Label>level</Label>
                        <Input
                            type="number" min={1}
                            value={(conditionParams.level as number) ?? 1}
                            onChange={(e) => setConditionParams(prev => ({ ...prev, level: parseInt(e.target.value) || 1 }))}
                        />
                    </div>
                );
            case 'quest':
                return (
                    <div className="space-y-2 max-w-xs">
                        <Label>questSlug</Label>
                        <Input
                            value={(conditionParams.questSlug as string) ?? ''}
                            onChange={(e) => setConditionParams(prev => ({ ...prev, questSlug: e.target.value }))}
                            placeholder="main_quest_finale"
                        />
                    </div>
                );
            default:
                return <p className="text-xs text-muted-foreground">Выберите тип условия выше.</p>;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-lg">{commonT('loading')}</div>
            </div>
        );
    }

    if (!item) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-lg text-red-600">{t('notFound')}</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 max-w-2xl space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={handleBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {commonT('back')}
                </Button>
                <div>
                    <h1 className="text-3xl font-bold">{t('edit')}</h1>
                    <p className="text-muted-foreground mt-1">ID: {titleId}</p>
                </div>
            </div>

            {/* Main fields */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('edit')}</CardTitle>
                    <CardDescription>{item.slug}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="slug">{t('slug')}</Label>
                            <Input id="slug" {...register('slug')} />
                            {errors.slug && (
                                <p className="text-sm text-red-600">{errors.slug.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="displayName">{t('displayName')}</Label>
                            <Input id="displayName" {...register('displayName')} />
                            {errors.displayName && (
                                <p className="text-sm text-red-600">{errors.displayName.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">{t('description')}</Label>
                            <Input id="description" {...register('description')} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="earnCondition">Тип условия получения</Label>
                            <Select
                                value={earnCondition}
                                onValueChange={(v) => setValue('earnCondition', v === '' ? undefined : v)}
                            >
                                <SelectTrigger id="earnCondition">
                                    <SelectValue placeholder="Выберите тип..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {EARN_CONDITION_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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

            {/* Condition Params */}
            {earnCondition && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Параметры условия</CardTitle>
                        <CardDescription>
                            Данные для проверки условия <code className="text-xs">{earnCondition}</code>
                        </CardDescription>
                    </CardHeader>
                    <CardContent>{renderConditionParams()}</CardContent>
                </Card>
            )}

            {/* Bonuses */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Бонусы к атрибутам</CardTitle>
                    <CardDescription>Пассивные модификаторы, активные пока надет этот титул</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {bonuses.length === 0 && (
                        <p className="text-sm text-muted-foreground">Бонусов нет</p>
                    )}
                    {bonuses.map((bonus, i) => (
                        <div key={i} className="flex gap-3 items-end">
                            <div className="space-y-1 flex-1">
                                <Label className="text-xs">Атрибут (slug)</Label>
                                <Input
                                    value={bonus.attributeSlug}
                                    onChange={(e) => updateBonus(i, 'attributeSlug', e.target.value)}
                                    placeholder="strength"
                                    className="h-8"
                                />
                            </div>
                            <div className="space-y-1 w-32">
                                <Label className="text-xs">Значение</Label>
                                <Input
                                    type="number"
                                    step="any"
                                    value={bonus.value}
                                    onChange={(e) => updateBonus(i, 'value', parseFloat(e.target.value) || 0)}
                                    className="h-8"
                                />
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => removeBonus(i)}
                            >
                                <X className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" className="h-8" onClick={addBonus}>
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Добавить бонус
                    </Button>

                    <div className="pt-2">
                        <Button
                            type="button"
                            onClick={() => {
                                setIsSubmitting(true);
                                const formValues = { slug: item.slug, displayName: item.displayName };
                                updateMutation.mutate({ id: titleId, bonuses, conditionParams });
                            }}
                            disabled={isSubmitting}
                            size="sm"
                        >
                            {isSubmitting ? commonT('loading') : 'Сохранить бонусы'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
