'use client'

import React, { useCallback, useMemo, useEffect, useState } from 'react'
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
} from 'reactflow'
import 'reactflow/dist/style.css'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Save, Download, Upload, RotateCcw } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { DialoguePositionManager } from '@/lib/dialogue-positions'
import { toast } from '@/hooks/use-toast'

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
        return dbEdges.map((edge) => ({
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
        }))
    }, [])

    const initialNodes = useMemo(() => {
        return graphData?.nodes ? convertDataToNodes(graphData.nodes) : []
    }, [graphData?.nodes, convertDataToNodes])

    const initialEdges = useMemo(() => {
        return graphData?.edges ? convertDataToEdges(graphData.edges) : []
    }, [graphData?.edges, convertDataToEdges])

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

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

    // Auto-layout all nodes
    const handleAutoLayout = useCallback(() => {
        if (!graphData?.nodes.length) return

        const newPositions = DialoguePositionManager.autoLayoutNodes(graphData.nodes)

        // Update React Flow nodes
        setNodes(currentNodes =>
            currentNodes.map(node => ({
                ...node,
                position: newPositions[node.id] || node.position
            }))
        )

        // Save to localStorage
        positionManager.savePositions(newPositions)

        toast.success('Layout applied', 'Nodes have been automatically arranged')
    }, [graphData?.nodes, setNodes, positionManager])

    // Reset positions (clear localStorage)
    const handleResetPositions = useCallback(() => {
        if (confirm('This will reset all node positions to their defaults. Continue?')) {
            positionManager.clearStoredPositions()

            // Reload nodes with default positions
            if (graphData?.nodes) {
                const resetNodes = convertDataToNodes(graphData.nodes)
                setNodes(resetNodes)
                toast.success('Positions reset', 'All node positions have been reset')
            }
        }
    }, [positionManager, graphData?.nodes, convertDataToNodes, setNodes])

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

                toast.success('Saved successfully', 'All changes have been saved to the database')
                // Reload the page to get fresh data with new IDs
                window.location.reload()
            } catch (error) {
                console.error('Save failed:', error)
                toast.error('Save failed', (error as Error).message)
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
                            <Card className="p-3">
                                <div className="space-y-2">
                                    <h3 className="font-medium text-sm">Add Nodes</h3>
                                    <div className="grid grid-cols-2 gap-1">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => addNewNode('line')}
                                            className="text-xs h-8"
                                        >
                                            <Plus className="w-3 h-3 mr-1" />
                                            Line
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => addNewNode('choice_hub')}
                                            className="text-xs h-8"
                                        >
                                            <Plus className="w-3 h-3 mr-1" />
                                            Choice
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => addNewNode('action')}
                                            className="text-xs h-8"
                                        >
                                            <Plus className="w-3 h-3 mr-1" />
                                            Action
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => addNewNode('jump')}
                                            className="text-xs h-8"
                                        >
                                            <Plus className="w-3 h-3 mr-1" />
                                            Jump
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => addNewNode('end')}
                                            className="text-xs h-8 col-span-2"
                                        >
                                            <Plus className="w-3 h-3 mr-1" />
                                            End
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        </Panel>
                    )}

                    <Panel position="top-right" className="space-y-2">
                        <Card className="p-3">
                            <div className="space-y-2">
                                <h3 className="font-medium text-sm">Actions</h3>
                                <div className="space-y-1">
                                    {!readOnly && (
                                        <Button size="sm" onClick={handleSave} className="w-full text-xs">
                                            <Save className="w-3 h-3 mr-1" />
                                            Save
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleAutoLayout}
                                        className="w-full text-xs"
                                    >
                                        <RotateCcw className="w-3 h-3 mr-1" />
                                        Auto Layout
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleResetPositions}
                                        className="w-full text-xs text-destructive hover:text-destructive"
                                    >
                                        Reset Layout
                                    </Button>
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
            <Card>
                <CardHeader>
                    <CardTitle>Instructions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                            <h4 className="font-medium mb-2">Node Types</h4>
                            <ul className="space-y-1 text-muted-foreground">
                                <li><strong>Line:</strong> Single dialogue line with speaker</li>
                                <li><strong>Choice:</strong> Player choice hub with multiple options</li>
                                <li><strong>Action:</strong> Execute game actions</li>
                                <li><strong>Jump:</strong> Jump to another node</li>
                                <li><strong>End:</strong> End the dialogue</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-medium mb-2">Controls</h4>
                            <ul className="space-y-1 text-muted-foreground">
                                <li><strong>Double-click node:</strong> Edit node properties</li>
                                <li><strong>Double-click edge:</strong> Edit connection properties</li>
                                <li><strong>Edge labels:</strong> Show choice text and info</li>
                                <li><strong>Drag from node:</strong> Create new connection</li>
                                <li><strong>Drag node:</strong> Move and save position</li>
                                <li><strong>Select & Delete:</strong> Remove nodes/edges</li>
                                <li><strong>Save button:</strong> Save changes to database</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-medium mb-2">Layout</h4>
                            <ul className="space-y-1 text-muted-foreground">
                                <li><strong>Auto Layout:</strong> Arrange nodes automatically</li>
                                <li><strong>Reset Layout:</strong> Clear saved positions</li>
                                <li><strong>Positions:</strong> Saved locally in your browser</li>
                                <li><strong>Persistent:</strong> Layout survives page reloads</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}