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

interface DialogueEdgeCreateProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    dialogueId: number
    nodes: any[]
    onSave: (newEdge: any) => void
}

export default function DialogueEdgeCreate({
    open,
    onOpenChange,
    dialogueId,
    nodes,
    onSave,
}: DialogueEdgeCreateProps) {
    const [formData, setFormData] = useState({
        dialogueId: dialogueId,
        fromNodeId: 0,
        toNodeId: 0,
        clientChoiceKey: '',
        orderIndex: 0,
        hideIfLocked: false,
        conditionGroup: null as any,
        actionGroup: null as any,
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (formData.fromNodeId === 0 || formData.toNodeId === 0) {
            alert('Please select both source and target nodes')
            return
        }

        onSave(formData)
        onOpenChange(false)
        // Reset form
        setFormData({
            dialogueId: dialogueId,
            fromNodeId: 0,
            toNodeId: 0,
            clientChoiceKey: '',
            orderIndex: 0,
            hideIfLocked: false,
            conditionGroup: null as any,
            actionGroup: null as any,
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create New Connection (Edge)</DialogTitle>
                    <DialogDescription>
                        Add a new connection between dialogue nodes.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* From Node */}
                    <div className="space-y-2">
                        <Label htmlFor="fromNodeId">From Node</Label>
                        <select
                            id="fromNodeId"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={formData.fromNodeId}
                            onChange={(e) => setFormData(prev => ({ ...prev, fromNodeId: parseInt(e.target.value) }))}
                            required
                        >
                            <option value="0">Select source node</option>
                            {nodes.map(node => (
                                <option key={node.id} value={node.id}>
                                    #{node.id} ({node.type}) - {node.clientNodeKey || 'Untitled'}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-muted-foreground">
                            The node where this connection starts
                        </p>
                    </div>

                    {/* To Node */}
                    <div className="space-y-2">
                        <Label htmlFor="toNodeId">To Node</Label>
                        <select
                            id="toNodeId"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={formData.toNodeId}
                            onChange={(e) => setFormData(prev => ({ ...prev, toNodeId: parseInt(e.target.value) }))}
                            required
                        >
                            <option value="0">Select target node</option>
                            {nodes
                                .filter(node => node.id !== formData.fromNodeId) // Don't allow self-loops
                                .map(node => (
                                    <option key={node.id} value={node.id}>
                                        #{node.id} ({node.type}) - {node.clientNodeKey || 'Untitled'}
                                    </option>
                                ))
                            }
                        </select>
                        <p className="text-xs text-muted-foreground">
                            The node where this connection leads to
                        </p>
                    </div>

                    {/* Choice Key */}
                    <div className="space-y-2">
                        <Label htmlFor="clientChoiceKey">Choice Text</Label>
                        <Input
                            id="clientChoiceKey"
                            value={formData.clientChoiceKey}
                            onChange={(e) => setFormData(prev => ({ ...prev, clientChoiceKey: e.target.value }))}
                            placeholder="e.g., choice.yes, choice.help, action.continue"
                        />
                        <p className="text-xs text-muted-foreground">
                            Text displayed for this choice option
                        </p>
                    </div>

                    {/* Order Index */}
                    <div className="space-y-2">
                        <Label htmlFor="orderIndex">Order Index</Label>
                        <Input
                            id="orderIndex"
                            type="number"
                            min="0"
                            value={formData.orderIndex}
                            onChange={(e) => setFormData(prev => ({ ...prev, orderIndex: parseInt(e.target.value) || 0 }))}
                        />
                        <p className="text-xs text-muted-foreground">
                            Display order for this choice (0 = first)
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
                        <Label htmlFor="hideIfLocked">Hide if locked</Label>
                        <p className="text-xs text-muted-foreground">
                            Hide this choice if conditions are not met
                        </p>
                    </div>

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
                            placeholder='{"type": "and", "conditions": [{"type": "flag", "flag": "choice.available", "value": true}, {"type": "item", "item": "gold", "count": 10}]}'
                            rows={3}
                        />
                        <p className="text-xs text-muted-foreground">
                            Conditions that must be met for this choice to be available
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
                            Actions to execute when this choice is selected
                        </p>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            Create Connection
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}