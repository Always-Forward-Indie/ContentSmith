'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslations, useLocale } from 'next-intl';
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import NPCSelect from '@/components/editors/NPCSelect'

import { trpc } from '@/lib/trpc'
import { CreateQuestSchema } from '@contentsmith/validation'

type CreateQuestForm = z.infer<typeof CreateQuestSchema>

export default function NewQuestPage() {
    const t = useTranslations();
    const locale = useLocale()
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
        watch,
    } = useForm<CreateQuestForm>({
        resolver: zodResolver(CreateQuestSchema),
        defaultValues: {
            minLevel: 1,
            repeatable: false,
            cooldownSec: 0,
        },
    })

    const createQuest = trpc.quest.create.useMutation({
        onSuccess: (data) => {
            router.push(`/${locale}/quests/${data.id}`)
        },
        onError: (error) => {
            console.error('Failed to create quest:', error)
        },
    })

    const onSubmit = async (data: CreateQuestForm) => {
        setIsSubmitting(true)
        try {
            await createQuest.mutateAsync(data)
        } finally {
            setIsSubmitting(false)
        }
    }

    const repeatable = watch('repeatable')

    return (
        <div className="container mx-auto py-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold">{t('quests.newQuest')}</h1>
                <p className="text-muted-foreground">
                    {t('quests.form.fillBasicInfo')}
                </p>
            </div>

            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle>{t('quests.form.basicInfo')}</CardTitle>
                    <CardDescription>
                        {t('quests.form.basicInfoDescription')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="slug">{t('quests.form.slug')}</Label>
                            <Input
                                id="slug"
                                {...register('slug')}
                                placeholder="wolf_hunt_intro"
                                disabled={isSubmitting}
                            />
                            {errors.slug && (
                                <p className="text-sm text-red-600">{errors.slug.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="minLevel">{t('quests.form.minLevel')}</Label>
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
                                {t('quests.form.repeatable')}
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                {t('quests.form.repeatableDescription')}
                            </p>
                        </div>

                        {repeatable && (
                            <div className="space-y-2">
                                <Label htmlFor="cooldownSec">{t('quests.form.cooldown')}</Label>
                                <Input
                                    id="cooldownSec"
                                    type="number"
                                    min="0"
                                    {...register('cooldownSec', { valueAsNumber: true })}
                                    disabled={isSubmitting}
                                />
                                <p className="text-sm text-muted-foreground">
                                    {t('quests.form.cooldownDescription')}
                                </p>
                                {errors.cooldownSec && (
                                    <p className="text-sm text-red-600">{errors.cooldownSec.message}</p>
                                )}
                            </div>
                        )}

                        <div className="space-y-2">
                            <NPCSelect
                                label={t('quests.form.questGiver')}
                                value={watch('giverNpcId') ?? null}
                                onChange={(npcId) => setValue('giverNpcId', npcId)}
                            />
                            <p className="text-sm text-muted-foreground">
                                {t('quests.form.questGiverDescription')}
                            </p>
                            {errors.giverNpcId && (
                                <p className="text-sm text-red-600">{errors.giverNpcId.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <NPCSelect
                                label={t('quests.form.questReceiver')}
                                value={watch('turninNpcId') ?? null}
                                onChange={(npcId) => setValue('turninNpcId', npcId)}
                            />
                            <p className="text-sm text-muted-foreground">
                                {t('quests.form.questReceiverDescription')}
                            </p>
                            {errors.turninNpcId && (
                                <p className="text-sm text-red-600">{errors.turninNpcId.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="clientQuestKey">{t('quests.form.clientKey')}</Label>
                            <Input
                                id="clientQuestKey"
                                {...register('clientQuestKey', {
                                    setValueAs: (value) => value === '' ? null : value
                                })}
                                placeholder="quest_wolf_hunt_intro_title"
                                disabled={isSubmitting}
                            />
                            <p className="text-sm text-muted-foreground">
                                {t('quests.form.clientKeyDescription')}
                            </p>
                            {errors.clientQuestKey && (
                                <p className="text-sm text-red-600">{errors.clientQuestKey.message}</p>
                            )}
                        </div>

                        <div className="flex gap-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.push(`/${locale}/quests`)}
                                disabled={isSubmitting}
                            >
                                {t('common.cancel')}
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting || createQuest.isPending}
                            >
                                {isSubmitting || createQuest.isPending ? t('quests.creating') : t('quests.createNew')}
                            </Button>
                        </div>

                        {createQuest.error && (
                            <div className="text-sm text-red-600 mt-2">
                                {t('quests.createError')}: {createQuest.error.message}
                            </div>
                        )}
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}