'use client'

import { useState } from 'react'
import { Plus, Trash2, Edit3, MessageSquare, ExternalLink } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { trpc } from '@/lib/trpc'
import { useToast } from '@/hooks/use-toast'

interface NpcDialogue {
    npcId: number
    dialogueId: number
    priority: number
    conditionGroup: unknown
    dialogueSlug: string | null
    dialogueVersion: number | null
}

interface NpcDialoguesManagerProps {
    npcId: number
    dialogues: NpcDialogue[]
    onUpdate: () => void
}

export function NpcDialoguesManager({ npcId, dialogues, onUpdate }: NpcDialoguesManagerProps) {
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [editingDialogue, setEditingDialogue] = useState<NpcDialogue | null>(null)
    const [deleteConfirm, setDeleteConfirm] = useState<NpcDialogue | null>(null)

    const [selectedDialogueId, setSelectedDialogueId] = useState<string>('')
    const [priority, setPriority] = useState<number>(0)
    const [conditionJson, setConditionJson] = useState<string>('')

    const t = useTranslations('npcs.dialogues')
    const commonT = useTranslations('common')
    const locale = useLocale()
    const { toast } = useToast()

    const { data: availableDialogues = [] } = trpc.npc.getAvailableDialogues.useQuery()

    const addMutation = trpc.npc.addNpcDialogue.useMutation({
        onSuccess: () => {
            toast({ title: commonT('success'), description: t('added') })
            onUpdate()
            setIsAddOpen(false)
            resetForm()
        },
        onError: (e) => toast({ title: commonT('error'), description: e.message, variant: 'error' }),
    })

    const updateMutation = trpc.npc.updateNpcDialogue.useMutation({
        onSuccess: () => {
            toast({ title: commonT('success'), description: t('updated') })
            onUpdate()
            setEditingDialogue(null)
            resetForm()
        },
        onError: (e) => toast({ title: commonT('error'), description: e.message, variant: 'error' }),
    })

    const removeMutation = trpc.npc.removeNpcDialogue.useMutation({
        onSuccess: () => {
            toast({ title: commonT('success'), description: t('removed') })
            onUpdate()
            setDeleteConfirm(null)
        },
        onError: (e) => toast({ title: commonT('error'), description: e.message, variant: 'error' }),
    })

    const resetForm = () => {
        setSelectedDialogueId('')
        setPriority(0)
        setConditionJson('')
    }

    const parseCondition = () => {
        if (!conditionJson.trim()) return null
        try {
            return JSON.parse(conditionJson)
        } catch {
            return null
        }
    }

    const handleAdd = () => {
        if (!selectedDialogueId) return
        addMutation.mutate({
            npcId,
            dialogueId: parseInt(selectedDialogueId),
            priority,
            conditionGroup: parseCondition(),
        })
    }

    const handleUpdate = () => {
        if (!editingDialogue) return
        updateMutation.mutate({
            npcId,
            dialogueId: editingDialogue.dialogueId,
            priority,
            conditionGroup: parseCondition(),
        })
    }

    const openEdit = (d: NpcDialogue) => {
        setPriority(d.priority)
        setConditionJson(d.conditionGroup ? JSON.stringify(d.conditionGroup, null, 2) : '')
        setEditingDialogue(d)
    }

    // Filter out already linked dialogues for the add dialog
    const unlinkedDialogues = availableDialogues.filter(
        d => !dialogues.some(nd => nd.dialogueId === d.id)
    )

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            {t('title')}
                        </CardTitle>
                        <CardDescription>{t('description')}</CardDescription>
                    </div>
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" disabled={unlinkedDialogues.length === 0}>
                                <Plus className="h-4 w-4 mr-2" />
                                {t('add')}
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{t('add')}</DialogTitle>
                                <DialogDescription>{t('addDescription')}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>{t('fields.dialogue')}</Label>
                                    <Select value={selectedDialogueId} onValueChange={setSelectedDialogueId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('fields.selectDialogue')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {unlinkedDialogues.map(d => (
                                                <SelectItem key={d.id} value={d.id.toString()}>
                                                    {d.slug} (v{d.version})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('fields.priority')}</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={priority}
                                        onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                                    />
                                    <p className="text-xs text-muted-foreground">{t('fields.priorityDescription')}</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('fields.condition')}</Label>
                                    <Textarea
                                        placeholder={t('fields.conditionPlaceholder')}
                                        value={conditionJson}
                                        onChange={(e) => setConditionJson(e.target.value)}
                                        rows={3}
                                    />
                                    <p className="text-xs text-muted-foreground">{t('fields.conditionDescription')}</p>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => { setIsAddOpen(false); resetForm() }}>
                                    {commonT('cancel')}
                                </Button>
                                <Button
                                    onClick={handleAdd}
                                    disabled={!selectedDialogueId || addMutation.isPending}
                                >
                                    {addMutation.isPending ? commonT('adding') : commonT('add')}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>

            <CardContent>
                {dialogues.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                        <MessageSquare className="h-8 w-8 opacity-30" />
                        <p className="text-sm font-medium">{t('noDialogues')}</p>
                        <p className="text-xs">{t('addFirst')}</p>
                    </div>
                ) : (
                    <TooltipProvider delayDuration={300}>
                        <div className="space-y-2">
                            {dialogues
                                .slice()
                                .sort((a, b) => b.priority - a.priority)
                                .map(d => (
                                    <div
                                        key={d.dialogueId}
                                        className="group flex justify-between items-center p-3 rounded-lg border bg-muted/30"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <Badge variant="outline" className="text-xs shrink-0">
                                                {t('priorityLabel')}: {d.priority}
                                            </Badge>
                                            <span className="text-sm font-medium truncate">
                                                {d.dialogueSlug || `#${d.dialogueId}`}
                                            </span>
                                            {d.dialogueVersion !== null && (
                                                <span className="text-xs text-muted-foreground shrink-0">
                                                    v{d.dialogueVersion}
                                                </span>
                                            )}
                                            {d.conditionGroup != null && (
                                                <Badge variant="secondary" className="text-xs shrink-0">
                                                    {t('hasCondition')}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex gap-0.5 shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                                                        <Link href={`/${locale}/dialogues/${d.dialogueId}/graph`} target="_blank">
                                                            <ExternalLink className="h-3.5 w-3.5" />
                                                        </Link>
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Open graph</TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7"
                                                        onClick={() => openEdit(d)}
                                                    >
                                                        <Edit3 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>{commonT('edit')}</TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => setDeleteConfirm(d)}
                                                        disabled={removeMutation.isPending}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>{commonT('delete')}</TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </TooltipProvider>
                )}
            </CardContent>

            {/* Edit dialog */}
            <Dialog open={!!editingDialogue} onOpenChange={(o) => { if (!o) { setEditingDialogue(null); resetForm() } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('edit')}</DialogTitle>
                        <DialogDescription>
                            {editingDialogue?.dialogueSlug || `Dialogue #${editingDialogue?.dialogueId}`}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t('fields.priority')}</Label>
                            <Input
                                type="number"
                                min={0}
                                value={priority}
                                onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                            />
                            <p className="text-xs text-muted-foreground">{t('fields.priorityDescription')}</p>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('fields.condition')}</Label>
                            <Textarea
                                placeholder={t('fields.conditionPlaceholder')}
                                value={conditionJson}
                                onChange={(e) => setConditionJson(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setEditingDialogue(null); resetForm() }}>
                            {commonT('cancel')}
                        </Button>
                        <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                            {updateMutation.isPending ? commonT('updating') : commonT('update')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete confirm */}
            <Dialog open={!!deleteConfirm} onOpenChange={(o) => { if (!o) setDeleteConfirm(null) }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10 text-destructive shrink-0">
                                <Trash2 className="h-5 w-5" />
                            </div>
                            <DialogTitle className="text-lg">{t('removeTitle')}</DialogTitle>
                        </div>
                        <DialogDescription className="pt-1">
                            {t('removeDescription', { dialogue: deleteConfirm?.dialogueSlug || `#${deleteConfirm?.dialogueId}` })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setDeleteConfirm(null)} disabled={removeMutation.isPending}>
                            {commonT('cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => deleteConfirm && removeMutation.mutate({ npcId, dialogueId: deleteConfirm.dialogueId })}
                            disabled={removeMutation.isPending}
                        >
                            {removeMutation.isPending ? commonT('loading') : commonT('remove')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    )
}
