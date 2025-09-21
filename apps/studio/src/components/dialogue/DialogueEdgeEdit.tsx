'use client'

import React, { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

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
        conditionGroup: null,
        actionGroup: null,
    })

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
        }
    }, [edge])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (edge) {
            onSave({
                ...edge,
                ...formData,
            })
        }
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t('title')}</DialogTitle>
                    <DialogDescription>
                        {t('description')}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* From Node */}
                    <div className="space-y-2">
                        <Label htmlFor="fromNodeId">{t('fields.fromNode')}</Label>
                        <select
                            id="fromNodeId"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={formData.fromNodeId}
                            onChange={(e) => setFormData(prev => ({ ...prev, fromNodeId: parseInt(e.target.value) }))}
                        >
                            <option value="">{t('fields.selectSourceNode')}</option>
                            {nodes.map(node => (
                                <option key={node.id} value={node.id}>
                                    #{node.id} ({node.type}) - {node.clientNodeKey || 'Untitled'}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* To Node */}
                    <div className="space-y-2">
                        <Label htmlFor="toNodeId">{t('fields.toNode')}</Label>
                        <select
                            id="toNodeId"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={formData.toNodeId}
                            onChange={(e) => setFormData(prev => ({ ...prev, toNodeId: parseInt(e.target.value) }))}
                        >
                            <option value="">{t('fields.selectTargetNode')}</option>
                            {nodes.map(node => (
                                <option key={node.id} value={node.id}>
                                    #{node.id} ({node.type}) - {node.clientNodeKey || 'Untitled'}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Choice Key */}
                    <div className="space-y-2">
                        <Label htmlFor="clientChoiceKey">{t('fields.choiceText')}</Label>
                        <Input
                            id="clientChoiceKey"
                            value={formData.clientChoiceKey}
                            onChange={(e) => setFormData(prev => ({ ...prev, clientChoiceKey: e.target.value }))}
                            placeholder={t('fields.choiceTextPlaceholder')}
                        />
                        <p className="text-xs text-muted-foreground">
                            {t('fields.choiceTextDescription')}
                        </p>
                    </div>

                    {/* Order Index */}
                    <div className="space-y-2">
                        <Label htmlFor="orderIndex">{t('fields.orderIndex')}</Label>
                        <Input
                            id="orderIndex"
                            type="number"
                            min="0"
                            value={formData.orderIndex}
                            onChange={(e) => setFormData(prev => ({ ...prev, orderIndex: parseInt(e.target.value) || 0 }))}
                        />
                        <p className="text-xs text-muted-foreground">
                            {t('fields.orderIndexDescription')}
                        </p>
                    </div>

                    {/* Hide if Locked */}
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="hideIfLocked"
                            checked={formData.hideIfLocked}
                            onChange={(e) => setFormData(prev => ({ ...prev, hideIfLocked: e.target.checked }))}
                            className="h-4 w-4 rounded border border-input bg-background"
                        />
                        <Label htmlFor="hideIfLocked">{t('fields.hideIfLocked')}</Label>
                        <p className="text-xs text-muted-foreground">
                            {t('fields.hideIfLockedDescription')}
                        </p>
                    </div>

                    {/* Condition Group */}
                    <div className="space-y-2">
                        <Label htmlFor="conditionGroup">{t('fields.conditions')}</Label>
                        <Textarea
                            id="conditionGroup"
                            value={formData.conditionGroup ? JSON.stringify(formData.conditionGroup, null, 2) : ''}
                            onChange={(e) => {
                                try {
                                    const parsed = e.target.value ? JSON.parse(e.target.value) : null
                                    setFormData(prev => ({ ...prev, conditionGroup: parsed }))
                                } catch {
                                    // Invalid JSON, keep the string for editing
                                }
                            }}
                            placeholder={t('fields.conditionsPlaceholder')}
                            rows={3}
                        />
                        <p className="text-xs text-muted-foreground">
                            {t('fields.conditionsDescription')}
                        </p>
                    </div>

                    {/* Action Group */}
                    <div className="space-y-2">
                        <Label htmlFor="actionGroup">{t('fields.actions')}</Label>
                        <Textarea
                            id="actionGroup"
                            value={formData.actionGroup ? JSON.stringify(formData.actionGroup, null, 2) : ''}
                            onChange={(e) => {
                                try {
                                    const parsed = e.target.value ? JSON.parse(e.target.value) : null
                                    setFormData(prev => ({ ...prev, actionGroup: parsed }))
                                } catch {
                                    // Invalid JSON, keep the string for editing
                                }
                            }}
                            placeholder={t('fields.actionsPlaceholder')}
                            rows={3}
                        />
                        <p className="text-xs text-muted-foreground">
                            {t('fields.actionsDescription')}
                        </p>
                    </div>

                    <DialogFooter>
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