'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { trpc } from '@/lib/trpc'

// Simple schema for NPC creation
const createNpcFormSchema = z.object({
    name: z.string().min(1).max(50),
    slug: z.string().max(50).nullable().optional(),
    level: z.number().int().positive(),
    currentHealth: z.number().int().positive().default(1),
    currentMana: z.number().int().positive().default(1),
    radius: z.number().int().positive().default(100),
    isInteractable: z.boolean().default(true),
    isDead: z.boolean().default(false),
    raceId: z.number().int().positive().default(1),
    npcType: z.number().int().positive().default(1),
    dialogueId: z.number().int().positive().nullable().optional(),
    questId: z.number().int().positive().nullable().optional(),
})

type CreateNpcForm = z.infer<typeof createNpcFormSchema>

export default function CreateNPCPage() {
    const t = useTranslations('npcs')
    const commonT = useTranslations('common')
    const locale = useLocale()
    const router = useRouter()

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<CreateNpcForm>({
        resolver: zodResolver(createNpcFormSchema),
        defaultValues: {
            level: 1,
            currentHealth: 100,
            currentMana: 50,
            radius: 100,
            isInteractable: true,
            isDead: false,
            raceId: 1,
            npcType: 1,
        },
    })

    // Fetch reference data
    const { data: races } = trpc.npc.getRaces.useQuery()
    const { data: npcTypes } = trpc.npc.getNpcTypes.useQuery()

    const createNpcMutation = trpc.npc.create.useMutation({
        onSuccess: (data) => {
            router.push(`/${locale}/npcs/${data.id}`)
        },
        onError: (error) => {
            console.error('Failed to create NPC:', error)
        },
    })

    const onSubmit = (data: CreateNpcForm) => {
        const npcData = {
            ...data,
            slug: data.slug || null,
            dialogueId: data.dialogueId || null,
            questId: data.questId || null,
        }
        createNpcMutation.mutate(npcData)
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">{t('create')}</h1>
                <p className="text-muted-foreground">
                    {t('description')}
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('basicInfo')}</CardTitle>
                        <CardDescription>
                            {t('basicInfoDescription')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">{t('name')}</Label>
                                <Input
                                    id="name"
                                    {...register('name')}
                                    placeholder="Enter NPC name..."
                                />
                                {errors.name && (
                                    <p className="text-sm text-red-500">{errors.name.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="slug">{t('slug')}</Label>
                                <Input
                                    id="slug"
                                    {...register('slug')}
                                    placeholder="npc-slug (optional)"
                                />
                                <p className="text-xs text-muted-foreground">
                                    {t('slugDescription')}
                                </p>
                                {errors.slug && (
                                    <p className="text-sm text-red-500">{errors.slug.message}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="level">{t('levelField')}</Label>
                                <Input
                                    id="level"
                                    type="number"
                                    min="1"
                                    {...register('level', { valueAsNumber: true })}
                                />
                                {errors.level && (
                                    <p className="text-sm text-red-500">{errors.level.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="radius">{t('radius')}</Label>
                                <Input
                                    id="radius"
                                    type="number"
                                    min="1"
                                    {...register('radius', { valueAsNumber: true })}
                                />
                                {errors.radius && (
                                    <p className="text-sm text-red-500">{errors.radius.message}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="currentHealth">{t('currentHealth')}</Label>
                                <Input
                                    id="currentHealth"
                                    type="number"
                                    min="1"
                                    {...register('currentHealth', { valueAsNumber: true })}
                                />
                                {errors.currentHealth && (
                                    <p className="text-sm text-red-500">{errors.currentHealth.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="currentMana">{t('currentMana')}</Label>
                                <Input
                                    id="currentMana"
                                    type="number"
                                    min="1"
                                    {...register('currentMana', { valueAsNumber: true })}
                                />
                                {errors.currentMana && (
                                    <p className="text-sm text-red-500">{errors.currentMana.message}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="raceId">{t('raceId')}</Label>
                                <select
                                    id="raceId"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    {...register('raceId', { valueAsNumber: true })}
                                >
                                    {races?.map((race) => (
                                        <option key={race.id} value={race.id}>
                                            {race.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.raceId && (
                                    <p className="text-sm text-red-500">{errors.raceId.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="npcType">{t('npcType')}</Label>
                                <select
                                    id="npcType"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    {...register('npcType', { valueAsNumber: true })}
                                >
                                    {npcTypes?.map((type) => (
                                        <option key={type.id} value={type.id}>
                                            {type.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.npcType && (
                                    <p className="text-sm text-red-500">{errors.npcType.message}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col space-y-4">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="isInteractable"
                                    className="rounded border border-input"
                                    {...register('isInteractable')}
                                />
                                <Label htmlFor="isInteractable">{t('isInteractable')}</Label>
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="isDead"
                                    className="rounded border border-input"
                                    {...register('isDead')}
                                />
                                <Label htmlFor="isDead">{t('isDead')}</Label>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end space-x-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push(`/${locale}/npcs`)}
                    >
                        {commonT('cancel')}
                    </Button>
                    <Button
                        type="submit"
                        disabled={createNpcMutation.isPending}
                    >
                        {createNpcMutation.isPending ? commonT('saving') : t('create')}
                    </Button>
                </div>
            </form>
        </div>
    )
}