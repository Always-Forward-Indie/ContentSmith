'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { ArrowLeft } from 'lucide-react'

const optNum = () =>
    z.preprocess(
        v => v === '' || v === null || v === undefined || (typeof v === 'number' && isNaN(v as number)) ? undefined : Number(v),
        z.number().optional()
    )

const formSchema = z.object({
    slug: z.string().min(1, 'Slug is required').max(255),
    gameZoneId: optNum(),
    triggerType: z.string().optional(),
    durationSec: optNum(),
    lootMultiplier: optNum(),
    spawnRateMultiplier: optNum(),
    mobSpeedMultiplier: optNum(),
    announceKey: z.string().optional(),
    intervalHours: optNum(),
    hasInvasionWave: z.boolean().default(false),
    invasionWaveCount: optNum(),
})

type FormData = z.infer<typeof formSchema>

export default function EditZoneEventPage() {
    const t = useTranslations('zoneEvents')
    const commonT = useTranslations('common')
    const router = useRouter()
    const locale = useLocale()
    const params = useParams()
    const id = Number(params.id)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const { data: zonesData } = trpc.zones.list.useQuery({ pageSize: 200 })
    const zones = (zonesData?.data ?? []) as { id: number; name?: string; slug: string }[]

    const { data, isLoading } = trpc.zoneEvents.getById.useQuery({ id })

    const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(formSchema),
    })

    useEffect(() => {
        if (data) {
            reset({
                slug: data.slug,
                gameZoneId: data.gameZoneId ?? undefined,
                triggerType: data.triggerType ?? undefined,
                durationSec: data.durationSec ?? undefined,
                lootMultiplier: data.lootMultiplier ?? undefined,
                spawnRateMultiplier: data.spawnRateMultiplier ?? undefined,
                mobSpeedMultiplier: data.mobSpeedMultiplier ?? undefined,
                announceKey: data.announceKey ?? undefined,
                intervalHours: data.intervalHours ?? undefined,
                hasInvasionWave: data.hasInvasionWave ?? false,
                invasionWaveCount: data.invasionWaveCount ?? undefined,
            })
        }
    }, [data, reset])

    const updateMutation = trpc.zoneEvents.update.useMutation({
        onSuccess: () => {
            toast.success(t('updateSuccess'))
            router.push(`/${locale}/zone-events`)
        },
        onError: (error) => {
            toast.error(commonT('error'), error.message)
            setIsSubmitting(false)
        },
    })

    const onSubmit = (formData: FormData) => {
        setIsSubmitting(true)
        updateMutation.mutate({ id, ...formData })
    }

    if (isLoading) return (
        <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
    )

    return (
        <div className="container mx-auto p-6 max-w-2xl">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" onClick={() => router.push(`/${locale}/zone-events`)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {commonT('back')}
                </Button>
                <h1 className="text-3xl font-bold">{t('edit')}</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('edit')}</CardTitle>
                    <CardDescription>{data?.slug}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="slug">{t('slug')}</Label>
                            <Input id="slug" {...register('slug')} />
                            {errors.slug && <p className="text-sm text-red-600">{errors.slug.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="zoneId">{t('zone')}</Label>
                            <select
                                id="gameZoneId"
                                {...register('gameZoneId')}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="">{t('selectZone')}</option>
                                {zones.map(z => (
                                    <option key={z.id} value={z.id}>{z.name ?? z.slug}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="triggerType">{t('triggerType')}</Label>
                            <Input id="triggerType" {...register('triggerType')} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="durationSec">{t('durationSec')}</Label>
                                <Input id="durationSec" type="number" {...register('durationSec')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="intervalHours">{t('intervalHours')}</Label>
                                <Input id="intervalHours" type="number" {...register('intervalHours')} />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="lootMultiplier">{t('lootMultiplier')}</Label>
                                <Input id="lootMultiplier" type="number" step="any" {...register('lootMultiplier')} placeholder="1.5" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="spawnRateMultiplier">{t('spawnRateMultiplier')}</Label>
                                <Input id="spawnRateMultiplier" type="number" step="any" {...register('spawnRateMultiplier')} placeholder="1.0" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="mobSpeedMultiplier">{t('mobSpeedMultiplier')}</Label>
                                <Input id="mobSpeedMultiplier" type="number" step="any" {...register('mobSpeedMultiplier')} placeholder="1.0" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="announceKey">{t('announceKey')}</Label>
                            <Input id="announceKey" {...register('announceKey')} />
                        </div>

                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="hasInvasionWave" {...register('hasInvasionWave')} className="h-4 w-4 rounded border-input" />
                            <Label htmlFor="hasInvasionWave">{t('hasInvasionWave')}</Label>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="invasionWaveCount">{t('invasionWaveCount')}</Label>
                            <Input id="invasionWaveCount" type="number" {...register('invasionWaveCount')} />
                        </div>

                        <div className="flex gap-4 pt-4">
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? commonT('loading') : commonT('save')}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => router.push(`/${locale}/zone-events`)}>
                                {commonT('cancel')}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
