'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { Handle, Position, NodeProps } from 'reactflow'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { MessageCircle } from 'lucide-react'

interface DialogueLineNodeData {
    clientNodeKey: string
    speakerNpcId?: number | null
}

export default function DialogueLineNode({ data, selected }: NodeProps<DialogueLineNodeData>) {
    const t = useTranslations('editors.nodes')

    return (
        <Card className={`min-w-[200px] ${selected ? 'ring-2 ring-primary' : ''}`}>
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium">{t('line.title')}</span>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="space-y-2">
                    <div className="text-sm">
                        <strong>{t('common.key')}:</strong> {data.clientNodeKey || t('common.notSet')}
                    </div>
                    {data.speakerNpcId && (
                        <div className="text-xs text-muted-foreground">
                            {t('common.speaker')}: NPC #{data.speakerNpcId}
                        </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                        {data.clientNodeKey || t('line.untitled')}
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