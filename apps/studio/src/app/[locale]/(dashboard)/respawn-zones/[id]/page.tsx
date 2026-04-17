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
import { ArrowLeft } from 'lucide-react';
import { z } from 'zod';

const updateRespawnZoneFormSchema = z.object({
    name: z.string().min(1, 'Name is required').max(64),
    zoneId: z.number().optional(),
    x: z.number().default(0),
    y: z.number().default(0),
    z: z.number().default(0),
    isDefault: z.boolean().default(false),
});

type UpdateRespawnZoneFormData = z.infer<typeof updateRespawnZoneFormSchema>;

type ZoneOption = { id: number; slug: string; name?: string };

interface RespawnZoneEditPageProps {
    params: { id: string };
}

export default function RespawnZoneEditPage({ params }: RespawnZoneEditPageProps) {
    const t = useTranslations('respawnZones');
    const commonT = useTranslations('common');
    const router = useRouter();
    const locale = useLocale();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const zoneId = Number(params.id);

    const { data: item, isLoading } = trpc.respawnZones.getById.useQuery(
        { id: zoneId },
        { enabled: !!zoneId }
    );

    const { data: zonesData } = trpc.zones.list.useQuery({ pageSize: 200 });
    const zones: ZoneOption[] = (zonesData?.data ?? []) as ZoneOption[];

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<UpdateRespawnZoneFormData>({
        resolver: zodResolver(updateRespawnZoneFormSchema),
    });

    useEffect(() => {
        if (item) {
            reset({
                name: item.name,
                zoneId: item.zoneId ?? undefined,
                x: item.x ?? 0,
                y: item.y ?? 0,
                z: item.z ?? 0,
                isDefault: item.isDefault ?? false,
            });
        }
    }, [item, reset]);

    const updateMutation = trpc.respawnZones.update.useMutation({
        onSuccess: () => {
            toast.success(t('updateSuccess'));
            router.push(`/${locale}/respawn-zones`);
        },
        onError: (error) => {
            toast.error(commonT('error'), error.message);
            setIsSubmitting(false);
        },
    });

    const onSubmit = (data: UpdateRespawnZoneFormData) => {
        setIsSubmitting(true);
        updateMutation.mutate({ id: zoneId, ...data });
    };

    const handleBack = () => {
        router.push(`/${locale}/respawn-zones`);
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
        <div className="container mx-auto p-6 max-w-2xl">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" onClick={handleBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {commonT('back')}
                </Button>
                <div>
                    <h1 className="text-3xl font-bold">{t('edit')}</h1>
                    <p className="text-muted-foreground mt-1">ID: {zoneId}</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('edit')}</CardTitle>
                    <CardDescription>{item.name}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">{t('name')}</Label>
                            <Input id="name" {...register('name')} />
                            {errors.name && (
                                <p className="text-sm text-red-600">{errors.name.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="zoneId">{t('zone')}</Label>
                            <select
                                id="zoneId"
                                {...register('zoneId', { valueAsNumber: true })}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                                <option value="">{t('selectZone')}</option>
                                {zones.map((zone) => (
                                    <option key={zone.id} value={zone.id}>
                                        {zone.name ?? zone.slug}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="x">X</Label>
                                <Input
                                    id="x"
                                    type="number"
                                    {...register('x', { valueAsNumber: true })}
                                />
                                {errors.x && (
                                    <p className="text-sm text-red-600">{errors.x.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="y">Y</Label>
                                <Input
                                    id="y"
                                    type="number"
                                    {...register('y', { valueAsNumber: true })}
                                />
                                {errors.y && (
                                    <p className="text-sm text-red-600">{errors.y.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="z">Z</Label>
                                <Input
                                    id="z"
                                    type="number"
                                    {...register('z', { valueAsNumber: true })}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isDefault"
                                {...register('isDefault')}
                                className="h-4 w-4"
                            />
                            <Label htmlFor="isDefault">{t('isDefault')}</Label>
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
