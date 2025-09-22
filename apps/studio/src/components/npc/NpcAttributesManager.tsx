'use client'

import { useState } from 'react'
import { Plus, Trash2, Edit3 } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
                    <div className="text-center py-8 text-muted-foreground">
                        <p>{t('noAttributes')}</p>
                        <p className="text-sm">{t('addFirstAttribute')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {attributes.map((attr) => (
                            <div key={attr.id} className="flex justify-between items-center p-3 border rounded">
                                <div>
                                    <span className="font-medium">{attr.attributeName || `Attribute ${attr.attributeId}`}</span>
                                    <Badge variant="outline" className="ml-2">{attr.value}</Badge>
                                </div>
                                <div className="flex gap-1">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={(e) => handleEditClick(e, attr)}
                                    >
                                        <Edit3 className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={(e) => handleDeleteClick(e, attr)}
                                        disabled={removeAttributeMutation.isPending}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
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
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('removeAttribute')}</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to remove {deleteConfirmAttribute?.attributeName || `Attribute ${deleteConfirmAttribute?.attributeId}`}? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDeleteConfirmAttribute(null)}
                        >
                            {commonT('cancel')}
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => deleteConfirmAttribute && handleRemoveAttribute(deleteConfirmAttribute.attributeId)}
                            disabled={removeAttributeMutation.isPending}
                        >
                            {removeAttributeMutation.isPending ? 'Removing...' : 'Remove'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    )
}