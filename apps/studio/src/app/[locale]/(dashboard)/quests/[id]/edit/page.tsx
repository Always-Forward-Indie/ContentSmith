'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ArrowLeft } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import NPCSelect from '@/components/editors/NPCSelect'

import { trpc } from '@/lib/trpc'
import { UpdateQuestSchema } from '@contentsmith/validation'

type UpdateQuestForm = z.infer<typeof UpdateQuestSchema>

export default function EditQuestPage() {
    const t = useTranslations('quests')
    const tCommon = useTranslations('common')
    const locale = useLocale()
    const params = useParams()
    const router = useRouter()
    const questId = parseInt(params.id as string, 10)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Fetch current quest data
    const { data: quest, isLoading, error } = trpc.quest.byId.useQuery({
        id: questId,
    })

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        watch,
        setValue,
    } = useForm<UpdateQuestForm>({
        resolver: zodResolver(UpdateQuestSchema),
    })

    // Reset form when quest data loads
    useEffect(() => {
        if (quest) {
            reset({
                id: quest.id,
                slug: quest.slug,
                minLevel: quest.minLevel,
                repeatable: quest.repeatable,
                cooldownSec: quest.cooldownSec,
                giverNpcId: quest.giverNpcId,
                turninNpcId: quest.turninNpcId,
                clientQuestKey: quest.clientQuestKey,
            })
        }
    }, [quest, reset])

    const updateQuest = trpc.quest.update.useMutation({
        onSuccess: () => {
            router.push(`/${locale}/quests/${questId}`)
        },
        onError: (error) => {
            console.error('Failed to update quest:', error)
        },
    })

    const onSubmit = async (data: UpdateQuestForm) => {
        setIsSubmitting(true)
        try {
            await updateQuest.mutateAsync(data)
        } finally {
            setIsSubmitting(false)
        }
    }

    const repeatable = watch('repeatable')

    if (isLoading) {
        return (
            <div className="container mx-auto py-6">
                <div className="mb-6">
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-96" />
                </div>
                <Skeleton className="h-96 max-w-2xl" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="container mx-auto py-6">
                <div className="text-center py-8">
                    <h1 className="text-2xl font-bold mb-2">{t('edit.errorLoading')}</h1>
                    <p className="text-red-600 mb-4">{error.message}</p>
                    <Button onClick={() => router.push(`/${locale}/quests/${questId}`)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {t('edit.back')}
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-6">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="outline" onClick={() => router.push(`/quests/${questId}`)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('edit.back')}
                </Button>
                <div>
                    <h1 className="text-3xl font-bold">{t('edit.title')}</h1>
                    <p className="text-muted-foreground">
                        {t('edit.description', { slug: quest?.slug })}
                    </p>
                </div>
            </div>

            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle>{t('edit.basicInfo')}</CardTitle>
                    <CardDescription>
                        {t('edit.basicInfoDescription')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="slug">{t('form.slug')}</Label>
                            <Input
                                id="slug"
                                {...register('slug')}
                                disabled={isSubmitting}
                            />
                            {errors.slug && (
                                <p className="text-sm text-red-600">{errors.slug.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="minLevel">{t('form.minLevel')}</Label>
                            <Input
                                id="minLevel"
                                type="number"
                                min="1"
                                max="999"
                                {...register('minLevel', { valueAsNumber: true })}
                                disabled={isSubmitting}
                            />
                            {errors.minLevel && (
                                <p className="text-sm text-red-600">{errors.minLevel.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="repeatable" className="flex items-center gap-2">
                                <input
                                    id="repeatable"
                                    type="checkbox"
                                    {...register('repeatable')}
                                    disabled={isSubmitting}
                                />
                                {t('form.repeatable')}
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                {t('form.repeatableDescription')}
                            </p>
                        </div>

                        {repeatable && (
                            <div className="space-y-2">
                                <Label htmlFor="cooldownSec">{t('form.cooldown')}</Label>
                                <Input
                                    id="cooldownSec"
                                    type="number"
                                    min="0"
                                    {...register('cooldownSec', { valueAsNumber: true })}
                                    disabled={isSubmitting}
                                />
                                <p className="text-sm text-muted-foreground">
                                    {t('form.cooldownDescription')}
                                </p>
                                {errors.cooldownSec && (
                                    <p className="text-sm text-red-600">{errors.cooldownSec.message}</p>
                                )}
                            </div>
                        )}

                        <div className="space-y-2">
                            <NPCSelect
                                label={t('form.questGiver')}
                                value={watch('giverNpcId') ?? null}
                                onChange={(npcId) => setValue('giverNpcId', npcId)}
                            />
                            <p className="text-sm text-muted-foreground">
                                {t('form.questGiverDescription')}
                            </p>
                            {errors.giverNpcId && (
                                <p className="text-sm text-red-600">{errors.giverNpcId.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <NPCSelect
                                label={t('form.questReceiver')}
                                value={watch('turninNpcId') ?? null}
                                onChange={(npcId) => setValue('turninNpcId', npcId)}
                            />
                            <p className="text-sm text-muted-foreground">
                                {t('form.questReceiverDescription')}
                            </p>
                            {errors.turninNpcId && (
                                <p className="text-sm text-red-600">{errors.turninNpcId.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="clientQuestKey">{t('form.clientKey')}</Label>
                            <Input
                                id="clientQuestKey"
                                {...register('clientQuestKey', {
                                    setValueAs: (value) => value === '' ? null : value
                                })}
                                placeholder="quest_wolf_hunt_intro_title"
                                disabled={isSubmitting}
                            />
                            <p className="text-sm text-muted-foreground">
                                {t('form.clientKeyDescription')}
                            </p>
                            {errors.clientQuestKey && (
                                <p className="text-sm text-red-600">{errors.clientQuestKey.message}</p>
                            )}
                        </div>

                        <div className="flex gap-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.push(`/${locale}/quests/${questId}`)}
                                disabled={isSubmitting}
                            >
                                {t('edit.cancel')}
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting || updateQuest.isPending}
                            >
                                {isSubmitting || updateQuest.isPending ? t('edit.saving') : t('edit.saveChanges')}
                            </Button>
                        </div>

                        {updateQuest.error && (
                            <div className="text-sm text-red-600 mt-2">
                                {t('edit.updateError', { error: updateQuest.error.message })}
                            </div>
                        )}
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}