'use client'

import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Play } from 'lucide-react'

interface DialogueActionNodeData {
    clientNodeKey: string
    actionType?: string
    parameters?: Record<string, any>
}

export default function DialogueActionNode({ data, selected }: NodeProps<DialogueActionNodeData>) {
    return (
        <Card className={`min-w-[200px] ${selected ? 'ring-2 ring-primary' : ''}`}>
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                    <Play className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-medium">Action Node</span>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="space-y-2">
                    <div className="text-sm">
                        <strong>Key:</strong> {data.clientNodeKey || 'Not set'}
                    </div>
                    {data.actionType && (
                        <div className="text-xs">
                            <strong>Type:</strong> {data.actionType}
                        </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                        {data.clientNodeKey || 'Untitled Action'}
                    </div>
                    {data.parameters && Object.keys(data.parameters).length > 0 && (
                        <div className="mt-2">
                            <div className="text-xs font-medium mb-1">Parameters:</div>
                            <div className="text-xs p-1 bg-muted rounded text-muted-foreground">
                                {Object.entries(data.parameters).map(([key, value]) => (
                                    <div key={key}>{key}: {String(value)}</div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>

            {/* Input handle */}
            <Handle
                type="target"
                position={Position.Top}
                className="w-3 h-3"
            />

            {/* Output handle */}
            <Handle
                type="source"
                position={Position.Bottom}
                className="w-3 h-3"
            />
        </Card>
    )
}