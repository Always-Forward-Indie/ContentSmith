'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import NPCSelect from '@/components/editors/NPCSelect'

const QuestStepFormSchema = z.object({
    stepIndex: z.number().min(0),
    stepType: z.enum(['collect', 'kill', 'talk', 'reach', 'custom']),
    params: z.record(z.unknown()),
    clientStepKey: z.string().nullable().optional(),
})

type QuestStepForm = z.infer<typeof QuestStepFormSchema>

interface QuestStepEditorProps {
    questId: number
    step?: {
        id: number
        stepIndex: number
        stepType: string
        params?: unknown
        clientStepKey?: string | null
    }
    onSave: (data: QuestStepForm & { id?: number }) => Promise<void>
    onCancel: () => void
    isSubmitting?: boolean
}

export function QuestStepEditor({
    questId,
    step,
    onSave,
    onCancel,
    isSubmitting = false
}: QuestStepEditorProps) {
    const t = useTranslations('quests.stepEditor')

    const stepTypeOptions = [
        { value: 'collect', label: t('fields.stepTypeOptions.collect') },
        { value: 'kill', label: t('fields.stepTypeOptions.kill') },
        { value: 'talk', label: t('fields.stepTypeOptions.talk') },
        { value: 'reach', label: t('fields.stepTypeOptions.reach') },
        { value: 'custom', label: t('fields.stepTypeOptions.custom') },
    ]

    const stepParams = (step?.params as Record<string, any>) || {}
    const [paramsJson, setParamsJson] = useState(
        step ? JSON.stringify(stepParams, null, 2) : '{}'
    )

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
        watch,
    } = useForm<QuestStepForm>({
        resolver: zodResolver(QuestStepFormSchema),
        defaultValues: {
            stepIndex: step?.stepIndex ?? 0,
            stepType: (step?.stepType as any) ?? 'collect',
            params: stepParams,
            clientStepKey: step?.clientStepKey,
        },
    })

    const stepType = watch('stepType')

    // Синхронизируем изменения типа шага с JSON
    useEffect(() => {
        if (stepType) {
            // При смене типа шага, если JSON пустой или содержит данные от другого типа,
            // создаем базовый шаблон параметров
            try {
                const currentParams = JSON.parse(paramsJson)
                if (Object.keys(currentParams).length === 0) {
                    const defaultParams = getDefaultParamsForType(stepType)
                    const newJson = JSON.stringify(defaultParams, null, 2)
                    setParamsJson(newJson)
                    setValue('params', defaultParams)
                }
            } catch {
                // Invalid JSON, create default params
                const defaultParams = getDefaultParamsForType(stepType)
                const newJson = JSON.stringify(defaultParams, null, 2)
                setParamsJson(newJson)
                setValue('params', defaultParams)
            }
        }
    }, [stepType])

    const getDefaultParamsForType = (type: string) => {
        switch (type) {
            case 'collect':
                return { itemId: '', count: 1 }
            case 'kill':
                return { npcId: '', count: 1 }
            case 'talk':
                return { npcId: '' }
            case 'reach':
                return { mapId: '', x: 0, y: 0, radius: 5 }
            case 'custom':
                return { script: '' }
            default:
                return {}
        }
    }

    const updateParams = (newParams: Record<string, any>) => {
        try {
            const currentParams = JSON.parse(paramsJson)
            const updatedParams = { ...currentParams, ...newParams }
            const updatedJson = JSON.stringify(updatedParams, null, 2)
            setParamsJson(updatedJson)
            setValue('params', updatedParams)
        } catch {
            // If JSON is invalid, create new params object
            const updatedJson = JSON.stringify(newParams, null, 2)
            setParamsJson(updatedJson)
            setValue('params', newParams)
        }
    }

    const renderVisualEditor = () => {
        switch (stepType) {
            case 'collect':
                return (
                    <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                        <h4 className="font-medium">{t('visualEditors.collect.title')}</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="itemId">{t('visualEditors.collect.itemId')}</Label>
                                <Input
                                    id="itemId"
                                    placeholder={t('visualEditors.collect.itemIdPlaceholder')}
                                    defaultValue={stepParams?.itemId || ''}
                                    onChange={(e) => updateParams({ itemId: e.target.value })}
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="count">{t('visualEditors.collect.count')}</Label>
                                <Input
                                    id="count"
                                    type="number"
                                    min="1"
                                    placeholder={t('visualEditors.collect.countPlaceholder')}
                                    defaultValue={stepParams?.count || 1}
                                    onChange={(e) => updateParams({ count: parseInt(e.target.value) || 1 })}
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>
                    </div>
                )

            case 'kill':
                return (
                    <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                        <h4 className="font-medium">{t('visualEditors.kill.title')}</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="npcId">{t('visualEditors.kill.npcId')}</Label>
                                <Input
                                    id="npcId"
                                    placeholder={t('visualEditors.kill.npcIdPlaceholder')}
                                    defaultValue={stepParams?.npcId || ''}
                                    onChange={(e) => updateParams({ npcId: e.target.value })}
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="count">{t('visualEditors.kill.count')}</Label>
                                <Input
                                    id="count"
                                    type="number"
                                    min="1"
                                    placeholder={t('visualEditors.kill.countPlaceholder')}
                                    defaultValue={stepParams?.count || 1}
                                    onChange={(e) => updateParams({ count: parseInt(e.target.value) || 1 })}
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>
                    </div>
                )

            case 'talk':
                return (
                    <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                        <h4 className="font-medium">{t('visualEditors.talk.title')}</h4>
                        <div className="space-y-4">
                            <NPCSelect
                                label={t('visualEditors.talk.npcLabel')}
                                value={stepParams?.npcId ? parseInt(stepParams.npcId) : null}
                                onChange={(npcId) => updateParams({ npcId: npcId?.toString() })}
                            />
                            <div className="space-y-2">
                                <Label htmlFor="dialogueId">ID диалога (опционально)</Label>
                                <Input
                                    id="dialogueId"
                                    placeholder="quest_intro_dialogue"
                                    defaultValue={stepParams?.dialogueId || ''}
                                    onChange={(e) => updateParams({ dialogueId: e.target.value || undefined })}
                                    disabled={isSubmitting}
                                />
                                <p className="text-sm text-muted-foreground">
                                    Конкретный диалог для активации. Оставьте пустым для любого диалога с NPC.
                                </p>
                            </div>
                        </div>
                    </div>
                )

            case 'reach':
                return (
                    <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                        <h4 className="font-medium">Параметры достижения локации</h4>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="mapId">ID карты</Label>
                                <Input
                                    id="mapId"
                                    placeholder="forest_1"
                                    defaultValue={stepParams?.mapId || ''}
                                    onChange={(e) => updateParams({ mapId: e.target.value })}
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="x">X координата</Label>
                                    <Input
                                        id="x"
                                        type="number"
                                        placeholder="100"
                                        defaultValue={stepParams?.x || 0}
                                        onChange={(e) => updateParams({ x: parseFloat(e.target.value) || 0 })}
                                        disabled={isSubmitting}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="y">Y координата</Label>
                                    <Input
                                        id="y"
                                        type="number"
                                        placeholder="200"
                                        defaultValue={stepParams?.y || 0}
                                        onChange={(e) => updateParams({ y: parseFloat(e.target.value) || 0 })}
                                        disabled={isSubmitting}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="radius">Радиус</Label>
                                    <Input
                                        id="radius"
                                        type="number"
                                        min="0"
                                        placeholder="5"
                                        defaultValue={stepParams?.radius || 5}
                                        onChange={(e) => updateParams({ radius: parseFloat(e.target.value) || 5 })}
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )

            case 'custom':
                return (
                    <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                        <h4 className="font-medium">Пользовательские параметры</h4>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="script">Скрипт</Label>
                                <Input
                                    id="script"
                                    placeholder="custom_quest_handler"
                                    defaultValue={stepParams?.script || ''}
                                    onChange={(e) => updateParams({ script: e.target.value })}
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>
                    </div>
                )

            default:
                return null
        }
    }

    const onSubmit = async (data: QuestStepForm) => {
        try {
            const params = JSON.parse(paramsJson)
            await onSave({
                ...data,
                params,
                id: step?.id
            })
        } catch (error) {
            console.error('Failed to parse params JSON:', error)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    {step ? t('editingStep') : t('addingStep')}
                </CardTitle>
                <CardDescription>
                    {t('title')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="stepIndex">{t('fields.stepIndex')}</Label>
                        <Input
                            id="stepIndex"
                            type="number"
                            min="0"
                            {...register('stepIndex', { valueAsNumber: true })}
                            disabled={isSubmitting}
                        />
                        <p className="text-sm text-muted-foreground">
                            {t('fields.stepIndexDescription')}
                        </p>
                        {errors.stepIndex && (
                            <p className="text-sm text-red-600">{errors.stepIndex.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="stepType">{t('fields.stepType')}</Label>
                        <select
                            id="stepType"
                            {...register('stepType')}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={isSubmitting}
                        >
                            {stepTypeOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        {errors.stepType && (
                            <p className="text-sm text-red-600">{errors.stepType.message}</p>
                        )}
                    </div>

                    {/* Visual parameter editor */}
                    {renderVisualEditor()}

                    <div className="space-y-2">
                        <Label htmlFor="clientStepKey">{t('fields.clientStepKey')}</Label>
                        <Input
                            id="clientStepKey"
                            {...register('clientStepKey', {
                                setValueAs: (value) => value === '' ? null : value
                            })}
                            placeholder={t('fields.clientStepKeyPlaceholder')}
                            disabled={isSubmitting}
                        />
                        <p className="text-sm text-muted-foreground">
                            {t('fields.clientStepKeyDescription')}
                        </p>
                        {errors.clientStepKey && (
                            <p className="text-sm text-red-600">{errors.clientStepKey.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>{t('fields.parameters')}</Label>
                        <Textarea
                            value={paramsJson}
                            onChange={(e) => {
                                setParamsJson(e.target.value)
                                try {
                                    const parsed = JSON.parse(e.target.value)
                                    setValue('params', parsed)
                                } catch {
                                    // Ignore invalid JSON
                                }
                            }}
                            className="font-mono text-sm"
                            rows={6}
                            disabled={isSubmitting}
                            placeholder={t('fields.parametersDescription')}
                        />
                        <p className="text-sm text-muted-foreground">
                            {t('fields.parametersDescription')}
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                            disabled={isSubmitting}
                        >
                            {t('buttons.cancel')}
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                        >
                            {t('buttons.save')}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}