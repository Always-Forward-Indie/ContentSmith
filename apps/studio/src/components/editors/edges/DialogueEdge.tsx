import React from 'react'
import { useTranslations } from 'next-intl'
import { EdgeProps, getBezierPath, EdgeLabelRenderer, BaseEdge } from 'reactflow'

export default function DialogueEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    data,
    markerEnd,
}: EdgeProps) {
    const t = useTranslations('editors.edges.dialogueEdge')

    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    })

    const hasLabel = data?.clientChoiceKey || data?.orderIndex > 0 || data?.hideIfLocked

    return (
        <>
            <BaseEdge
                path={edgePath}
                markerEnd={markerEnd}
                style={{
                    ...style,
                    strokeWidth: 2,
                    stroke: '#64748b',
                }}
            />
            {hasLabel && (
                <EdgeLabelRenderer>
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                            fontSize: 12,
                            pointerEvents: 'all',
                        }}
                        className="nodrag nopan bg-white border rounded px-2 py-1 shadow-sm text-xs max-w-40 text-center"
                        title={`${t('tooltip.edgeId')}: ${id}${data?.clientChoiceKey ? `\n${t('tooltip.choice')}: "${data.clientChoiceKey}"` : ''}${data?.orderIndex > 0 ? `\n${t('tooltip.order')}: ${data.orderIndex}` : ''}${data?.hideIfLocked ? `\n${t('tooltip.hiddenIfLocked')}` : ''}${data?.conditionGroup ? `\n${t('tooltip.hasConditions')}` : ''}${data?.actionGroup ? `\n${t('tooltip.hasActions')}` : ''}`}
                    >
                        {data?.clientChoiceKey && (
                            <div className="font-medium text-blue-600 truncate">
                                "{data.clientChoiceKey}"
                            </div>
                        )}
                        {(!data?.clientChoiceKey) && (
                            <div className="text-gray-500 italic text-xs">
                                {t('labels.noChoiceText')}
                            </div>
                        )}
                        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-1">
                            {data?.orderIndex > 0 && (
                                <span className="bg-yellow-100 text-yellow-800 px-1 rounded text-xs">
                                    #{data.orderIndex}
                                </span>
                            )}
                            {data?.hideIfLocked && (
                                <span className="bg-orange-100 text-orange-800 px-1 rounded text-xs" title={t('tooltip.hiddenIfLocked')}>
                                    🔒
                                </span>
                            )}
                            {(data?.conditionGroup || data?.actionGroup) && (
                                <span className="bg-purple-100 text-purple-800 px-1 rounded text-xs" title={t('tooltip.hasConditionsOrActions')}>
                                    ⚙️
                                </span>
                            )}
                        </div>
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    )
}