'use client'

import { useState } from 'react'
import { Plus, Trash2, Edit3, MapPin, Check, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { trpc } from '@/lib/trpc'
import { useToast } from '@/hooks/use-toast'

interface NpcPlacementsManagerProps {
    npcId: number
}

const EMPTY_COORDS = { x: '0', y: '0', z: '0', rotZ: '0' }

export function NpcPlacementsManager({ npcId }: NpcPlacementsManagerProps) {
    const [addOpen, setAddOpen] = useState(false)
    const [addZoneId, setAddZoneId] = useState<string>('none')
    const [addCoords, setAddCoords] = useState(EMPTY_COORDS)

    const [editingId, setEditingId] = useState<number | null>(null)
    const [editZoneId, setEditZoneId] = useState<string>('none')
    const [editCoords, setEditCoords] = useState(EMPTY_COORDS)

    const [removeConfirm, setRemoveConfirm] = useState<number | null>(null)

    const t = useTranslations('npcs.placements')
    const commonT = useTranslations('common')
    const { toast } = useToast()

    const { data: placements, refetch } = trpc.zones.listNpcPlacements.useQuery({ npcId })
    const { data: zonesData } = trpc.zones.list.useQuery({ pageSize: 100 })
    const allZones = zonesData?.data ?? []

    const addMutation = trpc.zones.createNpcPlacement.useMutation({
        onSuccess: () => {
            toast({ title: commonT('success'), description: t('added') })
            refetch()
            setAddOpen(false)
            setAddZoneId('none')
            setAddCoords(EMPTY_COORDS)
        },
        onError: (error) => {
            toast({ title: commonT('error'), description: error.message, variant: 'error' })
        },
    })

    const updateMutation = trpc.zones.updateNpcPlacement.useMutation({
        onSuccess: () => {
            toast({ title: commonT('success'), description: t('updated') })
            refetch()
            setEditingId(null)
        },
        onError: (error) => {
            toast({ title: commonT('error'), description: error.message, variant: 'error' })
        },
    })

    const deleteMutation = trpc.zones.deleteNpcPlacement.useMutation({
        onSuccess: () => {
            toast({ title: commonT('success'), description: t('removed') })
            refetch()
            setRemoveConfirm(null)
        },
        onError: (error) => {
            toast({ title: commonT('error'), description: error.message, variant: 'error' })
        },
    })

    const handleAdd = () => {
        addMutation.mutate({
            npcId,
            zoneId: addZoneId !== 'none' ? parseInt(addZoneId) : undefined,
            x: parseFloat(addCoords.x) || 0,
            y: parseFloat(addCoords.y) || 0,
            z: parseFloat(addCoords.z) || 0,
            rotZ: parseFloat(addCoords.rotZ) || 0,
        })
    }

    const handleEdit = (placement: { id: number; zoneId: number | null; x: number; y: number; z: number; rotZ: number }) => {
        setEditingId(placement.id)
        setEditZoneId(placement.zoneId != null ? String(placement.zoneId) : 'none')
        setEditCoords({
            x: String(placement.x),
            y: String(placement.y),
            z: String(placement.z),
            rotZ: String(placement.rotZ),
        })
    }

    const handleUpdate = () => {
        if (editingId == null) return
        updateMutation.mutate({
            id: editingId,
            zoneId: editZoneId !== 'none' ? parseInt(editZoneId) : undefined,
            x: parseFloat(editCoords.x) || 0,
            y: parseFloat(editCoords.y) || 0,
            z: parseFloat(editCoords.z) || 0,
            rotZ: parseFloat(editCoords.rotZ) || 0,
        })
    }

    return (
        <>
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-muted text-muted-foreground shrink-0 mt-0.5">
                                <MapPin className="h-3.5 w-3.5" />
                            </div>
                            <div>
                                <CardTitle className="text-sm font-semibold">{t('title')}</CardTitle>
                                <CardDescription className="text-xs mt-0.5">{t('description')}</CardDescription>
                            </div>
                        </div>
                        <Button size="sm" variant="outline" className="gap-1.5 shrink-0 h-8" onClick={() => setAddOpen(true)}>
                            <Plus className="h-3.5 w-3.5" />
                            {t('add')}
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="pt-0">
                    {!placements || placements.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-6">{t('noplacements')}</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-xs text-muted-foreground">
                                        <th className="text-left py-2 pr-4 font-medium">{t('zone')}</th>
                                        <th className="text-right py-2 px-2 font-medium">X</th>
                                        <th className="text-right py-2 px-2 font-medium">Y</th>
                                        <th className="text-right py-2 px-2 font-medium">Z</th>
                                        <th className="text-right py-2 px-2 font-medium">{t('rotZ')}</th>
                                        <th className="text-right py-2 pl-4 font-medium">{commonT('actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {placements.map((p) =>
                                        editingId === p.id ? (
                                            <tr key={p.id} className="border-b last:border-0 bg-muted/30">
                                                <td className="py-2 pr-2">
                                                    <Select value={editZoneId} onValueChange={setEditZoneId}>
                                                        <SelectTrigger className="h-7 text-xs w-36">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">—</SelectItem>
                                                            {allZones.map((z) => (
                                                                <SelectItem key={z.id} value={String(z.id)}>{z.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </td>
                                                {(['x', 'y', 'z', 'rotZ'] as const).map((field) => (
                                                    <td key={field} className="py-2 px-1">
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            className="h-7 text-xs w-20 text-right"
                                                            value={editCoords[field]}
                                                            onChange={(e) => setEditCoords((prev) => ({ ...prev, [field]: e.target.value }))}
                                                        />
                                                    </td>
                                                ))}
                                                <td className="py-2 pl-2">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            size="icon" variant="ghost"
                                                            className="h-7 w-7 text-emerald-600"
                                                            onClick={handleUpdate}
                                                            disabled={updateMutation.isPending}
                                                        >
                                                            <Check className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            size="icon" variant="ghost"
                                                            className="h-7 w-7"
                                                            onClick={() => setEditingId(null)}
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                                <td className="py-2.5 pr-4">
                                                    {p.zoneName
                                                        ? <span className="text-xs font-medium">{p.zoneName}</span>
                                                        : <span className="text-xs text-muted-foreground">—</span>
                                                    }
                                                </td>
                                                <td className="py-2.5 px-2 text-right font-mono text-xs tabular-nums">{Number(p.x).toFixed(2)}</td>
                                                <td className="py-2.5 px-2 text-right font-mono text-xs tabular-nums">{Number(p.y).toFixed(2)}</td>
                                                <td className="py-2.5 px-2 text-right font-mono text-xs tabular-nums">{Number(p.z).toFixed(2)}</td>
                                                <td className="py-2.5 px-2 text-right font-mono text-xs tabular-nums">{Number(p.rotZ).toFixed(2)}°</td>
                                                <td className="py-2.5 pl-4">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            size="icon" variant="ghost"
                                                            className="h-7 w-7"
                                                            onClick={() => handleEdit(p)}
                                                        >
                                                            <Edit3 className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            size="icon" variant="ghost"
                                                            className="h-7 w-7 text-destructive hover:text-destructive"
                                                            onClick={() => setRemoveConfirm(p.id)}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add placement dialog */}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{t('addTitle')}</DialogTitle>
                        <DialogDescription>{t('addDescription')}</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs">{t('zone')}</Label>
                            <Select value={addZoneId} onValueChange={setAddZoneId}>
                                <SelectTrigger className="h-8 text-sm">
                                    <SelectValue placeholder={t('noZone')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">{t('noZone')}</SelectItem>
                                    {allZones.map((z) => (
                                        <SelectItem key={z.id} value={String(z.id)}>{z.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {(['x', 'y', 'z', 'rotZ'] as const).map((field) => (
                                <div key={field} className="space-y-1.5">
                                    <Label className="text-xs">{field === 'rotZ' ? t('rotZ') : field.toUpperCase()}</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        className="h-8 text-sm"
                                        value={addCoords[field]}
                                        onChange={(e) => setAddCoords((prev) => ({ ...prev, [field]: e.target.value }))}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>
                            {commonT('cancel')}
                        </Button>
                        <Button size="sm" onClick={handleAdd} disabled={addMutation.isPending}>
                            {t('add')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete confirm dialog */}
            <Dialog open={removeConfirm != null} onOpenChange={(open) => { if (!open) setRemoveConfirm(null) }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{t('removeTitle')}</DialogTitle>
                        <DialogDescription>{t('removeDescription')}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => setRemoveConfirm(null)}>
                            {commonT('cancel')}
                        </Button>
                        <Button
                            variant="destructive" size="sm"
                            onClick={() => removeConfirm != null && deleteMutation.mutate({ id: removeConfirm })}
                            disabled={deleteMutation.isPending}
                        >
                            {commonT('delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
