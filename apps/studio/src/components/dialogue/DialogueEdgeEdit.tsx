'use client'

import React, { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowRight, ChevronDown, ChevronUp, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import ConditionGroupEditor from '@/components/editors/ConditionGroupEditor'
import ActionListEditor from '@/components/editors/ActionListEditor'
import { cn } from '@/lib/utils'

interface DialogueEdgeEditProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    edge: any | null
    nodes: any[]
    onSave: (updatedEdge: any) => void
}

export default function DialogueEdgeEdit({
    open,
    onOpenChange,
    edge,
    nodes,
    onSave,
}: DialogueEdgeEditProps) {
    const t = useTranslations('dialogues.components.edgeEdit')
    const [formData, setFormData] = useState({
        fromNodeId: 0,
        toNodeId: 0,
        clientChoiceKey: '',
        orderIndex: 0,
        hideIfLocked: false,
        conditionGroup: null as any,
        actionGroup: null as any,
    })
    const [advancedOpen, setAdvancedOpen] = useState(false)

    useEffect(() => {
        if (edge) {
            setFormData({
                fromNodeId: edge.fromNodeId || 0,
                toNodeId: edge.toNodeId || 0,
                clientChoiceKey: edge.clientChoiceKey || '',
                orderIndex: edge.orderIndex || 0,
                hideIfLocked: edge.hideIfLocked || false,
                conditionGroup: edge.conditionGroup,
                actionGroup: edge.actionGroup,
            })
            setAdvancedOpen(!!(edge.conditionGroup || edge.actionGroup))
        }
    }, [edge])

    const fromNode = nodes.find(n => n.id === formData.fromNodeId)
    const toNode = nodes.find(n => n.id === formData.toNodeId)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (edge) {
            onSave({ ...edge, ...formData })
        }
        onOpenChange(false)
    }

    const nativeSelectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg flex flex-col max-h-[88vh] p-0 gap-0">
                {/* Header */}
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-sky-500 bg-sky-50 dark:bg-sky-950/40">
                            <ArrowRight className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                        </div>
                        <div>
                            <DialogTitle className="text-base">{t('title')}</DialogTitle>
                            {edge && (
                                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                                    #{edge.fromNodeId} → #{edge.toNodeId}
                                </p>
                            )}
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                        {/* Connection */}
                        <div className="space-y-3">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('fields.connectionSetup')}</p>

                            <div className="space-y-2">
                                <Label htmlFor="fromNodeId">{t('fields.fromNode')}</Label>
                                <select
                                    id="fromNodeId"
                                    className={nativeSelectClass}
                                    value={formData.fromNodeId}
                                    onChange={(e) => setFormData(prev => ({ ...prev, fromNodeId: parseInt(e.target.value) }))}
                                >
                                    <option value="0">{t('fields.selectSourceNode')}</option>
                                    {nodes.map(node => (
                                        <option key={node.id} value={node.id}>
                                            #{node.id} · {node.type} · {node.clientNodeKey || t('fields.nodesUntitled')}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Connection preview */}
                            <div className="flex items-center gap-2 rounded-md bg-muted/60 px-3 py-2 overflow-hidden">
                                <span className={cn('font-mono text-xs min-w-0 truncate', fromNode ? 'text-foreground' : 'text-muted-foreground')}>
                                    {fromNode ? `#${fromNode.id} ${fromNode.clientNodeKey || '—'}` : '—'}
                                </span>
                                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className={cn('font-mono text-xs min-w-0 truncate', toNode ? 'text-foreground' : 'text-muted-foreground')}>
                                    {toNode ? `#${toNode.id} ${toNode.clientNodeKey || '—'}` : '—'}
                                </span>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="toNodeId">{t('fields.toNode')}</Label>
                                <select
                                    id="toNodeId"
                                    className={nativeSelectClass}
                                    value={formData.toNodeId}
                                    onChange={(e) => setFormData(prev => ({ ...prev, toNodeId: parseInt(e.target.value) }))}
                                >
                                    <option value="0">{t('fields.selectTargetNode')}</option>
                                    {nodes.map(node => (
                                        <option key={node.id} value={node.id}>
                                            #{node.id} · {node.type} · {node.clientNodeKey || t('fields.nodesUntitled')}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Edge settings */}
                        <div className="space-y-4">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('fields.edgeSettings')}</p>

                            <div className="space-y-2">
                                <Label htmlFor="clientChoiceKey">{t('fields.choiceText')}</Label>
                                <Input
                                    id="clientChoiceKey"
                                    value={formData.clientChoiceKey}
                                    onChange={(e) => setFormData(prev => ({ ...prev, clientChoiceKey: e.target.value }))}
                                    placeholder={t('fields.choiceTextPlaceholder')}
                                    className="font-mono"
                                />
                                <p className="text-xs text-muted-foreground">{t('fields.choiceTextDescription')}</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="orderIndex">{t('fields.orderIndex')}</Label>
                                <Input
                                    id="orderIndex"
                                    type="number"
                                    min="0"
                                    value={formData.orderIndex}
                                    onChange={(e) => setFormData(prev => ({ ...prev, orderIndex: parseInt(e.target.value) || 0 }))}
                                    className="w-28"
                                />
                                <p className="text-xs text-muted-foreground">{t('fields.orderIndexDescription')}</p>
                            </div>

                            {/* Hide if Locked with Switch */}
                            <div className="flex items-start justify-between gap-4 rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                    <Lock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium leading-none">{t('fields.hideIfLocked')}</p>
                                        <p className="text-xs text-muted-foreground mt-1">{t('fields.hideIfLockedDescription')}</p>
                                    </div>
                                </div>
                                <Switch
                                    id="hideIfLocked"
                                    checked={formData.hideIfLocked}
                                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, hideIfLocked: checked }))}
                                    className="shrink-0 mt-0.5"
                                />
                            </div>
                        </div>

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
                                    <ConditionGroupEditor
                                        label={t('fields.conditions')}
                                        value={formData.conditionGroup}
                                        onChange={(v) => setFormData(prev => ({ ...prev, conditionGroup: v }))}
                                    />
                                    <ActionListEditor
                                        label={t('fields.actions')}
                                        value={formData.actionGroup}
                                        onChange={(v) => setFormData(prev => ({ ...prev, actionGroup: v }))}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sticky footer */}
                    <DialogFooter className="px-6 py-4 border-t border-border/60 shrink-0 bg-background">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            {t('buttons.cancel')}
                        </Button>
                        <Button type="submit">
                            {t('buttons.save')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}