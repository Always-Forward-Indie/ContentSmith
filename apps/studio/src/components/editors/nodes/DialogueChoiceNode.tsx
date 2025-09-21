'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { Handle, Position, NodeProps } from 'reactflow'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { GitBranch } from 'lucide-react'

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
        <Card className={`min-w-[220px] ${selected ? 'ring-2 ring-primary' : ''}`}>
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium">{t('choice.title')}</span>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="space-y-2">
                    <div className="text-sm">
                        <strong>{t('common.key')}:</strong> {data.clientNodeKey || t('common.notSet')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {data.clientNodeKey || t('choice.untitled')}
                    </div>
                    {data.choices && data.choices.length > 0 && (
                        <div className="mt-2">
                            <div className="text-xs font-medium mb-1">{t('choice.choices')}:</div>
                            <div className="space-y-1">
                                {data.choices.map((choice, index) => (
                                    <div key={choice.id || index} className="text-xs p-1 bg-muted rounded text-muted-foreground">
                                        {index + 1}. {choice.text?.substring(0, 30)}{choice.text?.length > 30 ? '...' : ''}
                                    </div>
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

            {/* Multiple output handles for choices */}
            {(data.choices || []).map((_, index) => (
                <Handle
                    key={index}
                    type="source"
                    position={Position.Bottom}
                    id={`choice-${index}`}
                    className="w-3 h-3"
                    style={{
                        left: `${25 + (index * 50 / Math.max((data.choices?.length || 1) - 1, 1))}%`,
                    }}
                />
            ))}
        </Card>
    )
}