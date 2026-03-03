'use client'

import { useState } from 'react'
import { Plus, Trash2, Edit3, Activity } from 'lucide-react'
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

interface MobAttribute {
    id: number
    attributeId: number
    value: number
    attributeName: string | null
    attributeSlug: string | null
}

interface MobAttributesManagerProps {
    mobId: number
    attributes: MobAttribute[]
    onUpdate: () => void
}

export function MobAttributesManager({ mobId, attributes, onUpdate }: MobAttributesManagerProps) {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [editingAttribute, setEditingAttribute] = useState<MobAttribute | null>(null)
    const [deleteConfirmAttribute, setDeleteConfirmAttribute] = useState<MobAttribute | null>(null)
    const [selectedAttributeId, setSelectedAttributeId] = useState<string>('')
    const [attributeValue, setAttributeValue] = useState<number>(1)

    const t = useTranslations('mobs')
    const commonT = useTranslations('common')
    const { toast } = useToast()

    const { data: availableAttributes } = trpc.mobs.getEntityAttributes.useQuery()

    const setAttributeMutation = trpc.mobs.setMobAttribute.useMutation({
        onSuccess: () => {
            toast({ title: commonT('success'), description: t('attributeUpdated') })
            onUpdate()
            setIsAddDialogOpen(false)
            setEditingAttribute(null)
            resetForm()
        },
        onError: (error) => {
            toast({ title: commonT('error'), description: error.message, variant: 'error' })
        },
    })

    const removeAttributeMutation = trpc.mobs.removeMobAttribute.useMutation({
        onSuccess: () => {
            toast({ title: commonT('success'), description: t('attributeRemoved') })
            onUpdate()
        },
        onError: (error) => {
            toast({ title: commonT('error'), description: error.message, variant: 'error' })
        },
    })

    const resetForm = () => { setSelectedAttributeId(''); setAttributeValue(1) }

    const handleAddAttribute = () => {
        if (!selectedAttributeId) return
        setAttributeMutation.mutate({ mobId, attributeId: parseInt(selectedAttributeId), value: attributeValue })
    }

    const handleEditAttribute = (attribute: MobAttribute) => {
        setEditingAttribute(attribute)
        setSelectedAttributeId(attribute.attributeId.toString())
        setAttributeValue(attribute.value)
    }

    const handleUpdateAttribute = () => {
        if (!editingAttribute) return
        setAttributeMutation.mutate({ mobId, attributeId: editingAttribute.attributeId, value: attributeValue })
    }

    const handleRemoveAttribute = (attributeId: number) => {
        removeAttributeMutation.mutate({ mobId, attributeId })
        setDeleteConfirmAttribute(null)
    }

    const assignedIds = new Set(attributes.map(a => a.attributeId))
    const unassignedAttributes = availableAttributes?.filter(a => !assignedIds.has(a.id)) ?? []

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between pb-3">
                <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Activity className="h-4 w-4 text-primary" />
                        {t('attributes')}
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">{t('attributesDescription')}</CardDescription>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8">
                            <Plus className="h-3.5 w-3.5" />
                            {t('addAttribute')}
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('addAttribute')}</DialogTitle>
                            <DialogDescription>{t('attributesDescription')}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label>{t('attribute')}</Label>
                                <Select value={selectedAttributeId} onValueChange={setSelectedAttributeId}>
                                    <SelectTrigger><SelectValue placeholder="Select attribute..." /></SelectTrigger>
                                    <SelectContent>
                                        {unassignedAttributes.map(a => (
                                            <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>{t('value')}</Label>
                                <Input type="number" value={attributeValue} onChange={e => setAttributeValue(parseInt(e.target.value) || 0)} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm() }}>{commonT('cancel')}</Button>
                            <Button onClick={handleAddAttribute} disabled={!selectedAttributeId || setAttributeMutation.isPending}>
                                {setAttributeMutation.isPending ? commonT('saving') : commonT('save')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {attributes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">{t('noAttributes')}</p>
                        <p className="text-xs mt-1">{t('addFirstAttribute')}</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {attributes.map(attribute => (
                            <div key={attribute.id} className="flex items-center justify-between rounded-lg border px-3 py-2 gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-sm font-medium truncate">{attribute.attributeName}</span>
                                    {attribute.attributeSlug && (
                                        <Badge variant="outline" className="text-[10px] font-mono hidden sm:flex">{attribute.attributeSlug}</Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Badge variant="secondary" className="font-mono">{attribute.value}</Badge>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); handleEditAttribute(attribute) }}>
                                                    <Edit3 className="h-3.5 w-3.5" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>{t('editAttribute')}</TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={e => { e.stopPropagation(); setDeleteConfirmAttribute(attribute) }}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>{t('removeAttribute')}</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>

            {/* Edit dialog */}
            <Dialog open={!!editingAttribute} onOpenChange={(o) => { if (!o) setEditingAttribute(null) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('editAttribute')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>{t('attribute')}</Label>
                            <p className="text-sm font-medium">{editingAttribute?.attributeName}</p>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('value')}</Label>
                            <Input type="number" value={attributeValue} onChange={e => setAttributeValue(parseInt(e.target.value) || 0)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingAttribute(null)}>{commonT('cancel')}</Button>
                        <Button onClick={handleUpdateAttribute} disabled={setAttributeMutation.isPending}>
                            {setAttributeMutation.isPending ? commonT('saving') : commonT('save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete confirm dialog */}
            <Dialog open={!!deleteConfirmAttribute} onOpenChange={(o) => { if (!o) setDeleteConfirmAttribute(null) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('removeAttribute')}</DialogTitle>
                        <DialogDescription>Remove &quot;{deleteConfirmAttribute?.attributeName}&quot; from this mob?</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirmAttribute(null)}>{commonT('cancel')}</Button>
                        <Button variant="destructive" onClick={() => deleteConfirmAttribute && handleRemoveAttribute(deleteConfirmAttribute.attributeId)}
                            disabled={removeAttributeMutation.isPending}>
                            {removeAttributeMutation.isPending ? commonT('deleting') : commonT('delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    )
}
