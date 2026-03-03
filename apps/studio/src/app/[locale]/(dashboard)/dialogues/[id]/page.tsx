'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    ArrowLeft, Edit, Trash2, Plus, GitBranch, Link as LinkIcon,
    MessageSquare, List, Zap, ArrowRightCircle, StopCircle,
    CheckCircle2, AlertCircle, Network, ChevronRight,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from '@/components/ui/dialog'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { trpc } from '@/lib/trpc'
import { toast } from '@/hooks/use-toast'
import DialogueNodeEdit from '@/components/dialogue/DialogueNodeEdit'
import DialogueEdgeEdit from '@/components/dialogue/DialogueEdgeEdit'
import DialogueNodeCreate from '@/components/dialogue/DialogueNodeCreate'
import DialogueEdgeCreate from '@/components/dialogue/DialogueEdgeCreate'

// ────────────────────────────────────────────────
// Node type styling helpers
// ────────────────────────────────────────────────

type NodeType = 'line' | 'choice_hub' | 'action' | 'jump' | 'end' | string

const NODE_TYPE_CONFIG: Record<string, { icon: React.ElementType; className: string; label?: string }> = {
    line: { icon: MessageSquare, className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
    choice_hub: { icon: List, className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
    action: { icon: Zap, className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
    jump: { icon: ArrowRightCircle, className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
    end: { icon: StopCircle, className: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
}

function getNodeConfig(type: NodeType) {
    return NODE_TYPE_CONFIG[type] ?? { icon: MessageSquare, className: 'bg-muted text-muted-foreground' }
}

function NodeTypeBadge({ type }: { type: NodeType }) {
    const cfg = getNodeConfig(type)
    const Icon = cfg.icon
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
            <Icon className="h-3 w-3" />
            {type}
        </span>
    )
}

// ────────────────────────────────────────────────
// Loading skeleton
// ────────────────────────────────────────────────
function DetailSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="h-5 bg-muted rounded w-48" />
            <div className="h-9 bg-muted rounded w-72" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => <div key={i} className="h-32 bg-muted rounded-lg" />)}
            </div>
            <div className="h-48 bg-muted rounded-lg" />
        </div>
    )
}

// ────────────────────────────────────────────────
// Main page
// ────────────────────────────────────────────────
export default function DialogueDetailPage() {
    const t = useTranslations('dialogues.detail')
    const tDialogues = useTranslations('dialogues')
    const locale = useLocale()
    const params = useParams()
    const router = useRouter()
    const dialogueId = parseInt(params.id as string)

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
            toast.success(tDialogues('deleteSuccess'), tDialogues('deleteSuccess'))
            router.push(`/${locale}/dialogues`)
        },
        onError: (error) => {
            toast.error(tDialogues('deleteError'), error.message)
        },
    })

    const deleteNode = trpc.dialogue.deleteNode.useMutation({
        onSuccess: () => { toast.success(t('nodeDeleted'), t('nodeDeletedDescription')); refetchGraph() },
        onError: (error) => { toast.error(t('nodeDeleteError'), error.message) },
    })

    const deleteEdge = trpc.dialogue.deleteEdge.useMutation({
        onSuccess: () => { toast.success(t('connectionDeleted'), t('connectionDeletedDescription')); refetchGraph() },
        onError: (error) => { toast.error(t('connectionDeleteError'), error.message) },
    })

    const updateNode = trpc.dialogue.saveNode.useMutation({
        onSuccess: () => { toast.success(t('nodeUpdated'), t('nodeUpdatedDescription')); refetchGraph() },
        onError: (error) => { toast.error(t('nodeUpdateError'), error.message) },
    })

    const updateEdge = trpc.dialogue.saveEdge.useMutation({
        onSuccess: () => { toast.success(t('connectionUpdated'), t('connectionUpdatedDescription')); refetchGraph() },
        onError: (error) => { toast.error(t('connectionUpdateError'), error.message) },
    })

    const createNode = trpc.dialogue.saveNode.useMutation({
        onSuccess: () => { toast.success(t('nodeCreated'), t('nodeCreatedDescription')); refetchGraph() },
        onError: (error) => { toast.error(t('nodeCreateError'), error.message) },
    })

    const createEdge = trpc.dialogue.saveEdge.useMutation({
        onSuccess: () => { toast.success(t('connectionCreated'), t('connectionCreatedDescription')); refetchGraph() },
        onError: (error) => { toast.error(t('connectionCreateError'), error.message) },
    })

    const handleDelete = () => deleteDialogue.mutateAsync({ id: dialogueId }).catch(console.error)
    const handleDeleteNode = (nodeId: number) => deleteNode.mutateAsync({ id: nodeId }).catch(console.error)
    const handleDeleteEdge = (edgeId: number) => deleteEdge.mutateAsync({ id: edgeId }).catch(console.error)

    const handleEditNode = (nodeId: number) => {
        const node = graphData?.nodes.find(n => n.id === nodeId)
        if (node) { setEditingNode(node); setNodeEditOpen(true) }
    }

    const handleEditEdge = (edgeId: number) => {
        const edge = graphData?.edges.find(e => e.id === edgeId)
        if (edge) { setEditingEdge(edge); setEdgeEditOpen(true) }
    }

    const handleSaveNode = (data: any) => updateNode.mutateAsync(data).catch(console.error)
    const handleSaveEdge = (data: any) => updateEdge.mutateAsync(data).catch(console.error)
    const handleCreateNode = (data: any) => createNode.mutateAsync(data).catch(console.error)
    const handleCreateEdge = (data: any) => createEdge.mutateAsync(data).catch(console.error)

    if (isNaN(dialogueId)) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
                <AlertCircle className="h-10 w-10 text-destructive/70" />
                <p className="text-destructive font-medium">{tDialogues('invalidId')}</p>
                <Link href={`/${locale}/dialogues`}>
                    <Button variant="outline" size="sm" className="mt-1">{tDialogues('backToDialogues')}</Button>
                </Link>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
                <AlertCircle className="h-10 w-10 text-destructive/70" />
                <p className="text-destructive font-medium">{tDialogues('errorLoading')}: {error.message}</p>
                <Link href={`/${locale}/dialogues`}>
                    <Button variant="outline" size="sm" className="mt-1">{tDialogues('backToDialogues')}</Button>
                </Link>
            </div>
        )
    }

    if (isLoading) return <DetailSkeleton />

    if (!dialogue) {
        return (
            <div className="text-center py-24">
                <p className="text-muted-foreground">{tDialogues('errorLoading')}</p>
                <Link href={`/${locale}/dialogues`}>
                    <Button className="mt-4" variant="outline" size="sm">{tDialogues('backToDialogues')}</Button>
                </Link>
            </div>
        )
    }

    const nodeTypeStats = graphData?.nodes.reduce((acc, node) => {
        acc[node.type] = (acc[node.type] || 0) + 1
        return acc
    }, {} as Record<string, number>) ?? {}

    return (
        <TooltipProvider delayDuration={300}>
            <div className="space-y-6">

                {/* Breadcrumb */}
                <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Link href={`/${locale}/dialogues`} className="hover:text-foreground transition-colors">
                        {tDialogues('title')}
                    </Link>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span className="text-foreground font-medium font-mono">{dialogue.slug}</span>
                </nav>

                {/* Page Header */}
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                            <MessageSquare className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-2xl font-bold tracking-tight font-mono truncate">{dialogue.slug}</h1>
                                <Badge variant="outline" className="text-xs font-normal">v{dialogue.version}</Badge>
                                {dialogue.startNodeId ? (
                                    <Badge className="gap-1 bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100">
                                        <CheckCircle2 className="h-3 w-3" />
                                        {t('statusReady')}
                                    </Badge>
                                ) : (
                                    <Badge className="gap-1 bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800 hover:bg-amber-100">
                                        <AlertCircle className="h-3 w-3" />
                                        {t('statusDraft')}
                                    </Badge>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">Dialogue #{dialogue.id}</p>
                        </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Link href={`/${locale}/dialogues/${dialogue.id}/graph`}>
                                    <Button variant="outline" size="sm" className="gap-1.5">
                                        <GitBranch className="h-4 w-4" />
                                        {t('viewGraph')}
                                    </Button>
                                </Link>
                            </TooltipTrigger>
                            <TooltipContent>Open visual editor</TooltipContent>
                        </Tooltip>
                        <Link href={`/${locale}/dialogues/${dialogue.id}/edit`}>
                            <Button variant="outline" size="sm" className="gap-1.5">
                                <Edit className="h-4 w-4" />
                                {t('edit')}
                            </Button>
                        </Link>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                                    disabled={deleteDialogue.isLoading}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    {t('delete')}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <div className="flex items-center gap-3 mb-1">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10 text-destructive shrink-0">
                                            <Trash2 className="h-5 w-5" />
                                        </div>
                                        <DialogTitle>{t('deleteDialogueTitle')}</DialogTitle>
                                    </div>
                                    <DialogDescription>{t('deleteDialogueConfirm')}</DialogDescription>
                                </DialogHeader>
                                <div className="flex justify-end gap-2">
                                    <DialogClose asChild>
                                        <Button variant="outline">{t('cancel')}</Button>
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

                {/* Stats + Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Basic Info Card */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{t('basicInformation')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">{t('slug')}</span>
                                <span className="text-sm font-mono font-medium">{dialogue.slug}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">{t('version')}</span>
                                <Badge variant="outline" className="text-xs">v{dialogue.version}</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">{t('startNode')}</span>
                                {dialogue.startNodeId ? (
                                    <span className="text-sm font-mono text-emerald-600 dark:text-emerald-400">#{dialogue.startNodeId}</span>
                                ) : (
                                    <span className="text-sm text-muted-foreground italic">{t('notSet')}</span>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Stats Card */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{t('graphStatistics')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-6 mb-3">
                                <div>
                                    <p className="text-3xl font-bold">{graphData?.nodes.length ?? 0}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{t('totalNodes')}</p>
                                </div>
                                <div className="w-px bg-border" />
                                <div>
                                    <p className="text-3xl font-bold">{graphData?.edges.length ?? 0}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{t('totalEdges')}</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {Object.entries(nodeTypeStats).map(([type, count]) => (
                                    <NodeTypeBadge key={type} type={type} />
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Actions Card */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{t('quickActions')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button
                                className="w-full gap-2"
                                size="sm"
                                variant="outline"
                                onClick={() => setNodeCreateOpen(true)}
                            >
                                <Plus className="h-4 w-4" />
                                {t('addNode')}
                            </Button>
                            <Button
                                className="w-full gap-2"
                                size="sm"
                                variant="outline"
                                onClick={() => setEdgeCreateOpen(true)}
                                disabled={!graphData?.nodes.length || graphData.nodes.length < 2}
                            >
                                <LinkIcon className="h-4 w-4" />
                                {t('addConnection')}
                            </Button>
                            <Link href={`/${locale}/dialogues/${dialogue.id}/graph`} className="block">
                                <Button className="w-full gap-2" size="sm" variant="outline">
                                    <Network className="h-4 w-4" />
                                    {t('viewGraph')}
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>

                {/* Empty State */}
                {graphData && graphData.nodes.length === 0 && (
                    <Card>
                        <CardContent className="py-16">
                            <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                <MessageSquare className="h-12 w-12 opacity-25" />
                                <p className="text-sm font-medium">{t('emptyStateDescription')}</p>
                                <Button onClick={() => setNodeCreateOpen(true)} size="sm" className="mt-1 gap-1.5">
                                    <Plus className="h-4 w-4" />
                                    {t('addFirstNode')}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Nodes List */}
                {graphData && graphData.nodes.length > 0 && (
                    <Card>
                        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
                            <div>
                                <CardTitle>{t('dialogueNodes')}</CardTitle>
                                <p className="text-sm text-muted-foreground mt-0.5">{t('allNodesDescription')}</p>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 shrink-0"
                                onClick={() => setNodeCreateOpen(true)}
                            >
                                <Plus className="h-4 w-4" />
                                {t('addNode')}
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-1.5">
                                {[...graphData.nodes].sort((a, b) => a.id - b.id).map((node) => {
                                    const isStartNode = dialogue.startNodeId === node.id
                                    return (
                                        <div
                                            key={node.id}
                                            className="flex items-center justify-between px-3 py-2.5 rounded-lg border bg-card hover:bg-accent/40 transition-colors group"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className="text-xs font-mono text-muted-foreground w-8 shrink-0">#{node.id}</span>
                                                <NodeTypeBadge type={node.type} />
                                                <span className="text-sm truncate text-muted-foreground">
                                                    {node.clientNodeKey || (
                                                        <span className="italic opacity-50">{t('noKeySet')}</span>
                                                    )}
                                                </span>
                                                {isStartNode && (
                                                    <Badge className="gap-1 text-xs bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 shrink-0">
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        {t('statusStart')}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() => handleEditNode(node.id)}
                                                >
                                                    <Edit className="h-3.5 w-3.5" />
                                                </Button>
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            disabled={deleteNode.isLoading}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-sm">
                                                        <DialogHeader>
                                                            <DialogTitle>{t('deleteNodeTitle')}</DialogTitle>
                                                            <DialogDescription>{t('deleteNodeConfirm')}</DialogDescription>
                                                        </DialogHeader>
                                                        <div className="flex justify-end gap-2">
                                                            <DialogClose asChild>
                                                                <Button variant="outline" size="sm">{t('cancel')}</Button>
                                                            </DialogClose>
                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
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
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Edges List */}
                {graphData && graphData.edges.length > 0 && (
                    <Card>
                        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
                            <div>
                                <CardTitle>{t('dialogueConnections')}</CardTitle>
                                <p className="text-sm text-muted-foreground mt-0.5">{t('allConnectionsDescription')}</p>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 shrink-0"
                                onClick={() => setEdgeCreateOpen(true)}
                                disabled={!graphData?.nodes.length || graphData.nodes.length < 2}
                            >
                                <Plus className="h-4 w-4" />
                                {t('addConnection')}
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-1.5">
                                {[...graphData.edges].sort((a, b) => a.id - b.id).map((edge) => {
                                    const fromNode = graphData.nodes.find(n => n.id === edge.fromNodeId)
                                    const toNode = graphData.nodes.find(n => n.id === edge.toNodeId)

                                    return (
                                        <div
                                            key={edge.id}
                                            className="flex items-center justify-between px-3 py-2.5 rounded-lg border bg-card hover:bg-accent/40 transition-colors group"
                                        >
                                            <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                                <span className="text-xs font-mono text-muted-foreground w-8 shrink-0">#{edge.id}</span>
                                                {/* From node */}
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                                        #{edge.fromNodeId}
                                                    </span>
                                                    {fromNode && (
                                                        <span className="text-xs text-muted-foreground">{fromNode.type}</span>
                                                    )}
                                                </div>
                                                <ArrowRightCircle className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                                                {/* To node */}
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                                        #{edge.toNodeId}
                                                    </span>
                                                    {toNode && (
                                                        <span className="text-xs text-muted-foreground">{toNode.type}</span>
                                                    )}
                                                </div>
                                                {/* Meta badges */}
                                                {edge.clientChoiceKey && (
                                                    <Badge variant="secondary" className="text-xs font-normal">
                                                        "{edge.clientChoiceKey}"
                                                    </Badge>
                                                )}
                                                {edge.orderIndex > 0 && (
                                                    <Badge variant="outline" className="text-xs font-normal bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/40 dark:border-yellow-800 dark:text-yellow-300">
                                                        {t('order')}: {edge.orderIndex}
                                                    </Badge>
                                                )}
                                                {edge.hideIfLocked && (
                                                    <Badge variant="outline" className="text-xs font-normal bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/40 dark:border-orange-800 dark:text-orange-300">
                                                        {t('hiddenIfLocked')}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() => handleEditEdge(edge.id)}
                                                >
                                                    <Edit className="h-3.5 w-3.5" />
                                                </Button>
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            disabled={deleteEdge.isLoading}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-sm">
                                                        <DialogHeader>
                                                            <DialogTitle>{t('deleteConnectionTitle')}</DialogTitle>
                                                            <DialogDescription>{t('deleteConnectionConfirm')}</DialogDescription>
                                                        </DialogHeader>
                                                        <div className="flex justify-end gap-2">
                                                            <DialogClose asChild>
                                                                <Button variant="outline" size="sm">{t('cancel')}</Button>
                                                            </DialogClose>
                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
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

                {/* Modals */}
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
        </TooltipProvider>
    )
}

