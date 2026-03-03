'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import Link from 'next/link'
import { ChevronRight, ScrollText, AlertCircle } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
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

    const { data: quest, isLoading, error } = trpc.quest.byId.useQuery({ id: questId })

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
        watch,
        setValue,
    } = useForm<UpdateQuestForm>({
        resolver: zodResolver(UpdateQuestSchema),
    })

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
    })

    const onSubmit = async (data: UpdateQuestForm) => {
        await updateQuest.mutateAsync(data)
    }

    const repeatable = watch('repeatable')

    if (isLoading) {
        return (
            <div className="max-w-lg mx-auto space-y-6 animate-pulse">
                <div className="h-5 bg-muted rounded w-48" />
                <div className="h-9 bg-muted rounded w-56" />
                <div className="h-96 bg-muted rounded-lg" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
                <AlertCircle className="h-10 w-10 text-destructive/70" />
                <p className="text-destructive font-medium">{t('edit.errorLoading')}: {error.message}</p>
                <Link href={`/${locale}/quests/${questId}`}>
                    <Button variant="outline" size="sm">{tCommon('back')}</Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="max-w-lg mx-auto space-y-6">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Link href={`/${locale}/quests`} className="hover:text-foreground transition-colors">
                    {t('title')}
                </Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <Link
                    href={`/${locale}/quests/${questId}`}
                    className="hover:text-foreground transition-colors font-mono"
                >
                    {quest?.slug ?? `#${questId}`}
                </Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-foreground font-medium">{t('edit.title')}</span>
            </nav>

            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                    <ScrollText className="h-5 w-5" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t('edit.title')}</h1>
                    <p className="text-sm text-muted-foreground">{t('edit.description', { slug: quest?.slug ?? '' })}</p>
                </div>
            </div>

            {/* Form Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{t('edit.basicInfo')}</CardTitle>
                    <CardDescription>{t('edit.basicInfoDescription')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        {/* Slug */}
                        <div className="space-y-1.5">
                            <Label htmlFor="slug">{t('form.slug')}</Label>
                            <Input
                                id="slug"
                                {...register('slug')}
                                className="font-mono"
                                disabled={isSubmitting || updateQuest.isPending}
                            />
                            {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
                        </div>

                        {/* Min Level */}
                        <div className="space-y-1.5">
                            <Label htmlFor="minLevel">{t('form.minLevel')}</Label>
                            <Input
                                id="minLevel"
                                type="number"
                                min="1"
                                max="999"
                                className="w-28"
                                {...register('minLevel', { valueAsNumber: true })}
                                disabled={isSubmitting || updateQuest.isPending}
                            />
                            {errors.minLevel && <p className="text-xs text-destructive">{errors.minLevel.message}</p>}
                        </div>

                        {/* Repeatable toggle */}
                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div>
                                <Label htmlFor="repeatable" className="text-sm font-medium cursor-pointer">
                                    {t('form.repeatable')}
                                </Label>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {t('form.repeatableDescription')}
                                </p>
                            </div>
                            <Switch
                                id="repeatable"
                                checked={!!repeatable}
                                onCheckedChange={(v) => setValue('repeatable', v)}
                                disabled={isSubmitting || updateQuest.isPending}
                            />
                        </div>

                        {/* Cooldown */}
                        {repeatable && (
                            <div className="space-y-1.5">
                                <Label htmlFor="cooldownSec">{t('form.cooldown')}</Label>
                                <Input
                                    id="cooldownSec"
                                    type="number"
                                    min="0"
                                    className="w-36"
                                    {...register('cooldownSec', { valueAsNumber: true })}
                                    disabled={isSubmitting || updateQuest.isPending}
                                />
                                <p className="text-xs text-muted-foreground">{t('form.cooldownDescription')}</p>
                                {errors.cooldownSec && <p className="text-xs text-destructive">{errors.cooldownSec.message}</p>}
                            </div>
                        )}

                        {/* Quest Giver */}
                        <div className="space-y-1.5">
                            <NPCSelect
                                label={t('form.questGiver')}
                                value={watch('giverNpcId') ?? null}
                                onChange={(npcId) => setValue('giverNpcId', npcId)}
                            />
                            <p className="text-xs text-muted-foreground">{t('form.questGiverDescription')}</p>
                            {errors.giverNpcId && <p className="text-xs text-destructive">{errors.giverNpcId.message}</p>}
                        </div>

                        {/* Quest Receiver */}
                        <div className="space-y-1.5">
                            <NPCSelect
                                label={t('form.questReceiver')}
                                value={watch('turninNpcId') ?? null}
                                onChange={(npcId) => setValue('turninNpcId', npcId)}
                            />
                            <p className="text-xs text-muted-foreground">{t('form.questReceiverDescription')}</p>
                            {errors.turninNpcId && <p className="text-xs text-destructive">{errors.turninNpcId.message}</p>}
                        </div>

                        {/* Client Key */}
                        <div className="space-y-1.5">
                            <Label htmlFor="clientQuestKey">{t('form.clientKey')}</Label>
                            <Input
                                id="clientQuestKey"
                                {...register('clientQuestKey', {
                                    setValueAs: (v) => v === '' ? null : v,
                                })}
                                placeholder="quest_wolf_hunt_intro_title"
                                className="font-mono"
                                disabled={isSubmitting || updateQuest.isPending}
                            />
                            <p className="text-xs text-muted-foreground">{t('form.clientKeyDescription')}</p>
                            {errors.clientQuestKey && <p className="text-xs text-destructive">{errors.clientQuestKey.message}</p>}
                        </div>

                        {updateQuest.error && (
                            <p className="text-sm text-destructive">
                                {t('edit.updateError', { error: updateQuest.error.message })}
                            </p>
                        )}

                        <div className="flex gap-3 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.push(`/${locale}/quests/${questId}`)}
                                disabled={isSubmitting || updateQuest.isPending}
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
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}