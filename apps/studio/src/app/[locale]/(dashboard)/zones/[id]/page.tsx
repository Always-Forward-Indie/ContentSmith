'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { ArrowLeft, Map, Plus, Trash2, Pencil, Check, X } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

function slugify(str: string) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

export default function ZoneDetailPage() {
    const { id } = useParams<{ id: string }>()
    const locale = useLocale()
    const t = useTranslations('zones')
    const tc = useTranslations('common')
    const zoneId = Number(id)

    // inline edit state
    const [editing, setEditing] = useState(false)
    const [eName, setEName] = useState('')
    const [eSlug, setESlug] = useState('')
    const [eMin, setEMin] = useState('')
    const [eMax, setEMax] = useState('')
    const [ePvp, setEPvp] = useState(false)
    const [eSafe, setESafe] = useState(false)

    // spawn zone form
    const [spawnZoneName, setSpawnZoneName] = useState('')
    const [minX, setMinX] = useState('0')
    const [minY, setMinY] = useState('0')
    const [minZ, setMinZ] = useState('0')
    const [maxX, setMaxX] = useState('0')
    const [maxY, setMaxY] = useState('0')
    const [maxZ, setMaxZ] = useState('0')
    const [deleteSpawn, setDeleteSpawn] = useState<{ spawnZoneId: number; zoneName: string } | null>(null)

    const { data: zone, isLoading, refetch } = trpc.zones.getById.useQuery({ id: zoneId })
    const { data: allSpawnZones, refetch: refetchSpawn } = trpc.zones.listSpawnZones.useQuery({ gameZoneId: zoneId, pageSize: 100 })

    const updateZone = trpc.zones.update.useMutation({ onSuccess: () => { toast.success(t('zoneUpdated')); refetch(); setEditing(false) } })
    const createSpawn = trpc.zones.createSpawnZone.useMutation({ onSuccess: () => { toast.success(t('spawnAdded')); refetchSpawn(); setSpawnZoneName('') } })
    const deleteSpawnZone = trpc.zones.deleteSpawnZone.useMutation({ onSuccess: () => { toast.success(t('spawnDeleted')); refetchSpawn(); setDeleteSpawn(null) } })

    const spawnZones = allSpawnZones?.data ?? []

    function startEdit() {
        if (!zone) return
        setEName(zone.name)
        setESlug(zone.slug)
        setEMin(String(zone.minLevel ?? 1))
        setEMax(String(zone.maxLevel ?? 999))
        setEPvp(zone.isPvp ?? false)
        setESafe(zone.isSafeZone ?? false)
        setEditing(true)
    }

    if (isLoading) return (
        <div className="space-y-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-40 w-full" />
        </div>
    )

    if (!zone) return <div className="text-center py-24 text-muted-foreground">{t('zoneNotFound')}</div>

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" asChild className="shrink-0">
                    <Link href={`/${locale}/zones`}><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                        <Map className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight">{zone.name}</h1>
                            {zone.isPvp && <Badge variant="destructive" className="text-xs">{t('badges.pvp')}</Badge>}
                            {zone.isSafeZone && <Badge variant="secondary" className="text-xs">{t('badges.safe')}</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground font-mono">{zone.slug}</p>
                    </div>
                </div>
            </div>

            {/* Zone info */}
            <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-base">{t('zoneSettings')}</CardTitle>
                    {!editing && (
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={startEdit}>
                            <Pencil className="h-3.5 w-3.5" />{tc('edit')}
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    {editing ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label>{t('fields.name')}</Label>
                                    <Input value={eName} onChange={e => { setEName(e.target.value); setESlug(slugify(e.target.value)) }} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>{t('fields.slug')}</Label>
                                    <Input value={eSlug} onChange={e => setESlug(e.target.value)} className="font-mono text-sm" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label>{t('fields.minLevel')}</Label>
                                    <Input type="number" min={1} value={eMin} onChange={e => setEMin(e.target.value)} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>{t('fields.maxLevel')}</Label>
                                    <Input type="number" min={1} value={eMax} onChange={e => setEMax(e.target.value)} />
                                </div>
                            </div>
                            <div className="flex items-center gap-8">
                                <div className="flex items-center gap-2">
                                    <Switch checked={ePvp} onCheckedChange={setEPvp} id="edit-pvp" />
                                    <Label htmlFor="edit-pvp">{t('fields.pvp')}</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch checked={eSafe} onCheckedChange={setESafe} id="edit-safe" />
                                    <Label htmlFor="edit-safe">{t('fields.safe')}</Label>
                                </div>
                            </div>
                            <div className="flex gap-2 pt-1">
                                <Button size="sm" disabled={updateZone.isPending}
                                    onClick={() => updateZone.mutate({ id: zoneId, name: eName, slug: eSlug, minLevel: Number(eMin), maxLevel: Number(eMax), isPvp: ePvp, isSafeZone: eSafe })}>
                                    <Check className="h-4 w-4 mr-1" />{updateZone.isPending ? tc('saving') : tc('save')}
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                                    <X className="h-4 w-4 mr-1" />{tc('cancel')}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                            <div><span className="text-muted-foreground">{t('nameLabel')}</span> <span className="font-medium ml-1">{zone.name}</span></div>
                            <div><span className="text-muted-foreground">{t('slugLabel')}</span> <span className="font-mono ml-1">{zone.slug}</span></div>
                            <div><span className="text-muted-foreground">{t('levelRange')}</span> <span className="font-medium ml-1">{zone.minLevel}–{zone.maxLevel}</span></div>
                            <div className="flex gap-3">
                                {zone.isPvp && <Badge variant="destructive" className="text-xs">{t('badges.pvp')}</Badge>}
                                {zone.isSafeZone && <Badge variant="secondary" className="text-xs">{t('badges.safeZone')}</Badge>}
                                {!zone.isPvp && !zone.isSafeZone && <span className="text-muted-foreground">{t('badges.normalZone')}</span>}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Spawn zones */}
            <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">{t('spawnZones')}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    {/* Add form */}
                    <div className="p-3 bg-muted/40 rounded-md border border-dashed space-y-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('addSpawnZone')}</p>
                        <div className="space-y-1.5">
                            <Label className="text-xs">{t('spawnFields.name')}</Label>
                            <Input className="h-8 text-sm" placeholder="Foxes Nest" value={spawnZoneName} onChange={e => setSpawnZoneName(e.target.value)} />
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {(
                                [
                                    ['Min X', minX, setMinX],
                                    ['Min Y', minY, setMinY],
                                    ['Min Z', minZ, setMinZ],
                                    ['Max X', maxX, setMaxX],
                                    ['Max Y', maxY, setMaxY],
                                    ['Max Z', maxZ, setMaxZ],
                                ] as [string, string, (v: string) => void][]
                            ).map(([label, val, setter]) => (
                                <div key={label} className="space-y-1 w-20">
                                    <Label className="text-xs">{label}</Label>
                                    <Input className="h-8 text-sm" type="number" value={val} onChange={e => setter(e.target.value)} />
                                </div>
                            ))}
                        </div>
                        <Button size="sm" className="gap-1.5 h-8" disabled={!spawnZoneName || createSpawn.isPending}
                            onClick={() => createSpawn.mutate({
                                zoneName: spawnZoneName,
                                gameZoneId: zoneId,
                                minSpawnX: Number(minX), minSpawnY: Number(minY), minSpawnZ: Number(minZ),
                                maxSpawnX: Number(maxX), maxSpawnY: Number(maxY), maxSpawnZ: Number(maxZ),
                            })}>
                            <Plus className="h-3.5 w-3.5" />{t('addSpawn')}
                        </Button>
                    </div>

                    {spawnZones.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">{t('noSpawnZones')}</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('spawnTable.name')}</TableHead>
                                    <TableHead className="text-xs">{t('spawnTable.minCoords')}</TableHead>
                                    <TableHead className="text-xs">{t('spawnTable.maxCoords')}</TableHead>
                                    <TableHead className="text-right w-16">{t('spawnTable.del')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {spawnZones.map(sz => (
                                    <TableRow key={sz.spawnZoneId}>
                                        <TableCell className="font-medium">{sz.zoneName}</TableCell>
                                        <TableCell className="font-mono text-xs text-muted-foreground">{sz.minSpawnX}, {sz.minSpawnY}, {sz.minSpawnZ}</TableCell>
                                        <TableCell className="font-mono text-xs text-muted-foreground">{sz.maxSpawnX}, {sz.maxSpawnY}, {sz.maxSpawnZ}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                                                onClick={() => setDeleteSpawn({ spawnZoneId: sz.spawnZoneId, zoneName: sz.zoneName })}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={!!deleteSpawn} onOpenChange={open => { if (!open) setDeleteSpawn(null) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('deleteSpawnTitle', { name: deleteSpawn?.zoneName ?? '' })}</DialogTitle>
                        <DialogDescription>{t('deleteSpawnDescription')}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteSpawn(null)}>{tc('cancel')}</Button>
                        <Button variant="destructive" disabled={deleteSpawnZone.isPending}
                            onClick={() => deleteSpawn && deleteSpawnZone.mutate({ spawnZoneId: deleteSpawn.spawnZoneId })}>
                            {deleteSpawnZone.isPending ? '…' : tc('delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
