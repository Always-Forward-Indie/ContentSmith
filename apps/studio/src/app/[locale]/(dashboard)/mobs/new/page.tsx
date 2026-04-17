'use client'

import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronRight, Swords } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { trpc } from '@/lib/trpc'

const createMobFormSchema = z.object({
    name: z.string().min(1).max(50),
    slug: z.string().max(50).nullable().optional(),
    level: z.number().int().positive().default(1),
    raceId: z.number().int().positive().default(1),
    rankId: z.number().int().positive().default(1),
    currentHealth: z.number().int().positive().default(100),
    currentMana: z.number().int().min(0).default(50),
    baseXp: z.number().int().min(0).default(10),
    radius: z.number().int().positive().default(100),
    isAggressive: z.boolean().default(false),
    isDead: z.boolean().default(false),
    canEvolve: z.boolean().default(false),
    isRare: z.boolean().default(false),
    rareSpawnChance: z.number().min(0).max(1).optional(),
    rareSpawnCondition: z.string().max(30).nullable().optional(),
    factionSlug: z.string().max(60).nullable().optional(),
    biomeSlug: z.string().max(64).optional(),
    mobTypeSlug: z.string().max(64).optional(),
    repDeltaPerKill: z.number().int().optional(),
})

type CreateMobForm = z.infer<typeof createMobFormSchema>

export default function CreateMobPage() {
    const t = useTranslations('mobs')
    const commonT = useTranslations('common')
    const locale = useLocale()
    const router = useRouter()

    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
    } = useForm<CreateMobForm>({
        resolver: zodResolver(createMobFormSchema),
        defaultValues: {
            level: 1,
            currentHealth: 100,
            currentMana: 50,
            baseXp: 10,
            radius: 100,
            isAggressive: false,
            isDead: false,
            raceId: 1,
            rankId: 1,
            canEvolve: false,
            isRare: false,
            rareSpawnChance: 0,
            biomeSlug: '',
            mobTypeSlug: 'beast',
            repDeltaPerKill: 0,
        },
    })

    const { data: races } = trpc.mobs.getMobRaces.useQuery()
    const { data: ranks } = trpc.mobs.getMobRanks.useQuery()

    const createMobMutation = trpc.mobs.create.useMutation({
        onSuccess: (data) => { router.push(`/${locale}/mobs/${data.id}`) },
        onError: (error) => { console.error('Failed to create mob:', error) },
    })

    const onSubmit = (data: CreateMobForm) => {
        createMobMutation.mutate({ ...data, slug: data.slug || null })
    }

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Link href={`/${locale}/mobs`} className="hover:text-foreground transition-colors">{t('title')}</Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-foreground font-medium">{t('createNew')}</span>
            </nav>

            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-destructive/10 text-destructive shrink-0">
                    <Swords className="h-5 w-5" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t('createNew')}</h1>
                    <p className="text-sm text-muted-foreground">{t('description')}</p>
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
                                <Input id="name" {...register('name')} placeholder="Forest Wolf" />
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
                                    <Select value={field.value?.toString()} onValueChange={v => field.onChange(parseInt(v))}>
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
                                    <Select value={field.value?.toString()} onValueChange={v => field.onChange(parseInt(v))}>
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

                {/* Properties */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('properties')}</CardTitle>
                        <CardDescription>{t('propertiesDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                            <p className="text-sm font-medium">{t('canEvolve')}</p>
                            <Controller name="canEvolve" control={control}
                                render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                            <p className="text-sm font-medium">{t('isRare')}</p>
                            <Controller name="isRare" control={control}
                                render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="rareSpawnChance">{t('rareSpawnChance')}</Label>
                                <Input id="rareSpawnChance" type="number" step="0.001" min={0} max={1}
                                    {...register('rareSpawnChance', { valueAsNumber: true })} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="rareSpawnCondition">{t('rareSpawnCondition')}</Label>
                                <Input id="rareSpawnCondition" {...register('rareSpawnCondition')} placeholder="night_only" />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="factionSlug">{t('factionSlug')}</Label>
                                <Input id="factionSlug" {...register('factionSlug')} placeholder="undead" />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="biomeSlug">{t('biomeSlug')}</Label>
                                <Input id="biomeSlug" {...register('biomeSlug')} placeholder="forest" />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="mobTypeSlug">{t('mobTypeSlug')}</Label>
                                <Input id="mobTypeSlug" {...register('mobTypeSlug')} placeholder="beast" />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="repDeltaPerKill">{t('repDeltaPerKill')}</Label>
                                <Input id="repDeltaPerKill" type="number"
                                    {...register('repDeltaPerKill', { valueAsNumber: true })} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-3">
                    <Link href={`/${locale}/mobs`}>
                        <Button type="button" variant="outline">{commonT('cancel')}</Button>
                    </Link>
                    <Button type="submit" disabled={createMobMutation.isPending}>
                        {createMobMutation.isPending ? commonT('saving') : t('create')}
                    </Button>
                </div>
            </form>
        </div>
    )
}
