'use client'

import React, { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Node } from 'reactflow'
import { MessageSquare, GitBranch, Zap, CornerDownRight, CircleDot, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import NPCSelect from './NPCSelect'
import ConditionGroupEditor from './ConditionGroupEditor'
import ActionListEditor from './ActionListEditor'
import { cn } from '@/lib/utils'

const NODE_TYPE_CONFIG = {
    line: { icon: MessageSquare, color: 'blue' },
    choice_hub: { icon: GitBranch, color: 'purple' },
    action: { icon: Zap, color: 'amber' },
    jump: { icon: CornerDownRight, color: 'emerald' },
    end: { icon: CircleDot, color: 'rose' },
} as const

const NODE_COLOR_CLASSES: Record<string, { badge: string; icon: string }> = {
    blue: { badge: 'border-blue-500 bg-blue-50 dark:bg-blue-950/40', icon: 'text-blue-600 dark:text-blue-400' },
    purple: { badge: 'border-purple-500 bg-purple-50 dark:bg-purple-950/40', icon: 'text-purple-600 dark:text-purple-400' },
    amber: { badge: 'border-amber-500 bg-amber-50 dark:bg-amber-950/40', icon: 'text-amber-600 dark:text-amber-400' },
    emerald: { badge: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40', icon: 'text-emerald-600 dark:text-emerald-400' },
    rose: { badge: 'border-rose-500 bg-rose-50 dark:bg-rose-950/40', icon: 'text-rose-600 dark:text-rose-400' },
}

interface NodeEditDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    node: Node | null
    onSave: (nodeData: any) => void
    onDelete: (nodeId: string) => void
}

export default function NodeEditDialog({
    open,
    onOpenChange,
    node,
    onSave,
    onDelete,
}: NodeEditDialogProps) {
    const t = useTranslations('editors.dialogs.nodeEdit')

    const [formData, setFormData] = useState({
        clientNodeKey: '',
        speakerNpcId: null as number | null,
        conditionGroup: null as any,
        actionGroup: null as any,
        jumpTargetNodeId: null as number | null,
    })
    const [advancedOpen, setAdvancedOpen] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)

    useEffect(() => {
        if (node) {
            setFormData({
                clientNodeKey: node.data.clientNodeKey || '',
                speakerNpcId: node.data.speakerNpcId || null,
                conditionGroup: node.data.conditionGroup || null,
                actionGroup: node.data.actionGroup || null,
                jumpTargetNodeId: node.data.jumpTargetNodeId || null,
            })
            setAdvancedOpen(!!(node.data.conditionGroup || node.data.actionGroup))
            setConfirmDelete(false)
        }
    }, [node])

    const handleSave = () => {
        if (node) {
            onSave({ ...node, data: { ...node.data, ...formData } })
            onOpenChange(false)
        }
    }

    const handleDeleteConfirm = () => {
        if (node) {
            onDelete(node.id)
            onOpenChange(false)
        }
    }

    if (!node) return null

    const nodeType = node.data.nodeType as string
    const typeConfig = NODE_TYPE_CONFIG[nodeType as keyof typeof NODE_TYPE_CONFIG]
    const Icon = typeConfig?.icon ?? MessageSquare
    const colorClasses = NODE_COLOR_CLASSES[typeConfig?.color ?? 'blue']
    const showAdvanced = ['line', 'choice_hub', 'action'].includes(nodeType)

    return (
        <Dialog open={open} onOpenChange={(v) => { setConfirmDelete(false); onOpenChange(v) }}>
            <DialogContent className="max-w-lg flex flex-col max-h-[88vh] p-0 gap-0">
                {/* Header */}
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg border-2', colorClasses.badge)}>
                            <Icon className={cn('h-4 w-4', colorClasses.icon)} />
                        </div>
                        <div>
                            <DialogTitle className="text-base">
                                {t('title', { nodeType: t(`nodeTypes.${nodeType}.title`) })}
                            </DialogTitle>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">#{node.id}</p>
                        </div>
                    </div>
                </DialogHeader>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    {/* Node Key */}
                    <div className="space-y-2">
                        <Label htmlFor="clientNodeKey">{t('fields.nodeKey.label')}</Label>
                        <Input
                            id="clientNodeKey"
                            value={formData.clientNodeKey}
                            onChange={(e) => setFormData(prev => ({ ...prev, clientNodeKey: e.target.value }))}
                            placeholder={t('fields.nodeKey.placeholder')}
                            className="font-mono"
                        />
                    </div>

                    {/* Line: Speaker NPC */}
                    {nodeType === 'line' && (
                        <div className="space-y-2">
                            <NPCSelect
                                value={formData.speakerNpcId}
                                onChange={(npcId) => setFormData(prev => ({ ...prev, speakerNpcId: npcId }))}
                                label="Speaker NPC"
                            />
                        </div>
                    )}

                    {/* Jump: target node ID */}
                    {nodeType === 'jump' && (
                        <div className="space-y-2">
                            <Label htmlFor="jumpTarget">{t('nodeTypes.jump.targetLabel')}</Label>
                            <Input
                                id="jumpTarget"
                                type="number"
                                value={formData.jumpTargetNodeId || ''}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    jumpTargetNodeId: e.target.value ? parseInt(e.target.value) : null,
                                }))}
                                placeholder={t('nodeTypes.jump.targetPlaceholder')}
                                className="font-mono w-40"
                            />
                        </div>
                    )}

                    {/* End: description */}
                    {nodeType === 'end' && (
                        <p className="text-sm text-muted-foreground">{t('nodeTypes.end.description')}</p>
                    )}

                    {/* Advanced toggle (for line, choice_hub, action) */}
                    {showAdvanced && (
                        <div>
                            <button
                                type="button"
                                onClick={() => setAdvancedOpen(v => !v)}
                                className="flex w-full items-center gap-2 px-0 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
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
                                    {(nodeType === 'line' || nodeType === 'choice_hub') && (
                                        <ConditionGroupEditor
                                            label={nodeType === 'choice_hub' ? t('nodeTypes.choice_hub.conditionsLabel') : t('fields.conditions.label')}
                                            value={formData.conditionGroup}
                                            onChange={(v) => setFormData(prev => ({ ...prev, conditionGroup: v }))}
                                        />
                                    )}

                                    {nodeType === 'action' && (
                                        <ActionListEditor
                                            label={t('fields.actions.label')}
                                            value={formData.actionGroup}
                                            onChange={(v) => setFormData(prev => ({ ...prev, actionGroup: v }))}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Sticky footer */}
                <DialogFooter className="px-6 py-4 border-t border-border/60 shrink-0 bg-background">
                    {confirmDelete ? (
                        <div className="flex w-full items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-sm text-destructive">
                                <AlertTriangle className="h-4 w-4 shrink-0" />
                                <span className="line-clamp-1">{t('confirmDelete')}</span>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
                                    {t('buttons.cancel')}
                                </Button>
                                <Button variant="destructive" size="sm" onClick={handleDeleteConfirm}>
                                    {t('buttons.delete')}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex w-full items-center justify-between gap-3">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setConfirmDelete(true)}
                            >
                                {t('buttons.delete')}
                            </Button>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => onOpenChange(false)}>
                                    {t('buttons.cancel')}
                                </Button>
                                <Button onClick={handleSave}>
                                    {t('buttons.save')}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

