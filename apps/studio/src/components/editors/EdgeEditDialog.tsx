'use client'

import React, { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Edge } from 'reactflow'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

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

    useEffect(() => {
        if (edge) {
            setFormData({
                clientChoiceKey: edge.data?.clientChoiceKey || '',
                conditionGroup: edge.data?.conditionGroup || null,
                actionGroup: edge.data?.actionGroup || null,
                orderIndex: edge.data?.orderIndex || 0,
                hideIfLocked: edge.data?.hideIfLocked || false,
            })
        }
    }, [edge])

    const handleSave = () => {
        if (edge) {
            onSave({
                ...edge,
                data: {
                    ...edge.data,
                    ...formData,
                },
            })
            onOpenChange(false)
        }
    }

    const handleDelete = () => {
        if (edge) {
            onDelete(edge.id)
        }
    }

    if (!edge) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {t('title')}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="clientChoiceKey">{t('fields.choiceKey.label')}</Label>
                        <Input
                            id="clientChoiceKey"
                            value={formData.clientChoiceKey}
                            onChange={(e) => setFormData(prev => ({ ...prev, clientChoiceKey: e.target.value }))}
                            placeholder={t('fields.choiceKey.placeholder')}
                        />
                        <p className="text-xs text-muted-foreground">
                            {t('fields.choiceKey.description')}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="orderIndex">{t('fields.orderIndex.label')}</Label>
                        <Input
                            id="orderIndex"
                            type="number"
                            value={formData.orderIndex}
                            onChange={(e) => setFormData(prev => ({
                                ...prev,
                                orderIndex: parseInt(e.target.value) || 0
                            }))}
                            placeholder="0"
                        />
                        <p className="text-xs text-muted-foreground">
                            {t('fields.orderIndex.description')}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="hideIfLocked">
                            <input
                                type="checkbox"
                                id="hideIfLocked"
                                checked={formData.hideIfLocked}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    hideIfLocked: e.target.checked
                                }))}
                                className="mr-2"
                            />
                            {t('fields.hideIfLocked.label')}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                            {t('fields.hideIfLocked.description')}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="conditions">{t('fields.conditions.label')}</Label>
                        <Textarea
                            id="conditions"
                            value={formData.conditionGroup ? JSON.stringify(formData.conditionGroup, null, 2) : ''}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                try {
                                    const parsed = e.target.value ? JSON.parse(e.target.value) : null
                                    setFormData(prev => ({ ...prev, conditionGroup: parsed }))
                                } catch (err) {
                                    // Invalid JSON, keep as string for user to fix
                                }
                            }}
                            placeholder={t('fields.conditions.placeholder')}
                            rows={4}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="actions">{t('fields.actions.label')}</Label>
                        <Textarea
                            id="actions"
                            value={formData.actionGroup ? JSON.stringify(formData.actionGroup, null, 2) : ''}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                try {
                                    const parsed = e.target.value ? JSON.parse(e.target.value) : null
                                    setFormData(prev => ({ ...prev, actionGroup: parsed }))
                                } catch (err) {
                                    // Invalid JSON
                                }
                            }}
                            placeholder={t('fields.actions.placeholder')}
                            rows={4}
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="destructive" onClick={handleDelete}>
                        {t('buttons.delete')}
                    </Button>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t('buttons.cancel')}
                    </Button>
                    <Button onClick={handleSave}>
                        {t('buttons.save')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}