'use client'

import React, { useState, useEffect } from 'react'
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
    const [formData, setFormData] = useState({
        type: 'line',
        clientNodeKey: '',
        speakerNpcId: null as number | null,
        conditionGroup: null,
        actionGroup: null,
        jumpTargetNodeId: null as number | null,
    })

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
        }
    }, [node])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (node) {
            onSave({
                ...node,
                ...formData,
            })
        }
        onOpenChange(false)
    }

    const nodeTypes = [
        { value: 'line', label: 'Line' },
        { value: 'choice_hub', label: 'Choice Hub' },
        { value: 'action', label: 'Action' },
        { value: 'jump', label: 'Jump' },
        { value: 'end', label: 'End' },
    ]

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Edit Node</DialogTitle>
                    <DialogDescription>
                        Edit the properties of this dialogue node.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Node Type */}
                    <div className="space-y-2">
                        <Label htmlFor="type">Type</Label>
                        <select
                            id="type"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={formData.type}
                            onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                        >
                            {nodeTypes.map(type => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
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
                        />
                        <p className="text-xs text-muted-foreground">
                            Unique identifier for this node in the game
                        </p>
                    </div>

                    {/* Speaker NPC */}
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
                            Select the NPC speaking this line (for line nodes)
                        </p>
                    </div>

                    {/* Jump Target (only for jump nodes) */}
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
                        </div>
                    )}

                    {/* Condition Group */}
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
                            Conditions that must be met for this node to be available
                        </p>
                    </div>

                    {/* Action Group */}
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
                            Actions to execute when this node is processed
                        </p>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}