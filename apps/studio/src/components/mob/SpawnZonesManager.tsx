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

interface SpawnZonesManagerProps {
    mobId: number
}

export function SpawnZonesManager({ mobId }: SpawnZonesManagerProps) {
    const [addOpen, setAddOpen] = useState(false)
    const [addZoneId, setAddZoneId] = useState<string>('')
    const [addSpawnCount, setAddSpawnCount] = useState('1')
    const [addRespawnTime, setAddRespawnTime] = useState('00:05:00')
    const [editingId, setEditingId] = useState<number | null>(null)
    const [editSpawnCount, setEditSpawnCount] = useState('1')
    const [editRespawnTime, setEditRespawnTime] = useState('00:05:00')
    const [removeConfirm, setRemoveConfirm] = useState<number | null>(null)

    const t = useTranslations('mobs')
    const commonT = useTranslations('common')
    const { toast } = useToast()

    const { data: memberships, refetch } = trpc.zones.listSpawnZonesByMob.useQuery(mobId)
    const { data: allZonesData } = trpc.zones.listSpawnZones.useQuery({ pageSize: 100 })
    const allZones = allZonesData?.data ?? []

    const addMutation = trpc.zones.addSpawnZoneMob.useMutation({
        onSuccess: () => {
            toast({ title: commonT('success'), description: t('spawnZoneAdded') })
            refetch()
            setAddOpen(false)
            setAddZoneId('')
            setAddSpawnCount('1')
            setAddRespawnTime('00:05:00')
        },
        onError: (error) => {
            toast({ title: commonT('error'), description: error.message, variant: 'error' })
        },
    })

    const updateMutation = trpc.zones.updateSpawnZoneMob.useMutation({
        onSuccess: () => {
            toast({ title: commonT('success'), description: t('spawnZoneUpdated') })
            refetch()
            setEditingId(null)
        },
        onError: (error) => {
            toast({ title: commonT('error'), description: error.message, variant: 'error' })
        },
    })

    const removeMutation = trpc.zones.removeSpawnZoneMob.useMutation({
        onSuccess: () => {
            toast({ title: commonT('success'), description: t('spawnZoneRemoved') })
            refetch()
            setRemoveConfirm(null)
        },
        onError: (error) => {
            toast({ title: commonT('error'), description: error.message, variant: 'error' })
        },
    })

    function startEdit(entry: { id: number; spawnCount: number; respawnTime: string }) {
        setEditingId(entry.id)
        setEditSpawnCount(String(entry.spawnCount))
        setEditRespawnTime(entry.respawnTime)
    }

    function handleAdd() {
        if (!addZoneId) return
        addMutation.mutate({
            spawnZoneId: Number(addZoneId),
            mobId,
            spawnCount: Number(addSpawnCount) || 1,
            respawnTime: addRespawnTime,
        })
    }

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
                <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={() => setAddOpen(true)}>
                    <Plus className="h-3.5 w-3.5" />
                    {t('addSpawnZone')}
                </Button>
            </CardHeader>
            <CardContent>
                {!memberships || memberships.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <MapPin className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">{t('noSpawnZones')}</p>
                        <p className="text-xs mt-1">{t('addFirstSpawnZone')}</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {memberships.map(entry => (
                            <div key={entry.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{entry.zoneName ?? `#${entry.spawnZoneId}`}</p>
                                </div>
                                {editingId === entry.id ? (
                                    <div className="flex items-center gap-2 ml-3 shrink-0">
                                        <Input
                                            type="number" min={1} className="h-7 w-16 text-center text-xs"
                                            value={editSpawnCount}
                                            onChange={e => setEditSpawnCount(e.target.value)}
                                        />
                                        <Input
                                            className="h-7 w-24 font-mono text-xs"
                                            value={editRespawnTime}
                                            placeholder="00:05:00"
                                            onChange={e => setEditRespawnTime(e.target.value)}
                                        />
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600"
                                            disabled={updateMutation.isPending}
                                            onClick={() => updateMutation.mutate({ id: entry.id, spawnCount: Number(editSpawnCount) || 1, respawnTime: editRespawnTime })}>
                                            <Check className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 ml-3 shrink-0 text-muted-foreground text-xs">
                                        <span>{t('spawnCount')}: <span className="text-foreground font-medium">{entry.spawnCount}</span></span>
                                        <span className="font-mono">{entry.respawnTime}</span>
                                        <Button variant="ghost" size="icon" className="h-7 w-7"
                                            onClick={() => startEdit({ id: entry.id, spawnCount: entry.spawnCount, respawnTime: entry.respawnTime })}>
                                            <Edit3 className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                                            onClick={() => setRemoveConfirm(entry.id)}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>

            {/* Add dialog */}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('addSpawnZone')}</DialogTitle>
                        <DialogDescription>{t('spawnZonesDescription')}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>{t('zoneName')}</Label>
                            <Select value={addZoneId} onValueChange={setAddZoneId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a spawn zone..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {allZones.map(z => (
                                        <SelectItem key={z.spawnZoneId} value={String(z.spawnZoneId)}>{z.zoneName}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>{t('spawnCount')}</Label>
                                <Input type="number" min={1} value={addSpawnCount} onChange={e => setAddSpawnCount(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('respawnTime')}</Label>
                                <Input value={addRespawnTime} placeholder="00:05:00" pattern="\d{2}:\d{2}:\d{2}"
                                    onChange={e => setAddRespawnTime(e.target.value)} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddOpen(false)}>{commonT('cancel')}</Button>
                        <Button onClick={handleAdd} disabled={!addZoneId || addMutation.isPending}>
                            {addMutation.isPending ? commonT('saving') : commonT('add')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Remove confirm dialog */}
            <Dialog open={removeConfirm !== null} onOpenChange={() => setRemoveConfirm(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{commonT('deleteConfirm')}</DialogTitle>
                        <DialogDescription>{t('removeSpawnZone')}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRemoveConfirm(null)}>{commonT('cancel')}</Button>
                        <Button variant="destructive" disabled={removeMutation.isPending}
                            onClick={() => removeConfirm !== null && removeMutation.mutate({ id: removeConfirm })}>
                            {commonT('delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    )
}
