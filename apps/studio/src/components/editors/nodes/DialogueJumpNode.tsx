'use client'

import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ArrowRight } from 'lucide-react'

interface DialogueJumpNodeData {
    clientNodeKey: string
    jumpTargetNodeId?: number | null
}

export default function DialogueJumpNode({ data, selected }: NodeProps<DialogueJumpNodeData>) {
    return (
        <Card className={`min-w-[180px] ${selected ? 'ring-2 ring-primary' : ''}`}>
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-medium">Jump Node</span>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="space-y-2">
                    <div className="text-xs">
                        <strong>Key:</strong> {data.clientNodeKey || 'Not set'}
                    </div>
                    {data.jumpTargetNodeId && (
                        <div className="text-xs">
                            <strong>Target ID:</strong> {data.jumpTargetNodeId}
                        </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                        {data.clientNodeKey || 'Untitled Jump'}
                    </div>
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