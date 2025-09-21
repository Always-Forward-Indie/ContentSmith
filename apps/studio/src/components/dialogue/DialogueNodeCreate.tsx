'use client'

import React, { useState } from 'react'
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
import NPCSelect from '@/components/editors/NPCSelect'

interface DialogueNodeCreateProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    dialogueId: number
    onSave: (newNode: any) => void
}

export default function DialogueNodeCreate({
    open,
    onOpenChange,
    dialogueId,
    onSave,
}: DialogueNodeCreateProps) {
    const t = useTranslations('dialogues.components.nodeCreate')
    const [formData, setFormData] = useState({
        dialogueId: dialogueId,
        type: 'line',
        clientNodeKey: '',
        speakerNpcId: null as number | null,
        jumpTargetNodeId: null as number | null,
        conditionGroup: null as any,
        actionGroup: null as any,
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSave({
            ...formData,
            speakerNpcId: formData.speakerNpcId || null,
            jumpTargetNodeId: formData.jumpTargetNodeId || null,
        })
        onOpenChange(false)
        // Reset form
        setFormData({
            dialogueId: dialogueId,
            type: 'line',
            clientNodeKey: '',
            speakerNpcId: null as number | null,
            jumpTargetNodeId: null as number | null,
            conditionGroup: null as any,
            actionGroup: null as any,
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t('title')}</DialogTitle>
                    <DialogDescription>
                        {t('description')}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Node Type */}
                    <div className="space-y-2">
                        <Label htmlFor="type">{t('fields.nodeType')}</Label>
                        <select
                            id="type"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={formData.type}
                            onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                        >
                            <option value="line">{t('fields.nodeTypeOptions.line')}</option>
                            <option value="choice">{t('fields.nodeTypeOptions.choice')}</option>
                            <option value="action">{t('fields.nodeTypeOptions.action')}</option>
                            <option value="jump">{t('fields.nodeTypeOptions.jump')}</option>
                            <option value="end">{t('fields.nodeTypeOptions.end')}</option>
                        </select>
                    </div>

                    {/* Client Node Key */}
                    <div className="space-y-2">
                        <Label htmlFor="clientNodeKey">{t('fields.nodeKey')}</Label>
                        <Input
                            id="clientNodeKey"
                            value={formData.clientNodeKey}
                            onChange={(e) => setFormData(prev => ({ ...prev, clientNodeKey: e.target.value }))}
                            placeholder={t('fields.nodeKeyPlaceholder')}
                            required
                        />
                        <p className="text-xs text-muted-foreground">
                            {t('fields.nodeKeyDescription')}
                        </p>
                    </div>

                    {/* Speaker NPC (for line nodes) */}
                    {formData.type === 'line' && (
                        <div className="space-y-2">
                            <NPCSelect
                                value={formData.speakerNpcId}
                                onChange={(npcId) => setFormData(prev => ({
                                    ...prev,
                                    speakerNpcId: npcId
                                }))}
                                label={t('fields.speakerNpc')}
                            />
                            <p className="text-xs text-muted-foreground">
                                {t('fields.speakerNpcDescription')}
                            </p>
                        </div>
                    )}

                    {/* Jump Target (for jump nodes) */}
                    {formData.type === 'jump' && (
                        <div className="space-y-2">
                            <Label htmlFor="jumpTargetNodeId">{t('fields.jumpTargetNodeId')}</Label>
                            <Input
                                id="jumpTargetNodeId"
                                type="number"
                                value={formData.jumpTargetNodeId || ''}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    jumpTargetNodeId: e.target.value ? parseInt(e.target.value) : null
                                }))}
                                placeholder={t('fields.jumpTargetPlaceholder')}
                            />
                            <p className="text-xs text-muted-foreground">
                                {t('fields.jumpTargetDescription')}
                            </p>
                        </div>
                    )}

                    {/* Conditions */}
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

                    {/* Actions */}
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
                            {t('buttons.create')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}