'use client'

import { useState } from 'react'
import { Plus, Trash2, Edit3, MapPin } from 'lucide-react'
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
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { trpc } from '@/lib/trpc'
import { useToast } from '@/hooks/use-toast'

interface SpawnZone {
    zoneId: number
    zoneName: string
    minSpawnX: number | null
    minSpawnY: number | null
    minSpawnZ: number | null
    maxSpawnX: number | null
    maxSpawnY: number | null
    maxSpawnZ: number | null
    mobId: number
    spawnCount: number | null
    respawnTime: string | null
}

interface SpawnZonesManagerProps {
    mobId: number
    zones: SpawnZone[]
    onUpdate: () => void
}

const defaultForm = {
    zoneName: '',
    minSpawnX: 0, minSpawnY: 0, minSpawnZ: 0,
    maxSpawnX: 0, maxSpawnY: 0, maxSpawnZ: 0,
    spawnCount: 1,
    respawnTime: '00:01:00',
}

export function SpawnZonesManager({ mobId, zones, onUpdate }: SpawnZonesManagerProps) {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [editingZone, setEditingZone] = useState<SpawnZone | null>(null)
    const [deleteConfirm, setDeleteConfirm] = useState<SpawnZone | null>(null)
    const [form, setForm] = useState(defaultForm)

    const t = useTranslations('mobs')
    const commonT = useTranslations('common')
    const { toast } = useToast()

    const createMutation = trpc.mobs.createSpawnZone.useMutation({
        onSuccess: () => {
            toast({ title: commonT('success'), description: t('spawnZoneAdded') })
            onUpdate()
            setIsAddDialogOpen(false)
            setForm(defaultForm)
        },
        onError: (error) => {
            toast({ title: commonT('error'), description: error.message, variant: 'error' })
        },
    })

    const updateMutation = trpc.mobs.updateSpawnZone.useMutation({
        onSuccess: () => {
            toast({ title: commonT('success'), description: t('spawnZoneUpdated') })
            onUpdate()
            setEditingZone(null)
        },
        onError: (error) => {
            toast({ title: commonT('error'), description: error.message, variant: 'error' })
        },
    })

    const deleteMutation = trpc.mobs.deleteSpawnZone.useMutation({
        onSuccess: () => {
            toast({ title: commonT('success'), description: t('spawnZoneRemoved') })
            onUpdate()
            setDeleteConfirm(null)
        },
        onError: (error) => {
            toast({ title: commonT('error'), description: error.message, variant: 'error' })
        },
    })

    const handleAdd = () => {
        if (!form.zoneName.trim()) return
        createMutation.mutate({ ...form, mobId })
    }

    const handleUpdate = () => {
        if (!editingZone) return
        updateMutation.mutate({
            zoneId: editingZone.zoneId,
            zoneName: editingZone.zoneName,
            minSpawnX: editingZone.minSpawnX ?? 0,
            minSpawnY: editingZone.minSpawnY ?? 0,
            minSpawnZ: editingZone.minSpawnZ ?? 0,
            maxSpawnX: editingZone.maxSpawnX ?? 0,
            maxSpawnY: editingZone.maxSpawnY ?? 0,
            maxSpawnZ: editingZone.maxSpawnZ ?? 0,
            spawnCount: editingZone.spawnCount ?? 1,
            respawnTime: editingZone.respawnTime ?? '00:01:00',
        })
    }

    const ZoneForm = ({ value, onChange }: { value: typeof defaultForm; onChange: (v: typeof defaultForm) => void }) => (
        <div className="space-y-4 py-2">
            <div className="space-y-2">
                <Label>{t('zoneName')}</Label>
                <Input value={value.zoneName} onChange={e => onChange({ ...value, zoneName: e.target.value })} placeholder="Foxes Nest" />
            </div>
            <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t('minX')}</Label>
                    <Input type="number" step="any" value={value.minSpawnX} onChange={e => onChange({ ...value, minSpawnX: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t('minY')}</Label>
                    <Input type="number" step="any" value={value.minSpawnY} onChange={e => onChange({ ...value, minSpawnY: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t('minZ')}</Label>
                    <Input type="number" step="any" value={value.minSpawnZ} onChange={e => onChange({ ...value, minSpawnZ: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t('maxX')}</Label>
                    <Input type="number" step="any" value={value.maxSpawnX} onChange={e => onChange({ ...value, maxSpawnX: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t('maxY')}</Label>
                    <Input type="number" step="any" value={value.maxSpawnY} onChange={e => onChange({ ...value, maxSpawnY: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t('maxZ')}</Label>
                    <Input type="number" step="any" value={value.maxSpawnZ} onChange={e => onChange({ ...value, maxSpawnZ: parseFloat(e.target.value) || 0 })} />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                    <Label>{t('spawnCount')}</Label>
                    <Input type="number" min={1} value={value.spawnCount} onChange={e => onChange({ ...value, spawnCount: parseInt(e.target.value) || 1 })} />
                </div>
                <div className="space-y-2">
                    <Label>{t('respawnTime')}</Label>
                    <Input value={value.respawnTime} placeholder="00:01:00" pattern="\d{2}:\d{2}:\d{2}"
                        onChange={e => onChange({ ...value, respawnTime: e.target.value })} />
                </div>
            </div>
        </div>
    )

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between pb-3">
                <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        {t('spawnZones')}
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">{t('spawnZonesDescription')}</CardDescription>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8">
                            <Plus className="h-3.5 w-3.5" />
                            {t('addSpawnZone')}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>{t('addSpawnZone')}</DialogTitle>
                            <DialogDescription>{t('spawnZonesDescription')}</DialogDescription>
                        </DialogHeader>
                        <ZoneForm value={form} onChange={setForm} />
                        <DialogFooter>
                            <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); setForm(defaultForm) }}>{commonT('cancel')}</Button>
                            <Button onClick={handleAdd} disabled={!form.zoneName.trim() || createMutation.isPending}>
                                {createMutation.isPending ? commonT('saving') : commonT('save')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {zones.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <MapPin className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">{t('noSpawnZones')}</p>
                        <p className="text-xs mt-1">{t('addFirstSpawnZone')}</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {zones.map(zone => (
                            <div key={zone.zoneId} className="flex items-center justify-between rounded-lg border px-3 py-2 gap-2">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    <span className="text-sm font-medium truncate">{zone.zoneName}</span>
                                    <Badge variant="outline" className="font-mono text-[10px] shrink-0">×{zone.spawnCount}</Badge>
                                    <span className="text-xs text-muted-foreground shrink-0">{zone.respawnTime}</span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingZone(zone)}>
                                                    <Edit3 className="h-3.5 w-3.5" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>{t('editSpawnZone')}</TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(zone)}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>{t('removeSpawnZone')}</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>

            {/* Edit dialog */}
            <Dialog open={!!editingZone} onOpenChange={(o) => { if (!o) setEditingZone(null) }}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{t('editSpawnZone')}</DialogTitle>
                        <DialogDescription>{editingZone?.zoneName}</DialogDescription>
                    </DialogHeader>
                    {editingZone && (
                        <ZoneForm
                            value={{
                                zoneName: editingZone.zoneName,
                                minSpawnX: editingZone.minSpawnX ?? 0,
                                minSpawnY: editingZone.minSpawnY ?? 0,
                                minSpawnZ: editingZone.minSpawnZ ?? 0,
                                maxSpawnX: editingZone.maxSpawnX ?? 0,
                                maxSpawnY: editingZone.maxSpawnY ?? 0,
                                maxSpawnZ: editingZone.maxSpawnZ ?? 0,
                                spawnCount: editingZone.spawnCount ?? 1,
                                respawnTime: editingZone.respawnTime ?? '00:01:00',
                            }}
                            onChange={v => setEditingZone(z => z && ({ ...z, ...v }))}
                        />
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingZone(null)}>{commonT('cancel')}</Button>
                        <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                            {updateMutation.isPending ? commonT('saving') : commonT('save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete confirm */}
            <Dialog open={!!deleteConfirm} onOpenChange={(o) => { if (!o) setDeleteConfirm(null) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('removeSpawnZone')}</DialogTitle>
                        <DialogDescription>Remove zone &quot;{deleteConfirm?.zoneName}&quot;?</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirm(null)}>{commonT('cancel')}</Button>
                        <Button variant="destructive" onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.zoneId)}
                            disabled={deleteMutation.isPending}>
                            {deleteMutation.isPending ? commonT('deleting') : commonT('delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    )
}
