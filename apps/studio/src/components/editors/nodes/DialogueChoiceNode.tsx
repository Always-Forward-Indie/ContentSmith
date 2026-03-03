'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { Handle, Position, NodeProps } from 'reactflow'
import { GitBranch } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogueChoiceNodeData {
    clientNodeKey: string
    choices: Array<{
        id: number
        clientKey?: string
        text: string
    }>
}

export default function DialogueChoiceNode({ data, selected }: NodeProps<DialogueChoiceNodeData>) {
    const t = useTranslations('editors.nodes')

    return (
        <div className={cn(
            'min-w-[220px] rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden',
            'border-t-2 border-t-purple-500',
            selected && 'ring-2 ring-primary ring-offset-1'
        )}>
            {/* Coloured header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-950/30">
                <GitBranch className="h-3.5 w-3.5 shrink-0 text-purple-500" />
                <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 truncate">
                    {t('choice.title')}
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
                {data.choices && data.choices.length > 0 && (
                    <div className="space-y-0.5 pt-0.5">
                        {data.choices.slice(0, 3).map((choice, index) => (
                            <div key={choice.id || index} className="flex items-center gap-1 text-xs text-muted-foreground">
                                <span className="text-purple-400 font-mono">{index + 1}.</span>
                                <span className="truncate">{choice.text?.substring(0, 28)}{(choice.text?.length ?? 0) > 28 ? '…' : ''}</span>
                            </div>
                        ))}
                        {data.choices.length > 3 && (
                            <p className="text-xs text-muted-foreground">+{data.choices.length - 3} {t('choice.more')}</p>
                        )}
                    </div>
                )}
            </div>

            <Handle type="target" position={Position.Top} className="w-3 h-3" />
            <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
        </div>
    )
}