'use client'

import { useState } from 'react'
import { Plus, Trash2, Edit3, Package } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { trpc } from '@/lib/trpc'
import { useToast } from '@/hooks/use-toast'

interface MobLootEntry {
    id: number
    mobId?: number
    itemId: number
    dropChance: number
    itemName: string | null
    itemSlug: string | null
}

interface MobLootManagerProps {
    mobId: number
    loot: MobLootEntry[]
    onUpdate: () => void
}

const defaultForm = { itemId: '', dropChance: 10 }

export function MobLootManager({ mobId, loot, onUpdate }: MobLootManagerProps) {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [editingEntry, setEditingEntry] = useState<MobLootEntry | null>(null)
    const [deleteConfirm, setDeleteConfirm] = useState<MobLootEntry | null>(null)
    const [form, setForm] = useState(defaultForm)

    const t = useTranslations('mobs')
    const commonT = useTranslations('common')
    const { toast } = useToast()

    const { data: availableItems } = trpc.mobs.getAvailableItems.useQuery()

    const addLootMutation = trpc.mobs.addLoot.useMutation({
        onSuccess: () => {
            toast({ title: commonT('success'), description: t('lootAdded') })
            onUpdate()
            setIsAddDialogOpen(false)
            setForm(defaultForm)
        },
        onError: (error) => {
            toast({ title: commonT('error'), description: error.message, variant: 'error' })
        },
    })

    const updateLootMutation = trpc.mobs.updateLoot.useMutation({
        onSuccess: () => {
            toast({ title: commonT('success'), description: t('lootUpdated') })
            onUpdate()
            setEditingEntry(null)
        },
        onError: (error) => {
            toast({ title: commonT('error'), description: error.message, variant: 'error' })
        },
    })

    const removeLootMutation = trpc.mobs.removeLoot.useMutation({
        onSuccess: () => {
            toast({ title: commonT('success'), description: t('lootRemoved') })
            onUpdate()
            setDeleteConfirm(null)
        },
        onError: (error) => {
            toast({ title: commonT('error'), description: error.message, variant: 'error' })
        },
    })

    const handleAdd = () => {
        if (!form.itemId) return
        addLootMutation.mutate({
            mobId,
            itemId: parseInt(form.itemId),
            dropChance: form.dropChance,
        })
    }

    const handleUpdate = () => {
        if (!editingEntry) return
        updateLootMutation.mutate({
            id: editingEntry.id,
            dropChance: editingEntry.dropChance,
        })
    }

    const handleRemove = (entry: MobLootEntry) => {
        removeLootMutation.mutate({ mobId, itemId: entry.itemId })
    }

    const assignedItemIds = new Set(loot.map(l => l.itemId))
    const unassignedItems = availableItems?.filter(i => !assignedItemIds.has(Number(i.id))) ?? []

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between pb-3">
                <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Package className="h-4 w-4 text-primary" />
                        {t('loot')}
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">{t('lootDescription')}</CardDescription>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8">
                            <Plus className="h-3.5 w-3.5" />
                            {t('addLoot')}
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('addLoot')}</DialogTitle>
                            <DialogDescription>{t('lootDescription')}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label>{t('itemName')}</Label>
                                <Select value={form.itemId} onValueChange={v => setForm(f => ({ ...f, itemId: v }))}>
                                    <SelectTrigger><SelectValue placeholder="Select item..." /></SelectTrigger>
                                    <SelectContent>
                                        {unassignedItems.map(i => (
                                            <SelectItem key={i.id} value={i.id.toString()}>{i.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>{t('dropChance')}</Label>
                                <Input type="number" min={0} max={100} step={0.01} value={form.dropChance}
                                    onChange={e => setForm(f => ({ ...f, dropChance: parseFloat(e.target.value) || 0 }))} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); setForm(defaultForm) }}>{commonT('cancel')}</Button>
                            <Button onClick={handleAdd} disabled={!form.itemId || addLootMutation.isPending}>
                                {addLootMutation.isPending ? commonT('saving') : commonT('save')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {loot.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">{t('noLoot')}</p>
                        <p className="text-xs mt-1">{t('addFirstLoot')}</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {loot.map(entry => (
                            <div key={entry.id} className="flex items-center justify-between rounded-lg border px-3 py-2 gap-2">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className="text-sm font-medium truncate">{entry.itemName}</span>
                                    <Badge variant="outline" className="font-mono text-[10px]">{entry.dropChance}%</Badge>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingEntry(entry)}>
                                                    <Edit3 className="h-3.5 w-3.5" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>{t('editLoot')}</TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(entry)}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>{t('removeLoot')}</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>

            {/* Edit dialog */}
            <Dialog open={!!editingEntry} onOpenChange={(o) => { if (!o) setEditingEntry(null) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('editLoot')}</DialogTitle>
                        <DialogDescription>{editingEntry?.itemName}</DialogDescription>
                    </DialogHeader>
                    {editingEntry && (
                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label>{t('dropChance')}</Label>
                                <Input type="number" min={0} max={100} step={0.01} value={editingEntry.dropChance}
                                    onChange={e => setEditingEntry(v => v && ({ ...v, dropChance: parseFloat(e.target.value) || 0 }))} />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingEntry(null)}>{commonT('cancel')}</Button>
                        <Button onClick={handleUpdate} disabled={updateLootMutation.isPending}>
                            {updateLootMutation.isPending ? commonT('saving') : commonT('save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete confirm */}
            <Dialog open={!!deleteConfirm} onOpenChange={(o) => { if (!o) setDeleteConfirm(null) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('removeLoot')}</DialogTitle>
                        <DialogDescription>Remove &quot;{deleteConfirm?.itemName}&quot; from loot table?</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirm(null)}>{commonT('cancel')}</Button>
                        <Button variant="destructive" onClick={() => deleteConfirm && handleRemove(deleteConfirm)}
                            disabled={removeLootMutation.isPending}>
                            {removeLootMutation.isPending ? commonT('deleting') : commonT('delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    )
}
