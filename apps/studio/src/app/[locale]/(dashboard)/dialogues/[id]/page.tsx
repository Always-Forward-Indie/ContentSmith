'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit, Trash2, Plus, GitBranch, Link as LinkIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from '@/components/ui/dialog'
import { trpc } from '@/lib/trpc'
import { toast } from '@/hooks/use-toast'
import DialogueNodeEdit from '@/components/dialogue/DialogueNodeEdit'
import DialogueEdgeEdit from '@/components/dialogue/DialogueEdgeEdit'
import DialogueNodeCreate from '@/components/dialogue/DialogueNodeCreate'
import DialogueEdgeCreate from '@/components/dialogue/DialogueEdgeCreate'

export default function DialogueDetailPage() {
    const t = useTranslations('dialogues.detail')
    const locale = useLocale()
    const params = useParams()
    const router = useRouter()
    const dialogueId = parseInt(params.id as string)

    // Modal states
    const [nodeEditOpen, setNodeEditOpen] = useState(false)
    const [edgeEditOpen, setEdgeEditOpen] = useState(false)
    const [nodeCreateOpen, setNodeCreateOpen] = useState(false)
    const [edgeCreateOpen, setEdgeCreateOpen] = useState(false)
    const [editingNode, setEditingNode] = useState<any>(null)
    const [editingEdge, setEditingEdge] = useState<any>(null)

    const { data: dialogue, isLoading, error } = trpc.dialogue.byId.useQuery(
        { id: dialogueId },
        { enabled: !isNaN(dialogueId) }
    )

    const { data: graphData, refetch: refetchGraph } = trpc.dialogue.getGraph.useQuery(
        { id: dialogueId },
        { enabled: !isNaN(dialogueId) }
    )

    const deleteDialogue = trpc.dialogue.delete.useMutation({
        onSuccess: () => {
            toast.success(t('../../deleteSuccess'), t('../../deleteSuccess'))
            router.push(`/${locale}/dialogues`)
        },
        onError: (error) => {
            toast.error(t('../../deleteError'), error.message)
        },
    })

    const deleteNode = trpc.dialogue.deleteNode.useMutation({
        onSuccess: () => {
            toast.success(t('nodeDeleted'), t('nodeDeletedDescription'))
            refetchGraph()
        },
        onError: (error) => {
            toast.error(t('nodeDeleteError'), error.message)
        },
    })

    const deleteEdge = trpc.dialogue.deleteEdge.useMutation({
        onSuccess: () => {
            toast.success(t('connectionDeleted'), t('connectionDeletedDescription'))
            refetchGraph()
        },
        onError: (error) => {
            toast.error(t('connectionDeleteError'), error.message)
        },
    })

    const updateNode = trpc.dialogue.saveNode.useMutation({
        onSuccess: () => {
            toast.success(t('nodeUpdated'), t('nodeUpdatedDescription'))
            refetchGraph()
        },
        onError: (error) => {
            toast.error(t('nodeUpdateError'), error.message)
        },
    })

    const updateEdge = trpc.dialogue.saveEdge.useMutation({
        onSuccess: () => {
            toast.success(t('connectionUpdated'), t('connectionUpdatedDescription'))
            refetchGraph()
        },
        onError: (error) => {
            toast.error(t('connectionUpdateError'), error.message)
        },
    })

    const createNode = trpc.dialogue.saveNode.useMutation({
        onSuccess: () => {
            toast.success(t('nodeCreated'), t('nodeCreatedDescription'))
            refetchGraph()
        },
        onError: (error) => {
            toast.error(t('nodeCreateError'), error.message)
        },
    })

    const createEdge = trpc.dialogue.saveEdge.useMutation({
        onSuccess: () => {
            toast.success(t('connectionCreated'), t('connectionCreatedDescription'))
            refetchGraph()
        },
        onError: (error) => {
            toast.error(t('connectionCreateError'), error.message)
        },
    })

    const handleDelete = async () => {
        try {
            await deleteDialogue.mutateAsync({ id: dialogueId })
        } catch (error) {
            console.error('Failed to delete dialogue:', error)
        }
    }

    const handleDeleteNode = async (nodeId: number) => {
        try {
            await deleteNode.mutateAsync({ id: nodeId })
        } catch (error) {
            console.error('Failed to delete node:', error)
        }
    }

    const handleDeleteEdge = async (edgeId: number) => {
        try {
            await deleteEdge.mutateAsync({ id: edgeId })
        } catch (error) {
            console.error('Failed to delete edge:', error)
        }
    }

    const handleEditNode = (nodeId: number) => {
        const node = graphData?.nodes.find(n => n.id === nodeId)
        if (node) {
            setEditingNode(node)
            setNodeEditOpen(true)
        }
    }

    const handleEditEdge = (edgeId: number) => {
        const edge = graphData?.edges.find(e => e.id === edgeId)
        if (edge) {
            setEditingEdge(edge)
            setEdgeEditOpen(true)
        }
    }

    const handleSaveNode = async (updatedNode: any) => {
        try {
            await updateNode.mutateAsync(updatedNode)
        } catch (error) {
            console.error('Failed to update node:', error)
        }
    }

    const handleSaveEdge = async (updatedEdge: any) => {
        try {
            await updateEdge.mutateAsync(updatedEdge)
        } catch (error) {
            console.error('Failed to update edge:', error)
        }
    }

    const handleCreateNode = async (newNode: any) => {
        try {
            await createNode.mutateAsync(newNode)
        } catch (error) {
            console.error('Failed to create node:', error)
        }
    }

    const handleCreateEdge = async (newEdge: any) => {
        try {
            await createEdge.mutateAsync(newEdge)
        } catch (error) {
            console.error('Failed to create edge:', error)
        }
    }

    if (isNaN(dialogueId)) {
        return (
            <div className="text-center py-12">
                <p className="text-destructive">{t('../../invalidId')}</p>
                <Link href={`/${locale}/dialogues`}>
                    <Button className="mt-4">{t('../../backToDialogues')}</Button>
                </Link>
            </div>
        )
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-destructive">{t('../../errorLoading')}: {error.message}</p>
                <Link href={`/${locale}/dialogues`}>
                    <Button className="mt-4">{t('../../backToDialogues')}</Button>
                </Link>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="h-8 bg-muted rounded w-1/3"></div>
                <div className="h-32 bg-muted rounded"></div>
                <div className="h-64 bg-muted rounded"></div>
            </div>
        )
    }

    if (!dialogue) {
        return (
            <div className="text-center py-12">
                <p>{t('../../errorLoading')}</p>
                <Link href={`/${locale}/dialogues`}>
                    <Button className="mt-4">{t('../../backToDialogues')}</Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href={`/${locale}/dialogues`}>
                    <Button variant="outline" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {t('back')}
                    </Button>
                </Link>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold tracking-tight">{dialogue.slug}</h1>
                    <p className="text-muted-foreground">Dialogue #{dialogue.id}</p>
                </div>
                <div className="flex gap-2">
                    <Link href={`/dialogues/${dialogue.id}/edit`}>
                        <Button variant="outline">
                            <Edit className="mr-2 h-4 w-4" />
                            {t('edit')}
                        </Button>
                    </Link>
                    <Link href={`/dialogues/${dialogue.id}/graph`}>
                        <Button variant="outline">
                            <GitBranch className="mr-2 h-4 w-4" />
                            {t('viewGraph')}
                        </Button>
                    </Link>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button
                                variant="destructive"
                                disabled={deleteDialogue.isLoading}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t('delete')}
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{t('deleteDialogueTitle')}</DialogTitle>
                                <DialogDescription>
                                    {t('deleteDialogueConfirm')}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex justify-end gap-2">
                                <DialogClose asChild>
                                    <Button variant="outline">
                                        {t('cancel')}
                                    </Button>
                                </DialogClose>
                                <Button
                                    variant="destructive"
                                    onClick={handleDelete}
                                    disabled={deleteDialogue.isLoading}
                                >
                                    {deleteDialogue.isLoading ? t('deleting') : t('delete')}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Dialogue Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('basicInformation')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">{t('slug')}</label>
                            <p className="font-mono">{dialogue.slug}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">{t('version')}</label>
                            <p>{dialogue.version}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">{t('startNode')}</label>
                            <p className="font-mono">
                                {dialogue.startNodeId ? `#${dialogue.startNodeId}` : t('notSet')}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('graphStatistics')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">{t('totalNodes')}</label>
                            <p className="text-2xl font-bold">{graphData?.nodes.length || 0}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">{t('totalEdges')}</label>
                            <p className="text-2xl font-bold">{graphData?.edges.length || 0}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">{t('nodeTypes')}</label>
                            <div className="space-y-1 text-sm">
                                {graphData?.nodes.reduce((acc, node) => {
                                    acc[node.type] = (acc[node.type] || 0) + 1
                                    return acc
                                }, {} as Record<string, number>) &&
                                    Object.entries(
                                        graphData.nodes.reduce((acc, node) => {
                                            acc[node.type] = (acc[node.type] || 0) + 1
                                            return acc
                                        }, {} as Record<string, number>)
                                    ).map(([type, count]) => (
                                        <div key={type} className="flex justify-between">
                                            <span className="capitalize">{type}</span>
                                            <span>{count}</span>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('quickActions')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Button
                            className="w-full"
                            variant="outline"
                            onClick={() => setNodeCreateOpen(true)}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            {t('addNode')}
                        </Button>
                        <Button
                            className="w-full"
                            variant="outline"
                            onClick={() => setEdgeCreateOpen(true)}
                            disabled={!graphData?.nodes.length || graphData.nodes.length < 2}
                        >
                            <LinkIcon className="mr-2 h-4 w-4" />
                            {t('addConnection')}
                        </Button>
                        <Button className="w-full" variant="outline">
                            {t('exportDialogue')}
                        </Button>
                        <Button className="w-full" variant="outline">
                            {t('testDialogue')}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Nodes List */}
            {graphData && graphData.nodes.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>{t('dialogueNodes')}</CardTitle>
                        <CardDescription>
                            {t('allNodesDescription')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {graphData.nodes.map((node) => (
                                <div
                                    key={node.id}
                                    className="flex items-center justify-between p-3 border rounded-lg"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-sm">#{node.id}</span>
                                        <span className="capitalize px-2 py-1 bg-muted rounded text-xs">
                                            {node.type}
                                        </span>
                                        <span className="text-sm">
                                            {node.clientNodeKey || t('noKeySet')}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEditNode(node.id)}
                                        >
                                            {t('edit')}
                                        </Button>
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={deleteNode.isLoading}
                                                >
                                                    {t('delete')}
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>{t('deleteNodeTitle')}</DialogTitle>
                                                    <DialogDescription>
                                                        {t('deleteNodeConfirm')}
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="flex justify-end gap-2">
                                                    <DialogClose asChild>
                                                        <Button variant="outline">
                                                            {t('cancel')}
                                                        </Button>
                                                    </DialogClose>
                                                    <Button
                                                        variant="destructive"
                                                        onClick={() => handleDeleteNode(node.id)}
                                                        disabled={deleteNode.isLoading}
                                                    >
                                                        {deleteNode.isLoading ? t('deleting') : t('delete')}
                                                    </Button>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Edges List */}
            {graphData && graphData.edges.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>{t('dialogueConnections')}</CardTitle>
                        <CardDescription>
                            {t('allConnectionsDescription')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {graphData.edges.map((edge) => {
                                const fromNode = graphData.nodes.find(n => n.id === edge.fromNodeId)
                                const toNode = graphData.nodes.find(n => n.id === edge.toNodeId)

                                return (
                                    <div
                                        key={edge.id}
                                        className="flex items-center justify-between p-3 border rounded-lg"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono text-sm">#{edge.id}</span>
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1">
                                                    <span className="font-mono text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                                        #{edge.fromNodeId}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {fromNode?.type || t('unknown')}
                                                    </span>
                                                </div>
                                                <span className="text-muted-foreground">→</span>
                                                <div className="flex items-center gap-1">
                                                    <span className="font-mono text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                                                        #{edge.toNodeId}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {toNode?.type || t('unknown')}
                                                    </span>
                                                </div>
                                            </div>
                                            {edge.clientChoiceKey && (
                                                <span className="text-sm px-2 py-1 bg-muted rounded">
                                                    "{edge.clientChoiceKey}"
                                                </span>
                                            )}
                                            {edge.orderIndex > 0 && (
                                                <span className="text-xs text-muted-foreground px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                                                    {t('order')}: {edge.orderIndex}
                                                </span>
                                            )}
                                            {edge.hideIfLocked && (
                                                <span className="text-xs text-orange-600 px-2 py-1 bg-orange-100 rounded">
                                                    {t('hiddenIfLocked')}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleEditEdge(edge.id)}
                                            >
                                                {t('edit')}
                                            </Button>
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={deleteEdge.isLoading}
                                                    >
                                                        {t('delete')}
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>{t('deleteConnectionTitle')}</DialogTitle>
                                                        <DialogDescription>
                                                            {t('deleteConnectionConfirm')}
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="flex justify-end gap-2">
                                                        <DialogClose asChild>
                                                            <Button variant="outline">
                                                                {t('cancel')}
                                                            </Button>
                                                        </DialogClose>
                                                        <Button
                                                            variant="destructive"
                                                            onClick={() => handleDeleteEdge(edge.id)}
                                                            disabled={deleteEdge.isLoading}
                                                        >
                                                            {deleteEdge.isLoading ? t('deleting') : t('delete')}
                                                        </Button>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Empty State */}
            {graphData && graphData.nodes.length === 0 && (
                <Card>
                    <CardContent className="text-center py-12">
                        <p className="text-muted-foreground mb-4">
                            {t('emptyStateDescription')}
                        </p>
                        <Button onClick={() => setNodeCreateOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            {t('addFirstNode')}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Modal Dialogs */}
            <DialogueNodeEdit
                open={nodeEditOpen}
                onOpenChange={setNodeEditOpen}
                node={editingNode}
                onSave={handleSaveNode}
            />

            <DialogueEdgeEdit
                open={edgeEditOpen}
                onOpenChange={setEdgeEditOpen}
                edge={editingEdge}
                nodes={graphData?.nodes || []}
                onSave={handleSaveEdge}
            />

            <DialogueNodeCreate
                open={nodeCreateOpen}
                onOpenChange={setNodeCreateOpen}
                dialogueId={dialogueId}
                onSave={handleCreateNode}
            />

            <DialogueEdgeCreate
                open={edgeCreateOpen}
                onOpenChange={setEdgeCreateOpen}
                dialogueId={dialogueId}
                nodes={graphData?.nodes || []}
                onSave={handleCreateEdge}
            />
        </div>
    )
}