import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { EdgeProps, EdgeLabelRenderer, BaseEdge } from 'reactflow'

// Vertical drop from source before the horizontal segment.
// Each orderIndex gets its own lane, so parallel edges never overlap.
const BASE_OFFSET = 18
const LANE_HEIGHT = 22
const CORNER_R = 6

export default function DialogueEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    style = {},
    data,
    markerEnd,
}: EdgeProps) {
    const t = useTranslations('editors.edges.dialogueEdge')
    const [hovered, setHovered] = useState(false)

    const ORDER = data?.orderIndex ?? 0

    // bandY is the Y of the horizontal segment for this lane.
    // Clamped so it never exceeds the midpoint between source and target
    // (prevents upward-going paths when nodes are close together).
    const rawBandY = sourceY + BASE_OFFSET + ORDER * LANE_HEIGHT
    const bandY = Math.min(rawBandY, Math.round((sourceY + targetY) / 2) - CORNER_R)

    const dx = targetX - sourceX
    const dir = dx >= 0 ? 1 : -1
    const absDx = Math.abs(dx)

    // Build the SVG path manually:
    //   1. Short vertical exit from source
    //   2. Rounded corner into horizontal segment (unique Y = bandY per ORDER)
    //   3. Horizontal to targetX
    //   4. Rounded corner down into target
    //   5. Vertical into target
    // Because bandY is different for each ORDER, parallel edges from the same
    // source are routed as visually separate horizontal lanes.
    let edgePath: string
    let labelX: number

    if (absDx < 2 * CORNER_R) {
        // Nearly vertical edge (source and target almost same X) — straight line
        edgePath = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`
        labelX = sourceX
    } else {
        edgePath =
            `M ${sourceX} ${sourceY}` +
            ` L ${sourceX} ${bandY - CORNER_R}` +
            ` Q ${sourceX} ${bandY} ${sourceX + dir * CORNER_R} ${bandY}` +
            ` L ${targetX - dir * CORNER_R} ${bandY}` +
            ` Q ${targetX} ${bandY} ${targetX} ${bandY + CORNER_R}` +
            ` L ${targetX} ${targetY}`

        // Label on the horizontal segment, ~25% of the horizontal distance
        // before reaching targetX ("near the arrow head" as requested).
        const margin = Math.max(absDx * 0.25, CORNER_R + 10)
        labelX = targetX - dir * margin
    }

    const labelY = bandY

    const choiceKey: string | undefined = data?.clientChoiceKey
    const shortKey = choiceKey ? choiceKey.split('.').pop()! : undefined

    const hasLabel = !!(choiceKey || data?.hideIfLocked || data?.conditionGroup || data?.actionGroup)

    const tooltip = [
        choiceKey ? `"${choiceKey}"` : null,
        data?.orderIndex !== undefined ? `order: ${data.orderIndex}` : null,
        data?.hideIfLocked ? t('tooltip.hiddenIfLocked') : null,
        data?.conditionGroup ? t('tooltip.hasConditions') : null,
        data?.actionGroup ? t('tooltip.hasActions') : null,
    ].filter(Boolean).join('\n')

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
                            pointerEvents: 'all',
                            zIndex: 10,
                        }}
                        className="nodrag nopan"
                        title={tooltip}
                        onMouseEnter={() => setHovered(true)}
                        onMouseLeave={() => setHovered(false)}
                    >
                        {!hovered && (
                            <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-full px-2 py-0.5 shadow-sm text-[10px] font-medium text-slate-600 whitespace-nowrap">
                                {data?.orderIndex !== undefined && (
                                    <span className="text-slate-400 mr-0.5">{data.orderIndex + 1}.</span>
                                )}
                                {shortKey && <span className="max-w-[80px] truncate">{shortKey}</span>}
                                {data?.hideIfLocked && <span>🔒</span>}
                                {(data?.conditionGroup || data?.actionGroup) && <span>⚙️</span>}
                            </div>
                        )}
                        {hovered && (
                            <div className="bg-white border border-slate-300 rounded-lg px-3 py-2 shadow-lg text-xs text-left min-w-[120px] max-w-[220px]">
                                {choiceKey && (
                                    <div className="font-medium text-blue-600 break-all">{choiceKey}</div>
                                )}
                                <div className="flex flex-wrap items-center gap-1 mt-1">
                                    {data?.orderIndex !== undefined && (
                                        <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px]">#{data.orderIndex}</span>
                                    )}
                                    {data?.hideIfLocked && (
                                        <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[10px]">🔒 locked</span>
                                    )}
                                    {data?.conditionGroup && (
                                        <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-[10px]">⚙️ cond</span>
                                    )}
                                    {data?.actionGroup && (
                                        <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[10px]">⚙️ action</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    )
}
