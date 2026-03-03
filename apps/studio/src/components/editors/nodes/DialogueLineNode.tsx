'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { Handle, Position, NodeProps } from 'reactflow'
import { MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogueLineNodeData {
    clientNodeKey: string
    speakerNpcId?: number | null
}

export default function DialogueLineNode({ data, selected }: NodeProps<DialogueLineNodeData>) {
    const t = useTranslations('editors.nodes')

    return (
        <div className={cn(
            'min-w-[200px] rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden',
            'border-t-2 border-t-blue-500',
            selected && 'ring-2 ring-primary ring-offset-1'
        )}>
            {/* Coloured header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950/30">
                <MessageSquare className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 truncate">
                    {t('line.title')}
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
                {data.speakerNpcId && (
                    <p className="text-xs text-muted-foreground">
                        {t('common.speaker')}: #{data.speakerNpcId}
                    </p>
                )}
            </div>

            <Handle type="target" position={Position.Top} className="w-3 h-3" />
            <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
        </div>
    )
}