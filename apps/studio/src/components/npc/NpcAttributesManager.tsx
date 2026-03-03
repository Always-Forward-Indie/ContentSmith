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
import { trpc } from '@/lib/trpc'
import { useToast } from '@/hooks/use-toast'

interface NpcAttribute {
    id: number
    attributeId: number
    value: number
    attributeName: string | null
    attributeSlug: string | null
}

interface NpcAttributesManagerProps {
    npcId: number
    attributes: NpcAttribute[]
    onUpdate: () => void
}

export function NpcAttributesManager({ npcId, attributes, onUpdate }: NpcAttributesManagerProps) {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [editingAttribute, setEditingAttribute] = useState<NpcAttribute | null>(null)
    const [deleteConfirmAttribute, setDeleteConfirmAttribute] = useState<NpcAttribute | null>(null)
    const [selectedAttributeId, setSelectedAttributeId] = useState<string>('')
    const [attributeValue, setAttributeValue] = useState<number>(1)

    const t = useTranslations('npcs')
    const commonT = useTranslations('common')
    const { toast } = useToast()

    // Fetch available attributes
    const { data: availableAttributes } = trpc.npc.getEntityAttributes.useQuery()

    // Mutations
    const setAttributeMutation = trpc.npc.setNpcAttribute.useMutation({
        onSuccess: () => {
            toast({
                title: commonT('success'),
                description: t('attributeUpdated'),
            })
            onUpdate()
            setIsAddDialogOpen(false)
            setEditingAttribute(null)
            resetForm()
        },
        onError: (error) => {
            toast({
                title: commonT('error'),
                description: error.message,
                variant: 'error',
            })
        },
    })

    const removeAttributeMutation = trpc.npc.removeNpcAttribute.useMutation({
        onSuccess: () => {
            toast({
                title: commonT('success'),
                description: t('attributeRemoved'),
            })
            onUpdate()
        },
        onError: (error) => {
            toast({
                title: commonT('error'),
                description: error.message,
                variant: 'error',
            })
        },
    })

    const resetForm = () => {
        setSelectedAttributeId('')
        setAttributeValue(1)
    }

    const handleAddAttribute = () => {
        if (!selectedAttributeId || attributeValue < 1) return

        setAttributeMutation.mutate({
            npcId,
            attributeId: parseInt(selectedAttributeId),
            value: attributeValue,
        })
    }

    const handleEditAttribute = (attribute: NpcAttribute) => {
        setEditingAttribute(attribute)
        setSelectedAttributeId(attribute.attributeId.toString())
        setAttributeValue(attribute.value)
    }

    const handleUpdateAttribute = () => {
        if (!editingAttribute || attributeValue < 1) return

        setAttributeMutation.mutate({
            npcId,
            attributeId: editingAttribute.attributeId,
            value: attributeValue,
        })
    }

    const handleRemoveAttribute = (attributeId: number) => {
        removeAttributeMutation.mutate({
            npcId,
            attributeId,
        })
        setDeleteConfirmAttribute(null)
    }

    const handleEditClick = (e: React.MouseEvent, attribute: NpcAttribute) => {
        e.stopPropagation()
        handleEditAttribute(attribute)
    }

    const handleDeleteClick = (e: React.MouseEvent, attribute: NpcAttribute) => {
        e.stopPropagation()
        setDeleteConfirmAttribute(attribute)
    }

    // Filter out already assigned attributes for the add dialog
    const unassignedAttributes = availableAttributes?.filter(
        attr => !attributes.some(npcAttr => npcAttr.attributeId === attr.id)
    ) || []

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>{t('attributes')}</CardTitle>
                        <CardDescription>
                            {t('attributesDescription')}
                        </CardDescription>
                    </div>
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" disabled={unassignedAttributes.length === 0}>
                                <Plus className="h-4 w-4 mr-2" />
                                {t('addAttribute')}
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{t('addAttribute')}</DialogTitle>
                                <DialogDescription>
                                    Select an attribute and set its value for this NPC.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="attribute">{t('attribute')}</Label>
                                    <Select value={selectedAttributeId} onValueChange={setSelectedAttributeId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select an attribute..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {unassignedAttributes.map((attr) => (
                                                <SelectItem key={attr.id} value={attr.id.toString()}>
                                                    {attr.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="value">{t('value')}</Label>
                                    <Input
                                        id="value"
                                        type="number"
                                        min="1"
                                        value={attributeValue}
                                        onChange={(e) => setAttributeValue(parseInt(e.target.value) || 1)}
                                    />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setIsAddDialogOpen(false)
                                        resetForm()
                                    }}
                                >
                                    {commonT('cancel')}
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleAddAttribute}
                                    disabled={!selectedAttributeId || setAttributeMutation.isPending}
                                >
                                    {setAttributeMutation.isPending ? commonT('adding') : commonT('add')}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>

            <CardContent>
                {attributes.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                        <Activity className="h-8 w-8 opacity-30" />
                        <p className="text-sm font-medium">{t('noAttributes')}</p>
                        <p className="text-xs">{t('addFirstAttribute')}</p>
                    </div>
                ) : (
                    <TooltipProvider delayDuration={300}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {attributes.map((attr) => (
                                <div key={attr.id} className="group flex justify-between items-center p-3 rounded-lg border bg-muted/30">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-sm font-medium truncate">{attr.attributeName || `#${attr.attributeId}`}</span>
                                        <Badge variant="outline" className="text-xs shrink-0">{attr.value}</Badge>
                                    </div>
                                    <div className="flex gap-0.5 shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7"
                                                    onClick={(e) => handleEditClick(e, attr)}
                                                >
                                                    <Edit3 className="h-3.5 w-3.5" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>{commonT('edit')}</TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={(e) => handleDeleteClick(e, attr)}
                                                    disabled={removeAttributeMutation.isPending}
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

            {/* Edit attribute dialog */}
            <Dialog open={!!editingAttribute} onOpenChange={() => setEditingAttribute(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('editAttribute')}</DialogTitle>
                        <DialogDescription>
                            Update the value for {editingAttribute?.attributeName || `Attribute ${editingAttribute?.attributeId}`}.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-value">{t('value')}</Label>
                            <Input
                                id="edit-value"
                                type="number"
                                min="1"
                                value={attributeValue}
                                onChange={(e) => setAttributeValue(parseInt(e.target.value) || 1)}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setEditingAttribute(null)
                                resetForm()
                            }}
                        >
                            {commonT('cancel')}
                        </Button>
                        <Button
                            type="button"
                            onClick={handleUpdateAttribute}
                            disabled={setAttributeMutation.isPending}
                        >
                            {setAttributeMutation.isPending ? commonT('updating') : commonT('update')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete confirmation dialog */}
            <Dialog open={!!deleteConfirmAttribute} onOpenChange={() => setDeleteConfirmAttribute(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10 text-destructive shrink-0">
                                <Trash2 className="h-5 w-5" />
                            </div>
                            <DialogTitle className="text-lg">{t('removeAttribute')}</DialogTitle>
                        </div>
                        <DialogDescription className="pt-1">
                            Are you sure you want to remove <strong>{deleteConfirmAttribute?.attributeName || `Attribute ${deleteConfirmAttribute?.attributeId}`}</strong>?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDeleteConfirmAttribute(null)}
                            disabled={removeAttributeMutation.isPending}
                        >
                            {commonT('cancel')}
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => deleteConfirmAttribute && handleRemoveAttribute(deleteConfirmAttribute.attributeId)}
                            disabled={removeAttributeMutation.isPending}
                        >
                            {removeAttributeMutation.isPending ? commonT('loading') : commonT('delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    )
}