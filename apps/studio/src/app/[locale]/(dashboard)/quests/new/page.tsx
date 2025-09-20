'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslations } from 'next-intl';
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
            router.push(`/quests/${data.id}`)
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
                    Заполните основную информацию о квесте
                </p>
            </div>

            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle>Основная информация</CardTitle>
                    <CardDescription>
                        Настройте базовые параметры квеста
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="slug">Slug квеста *</Label>
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
                            <Label htmlFor="minLevel">Минимальный уровень *</Label>
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
                                Повторяемый квест
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Можно ли брать этот квест повторно после завершения
                            </p>
                        </div>

                        {repeatable && (
                            <div className="space-y-2">
                                <Label htmlFor="cooldownSec">Кулдаун (секунды)</Label>
                                <Input
                                    id="cooldownSec"
                                    type="number"
                                    min="0"
                                    {...register('cooldownSec', { valueAsNumber: true })}
                                    disabled={isSubmitting}
                                />
                                <p className="text-sm text-muted-foreground">
                                    Время ожидания перед повторным взятием квеста
                                </p>
                                {errors.cooldownSec && (
                                    <p className="text-sm text-red-600">{errors.cooldownSec.message}</p>
                                )}
                            </div>
                        )}

                        <div className="space-y-2">
                            <NPCSelect
                                label="NPC выдающий квест"
                                value={watch('giverNpcId') ?? null}
                                onChange={(npcId) => setValue('giverNpcId', npcId)}
                            />
                            <p className="text-sm text-muted-foreground">
                                NPC, который выдает этот квест игрокам
                            </p>
                            {errors.giverNpcId && (
                                <p className="text-sm text-red-600">{errors.giverNpcId.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <NPCSelect
                                label="NPC принимающий квест"
                                value={watch('turninNpcId') ?? null}
                                onChange={(npcId) => setValue('turninNpcId', npcId)}
                            />
                            <p className="text-sm text-muted-foreground">
                                NPC, которому игрок сдает завершенный квест
                            </p>
                            {errors.turninNpcId && (
                                <p className="text-sm text-red-600">{errors.turninNpcId.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="clientQuestKey">Ключ клиентского UI</Label>
                            <Input
                                id="clientQuestKey"
                                {...register('clientQuestKey', {
                                    setValueAs: (value) => value === '' ? null : value
                                })}
                                placeholder="quest_wolf_hunt_intro_title"
                                disabled={isSubmitting}
                            />
                            <p className="text-sm text-muted-foreground">
                                Ключ для названия/описания квеста в клиентском интерфейсе
                            </p>
                            {errors.clientQuestKey && (
                                <p className="text-sm text-red-600">{errors.clientQuestKey.message}</p>
                            )}
                        </div>

                        <div className="flex gap-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.back()}
                                disabled={isSubmitting}
                            >
                                Отмена
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting || createQuest.isPending}
                            >
                                {isSubmitting || createQuest.isPending ? 'Создание...' : 'Создать квест'}
                            </Button>
                        </div>

                        {createQuest.error && (
                            <div className="text-sm text-red-600 mt-2">
                                Ошибка создания квеста: {createQuest.error.message}
                            </div>
                        )}
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}