'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { Handle, Position, NodeProps } from 'reactflow'
import { CircleDot } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogueEndNodeData {
    clientNodeKey: string
    endType?: 'normal' | 'quest_complete' | 'dialogue_exit'
}

export default function DialogueEndNode({ data, selected }: NodeProps<DialogueEndNodeData>) {
    const t = useTranslations('editors.nodes')

    const getEndTypeLabel = (endType?: string) => {
        switch (endType) {
            case 'quest_complete':
                return t('end.types.questComplete')
            case 'dialogue_exit':
                return t('end.types.dialogueExit')
            default:
                return t('end.types.normal')
        }
    }

    return (
        <div className={cn(
            'min-w-[180px] rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden',
            'border-t-2 border-t-rose-500',
            selected && 'ring-2 ring-primary ring-offset-1'
        )}>
            {/* Coloured header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-rose-50 dark:bg-rose-950/30">
                <CircleDot className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                <span className="text-xs font-semibold text-rose-700 dark:text-rose-300 truncate">
                    {t('end.title')}
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
                {data.endType && (
                    <p className="text-xs text-muted-foreground">{getEndTypeLabel(data.endType)}</p>
                )}
            </div>

            {/* Input handle only - end nodes don't have outputs */}
            <Handle
                type="target"
                position={Position.Top}
                className="w-3 h-3"
            />
        </div>
    )
}