'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { Handle, Position, NodeProps } from 'reactflow'
import { CornerDownRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogueJumpNodeData {
    clientNodeKey: string
    jumpTargetNodeId?: number | null
}

export default function DialogueJumpNode({ data, selected }: NodeProps<DialogueJumpNodeData>) {
    const t = useTranslations('editors.nodes')

    return (
        <div className={cn(
            'min-w-[180px] rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden',
            'border-t-2 border-t-emerald-500',
            selected && 'ring-2 ring-primary ring-offset-1'
        )}>
            {/* Coloured header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/30">
                <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 truncate">
                    {t('jump.title')}
                </span>
            </div>

            {/* Body */}
            <div className="px-3 py-2 space-y-1">
                <p className={cn(
                    'font-mono text-xs truncate',
                    data.clientNodeKey ? 'text-foreground' : 'text-muted-foreground italic'
                )}>
                    {data.clientNodeKey || t('common.notSet')}
                </p>
                {data.jumpTargetNodeId && (
                    <p className="text-xs text-muted-foreground">
                        {t('jump.targetId')}: <span className="font-mono">#{data.jumpTargetNodeId}</span>
                    </p>
                )}
            </div>

            <Handle type="target" position={Position.Top} className="w-3 h-3" />
            <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
        </div>
    )
}