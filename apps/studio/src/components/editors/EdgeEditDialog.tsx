'use client'

import React, { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Edge } from 'reactflow'
import { ArrowRight, ChevronDown, ChevronUp, Lock, AlertTriangle } from 'lucide-react'
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
import { Switch } from '@/components/ui/switch'
import ConditionGroupEditor from './ConditionGroupEditor'
import ActionListEditor from './ActionListEditor'
import { cn } from '@/lib/utils'

interface EdgeEditDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    edge: Edge | null
    onSave: (edgeData: Edge) => void
    onDelete: (edgeId: string) => void
}

export default function EdgeEditDialog({
    open,
    onOpenChange,
    edge,
    onSave,
    onDelete,
}: EdgeEditDialogProps) {
    const t = useTranslations('editors.dialogs.edgeEdit')

    const [formData, setFormData] = useState({
        clientChoiceKey: '',
        conditionGroup: null as any,
        actionGroup: null as any,
        orderIndex: 0,
        hideIfLocked: false,
    })
    const [advancedOpen, setAdvancedOpen] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)

    useEffect(() => {
        if (edge) {
            setFormData({
                clientChoiceKey: edge.data?.clientChoiceKey || '',
                conditionGroup: edge.data?.conditionGroup || null,
                actionGroup: edge.data?.actionGroup || null,
                orderIndex: edge.data?.orderIndex || 0,
                hideIfLocked: edge.data?.hideIfLocked || false,
            })
            setAdvancedOpen(!!(edge.data?.conditionGroup || edge.data?.actionGroup))
            setConfirmDelete(false)
        }
    }, [edge])

    const handleSave = () => {
        if (edge) {
            onSave({ ...edge, data: { ...edge.data, ...formData } })
            onOpenChange(false)
        }
    }

    const handleDeleteConfirm = () => {
        if (edge) {
            onDelete(edge.id)
            onOpenChange(false)
        }
    }

    if (!edge) return null

    return (
        <Dialog open={open} onOpenChange={(v) => { setConfirmDelete(false); onOpenChange(v) }}>
            <DialogContent className="max-w-lg flex flex-col max-h-[88vh] p-0 gap-0">
                {/* Header */}
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-sky-500 bg-sky-50 dark:bg-sky-950/40">
                            <ArrowRight className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                        </div>
                        <div>
                            <DialogTitle className="text-base">{t('title')}</DialogTitle>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">
                                #{edge.source} → #{edge.target}
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    {/* Choice key */}
                    <div className="space-y-2">
                        <Label htmlFor="clientChoiceKey">{t('fields.choiceKey.label')}</Label>
                        <Input
                            id="clientChoiceKey"
                            value={formData.clientChoiceKey}
                            onChange={(e) => setFormData(prev => ({ ...prev, clientChoiceKey: e.target.value }))}
                            placeholder={t('fields.choiceKey.placeholder')}
                            className="font-mono"
                        />
                        <p className="text-xs text-muted-foreground">{t('fields.choiceKey.description')}</p>
                    </div>

                    {/* Order index */}
                    <div className="space-y-2">
                        <Label htmlFor="orderIndex">{t('fields.orderIndex.label')}</Label>
                        <Input
                            id="orderIndex"
                            type="number"
                            value={formData.orderIndex}
                            onChange={(e) => setFormData(prev => ({ ...prev, orderIndex: parseInt(e.target.value) || 0 }))}
                            className="w-28"
                        />
                        <p className="text-xs text-muted-foreground">{t('fields.orderIndex.description')}</p>
                    </div>

                    {/* Hide if locked — Switch */}
                    <div className="flex items-start justify-between gap-4 rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
                        <div className="flex items-center gap-2.5">
                            <Lock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium leading-none">{t('fields.hideIfLocked.label')}</p>
                                <p className="text-xs text-muted-foreground mt-1">{t('fields.hideIfLocked.description')}</p>
                            </div>
                        </div>
                        <Switch
                            id="hideIfLocked"
                            checked={formData.hideIfLocked}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, hideIfLocked: checked }))}
                            className="shrink-0 mt-0.5"
                        />
                    </div>

                    {/* Advanced toggle */}
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
                                <ConditionGroupEditor
                                    label={t('fields.conditions.label')}
                                    value={formData.conditionGroup}
                                    onChange={(v) => setFormData(prev => ({ ...prev, conditionGroup: v }))}
                                />
                                <ActionListEditor
                                    label={t('fields.actions.label')}
                                    value={formData.actionGroup}
                                    onChange={(v) => setFormData(prev => ({ ...prev, actionGroup: v }))}
                                />
                            </div>
                        )}
                    </div>
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

