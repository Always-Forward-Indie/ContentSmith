'use client'

import React, { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { MessageSquare, GitBranch, Zap, CornerDownRight, CircleDot, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import NPCSelect from '@/components/editors/NPCSelect'
import { cn } from '@/lib/utils'

const NODE_TYPE_CONFIG = [
    { value: 'line', icon: MessageSquare, labelKey: 'fields.nodeTypeOptions.line', color: 'blue' },
    { value: 'choice_hub', icon: GitBranch, labelKey: 'fields.nodeTypeOptions.choice_hub', color: 'purple' },
    { value: 'action', icon: Zap, labelKey: 'fields.nodeTypeOptions.action', color: 'amber' },
    { value: 'jump', icon: CornerDownRight, labelKey: 'fields.nodeTypeOptions.jump', color: 'emerald' },
    { value: 'end', icon: CircleDot, labelKey: 'fields.nodeTypeOptions.end', color: 'rose' },
] as const

const NODE_COLOR_CLASSES: Record<string, { selected: string; icon: string }> = {
    blue: { selected: 'border-blue-500 bg-blue-50 dark:bg-blue-950/40', icon: 'text-blue-600 dark:text-blue-400' },
    purple: { selected: 'border-purple-500 bg-purple-50 dark:bg-purple-950/40', icon: 'text-purple-600 dark:text-purple-400' },
    amber: { selected: 'border-amber-500 bg-amber-50 dark:bg-amber-950/40', icon: 'text-amber-600 dark:text-amber-400' },
    emerald: { selected: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40', icon: 'text-emerald-600 dark:text-emerald-400' },
    rose: { selected: 'border-rose-500 bg-rose-50 dark:bg-rose-950/40', icon: 'text-rose-600 dark:text-rose-400' },
}

interface DialogueNodeEditProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    node: any | null
    onSave: (updatedNode: any) => void
}

export default function DialogueNodeEdit({
    open,
    onOpenChange,
    node,
    onSave,
}: DialogueNodeEditProps) {
    const t = useTranslations('dialogues.components.nodeEdit')
    const [formData, setFormData] = useState({
        type: 'line',
        clientNodeKey: '',
        speakerNpcId: null as number | null,
        conditionGroup: null as any,
        actionGroup: null as any,
        jumpTargetNodeId: null as number | null,
    })
    const [conditionsRaw, setConditionsRaw] = useState('')
    const [actionsRaw, setActionsRaw] = useState('')
    const [conditionsError, setConditionsError] = useState(false)
    const [actionsError, setActionsError] = useState(false)
    const [advancedOpen, setAdvancedOpen] = useState(false)

    useEffect(() => {
        if (node) {
            setFormData({
                type: node.type || 'line',
                clientNodeKey: node.clientNodeKey || '',
                speakerNpcId: node.speakerNpcId || null,
                conditionGroup: node.conditionGroup,
                actionGroup: node.actionGroup,
                jumpTargetNodeId: node.jumpTargetNodeId || null,
            })
            setConditionsRaw(node.conditionGroup ? JSON.stringify(node.conditionGroup, null, 2) : '')
            setActionsRaw(node.actionGroup ? JSON.stringify(node.actionGroup, null, 2) : '')
            setConditionsError(false)
            setActionsError(false)
            // Auto-open advanced if node has conditions or actions
            setAdvancedOpen(!!(node.conditionGroup || node.actionGroup))
        }
    }, [node])

    const activeConfig = NODE_TYPE_CONFIG.find(c => c.value === formData.type)
    const ActiveIcon = activeConfig?.icon ?? MessageSquare
    const activeColor = activeConfig?.color ?? 'blue'
    const colorClasses = NODE_COLOR_CLASSES[activeColor]

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (node) {
            onSave({ ...node, ...formData })
        }
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg flex flex-col max-h-[88vh] p-0 gap-0">
                {/* Header */}
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg border-2 transition-colors', colorClasses.selected)}>
                            <ActiveIcon className={cn('h-4 w-4', colorClasses.icon)} />
                        </div>
                        <div>
                            <DialogTitle className="text-base">{t('title')}</DialogTitle>
                            {node && (
                                <p className="text-xs text-muted-foreground font-mono mt-0.5">#{node.id}</p>
                            )}
                        </div>
                    </div>
                </DialogHeader>

                {/* Scrollable body */}
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                        {/* Node Type selector */}
                        <div className="space-y-2">
                            <Label>{t('fields.nodeType')}</Label>
                            <div className="grid grid-cols-5 gap-1.5">
                                {NODE_TYPE_CONFIG.map((opt) => {
                                    const Icon = opt.icon
                                    const isSelected = formData.type === opt.value
                                    const colors = NODE_COLOR_CLASSES[opt.color]
                                    return (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, type: opt.value }))}
                                            className={cn(
                                                'flex flex-col items-center gap-1.5 rounded-lg border-2 px-1 py-2.5 text-xs font-medium transition-all cursor-pointer',
                                                isSelected
                                                    ? `${colors.selected} ${colors.icon}`
                                                    : 'border-border bg-background text-muted-foreground hover:border-border/80 hover:text-foreground'
                                            )}
                                        >
                                            <Icon className="h-4 w-4" />
                                            <span className="leading-tight text-center">{t(opt.labelKey)}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Node Key */}
                        <div className="space-y-2">
                            <Label htmlFor="clientNodeKey">{t('fields.nodeKey')}</Label>
                            <Input
                                id="clientNodeKey"
                                value={formData.clientNodeKey}
                                onChange={(e) => setFormData(prev => ({ ...prev, clientNodeKey: e.target.value }))}
                                placeholder={t('fields.nodeKeyPlaceholder')}
                                className="font-mono"
                            />
                            <p className="text-xs text-muted-foreground">{t('fields.nodeKeyDescription')}</p>
                        </div>

                        {/* Speaker NPC (line only) — fixes the bug where it showed for all types */}
                        {formData.type === 'line' && (
                            <div className="space-y-2">
                                <NPCSelect
                                    value={formData.speakerNpcId}
                                    onChange={(npcId) => setFormData(prev => ({ ...prev, speakerNpcId: npcId }))}
                                    label={t('fields.speakerNpc')}
                                />
                                <p className="text-xs text-muted-foreground">{t('fields.speakerNpcDescription')}</p>
                            </div>
                        )}

                        {/* Jump Target (jump only) */}
                        {formData.type === 'jump' && (
                            <div className="space-y-2">
                                <Label htmlFor="jumpTargetNodeId">{t('fields.jumpTargetNodeId')}</Label>
                                <Input
                                    id="jumpTargetNodeId"
                                    type="number"
                                    value={formData.jumpTargetNodeId || ''}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        jumpTargetNodeId: e.target.value ? parseInt(e.target.value) : null,
                                    }))}
                                    placeholder={t('fields.jumpTargetPlaceholder')}
                                />
                            </div>
                        )}

                        {/* Advanced toggle */}
                        <div>
                            <button
                                type="button"
                                onClick={() => setAdvancedOpen(v => !v)}
                                className="flex w-full items-center gap-2 rounded-md px-0 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <span className="flex-1 border-t border-dashed border-border" />
                                <span>{t('fields.advanced')}</span>
                                {advancedOpen
                                    ? <ChevronUp className="h-3.5 w-3.5 shrink-0" />
                                    : <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                                }
                                <span className="flex-1 border-t border-dashed border-border" />
                            </button>

                            {advancedOpen && (
                                <div className="mt-4 space-y-4">
                                    {/* Conditions */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="conditionGroup">{t('fields.conditions')}</Label>
                                            {conditionsError && (
                                                <span className="text-xs text-destructive">{t('fields.jsonError')}</span>
                                            )}
                                        </div>
                                        <Textarea
                                            id="conditionGroup"
                                            value={conditionsRaw}
                                            onChange={(e) => {
                                                setConditionsRaw(e.target.value)
                                                try {
                                                    const parsed = e.target.value ? JSON.parse(e.target.value) : null
                                                    setFormData(prev => ({ ...prev, conditionGroup: parsed }))
                                                    setConditionsError(false)
                                                } catch {
                                                    setConditionsError(true)
                                                }
                                            }}
                                            placeholder={t('fields.conditionsPlaceholder')}
                                            rows={3}
                                            className={cn('font-mono text-xs', conditionsError && 'border-destructive focus-visible:ring-destructive')}
                                        />
                                        <p className="text-xs text-muted-foreground">{t('fields.conditionsDescription')}</p>
                                    </div>

                                    {/* Actions */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="actionGroup">{t('fields.actions')}</Label>
                                            {actionsError && (
                                                <span className="text-xs text-destructive">{t('fields.jsonError')}</span>
                                            )}
                                        </div>
                                        <Textarea
                                            id="actionGroup"
                                            value={actionsRaw}
                                            onChange={(e) => {
                                                setActionsRaw(e.target.value)
                                                try {
                                                    const parsed = e.target.value ? JSON.parse(e.target.value) : null
                                                    setFormData(prev => ({ ...prev, actionGroup: parsed }))
                                                    setActionsError(false)
                                                } catch {
                                                    setActionsError(true)
                                                }
                                            }}
                                            placeholder={t('fields.actionsPlaceholder')}
                                            rows={3}
                                            className={cn('font-mono text-xs', actionsError && 'border-destructive focus-visible:ring-destructive')}
                                        />
                                        <p className="text-xs text-muted-foreground">{t('fields.actionsDescription')}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sticky footer */}
                    <DialogFooter className="px-6 py-4 border-t border-border/60 shrink-0 bg-background">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            {t('buttons.cancel')}
                        </Button>
                        <Button type="submit" disabled={conditionsError || actionsError}>
                            {t('buttons.save')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
