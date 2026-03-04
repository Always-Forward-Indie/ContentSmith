'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, MapPin, Plus, Trash2, Edit3, AlertCircle, Check, X } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'

export default function EditSpawnZonePage() {
    const locale = useLocale()
    const router = useRouter()
    const params = useParams()
    const spawnZoneId = Number(params.id)
    const t = useTranslations('spawnZones')
    const tc = useTranslations('common')

    // ── Zone form state ────────────────────────────────────────────────────────
    const [zoneName, setZoneName] = useState('')
    const [gameZoneId, setGameZoneId] = useState<string>('')
    const [minX, setMinX] = useState('0')
    const [minY, setMinY] = useState('0')
    const [minZ, setMinZ] = useState('0')
    const [maxX, setMaxX] = useState('0')
    const [maxY, setMaxY] = useState('0')
    const [maxZ, setMaxZ] = useState('0')

    // ── Mob manager state ──────────────────────────────────────────────────────
    const [addMobOpen, setAddMobOpen] = useState(false)
    const [addMobId, setAddMobId] = useState<string>('')
    const [addSpawnCount, setAddSpawnCount] = useState('1')
    const [addRespawnTime, setAddRespawnTime] = useState('00:05:00')
    const [editingMob, setEditingMob] = useState<{ id: number; spawnCount: number; respawnTime: string } | null>(null)
    const [removeTarget, setRemoveTarget] = useState<{ id: number; name: string } | null>(null)

    // ── Server data ────────────────────────────────────────────────────────────
    const { data: zone, isLoading, error } = trpc.zones.getSpawnZoneById.useQuery(spawnZoneId, { enabled: !!spawnZoneId })
    const { data: gameZonesData } = trpc.zones.list.useQuery({ pageSize: 100 })
    const gameZones = gameZonesData?.data ?? []

    const { data: zoneMobs, refetch: refetchMobs } = trpc.zones.listSpawnZoneMobs.useQuery(spawnZoneId, { enabled: !!spawnZoneId })
    const { data: allMobs } = trpc.zones.allMobs.useQuery()

    // ── Populate form ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (!zone) return
        setZoneName(zone.zoneName)
        setGameZoneId(zone.gameZoneId ? String(zone.gameZoneId) : '')
        setMinX(String(zone.minSpawnX ?? 0))
        setMinY(String(zone.minSpawnY ?? 0))
        setMinZ(String(zone.minSpawnZ ?? 0))
        setMaxX(String(zone.maxSpawnX ?? 0))
        setMaxY(String(zone.maxSpawnY ?? 0))
        setMaxZ(String(zone.maxSpawnZ ?? 0))
    }, [zone])

    // ── Mutations ──────────────────────────────────────────────────────────────
    const update = trpc.zones.updateSpawnZone.useMutation({
        onSuccess: () => toast.success(t('spawnZoneUpdated')),
    })

    const addMob = trpc.zones.addSpawnZoneMob.useMutation({
        onSuccess: () => {
            toast.success(t('mobs.mobAdded'))
            refetchMobs()
            setAddMobOpen(false)
            setAddMobId('')
            setAddSpawnCount('1')
            setAddRespawnTime('00:05:00')
        },
    })

    const updateMob = trpc.zones.updateSpawnZoneMob.useMutation({
        onSuccess: () => {
            toast.success(t('mobs.mobUpdated'))
            refetchMobs()
            setEditingMob(null)
        },
    })

    const removeMob = trpc.zones.removeSpawnZoneMob.useMutation({
        onSuccess: () => {
            toast.success(t('mobs.mobRemoved'))
            refetchMobs()
            setRemoveTarget(null)
        },
    })

    function handleSaveZone(e: React.FormEvent) {
        e.preventDefault()
        update.mutate({
            spawnZoneId,
            zoneName,
            gameZoneId: gameZoneId ? Number(gameZoneId) : undefined,
            minSpawnX: parseFloat(minX) || 0,
            minSpawnY: parseFloat(minY) || 0,
            minSpawnZ: parseFloat(minZ) || 0,
            maxSpawnX: parseFloat(maxX) || 0,
            maxSpawnY: parseFloat(maxY) || 0,
            maxSpawnZ: parseFloat(maxZ) || 0,
        })
    }

    function handleAddMob() {
        if (!addMobId) return
        addMob.mutate({
            spawnZoneId,
            mobId: Number(addMobId),
            spawnCount: Number(addSpawnCount) || 1,
            respawnTime: addRespawnTime,
        })
    }

    if (error) return (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
            <AlertCircle className="h-10 w-10 text-destructive/70" />
            <p className="text-destructive font-medium">{t('spawnZoneNotFound')}</p>
            <Button variant="outline" asChild>
                <Link href={`/${locale}/spawn-zones`}>{tc('back')}</Link>
            </Button>
        </div>
    )

    return (
        <div className="space-y-6 max-w-2xl">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" asChild className="shrink-0">
                    <Link href={`/${locale}/spawn-zones`}><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                        <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{t('editTitle')}</h1>
                        <p className="text-sm text-muted-foreground">{zone?.zoneName ?? tc('loading')}</p>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}
                </div>
            ) : (
                <>
                    {/* ── Zone form ───────────────────────────────────────── */}
                    <form onSubmit={handleSaveZone} className="space-y-5">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">{tc('general')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="zoneName">{t('fields.zoneName')}</Label>
                                    <Input id="zoneName" value={zoneName} onChange={e => setZoneName(e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="gameZone">{t('fields.gameZone')}</Label>
                                    <Select value={gameZoneId} onValueChange={setGameZoneId}>
                                        <SelectTrigger id="gameZone">
                                            <SelectValue placeholder={t('fields.selectGameZone')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {gameZones.map(z => (
                                                <SelectItem key={z.id} value={String(z.id)}>{z.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">{t('fields.coordinates')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">{t('fields.minCoords')}</Label>
                                    <div className="grid grid-cols-3 gap-3">
                                        <Input type="number" step="any" placeholder="X" value={minX} onChange={e => setMinX(e.target.value)} />
                                        <Input type="number" step="any" placeholder="Y" value={minY} onChange={e => setMinY(e.target.value)} />
                                        <Input type="number" step="any" placeholder="Z" value={minZ} onChange={e => setMinZ(e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">{t('fields.maxCoords')}</Label>
                                    <div className="grid grid-cols-3 gap-3">
                                        <Input type="number" step="any" placeholder="X" value={maxX} onChange={e => setMaxX(e.target.value)} />
                                        <Input type="number" step="any" placeholder="Y" value={maxY} onChange={e => setMaxY(e.target.value)} />
                                        <Input type="number" step="any" placeholder="Z" value={maxZ} onChange={e => setMaxZ(e.target.value)} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex items-center gap-3">
                            <Button type="submit" disabled={update.isPending || !zoneName}>
                                {update.isPending ? tc('saving') : tc('save')}
                            </Button>
                            <Button type="button" variant="outline" asChild>
                                <Link href={`/${locale}/spawn-zones`}>{tc('cancel')}</Link>
                            </Button>
                        </div>
                    </form>

                    {/* ── Mob manager ─────────────────────────────────────── */}
                    <Card>
                        <CardHeader className="flex flex-row items-start justify-between pb-3">
                            <div>
                                <CardTitle className="text-base flex items-center gap-2">
                                    {t('mobs.title')}
                                    {zoneMobs && zoneMobs.length > 0 && (
                                        <Badge variant="secondary" className="text-xs font-normal">{zoneMobs.length}</Badge>
                                    )}
                                </CardTitle>
                                <CardDescription className="text-xs mt-0.5">{t('mobs.description')}</CardDescription>
                            </div>
                            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={() => setAddMobOpen(true)}>
                                <Plus className="h-3.5 w-3.5" />
                                {t('mobs.addMob')}
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            {!zoneMobs || zoneMobs.length === 0 ? (
                                <div className="text-center py-10 text-muted-foreground">
                                    <MapPin className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">{t('mobs.noMobs')}</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('mobs.table.mob')}</TableHead>
                                            <TableHead className="w-16 text-center">{t('mobs.table.level')}</TableHead>
                                            <TableHead className="w-24 text-center">{t('mobs.table.spawnCount')}</TableHead>
                                            <TableHead className="w-32">{t('mobs.table.respawnTime')}</TableHead>
                                            <TableHead className="w-20 text-right">{t('mobs.table.actions')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {zoneMobs.map(entry => (
                                            <TableRow key={entry.id}>
                                                {editingMob?.id === entry.id ? (
                                                    <>
                                                        <TableCell className="font-medium">{entry.mobName}</TableCell>
                                                        <TableCell className="text-center text-sm text-muted-foreground">{entry.mobLevel ?? '—'}</TableCell>
                                                        <TableCell>
                                                            <Input
                                                                type="number" min={1} className="h-7 w-20 text-center"
                                                                value={editingMob.spawnCount}
                                                                onChange={e => setEditingMob(m => m ? { ...m, spawnCount: Number(e.target.value) || 1 } : null)}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                className="h-7 w-28 font-mono text-xs"
                                                                value={editingMob.respawnTime}
                                                                placeholder="00:05:00"
                                                                pattern="\d{2}:\d{2}:\d{2}"
                                                                onChange={e => setEditingMob(m => m ? { ...m, respawnTime: e.target.value } : null)}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600"
                                                                    disabled={updateMob.isPending}
                                                                    onClick={() => updateMob.mutate({ id: editingMob.id, spawnCount: editingMob.spawnCount, respawnTime: editingMob.respawnTime })}>
                                                                    <Check className="h-3.5 w-3.5" />
                                                                </Button>
                                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingMob(null)}>
                                                                    <X className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </>
                                                ) : (
                                                    <>
                                                        <TableCell className="font-medium">{entry.mobName}</TableCell>
                                                        <TableCell className="text-center text-sm text-muted-foreground">{entry.mobLevel ?? '—'}</TableCell>
                                                        <TableCell className="text-center text-sm">{entry.spawnCount}</TableCell>
                                                        <TableCell className="font-mono text-xs text-muted-foreground">{entry.respawnTime}</TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <Button variant="ghost" size="icon" className="h-7 w-7"
                                                                    onClick={() => setEditingMob({ id: entry.id, spawnCount: entry.spawnCount, respawnTime: entry.respawnTime })}>
                                                                    <Edit3 className="h-3.5 w-3.5" />
                                                                </Button>
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                                                                    onClick={() => setRemoveTarget({ id: entry.id, name: entry.mobName ?? '' })}>
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </>
                                                )}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}

            {/* ── Add mob dialog ─────────────────────────────────────────── */}
            <Dialog open={addMobOpen} onOpenChange={setAddMobOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('mobs.addMob')}</DialogTitle>
                        <DialogDescription>{t('mobs.description')}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>{t('mobs.fields.mob')}</Label>
                            <Select value={addMobId} onValueChange={setAddMobId}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('mobs.fields.selectMob')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {(allMobs ?? []).map(m => (
                                        <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('mobs.fields.spawnCount')}</Label>
                                <Input type="number" min={1} value={addSpawnCount} onChange={e => setAddSpawnCount(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('mobs.fields.respawnTime')}</Label>
                                <Input value={addRespawnTime} placeholder="00:05:00" pattern="\d{2}:\d{2}:\d{2}"
                                    onChange={e => setAddRespawnTime(e.target.value)} />
                                <p className="text-xs text-muted-foreground">{t('mobs.fields.respawnTimeHint')}</p>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddMobOpen(false)}>{tc('cancel')}</Button>
                        <Button onClick={handleAddMob} disabled={!addMobId || addMob.isPending}>
                            {addMob.isPending ? tc('saving') : tc('add')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Remove mob dialog ──────────────────────────────────────── */}
            <Dialog open={!!removeTarget} onOpenChange={() => setRemoveTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{tc('deleteConfirm')}</DialogTitle>
                        <DialogDescription>{removeTarget?.name}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRemoveTarget(null)}>{tc('cancel')}</Button>
                        <Button variant="destructive" disabled={removeMob.isPending}
                            onClick={() => removeTarget && removeMob.mutate({ id: removeTarget.id })}>
                            {tc('delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
