'use client'

import React, { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Node } from 'reactflow'
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
import NPCSelect from './NPCSelect'

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
        conditionGroup: null,
        actionGroup: null,
        jumpTargetNodeId: null as number | null,
    })

    useEffect(() => {
        if (node) {
            setFormData({
                clientNodeKey: node.data.clientNodeKey || '',
                speakerNpcId: node.data.speakerNpcId || null,
                conditionGroup: node.data.conditionGroup || null,
                actionGroup: node.data.actionGroup || null,
                jumpTargetNodeId: node.data.jumpTargetNodeId || null,
            })
        }
    }, [node])

    const handleSave = () => {
        if (node) {
            const updatedNode = {
                ...node,
                data: {
                    ...node.data,
                    ...formData,
                }
            }
            onSave(updatedNode)
            onOpenChange(false)
        }
    }

    const handleDelete = () => {
        if (node && confirm(t('confirmDelete'))) {
            onDelete(node.id)
            onOpenChange(false)
        }
    }

    const renderNodeTypeFields = () => {
        if (!node) return null

        switch (node.data.nodeType) {
            case 'line':
                return (
                    <>
                        <NPCSelect
                            value={formData.speakerNpcId}
                            onChange={(npcId) => setFormData(prev => ({
                                ...prev,
                                speakerNpcId: npcId
                            }))}
                            label="Speaker NPC"
                        />
                        <div className="space-y-2">
                            <Label htmlFor="conditions">{t('fields.conditions.label')}</Label>
                            <Textarea
                                id="conditions"
                                value={formData.conditionGroup ? JSON.stringify(formData.conditionGroup, null, 2) : ''}
                                onChange={(e) => {
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
                    </>
                )

            case 'choice_hub':
                return (
                    <div className="space-y-2">
                        <Label htmlFor="conditions">{t('nodeTypes.choice.conditionsLabel')}</Label>
                        <Textarea
                            id="conditions"
                            value={formData.conditionGroup ? JSON.stringify(formData.conditionGroup, null, 2) : ''}
                            onChange={(e) => {
                                try {
                                    const parsed = e.target.value ? JSON.parse(e.target.value) : null
                                    setFormData(prev => ({ ...prev, conditionGroup: parsed }))
                                } catch (err) {
                                    // Invalid JSON, keep as string for user to fix
                                }
                            }}
                            placeholder={t('nodeTypes.choice.placeholder')}
                            rows={4}
                        />
                    </div>
                )

            case 'action':
                return (
                    <div className="space-y-2">
                        <Label htmlFor="actions">{t('fields.actions.label')}</Label>
                        <Textarea
                            id="actions"
                            value={formData.actionGroup ? JSON.stringify(formData.actionGroup, null, 2) : ''}
                            onChange={(e) => {
                                try {
                                    const parsed = e.target.value ? JSON.parse(e.target.value) : null
                                    setFormData(prev => ({ ...prev, actionGroup: parsed }))
                                } catch (err) {
                                    // Invalid JSON, keep as string for user to fix
                                }
                            }}
                            placeholder={t('fields.actions.placeholder')}
                            rows={4}
                        />
                    </div>
                )

            case 'jump':
                return (
                    <div className="space-y-2">
                        <Label htmlFor="jumpTarget">{t('nodeTypes.jump.targetLabel')}</Label>
                        <Input
                            id="jumpTarget"
                            type="number"
                            value={formData.jumpTargetNodeId || ''}
                            onChange={(e) => setFormData(prev => ({
                                ...prev,
                                jumpTargetNodeId: e.target.value ? parseInt(e.target.value) : null
                            }))}
                            placeholder={t('nodeTypes.jump.targetPlaceholder')}
                        />
                    </div>
                )

            case 'end':
                return (
                    <div className="text-sm text-muted-foreground">
                        {t('nodeTypes.end.description')}
                    </div>
                )

            default:
                return null
        }
    }

    if (!node) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {t('title', { nodeType: t(`nodeTypes.${node.data.nodeType}.title`) })}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>{t('fields.nodeId.label')}</Label>
                        <Input
                            value={node.id}
                            disabled
                            className="bg-muted"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>{t('fields.nodeType.label')}</Label>
                        <Input
                            value={node.data.nodeType}
                            disabled
                            className="bg-muted"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="clientNodeKey">{t('fields.nodeKey.label')}</Label>
                        <Input
                            id="clientNodeKey"
                            value={formData.clientNodeKey}
                            onChange={(e) => setFormData(prev => ({
                                ...prev,
                                clientNodeKey: e.target.value
                            }))}
                            placeholder={t('fields.nodeKey.placeholder')}
                        />
                    </div>

                    {renderNodeTypeFields()}
                </div>

                <DialogFooter className="flex justify-between">
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                    >
                        {t('buttons.delete')}
                    </Button>
                    <div className="space-x-2">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            {t('buttons.cancel')}
                        </Button>
                        <Button onClick={handleSave}>
                            {t('buttons.save')}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
