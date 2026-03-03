'use client'

import React, { useCallback, useMemo, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
    ReactFlow,
    Node,
    Edge,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    ConnectionMode,
    MiniMap,
    Panel,
    MarkerType,
    ReactFlowInstance,
} from 'reactflow'
import 'reactflow/dist/style.css'
import Dagre from '@dagrejs/dagre'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Save, Download, Upload, RotateCcw, MessageSquare, GitBranch, Zap, CornerDownRight, CircleDot, MousePointerClick, MoveHorizontal, Trash2, Link, Tag, Wand2, HardDrive, ChevronDown, ChevronUp } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { DialoguePositionManager } from '@/lib/dialogue-positions'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

// Custom node types
import {
    DialogueLineNode,
    DialogueChoiceNode,
    DialogueActionNode,
    DialogueJumpNode,
    DialogueEndNode,
} from './nodes'
import { DialogueEdge } from './edges'
import NodeEditDialog from './NodeEditDialog'
import EdgeEditDialog from './EdgeEditDialog'

const nodeTypes = {
    line: DialogueLineNode,
    choice_hub: DialogueChoiceNode,
    action: DialogueActionNode,
    jump: DialogueJumpNode,
    end: DialogueEndNode,
}

const edgeTypes = {
    dialogue: DialogueEdge,
}

interface DialogueGraphEditorProps {
    dialogueId: number
    graphData?: {
        dialogue: any
        nodes: any[]
        edges: any[]
    }
    onSave?: (nodes: Node[], edges: Edge[]) => void
    readOnly?: boolean
}

export default function DialogueGraphEditor({
    dialogueId,
    graphData,
    onSave,
    readOnly = false,
}: DialogueGraphEditorProps) {
    const t = useTranslations('editors.dialogueGraphEditor')

    // Position manager for localStorage
    const positionManager = useMemo(() => new DialoguePositionManager(dialogueId), [dialogueId])

    // Convert DB data to React Flow format
    const convertDataToNodes = useCallback((dbNodes: any[]): Node[] => {
        return dbNodes.map((node) => {
            const baseData = {
                dialogueId,
                nodeType: node.type,
                clientNodeKey: node.clientNodeKey || '',
                speakerNpcId: node.speakerNpcId,
                conditionGroup: node.conditionGroup,
                actionGroup: node.actionGroup,
                jumpTargetNodeId: node.jumpTargetNodeId,
            }

            // Add type-specific data
            const data = node.type === 'choice_hub'
                ? { ...baseData, choices: node.choices || [] }
                : baseData

            // Get position from localStorage or use fallback
            const position = positionManager.getNodePosition(
                node.id.toString(),
                { x: node.positionX || 0, y: node.positionY || 0 }
            )

            return {
                id: node.id.toString(),
                type: node.type,
                position,
                data,
            }
        })
    }, [dialogueId, positionManager])

    const convertDataToEdges = useCallback((dbEdges: any[]): Edge[] => {
        return dbEdges.map((edge) => {
            return {
                id: edge.id.toString(),
                source: edge.fromNodeId.toString(),
                target: edge.toNodeId.toString(),
                type: 'dialogue',
                animated: false,
                markerEnd: {
                    type: MarkerType.Arrow,
                    color: '#64748b',
                },
                data: {
                    clientChoiceKey: edge.clientChoiceKey || '',
                    conditionGroup: edge.conditionGroup,
                    actionGroup: edge.actionGroup,
                    orderIndex: edge.orderIndex || 0,
                    hideIfLocked: edge.hideIfLocked || false,
                },
            }
        })
    }, [])

    const initialNodes = useMemo(() => {
        return graphData?.nodes ? convertDataToNodes(graphData.nodes) : []
    }, [graphData?.nodes, convertDataToNodes])

    const initialEdges = useMemo(() => {
        return graphData?.edges ? convertDataToEdges(graphData.edges) : []
    }, [graphData?.edges, convertDataToEdges])

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
    const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null)

    // Save positions to localStorage when nodes move
    const handleNodesChange = useCallback((changes: any[]) => {
        onNodesChange(changes)

        // Save position changes to localStorage
        changes.forEach(change => {
            if (change.type === 'position' && change.position && !change.dragging) {
                // Only save when drag is complete (not dragging)
                positionManager.updateNodePosition(change.id, change.position)
            }
        })
    }, [onNodesChange, positionManager])

    // Node editing state
    const [editingNode, setEditingNode] = useState<Node | null>(null)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

    // Edge editing state
    const [editingEdge, setEditingEdge] = useState<Edge | null>(null)
    const [isEdgeEditDialogOpen, setIsEdgeEditDialogOpen] = useState(false)

    // UI state
    const [showResetConfirm, setShowResetConfirm] = useState(false)

    // tRPC mutations
    const saveNodeMutation = trpc.dialogue.saveNode.useMutation()
    const saveEdgeMutation = trpc.dialogue.saveEdge.useMutation()
    const deleteEdgeMutation = trpc.dialogue.deleteEdge.useMutation()
    const deleteNodeMutation = trpc.dialogue.deleteNode.useMutation()

    // Update nodes and edges when data changes
    useEffect(() => {
        setNodes(initialNodes)
    }, [initialNodes, setNodes])

    useEffect(() => {
        setEdges(initialEdges)
    }, [initialEdges, setEdges])

    // Edge double-click handler
    const onEdgeDoubleClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
        setEditingEdge(edge)
        setIsEdgeEditDialogOpen(true)
    }, [])

    const handleEdgeSave = useCallback((updatedEdge: Edge) => {
        setEdges((eds) => eds.map((e) => e.id === updatedEdge.id ? updatedEdge : e))
        setEditingEdge(null)
    }, [setEdges])

    const handleEdgeDelete = useCallback(async (edgeId: string) => {
        try {
            // Remove from local state first
            setEdges((eds) => eds.filter((e) => e.id !== edgeId))
            setEditingEdge(null)
            setIsEdgeEditDialogOpen(false)

            // If edge ID is numeric, delete from database  
            const numericId = parseInt(edgeId)
            if (!isNaN(numericId)) {
                await deleteEdgeMutation.mutateAsync({ id: numericId })
            }
        } catch (error) {
            console.error('Failed to delete edge:', error)
            // Optionally restore the edge in UI if deletion failed
        }
    }, [setEdges, deleteEdgeMutation])

    const onConnect = useCallback(
        (params: Connection) => {
            const edge = {
                ...params,
                id: `edge-${params.source}-${params.target}`,
                type: 'dialogue',
                animated: false,
                markerEnd: {
                    type: MarkerType.Arrow,
                    color: '#64748b',
                },
                data: {
                    clientChoiceKey: 'New Choice',
                    conditionGroup: null,
                    actionGroup: null,
                    orderIndex: 0,
                    hideIfLocked: false,
                },
            }
            setEdges((eds) => addEdge(edge, eds))
        },
        [setEdges]
    )

    const addNewNode = useCallback(
        (type: string) => {
            const baseData = {
                dialogueId,
                nodeType: type,
                clientNodeKey: '',
                speakerNpcId: null,
                conditionGroup: null,
                actionGroup: null,
                jumpTargetNodeId: type === 'jump' ? null : undefined,
            }

            // Add type-specific data
            const typeSpecificData = type === 'choice_hub'
                ? { ...baseData, choices: [] }
                : baseData

            const newNodeId = `${type}-${Date.now()}`
            const position = { x: Math.random() * 400, y: Math.random() * 400 }

            const newNode: Node = {
                id: newNodeId,
                type,
                position,
                data: typeSpecificData,
            }

            setNodes((nds) => [...nds, newNode])

            // Save position to localStorage
            positionManager.updateNodePosition(newNodeId, position)
        },
        [dialogueId, setNodes, positionManager]
    )

    // Auto-layout all nodes using dagre
    const handleAutoLayout = useCallback(() => {
        if (!nodes.length) return

        const g = new Dagre.graphlib.Graph()
        g.setDefaultEdgeLabel(() => ({}))
        g.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 120, marginx: 40, marginy: 40 })

        const NODE_WIDTHS: Record<string, number> = {
            choice_hub: 220,
            line: 200,
            action: 200,
            jump: 200,
            end: 180,
        }
        const NODE_HEIGHT = 120

        nodes.forEach((node) => {
            const width = NODE_WIDTHS[node.type ?? ''] ?? 200
            g.setNode(node.id, { width, height: NODE_HEIGHT })
        })

        edges.forEach((edge) => {
            g.setEdge(edge.source, edge.target)
        })

        Dagre.layout(g)

        const newPositions: Record<string, { x: number; y: number }> = {}
        const layoutedNodes = nodes.map((node) => {
            const { x, y } = g.node(node.id)
            const width = NODE_WIDTHS[node.type ?? ''] ?? 200
            const position = { x: x - width / 2, y: y - NODE_HEIGHT / 2 }
            newPositions[node.id] = position
            return { ...node, position }
        })

        setNodes(layoutedNodes)
        positionManager.savePositions(newPositions)

        window.requestAnimationFrame(() => {
            rfInstance?.fitView({ padding: 0.12, duration: 400 })
        })

        toast.success(t('messages.layoutApplied'), t('messages.layoutAppliedDescription'))
    }, [nodes, edges, setNodes, positionManager, rfInstance, t])

    // Reset positions (clear localStorage)
    const handleResetPositions = useCallback(() => {
        positionManager.clearStoredPositions()

        // Reload nodes with default positions
        if (graphData?.nodes) {
            const resetNodes = convertDataToNodes(graphData.nodes)
            setNodes(resetNodes)
            toast.success(t('messages.positionsReset'), t('messages.positionsResetDescription'))
        }
        setShowResetConfirm(false)
    }, [positionManager, graphData?.nodes, convertDataToNodes, setNodes, t])

    const handleNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
        setEditingNode(node)
        setIsEditDialogOpen(true)
    }, [])

    const handleNodeSave = useCallback((updatedNode: Node) => {
        setNodes((nds) =>
            nds.map((node) =>
                node.id === updatedNode.id ? updatedNode : node
            )
        )
        setEditingNode(null)
    }, [setNodes])

    const handleNodeDelete = useCallback(async (nodeId: string) => {
        try {
            // Remove from local state first
            setNodes((nds) => nds.filter((node) => node.id !== nodeId))
            setEditingNode(null)
            setIsEditDialogOpen(false)

            // Remove all edges connected to this node
            setEdges((eds) => eds.filter((edge) =>
                edge.source !== nodeId && edge.target !== nodeId
            ))

            // If node ID is numeric, delete from database
            const numericId = parseInt(nodeId)
            if (!isNaN(numericId)) {
                await deleteNodeMutation.mutateAsync({ id: numericId })
            }
        } catch (error) {
            console.error('Failed to delete node:', error)
            // Optionally restore the node in UI if deletion failed
        }
    }, [setNodes, setEdges, deleteNodeMutation])

    const handleSave = useCallback(async () => {
        if (onSave) {
            onSave(nodes, edges)
        } else {
            // Save to database via tRPC (without positions)
            try {
                // Map old IDs to new IDs
                const nodeIdMap = new Map<string, number>()

                // Save nodes first and collect ID mappings
                for (const node of nodes) {
                    const isNewNode = node.id.includes('-') // temp IDs contain dash

                    if (isNewNode) {
                        // Create new node (without position data)
                        const newNode = await saveNodeMutation.mutateAsync({
                            dialogueId,
                            type: node.data.nodeType as 'line' | 'choice_hub' | 'action' | 'jump' | 'end',
                            clientNodeKey: node.data.clientNodeKey || '',
                            speakerNpcId: node.data.speakerNpcId,
                            conditionGroup: node.data.conditionGroup,
                            actionGroup: node.data.actionGroup,
                            jumpTargetNodeId: node.data.jumpTargetNodeId,
                        })
                        nodeIdMap.set(node.id, newNode.id)

                        // Update position in localStorage with new ID
                        positionManager.updateNodePosition(newNode.id.toString(), node.position)
                    } else {
                        // Update existing node (without position data)
                        const nodeId = parseInt(node.id)
                        await saveNodeMutation.mutateAsync({
                            dialogueId,
                            id: nodeId,
                            type: node.data.nodeType as 'line' | 'choice_hub' | 'action' | 'jump' | 'end',
                            clientNodeKey: node.data.clientNodeKey || '',
                            speakerNpcId: node.data.speakerNpcId,
                            conditionGroup: node.data.conditionGroup,
                            actionGroup: node.data.actionGroup,
                            jumpTargetNodeId: node.data.jumpTargetNodeId,
                        })
                        nodeIdMap.set(node.id, nodeId)

                        // Update position in localStorage
                        positionManager.updateNodePosition(node.id, node.position)
                    }
                }

                // Save edges with correct node IDs
                for (const edge of edges) {
                    const fromNodeId = nodeIdMap.get(edge.source)
                    const toNodeId = nodeIdMap.get(edge.target)

                    if (fromNodeId && toNodeId) {
                        const isNewEdge = edge.id.includes('-')

                        if (isNewEdge) {
                            // Create new edge
                            await saveEdgeMutation.mutateAsync({
                                fromNodeId,
                                toNodeId,
                                clientChoiceKey: edge.data?.clientChoiceKey || '',
                                conditionGroup: edge.data?.conditionGroup,
                                actionGroup: edge.data?.actionGroup,
                                orderIndex: edge.data?.orderIndex || 0,
                                hideIfLocked: edge.data?.hideIfLocked || false,
                            })
                        } else {
                            // Update existing edge
                            const edgeId = parseInt(edge.id)
                            await saveEdgeMutation.mutateAsync({
                                id: edgeId,
                                fromNodeId,
                                toNodeId,
                                clientChoiceKey: edge.data?.clientChoiceKey || '',
                                conditionGroup: edge.data?.conditionGroup,
                                actionGroup: edge.data?.actionGroup,
                                orderIndex: edge.data?.orderIndex || 0,
                                hideIfLocked: edge.data?.hideIfLocked || false,
                            })
                        }
                    }
                }

                toast.success(t('messages.savedSuccessfully'), t('messages.savedSuccessfullyDescription'))
                // Reload the page to get fresh data with new IDs
                window.location.reload()
            } catch (error) {
                console.error('Save failed:', error)
                toast.error(t('messages.saveFailed'), (error as Error).message)
            }
        }
    }, [nodes, edges, onSave, dialogueId, saveNodeMutation, saveEdgeMutation, positionManager])

    const onNodesDelete = useCallback((nodesToDelete: Node[]) => {
        nodesToDelete.forEach(node => {
            handleNodeDelete(node.id)
        })
    }, [handleNodeDelete])

    const miniMapNodeColor = useCallback((node: Node) => {
        switch (node.type) {
            case 'line':
                return '#3b82f6' // blue
            case 'choice_hub':
                return '#10b981' // green
            case 'action':
                return '#f59e0b' // yellow
            case 'jump':
                return '#8b5cf6' // purple
            case 'end':
                return '#ef4444' // red
            default:
                return '#6b7280' // gray
        }
    }, [])

    const proOptions = { hideAttribution: true }

    return (
        <div className="space-y-4">
            <div className="h-[800px] w-full border rounded-lg overflow-hidden">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={handleNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onNodeDoubleClick={handleNodeDoubleClick}
                    onEdgeDoubleClick={onEdgeDoubleClick}
                    onNodesDelete={onNodesDelete}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    connectionMode={ConnectionMode.Loose}
                    fitView
                    onInit={setRfInstance}
                    proOptions={proOptions}
                >
                    <Background />
                    <Controls />
                    <MiniMap
                        nodeColor={miniMapNodeColor}
                        position="bottom-right"
                        className="!bg-background border"
                    />

                    {!readOnly && (
                        <Panel position="top-left" className="space-y-2">
                            <Card className="p-3 min-w-[160px]">
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                        {t('panels.addNodes')}
                                    </p>
                                    <div className="grid grid-cols-2 gap-1">
                                        <Button size="sm" variant="outline" onClick={() => addNewNode('line')}
                                            className="text-xs h-8 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/40">
                                            <MessageSquare className="w-3 h-3 mr-1 text-blue-500" />
                                            {t('nodeTypes.line')}
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => addNewNode('choice_hub')}
                                            className="text-xs h-8 border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-800 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-950/40">
                                            <GitBranch className="w-3 h-3 mr-1 text-purple-500" />
                                            {t('nodeTypes.choice')}
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => addNewNode('action')}
                                            className="text-xs h-8 border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/40">
                                            <Zap className="w-3 h-3 mr-1 text-amber-500" />
                                            {t('nodeTypes.action')}
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => addNewNode('jump')}
                                            className="text-xs h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40">
                                            <CornerDownRight className="w-3 h-3 mr-1 text-emerald-500" />
                                            {t('nodeTypes.jump')}
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => addNewNode('end')}
                                            className="text-xs h-8 col-span-2 border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/40">
                                            <CircleDot className="w-3 h-3 mr-1 text-rose-500" />
                                            {t('nodeTypes.end')}
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        </Panel>
                    )}

                    <Panel position="top-right" className="space-y-2">
                        <Card className="p-3 min-w-[148px]">
                            <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('panels.actions')}
                                </p>
                                <div className="space-y-1">
                                    {!readOnly && (
                                        <Button size="sm" onClick={handleSave} className="w-full text-xs">
                                            <Save className="w-3 h-3 mr-1" />
                                            {t('controls.save')}
                                        </Button>
                                    )}
                                    <Button size="sm" variant="outline" onClick={handleAutoLayout} className="w-full text-xs">
                                        <Wand2 className="w-3 h-3 mr-1" />
                                        {t('controls.autoLayout')}
                                    </Button>
                                    {showResetConfirm ? (
                                        <div className="flex gap-1">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setShowResetConfirm(false)}
                                                className="flex-1 text-xs h-8 text-muted-foreground"
                                            >
                                                {t('controls.cancel')}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={handleResetPositions}
                                                className="flex-1 text-xs h-8"
                                            >
                                                {t('controls.confirm')}
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setShowResetConfirm(true)}
                                            className="w-full text-xs text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
                                        >
                                            <RotateCcw className="w-3 h-3 mr-1" />
                                            {t('controls.resetLayout')}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    </Panel>
                </ReactFlow>
            </div>

            <NodeEditDialog
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                node={editingNode}
                onSave={handleNodeSave}
                onDelete={handleNodeDelete}
            />

            <EdgeEditDialog
                open={isEdgeEditDialogOpen}
                onOpenChange={setIsEdgeEditDialogOpen}
                edge={editingEdge}
                onSave={handleEdgeSave}
                onDelete={handleEdgeDelete}
            />

            {/* Help/Instructions */}
            <HelpPanel t={t} />
        </div>
    )
}

// ─── Help Panel ───────────────────────────────────────────────────────────────

const NODE_TYPES_VISUAL = [
    { key: 'line', tKey: 'line', icon: MessageSquare, color: 'blue', bg: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-600 dark:text-blue-400' },
    { key: 'choice_hub', tKey: 'choice', icon: GitBranch, color: 'purple', bg: 'bg-purple-50 dark:bg-purple-950/40', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-600 dark:text-purple-400' },
    { key: 'action', tKey: 'action', icon: Zap, color: 'amber', bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-600 dark:text-amber-400' },
    { key: 'jump', tKey: 'jump', icon: CornerDownRight, color: 'emerald', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-600 dark:text-emerald-400' },
    { key: 'end', tKey: 'end', icon: CircleDot, color: 'rose', bg: 'bg-rose-50 dark:bg-rose-950/40', border: 'border-rose-200 dark:border-rose-800', text: 'text-rose-600 dark:text-rose-400' },
] as const

const CONTROLS_VISUAL = [
    { icon: MousePointerClick, actionKey: 'doubleClickNode' },
    { icon: MousePointerClick, actionKey: 'doubleClickEdge' },
    { icon: Tag, actionKey: 'edgeLabels' },
    { icon: Link, actionKey: 'dragFromNode' },
    { icon: MoveHorizontal, actionKey: 'dragNode' },
    { icon: Trash2, actionKey: 'selectDelete' },
    { icon: Save, actionKey: 'saveButton' },
] as const

const LAYOUT_VISUAL = [
    { icon: Wand2, key: 'autoLayout' },
    { icon: RotateCcw, key: 'resetLayout' },
    { icon: HardDrive, key: 'positions' },
    { icon: HardDrive, key: 'persistent' },
] as const

function HelpPanel({ t }: { t: any }) {
    const [open, setOpen] = useState(false)

    return (
        <Card className="overflow-hidden">
            {/* Toggle header */}
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-muted/40 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{t('help.title')}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground font-mono">?</span>
                </div>
                {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>

            {open && (
                <CardContent className="pt-0 pb-6">
                    <div className="border-t border-border/60 pt-5 space-y-7">

                        {/* Node Types */}
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                                {t('help.sections.nodeTypes')}
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                                {NODE_TYPES_VISUAL.map(({ key, tKey, icon: Icon, bg, border, text }) => {
                                    const raw = t(`help.nodeTypeDescriptions.${tKey}`) as string
                                    return (
                                        <div
                                            key={key}
                                            className={cn('flex flex-col gap-2 rounded-lg border p-3', bg, border)}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <Icon className={cn('h-3.5 w-3.5 shrink-0', text)} />
                                                <span className={cn('text-xs font-semibold', text)}>
                                                    {t(`nodeTypes.${tKey}`)}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground leading-snug">{raw}</p>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Controls */}
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                                {t('help.sections.controls')}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5">
                                {CONTROLS_VISUAL.map(({ icon: Icon, actionKey }) => {
                                    const raw = t(`help.controlDescriptions.${actionKey}`) as string
                                    const [action, ...rest] = raw.split(': ')
                                    const desc = rest.join(': ')
                                    return (
                                        <div key={actionKey} className="flex items-start gap-2.5">
                                            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted">
                                                <Icon className="h-3 w-3 text-muted-foreground" />
                                            </div>
                                            <div className="text-xs">
                                                <span className="font-medium text-foreground">{action}</span>
                                                {desc && <span className="text-muted-foreground"> — {desc}</span>}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Layout */}
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                                {t('help.sections.layout')}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5">
                                {LAYOUT_VISUAL.map(({ icon: Icon, key }) => {
                                    const raw = t(`help.layoutDescriptions.${key}`) as string
                                    const [action, ...rest] = raw.split(': ')
                                    const desc = rest.join(': ')
                                    return (
                                        <div key={key} className="flex items-start gap-2.5">
                                            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted">
                                                <Icon className="h-3 w-3 text-muted-foreground" />
                                            </div>
                                            <div className="text-xs">
                                                <span className="font-medium text-foreground">{action}</span>
                                                {desc && <span className="text-muted-foreground"> — {desc}</span>}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                    </div>
                </CardContent>
            )}
        </Card>
    )
}