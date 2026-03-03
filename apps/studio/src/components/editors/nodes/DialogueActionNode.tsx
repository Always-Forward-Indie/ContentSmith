'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { Handle, Position, NodeProps } from 'reactflow'
import { Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogueActionNodeData {
    clientNodeKey: string
    actionGroup?: unknown
}

export default function DialogueActionNode({ data, selected }: NodeProps<DialogueActionNodeData>) {
    const t = useTranslations('editors.nodes')
    const hasActions = !!data.actionGroup

    return (
        <div className={cn(
            'min-w-[200px] rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden',
            'border-t-2 border-t-amber-500',
            selected && 'ring-2 ring-primary ring-offset-1'
        )}>
            {/* Coloured header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/30">
                <Zap className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 truncate">
                    {t('action.title')}
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
                {hasActions && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">{t('action.hasActions')}</p>
                )}
            </div>

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
        </div>
    )
}