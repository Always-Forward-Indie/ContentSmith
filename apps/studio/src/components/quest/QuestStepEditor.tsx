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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import NPCSelect from '@/components/editors/NPCSelect'
import { trpc } from '@/lib/trpc'
import EntityCombobox from '@/components/editors/EntityCombobox'

const QuestStepFormSchema = z.object({
    stepIndex: z.number().min(0),
    stepType: z.enum(['collect', 'kill', 'talk', 'reach', 'custom']),
    params: z.record(z.unknown()),
    clientStepKey: z.string().nullable().optional(),
    completionMode: z.enum(['auto', 'manual', 'all']).default('auto'),
})

type QuestStepForm = z.infer<typeof QuestStepFormSchema>

interface VisualEditorInnerProps {
    stepParams: Record<string, unknown>
    updateParams: (params: Record<string, unknown>) => void
    isSubmitting: boolean
}

function CollectVisualEditor({ stepParams, updateParams, isSubmitting }: VisualEditorInnerProps) {
    const t = useTranslations('quests.stepEditor')
    const [search, setSearch] = useState('')
    const itemId = (stepParams?.item_id as number) || 0
    const { data: listData, isLoading } = trpc.items.list.useQuery({ search, page: 1, limit: 20 })
    const { data: current } = trpc.items.getById.useQuery({ id: itemId }, { enabled: !!itemId })
    const options = (listData?.items ?? []).map((item) => ({
        value: item.id,
        label: item.name,
        sublabel: item.slug,
    }))
    return (
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium">{t('visualEditors.collect.title')}</h4>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>{t('visualEditors.collect.itemId')}</Label>
                    <EntityCombobox
                        value={itemId || null}
                        displayName={current?.name ?? null}
                        onChange={(v) => updateParams({ item_id: v ?? 0 })}
                        options={options}
                        isLoading={isLoading}
                        onSearch={setSearch}
                        placeholder={t('visualEditors.collect.selectItem')}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="count">{t('visualEditors.collect.count')}</Label>
                    <Input
                        id="count"
                        type="number"
                        min="1"
                        placeholder={t('visualEditors.collect.countPlaceholder')}
                        defaultValue={stepParams?.count as number || 1}
                        onChange={(e) => updateParams({ count: parseInt(e.target.value) || 1 })}
                        disabled={isSubmitting}
                    />
                </div>
            </div>
        </div>
    )
}

function KillVisualEditor({ stepParams, updateParams, isSubmitting }: VisualEditorInnerProps) {
    const t = useTranslations('quests.stepEditor')
    const [search, setSearch] = useState('')
    const mobId = (stepParams?.mob_id as number) || 0
    const { data: listData, isLoading } = trpc.mobs.list.useQuery({ search, page: 1, limit: 20 })
    const { data: current } = trpc.mobs.getById.useQuery(mobId, { enabled: !!mobId })
    const options = (listData?.data ?? []).map((m) => ({
        value: m.id,
        label: m.name,
        sublabel: m.slug ?? undefined,
    }))
    return (
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium">{t('visualEditors.kill.title')}</h4>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>{t('visualEditors.kill.npcId')}</Label>
                    <EntityCombobox
                        value={mobId || null}
                        displayName={current?.name ?? null}
                        onChange={(v) => updateParams({ mob_id: v ?? 0 })}
                        options={options}
                        isLoading={isLoading}
                        onSearch={setSearch}
                        placeholder={t('visualEditors.kill.selectMob')}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="count">{t('visualEditors.kill.count')}</Label>
                    <Input
                        id="count"
                        type="number"
                        min="1"
                        placeholder={t('visualEditors.kill.countPlaceholder')}
                        defaultValue={stepParams?.count as number || 1}
                        onChange={(e) => updateParams({ count: parseInt(e.target.value) || 1 })}
                        disabled={isSubmitting}
                    />
                </div>
            </div>
        </div>
    )
}

interface QuestStepEditorProps {
    questId: number
    step?: {
        id: number
        stepIndex: number
        stepType: string
        params?: unknown
        clientStepKey?: string | null
        completionMode?: string | null
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
            completionMode: (step?.completionMode as any) ?? 'auto',
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
                return { item_id: 0, count: 1 }
            case 'kill':
                return { mob_id: 0, count: 1 }
            case 'talk':
                return { npc_id: 0 }
            case 'reach':
                return { x: 0, y: 0, radius: 200 }
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
                    <CollectVisualEditor
                        stepParams={stepParams}
                        updateParams={updateParams}
                        isSubmitting={isSubmitting}
                    />
                )

            case 'kill':
                return (
                    <KillVisualEditor
                        stepParams={stepParams}
                        updateParams={updateParams}
                        isSubmitting={isSubmitting}
                    />
                )

            case 'talk':
                return (
                    <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                        <h4 className="text-sm font-medium">{t('visualEditors.talk.title')}</h4>
                        <div className="space-y-4">
                            <NPCSelect
                                label={t('visualEditors.talk.npcLabel')}
                                value={stepParams?.npc_id ? parseInt(stepParams.npc_id) : null}
                                onChange={(npcId) => updateParams({ npc_id: npcId ?? 0 })}
                            />
                        </div>
                    </div>
                )

            case 'reach':
                return (
                    <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                        <h4 className="text-sm font-medium">{t('visualEditors.reach.title')}</h4>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="x">{t('visualEditors.reach.x')}</Label>
                                <Input
                                    id="x"
                                    type="number"
                                    step="any"
                                    placeholder="0"
                                    defaultValue={stepParams?.x ?? 0}
                                    onChange={(e) => updateParams({ x: parseFloat(e.target.value) || 0 })}
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="y">{t('visualEditors.reach.y')}</Label>
                                <Input
                                    id="y"
                                    type="number"
                                    step="any"
                                    placeholder="0"
                                    defaultValue={stepParams?.y ?? 0}
                                    onChange={(e) => updateParams({ y: parseFloat(e.target.value) || 0 })}
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="radius">{t('visualEditors.reach.radius')}</Label>
                                <Input
                                    id="radius"
                                    type="number"
                                    min="1"
                                    step="any"
                                    placeholder="200"
                                    defaultValue={stepParams?.radius ?? 200}
                                    onChange={(e) => updateParams({ radius: parseFloat(e.target.value) || 200 })}
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>
                    </div>
                )

            case 'custom':
                return (
                    <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                        <h4 className="text-sm font-medium">{t('visualEditors.custom.title')}</h4>
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="script">{t('visualEditors.custom.script')}</Label>
                                <Input
                                    id="script"
                                    placeholder={t('visualEditors.custom.scriptPlaceholder')}
                                    className="font-mono"
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
                <CardTitle className="text-base">
                    {step ? t('editingStep') : t('addingStep')}
                </CardTitle>
                <CardDescription>{t('title')}</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    <div className="space-y-1.5">
                        <Label htmlFor="stepIndex">{t('fields.stepIndex')}</Label>
                        <Input
                            id="stepIndex"
                            type="number"
                            min="0"
                            className="w-24"
                            {...register('stepIndex', { valueAsNumber: true })}
                            disabled={isSubmitting}
                        />
                        <p className="text-xs text-muted-foreground">
                            {t('fields.stepIndexDescription')}
                        </p>
                        {errors.stepIndex && (
                            <p className="text-xs text-destructive">{errors.stepIndex.message}</p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="stepType">{t('fields.stepType')}</Label>
                        <Select
                            value={watch('stepType')}
                            onValueChange={(v) => setValue('stepType', v as any)}
                            disabled={isSubmitting}
                        >
                            <SelectTrigger id="stepType">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {stepTypeOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.stepType && (
                            <p className="text-xs text-destructive">{errors.stepType.message}</p>
                        )}
                    </div>

                    {/* Visual parameter editor */}
                    {renderVisualEditor()}

                    <div className="space-y-1.5">
                        <Label htmlFor="clientStepKey">{t('fields.clientStepKey')}</Label>
                        <Input
                            id="clientStepKey"
                            {...register('clientStepKey', {
                                setValueAs: (value) => value === '' ? null : value
                            })}
                            placeholder={t('fields.clientStepKeyPlaceholder')}
                            className="font-mono"
                            disabled={isSubmitting}
                        />
                        <p className="text-xs text-muted-foreground">
                            {t('fields.clientStepKeyDescription')}
                        </p>
                        {errors.clientStepKey && (
                            <p className="text-xs text-destructive">{errors.clientStepKey.message}</p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="completionMode">{t('fields.completionMode')}</Label>
                        <Select
                            value={watch('completionMode')}
                            onValueChange={(v) => setValue('completionMode', v as any)}
                            disabled={isSubmitting}
                        >
                            <SelectTrigger id="completionMode">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="auto">{t('fields.completionModeOptions.auto')}</SelectItem>
                                <SelectItem value="manual">{t('fields.completionModeOptions.manual')}</SelectItem>
                                <SelectItem value="all">{t('fields.completionModeOptions.all')}</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            {t('fields.completionModeDescription')}
                        </p>
                    </div>

                    <div className="space-y-1.5">
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
                            className="font-mono text-xs"
                            rows={6}
                            disabled={isSubmitting}
                            placeholder={t('fields.parametersDescription')}
                        />
                        <p className="text-xs text-muted-foreground">
                            {t('fields.parametersDescription')}
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2">
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