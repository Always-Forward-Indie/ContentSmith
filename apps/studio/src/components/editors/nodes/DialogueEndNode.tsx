'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { Handle, Position, NodeProps } from 'reactflow'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Square } from 'lucide-react'

interface DialogueEndNodeData {
    clientNodeKey: string
    endType?: 'normal' | 'quest_complete' | 'dialogue_exit'
}

export default function DialogueEndNode({ data, selected }: NodeProps<DialogueEndNodeData>) {
    const t = useTranslations('editors.nodes')

    const getEndTypeColor = (endType?: string) => {
        switch (endType) {
            case 'quest_complete':
                return 'text-green-600'
            case 'dialogue_exit':
                return 'text-yellow-600'
            default:
                return 'text-red-500'
        }
    }

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
        <Card className={`min-w-[180px] ${selected ? 'ring-2 ring-primary' : ''}`}>
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                    <Square className={`w-4 h-4 ${getEndTypeColor(data.endType)}`} />
                    <span className="text-sm font-medium">{t('end.title')}</span>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="space-y-2">
                    <div className="text-sm">
                        <strong>{t('common.key')}:</strong> {data.clientNodeKey || t('common.notSet')}
                    </div>
                    {data.endType && (
                        <div className="text-xs">
                            <strong>{t('common.type')}:</strong> {getEndTypeLabel(data.endType)}
                        </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                        {data.clientNodeKey || t('end.untitled')}
                    </div>
                </div>
            </CardContent>

            {/* Input handle only - end nodes don't have outputs */}
            <Handle
                type="target"
                position={Position.Top}
                className="w-3 h-3"
            />
        </Card>
    )
}