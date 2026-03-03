'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Swords, AlertCircle, ChevronRight, MapPin } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { trpc } from '@/lib/trpc'

const editMobFormSchema = z.object({
    name: z.string().min(1).max(50),
    slug: z.string().max(50).nullable().optional(),
    level: z.number().int().positive(),
    raceId: z.number().int().positive(),
    rankId: z.number().int().positive(),
    currentHealth: z.number().int().positive(),
    currentMana: z.number().int().min(0),
    baseXp: z.number().int().min(0),
    radius: z.number().int().positive(),
    isAggressive: z.boolean(),
    isDead: z.boolean(),
    positionX: z.number().nullable().optional(),
    positionY: z.number().nullable().optional(),
    positionZ: z.number().nullable().optional(),
})

type EditMobForm = z.infer<typeof editMobFormSchema>

function EditSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-1.5">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                </div>
            </div>
            <Skeleton className="h-72 rounded-lg" />
            <Skeleton className="h-48 rounded-lg" />
        </div>
    )
}

export default function EditMobPage() {
    const params = useParams()
    const mobId = parseInt(params.id as string)
    const t = useTranslations('mobs')
    const commonT = useTranslations('common')
    const locale = useLocale()
    const router = useRouter()

    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
        reset,
    } = useForm<EditMobForm>({
        resolver: zodResolver(editMobFormSchema),
    })

    const { data: mob, isLoading, error } = trpc.mobs.getById.useQuery(mobId)
    const { data: races } = trpc.mobs.getMobRaces.useQuery()
    const { data: ranks } = trpc.mobs.getMobRanks.useQuery()

    const updateMobMutation = trpc.mobs.update.useMutation({
        onSuccess: (data) => { router.push(`/${locale}/mobs/${data.id}`) },
        onError: (error) => { console.error('Failed to update mob:', error) },
    })

    const updatePositionMutation = trpc.mobs.updatePosition.useMutation({
        onError: (error) => { console.error('Failed to update position:', error) },
    })

    useEffect(() => {
        if (mob) {
            reset({
                name: mob.name,
                slug: mob.slug,
                level: mob.level,
                raceId: mob.raceId ?? 1,
                rankId: mob.rankId ?? 1,
                currentHealth: mob.currentHealth ?? 1,
                currentMana: mob.currentMana ?? 0,
                baseXp: mob.baseXp ?? 0,
                radius: mob.radius ?? 100,
                isAggressive: mob.isAggressive ?? false,
                isDead: mob.isDead ?? false,
                positionX: mob.positionX as number ?? undefined,
                positionY: mob.positionY as number ?? undefined,
                positionZ: mob.positionZ as number ?? undefined,
            })
        }
    }, [mob, races, ranks, reset])

    const onSubmit = async (data: EditMobForm) => {
        const { positionX, positionY, positionZ, ...mobData } = data
        await updateMobMutation.mutateAsync({ id: mobId, ...mobData, slug: mobData.slug || null })
        if (positionX != null || positionY != null || positionZ != null) {
            await updatePositionMutation.mutateAsync({
                mobId,
                x: positionX ?? undefined,
                y: positionY ?? undefined,
                z: positionZ ?? undefined,
            })
        }
    }

    if (isLoading) return <EditSkeleton />

    if (error || !mob) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
                <AlertCircle className="h-10 w-10 text-destructive/70" />
                <p className="text-destructive font-medium">{error?.message ?? 'Mob not found'}</p>
                <Link href={`/${locale}/mobs`}>
                    <Button variant="outline" size="sm">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        {commonT('back')}
                    </Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Link href={`/${locale}/mobs`} className="hover:text-foreground transition-colors">{t('title')}</Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <Link href={`/${locale}/mobs/${mobId}`} className="hover:text-foreground transition-colors">{mob.name}</Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-foreground font-medium">{commonT('edit')}</span>
            </nav>

            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-destructive/10 text-destructive shrink-0">
                    <Swords className="h-5 w-5" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t('edit')}: {mob.name}</h1>
                    <p className="text-sm text-muted-foreground">ID: {mob.id}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Basic Info */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('basicInfo')}</CardTitle>
                        <CardDescription>{t('basicInfoDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 space-y-1.5">
                                <Label htmlFor="name">{t('name')}</Label>
                                <Input id="name" {...register('name')} />
                                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                            </div>
                            <div className="col-span-2 space-y-1.5">
                                <Label htmlFor="slug">{t('slug')}</Label>
                                <Input id="slug" {...register('slug')} placeholder="forest_wolf" />
                                <p className="text-xs text-muted-foreground">{t('slugDescription')}</p>
                            </div>
                            <div className="space-y-1.5">
                                <Label>{t('raceId')}</Label>
                                <Controller name="raceId" control={control} render={({ field }) => (
                                    <Select key={`race-${races?.length ?? 0}-${field.value}`} value={field.value?.toString()} onValueChange={v => field.onChange(parseInt(v))}>
                                        <SelectTrigger><SelectValue placeholder="Select race..." /></SelectTrigger>
                                        <SelectContent>
                                            {races?.map(r => (
                                                <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>{t('rankId')}</Label>
                                <Controller name="rankId" control={control} render={({ field }) => (
                                    <Select key={`rank-${ranks?.length ?? 0}-${field.value}`} value={field.value?.toString()} onValueChange={v => field.onChange(parseInt(v))}>
                                        <SelectTrigger><SelectValue placeholder="Select rank..." /></SelectTrigger>
                                        <SelectContent>
                                            {ranks?.map(r => (
                                                <SelectItem key={r.rankId} value={r.rankId.toString()}>
                                                    <span className="capitalize">{r.code}</span>
                                                    <span className="text-muted-foreground ml-1">(×{r.mult})</span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="level">{t('levelField')}</Label>
                                <Input id="level" type="number" min={1} {...register('level', { valueAsNumber: true })} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="radius">{t('radius')}</Label>
                                <Input id="radius" type="number" min={1} {...register('radius', { valueAsNumber: true })} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Combat Stats */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('combatInfo')}</CardTitle>
                        <CardDescription>{t('combatInfoDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="currentHealth">{t('currentHealth')}</Label>
                                <Input id="currentHealth" type="number" min={1} {...register('currentHealth', { valueAsNumber: true })} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="currentMana">{t('currentMana')}</Label>
                                <Input id="currentMana" type="number" min={0} {...register('currentMana', { valueAsNumber: true })} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="baseXp">{t('baseXp')}</Label>
                                <Input id="baseXp" type="number" min={0} {...register('baseXp', { valueAsNumber: true })} />
                            </div>
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                            <p className="text-sm font-medium">{t('isAggressive')}</p>
                            <Controller name="isAggressive" control={control}
                                render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                            <p className="text-sm font-medium">{t('isDead')}</p>
                            <Controller name="isDead" control={control}
                                render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
                        </div>
                    </CardContent>
                </Card>

                {/* Position */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {t('position')}
                        </CardTitle>
                        <CardDescription>{t('positionDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="positionX">{t('positionX')}</Label>
                                <Input id="positionX" type="number" step="any" {...register('positionX', { valueAsNumber: true })} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="positionY">{t('positionY')}</Label>
                                <Input id="positionY" type="number" step="any" {...register('positionY', { valueAsNumber: true })} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="positionZ">{t('positionZ')}</Label>
                                <Input id="positionZ" type="number" step="any" {...register('positionZ', { valueAsNumber: true })} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-3">
                    <Link href={`/${locale}/mobs/${mobId}`}>
                        <Button type="button" variant="outline">{commonT('cancel')}</Button>
                    </Link>
                    <Button type="submit" disabled={updateMobMutation.isPending || updatePositionMutation.isPending}>
                        {updateMobMutation.isPending ? commonT('saving') : t('update')}
                    </Button>
                </div>
            </form>
        </div>
    )
}
