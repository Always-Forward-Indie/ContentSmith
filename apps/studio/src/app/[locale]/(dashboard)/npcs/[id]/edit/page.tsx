'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Users, AlertCircle, Save, ChevronRight } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { NpcAttributesManager } from '@/components/npc/NpcAttributesManager'
import { NpcSkillsManager } from '@/components/npc/NpcSkillsManager'
import { trpc } from '@/lib/trpc'

const editNpcFormSchema = z.object({
    name: z.string().min(1).max(50),
    slug: z.string().max(50).nullable().optional(),
    level: z.number().int().positive(),
    currentHealth: z.number().int().positive(),
    currentMana: z.number().int().positive(),
    radius: z.number().int().positive(),
    isInteractable: z.boolean(),
    isDead: z.boolean(),
    raceId: z.number().int().positive(),
    npcType: z.number().int().positive(),
})

type EditNpcForm = z.infer<typeof editNpcFormSchema>

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

export default function EditNPCPage() {
    const params = useParams()
    const npcId = parseInt(params.id as string)
    const t = useTranslations('npcs')
    const commonT = useTranslations('common')
    const locale = useLocale()
    const router = useRouter()

    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
        reset,
    } = useForm<EditNpcForm>({
        resolver: zodResolver(editNpcFormSchema),
    })

    const { data: npc, isLoading, error, refetch } = trpc.npc.getById.useQuery(npcId)
    const { data: races } = trpc.npc.getRaces.useQuery()
    const { data: npcTypes } = trpc.npc.getNpcTypes.useQuery()

    const updateNpcMutation = trpc.npc.update.useMutation({
        onSuccess: (data) => {
            router.push(`/${locale}/npcs/${data.id}`)
        },
        onError: (error) => {
            console.error('Failed to update NPC:', error)
        },
    })

    useEffect(() => {
        if (npc && races && npcTypes) {
            reset({
                name: npc.name,
                slug: npc.slug,
                level: npc.level,
                currentHealth: npc.currentHealth,
                currentMana: npc.currentMana,
                radius: npc.radius,
                isInteractable: npc.isInteractable,
                isDead: npc.isDead,
                raceId: npc.raceId,
                npcType: npc.npcType,
            })
        }
    }, [npc, races, npcTypes, reset])

    const onSubmit = (data: EditNpcForm) => {
        updateNpcMutation.mutate({
            id: npcId,
            ...data,
            slug: data.slug || null,
        })
    }

    if (isLoading) return <EditSkeleton />

    if (error || !npc) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
                <AlertCircle className="h-10 w-10 text-destructive/70" />
                <p className="text-destructive font-medium">
                    {error ? `${commonT('error')}: ${error.message}` : 'NPC not found'}
                </p>
                <Link href={`/${locale}/npcs`}>
                    <Button variant="outline" size="sm">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        {commonT('back')}
                    </Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Link href={`/${locale}/npcs`} className="hover:text-foreground transition-colors">
                    {t('title')}
                </Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <Link href={`/${locale}/npcs/${npcId}`} className="hover:text-foreground transition-colors">
                    {npc.name}
                </Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-foreground font-medium">{t('edit')}</span>
            </nav>

            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                    <Users className="h-5 w-5" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        {t('edit')} — {npc.name}
                    </h1>
                    {npc.slug && (
                        <p className="text-sm text-muted-foreground font-mono mt-0.5">{npc.slug}</p>
                    )}
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('basicInfo')}</CardTitle>
                        <CardDescription>{t('basicInfoDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">{t('name')}</Label>
                                <Input id="name" {...register('name')} />
                                {errors.name && (
                                    <p className="text-xs text-destructive">{errors.name.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="slug">{t('slug')}</Label>
                                <Input id="slug" {...register('slug')} className="font-mono" />
                                <p className="text-xs text-muted-foreground">{t('slugDescription')}</p>
                                {errors.slug && (
                                    <p className="text-xs text-destructive">{errors.slug.message}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="level">{t('levelField')}</Label>
                                <Input id="level" type="number" min="1"
                                    {...register('level', { valueAsNumber: true })} />
                                {errors.level && (
                                    <p className="text-xs text-destructive">{errors.level.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="radius">{t('radius')}</Label>
                                <Input id="radius" type="number" min="1"
                                    {...register('radius', { valueAsNumber: true })} />
                                {errors.radius && (
                                    <p className="text-xs text-destructive">{errors.radius.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="currentHealth">{t('currentHealth')}</Label>
                                <Input id="currentHealth" type="number" min="1"
                                    {...register('currentHealth', { valueAsNumber: true })} />
                                {errors.currentHealth && (
                                    <p className="text-xs text-destructive">{errors.currentHealth.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="currentMana">{t('currentMana')}</Label>
                                <Input id="currentMana" type="number" min="1"
                                    {...register('currentMana', { valueAsNumber: true })} />
                                {errors.currentMana && (
                                    <p className="text-xs text-destructive">{errors.currentMana.message}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('raceId')}</Label>
                                <Controller
                                    name="raceId"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            key={field.value}
                                            value={field.value?.toString()}
                                            onValueChange={(v) => field.onChange(parseInt(v))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {races?.map((race) => (
                                                    <SelectItem key={race.id} value={race.id.toString()}>
                                                        {race.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {errors.raceId && (
                                    <p className="text-xs text-destructive">{errors.raceId.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label>{t('npcType')}</Label>
                                <Controller
                                    name="npcType"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            key={field.value}
                                            value={field.value?.toString()}
                                            onValueChange={(v) => field.onChange(parseInt(v))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {npcTypes?.map((type) => (
                                                    <SelectItem key={type.id} value={type.id.toString()}>
                                                        {type.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {errors.npcType && (
                                    <p className="text-xs text-destructive">{errors.npcType.message}</p>
                                )}
                            </div>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-center justify-between rounded-lg border p-3">
                                <p className="text-sm font-medium">{t('isInteractable')}</p>
                                <Controller
                                    name="isInteractable"
                                    control={control}
                                    render={({ field }) => (
                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                    )}
                                />
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-3">
                                <p className="text-sm font-medium">{t('isDead')}</p>
                                <Controller
                                    name="isDead"
                                    control={control}
                                    render={({ field }) => (
                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                    )}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push(`/${locale}/npcs/${npcId}`)}
                    >
                        {commonT('cancel')}
                    </Button>
                    <Button type="submit" disabled={updateNpcMutation.isPending} className="gap-1.5">
                        <Save className="h-4 w-4" />
                        {updateNpcMutation.isPending ? commonT('saving') : t('update')}
                    </Button>
                </div>
            </form>

            <NpcAttributesManager
                npcId={npcId}
                attributes={npc.attributes || []}
                onUpdate={() => refetch()}
            />
            <NpcSkillsManager
                npcId={npcId}
                skills={npc.skills || []}
                onUpdate={() => refetch()}
            />
        </div>
    )
}
