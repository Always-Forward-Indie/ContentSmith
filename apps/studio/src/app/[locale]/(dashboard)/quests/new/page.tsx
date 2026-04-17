'use client'

import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslations, useLocale } from 'next-intl'
import { z } from 'zod'
import Link from 'next/link'
import { ChevronRight, ScrollText } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import NPCSelect from '@/components/editors/NPCSelect'

import { trpc } from '@/lib/trpc'
import { CreateQuestSchema } from '@contentsmith/validation'

type CreateQuestForm = z.infer<typeof CreateQuestSchema>

export default function NewQuestPage() {
    const t = useTranslations()
    const locale = useLocale()
    const router = useRouter()

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
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
    })

    const onSubmit = async (data: CreateQuestForm) => {
        await createQuest.mutateAsync(data)
    }

    const repeatable = watch('repeatable')

    return (
        <div className="max-w-lg mx-auto space-y-6">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Link href={`/${locale}/quests`} className="hover:text-foreground transition-colors">
                    {t('quests.title')}
                </Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-foreground font-medium">{t('quests.newQuest')}</span>
            </nav>

            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                    <ScrollText className="h-5 w-5" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t('quests.newQuest')}</h1>
                    <p className="text-sm text-muted-foreground">{t('quests.form.fillBasicInfo')}</p>
                </div>
            </div>

            {/* Form Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{t('quests.form.basicInfo')}</CardTitle>
                    <CardDescription>{t('quests.form.basicInfoDescription')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        {/* Slug */}
                        <div className="space-y-1.5">
                            <Label htmlFor="slug">{t('quests.form.slug')}</Label>
                            <Input
                                id="slug"
                                {...register('slug')}
                                placeholder="wolf_hunt_intro"
                                className="font-mono"
                                disabled={isSubmitting || createQuest.isPending}
                            />
                            {errors.slug && (
                                <p className="text-xs text-destructive">{errors.slug.message}</p>
                            )}
                        </div>

                        {/* Min Level */}
                        <div className="space-y-1.5">
                            <Label htmlFor="minLevel">{t('quests.form.minLevel')}</Label>
                            <Input
                                id="minLevel"
                                type="number"
                                min="1"
                                max="999"
                                className="w-28"
                                {...register('minLevel', { valueAsNumber: true })}
                                disabled={isSubmitting || createQuest.isPending}
                            />
                            {errors.minLevel && (
                                <p className="text-xs text-destructive">{errors.minLevel.message}</p>
                            )}
                        </div>

                        {/* Repeatable toggle */}
                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div>
                                <Label htmlFor="repeatable" className="text-sm font-medium cursor-pointer">
                                    {t('quests.form.repeatable')}
                                </Label>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {t('quests.form.repeatableDescription')}
                                </p>
                            </div>
                            <Switch
                                id="repeatable"
                                checked={!!repeatable}
                                onCheckedChange={(v) => setValue('repeatable', v)}
                                disabled={isSubmitting || createQuest.isPending}
                            />
                        </div>

                        {/* Cooldown (only if repeatable) */}
                        {repeatable && (
                            <div className="space-y-1.5">
                                <Label htmlFor="cooldownSec">{t('quests.form.cooldown')}</Label>
                                <Input
                                    id="cooldownSec"
                                    type="number"
                                    min="0"
                                    className="w-36"
                                    {...register('cooldownSec', { valueAsNumber: true })}
                                    disabled={isSubmitting || createQuest.isPending}
                                />
                                <p className="text-xs text-muted-foreground">{t('quests.form.cooldownDescription')}</p>
                                {errors.cooldownSec && (
                                    <p className="text-xs text-destructive">{errors.cooldownSec.message}</p>
                                )}
                            </div>
                        )}

                        {/* Quest Giver */}
                        <div className="space-y-1.5">
                            <NPCSelect
                                label={t('quests.form.questGiver')}
                                value={watch('giverNpcId') ?? null}
                                onChange={(npcId) => setValue('giverNpcId', npcId)}
                            />
                            <p className="text-xs text-muted-foreground">{t('quests.form.questGiverDescription')}</p>
                            {errors.giverNpcId && (
                                <p className="text-xs text-destructive">{errors.giverNpcId.message}</p>
                            )}
                        </div>

                        {/* Quest Receiver */}
                        <div className="space-y-1.5">
                            <NPCSelect
                                label={t('quests.form.questReceiver')}
                                value={watch('turninNpcId') ?? null}
                                onChange={(npcId) => setValue('turninNpcId', npcId)}
                            />
                            <p className="text-xs text-muted-foreground">{t('quests.form.questReceiverDescription')}</p>
                            {errors.turninNpcId && (
                                <p className="text-xs text-destructive">{errors.turninNpcId.message}</p>
                            )}
                        </div>

                        {/* Client Key */}
                        <div className="space-y-1.5">
                            <Label htmlFor="clientQuestKey">{t('quests.form.clientKey')}</Label>
                            <Input
                                id="clientQuestKey"
                                {...register('clientQuestKey', {
                                    setValueAs: (v) => v === '' ? null : v,
                                })}
                                placeholder="quest_wolf_hunt_intro_title"
                                className="font-mono"
                                disabled={isSubmitting || createQuest.isPending}
                            />
                            <p className="text-xs text-muted-foreground">{t('quests.form.clientKeyDescription')}</p>
                            {errors.clientQuestKey && (
                                <p className="text-xs text-destructive">{errors.clientQuestKey.message}</p>
                            )}
                        </div>

                        {/* Reputation */}
                        <div className="space-y-1.5">
                            <Label htmlFor="reputationFactionSlug">{t('quests.form.reputationFactionSlug')}</Label>
                            <Input
                                id="reputationFactionSlug"
                                {...register('reputationFactionSlug', {
                                    setValueAs: (v) => v === '' ? null : v,
                                })}
                                placeholder="city_guards"
                                className="font-mono"
                                disabled={isSubmitting || createQuest.isPending}
                            />
                            <p className="text-xs text-muted-foreground">{t('quests.form.reputationFactionSlugDescription')}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="reputationOnComplete">{t('quests.form.reputationOnComplete')}</Label>
                                <Input
                                    id="reputationOnComplete"
                                    type="number"
                                    className="w-full"
                                    {...register('reputationOnComplete', { valueAsNumber: true })}
                                    disabled={isSubmitting || createQuest.isPending}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="reputationOnFail">{t('quests.form.reputationOnFail')}</Label>
                                <Input
                                    id="reputationOnFail"
                                    type="number"
                                    className="w-full"
                                    {...register('reputationOnFail', { valueAsNumber: true })}
                                    disabled={isSubmitting || createQuest.isPending}
                                />
                            </div>
                        </div>

                        {createQuest.error && (
                            <p className="text-sm text-destructive">
                                {t('quests.createError')}: {createQuest.error.message}
                            </p>
                        )}

                        <div className="flex gap-3 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.push(`/${locale}/quests`)}
                                disabled={isSubmitting || createQuest.isPending}
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
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}