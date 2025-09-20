'use client'

import React, { useState, useEffect } from 'react'
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
        if (node && confirm('Are you sure you want to delete this node?')) {
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
                            <Label htmlFor="conditions">Conditions (JSON)</Label>
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
                                placeholder='{"type": "and", "conditions": [{"type": "flag", "flag": "quest.completed", "value": true}, {"type": "level", "min": 5}]}'
                                rows={4}
                            />
                        </div>
                    </>
                )

            case 'choice_hub':
                return (
                    <div className="space-y-2">
                        <Label htmlFor="conditions">Choice Conditions (JSON)</Label>
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
                            placeholder='{"type": "and", "conditions": [{"type": "flag", "flag": "has_key", "value": true}, {"type": "level", "min": 10}]}'
                            rows={4}
                        />
                    </div>
                )

            case 'action':
                return (
                    <div className="space-y-2">
                        <Label htmlFor="actions">Actions (JSON)</Label>
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
                            placeholder="Action configuration"
                            rows={4}
                        />
                    </div>
                )

            case 'jump':
                return (
                    <div className="space-y-2">
                        <Label htmlFor="jumpTarget">Jump Target Node ID</Label>
                        <Input
                            id="jumpTarget"
                            type="number"
                            value={formData.jumpTargetNodeId || ''}
                            onChange={(e) => setFormData(prev => ({
                                ...prev,
                                jumpTargetNodeId: e.target.value ? parseInt(e.target.value) : null
                            }))}
                            placeholder="Target node ID"
                        />
                    </div>
                )

            case 'end':
                return (
                    <div className="text-sm text-muted-foreground">
                        End nodes do not have additional configuration.
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
                        Edit {node.data.nodeType} Node
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Node ID</Label>
                        <Input
                            value={node.id}
                            disabled
                            className="bg-muted"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Node Type</Label>
                        <Input
                            value={node.data.nodeType}
                            disabled
                            className="bg-muted"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="clientNodeKey">Node Key</Label>
                        <Input
                            id="clientNodeKey"
                            value={formData.clientNodeKey}
                            onChange={(e) => setFormData(prev => ({
                                ...prev,
                                clientNodeKey: e.target.value
                            }))}
                            placeholder="e.g., greeting.welcome, choice.help, action.give_item"
                        />
                    </div>

                    {renderNodeTypeFields()}
                </div>

                <DialogFooter className="flex justify-between">
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                    >
                        Delete Node
                    </Button>
                    <div className="space-x-2">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleSave}>
                            Save Changes
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
