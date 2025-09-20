'use client'

import React, { useState } from 'react'
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
                    <DialogTitle>Create New Node</DialogTitle>
                    <DialogDescription>
                        Add a new dialogue node to this dialogue.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Node Type */}
                    <div className="space-y-2">
                        <Label htmlFor="type">Node Type</Label>
                        <select
                            id="type"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={formData.type}
                            onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                        >
                            <option value="line">Line (Dialogue)</option>
                            <option value="choice">Choice</option>
                            <option value="action">Action</option>
                            <option value="jump">Jump</option>
                            <option value="end">End</option>
                        </select>
                    </div>

                    {/* Client Node Key */}
                    <div className="space-y-2">
                        <Label htmlFor="clientNodeKey">Node Key</Label>
                        <Input
                            id="clientNodeKey"
                            value={formData.clientNodeKey}
                            onChange={(e) => setFormData(prev => ({ ...prev, clientNodeKey: e.target.value }))}
                            placeholder="e.g., greeting.welcome, choice.help, action.give_item"
                            required
                        />
                        <p className="text-xs text-muted-foreground">
                            Unique identifier for this node (required)
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
                                label="Speaker NPC"
                            />
                            <p className="text-xs text-muted-foreground">
                                Select the NPC who speaks this line
                            </p>
                        </div>
                    )}

                    {/* Jump Target (for jump nodes) */}
                    {formData.type === 'jump' && (
                        <div className="space-y-2">
                            <Label htmlFor="jumpTargetNodeId">Jump Target Node ID</Label>
                            <Input
                                id="jumpTargetNodeId"
                                type="number"
                                value={formData.jumpTargetNodeId || ''}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    jumpTargetNodeId: e.target.value ? parseInt(e.target.value) : null
                                }))}
                                placeholder="Enter target node ID"
                            />
                            <p className="text-xs text-muted-foreground">
                                ID of the node to jump to
                            </p>
                        </div>
                    )}

                    {/* Conditions */}
                    <div className="space-y-2">
                        <Label htmlFor="conditionGroup">Conditions (JSON)</Label>
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
                            placeholder='{"type": "and", "conditions": [{"type": "flag", "flag": "quest.completed", "value": true}, {"type": "level", "min": 5}]}'
                            rows={3}
                        />
                        <p className="text-xs text-muted-foreground">
                            Optional conditions for this node
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="space-y-2">
                        <Label htmlFor="actionGroup">Actions (JSON)</Label>
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
                            placeholder='{"type": "set_flag", "flag": "example", "value": true}'
                            rows={3}
                        />
                        <p className="text-xs text-muted-foreground">
                            Optional actions to execute when this node is reached
                        </p>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            Create Node
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}