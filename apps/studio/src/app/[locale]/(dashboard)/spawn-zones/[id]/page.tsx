'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { ArrowLeft, Map, Plus, Trash2, Pencil, Check, X, Skull, ExternalLink, AlertCircle } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import type { SpawnZoneShape } from '@contentsmith/validation'

export default function SpawnZoneDetailPage() {
    const { id } = useParams<{ id: string }>()
    const locale = useLocale()
    const t = useTranslations('spawnZones')
    const tc = useTranslations('common')
    const spawnZoneId = Number(id)

    const [editing, setEditing] = useState(false)
    const [eName, setEName] = useState('')
    const [eGameZoneId, setEGameZoneId] = useState<number | null>(null)
    const [eExclusionZoneId, setEExclusionZoneId] = useState<number | null>(null)
    const [eMinX, setEMinX] = useState('0')
    const [eMinY, setEMinY] = useState('0')
    const [eMinZ, setEMinZ] = useState('0')
    const [eMaxX, setEMaxX] = useState('0')
    const [eMaxY, setEMaxY] = useState('0')
    const [eMaxZ, setEMaxZ] = useState('0')
    const [eShapeType, setEShapeType] = useState<SpawnZoneShape>('RECT')
    const [eCenterX, setECenterX] = useState('0')
    const [eCenterY, setECenterY] = useState('0')
    const [eInnerRadius, setEInnerRadius] = useState('0')
    const [eOuterRadius, setEOuterRadius] = useState('0')

    const [addMobOpen, setAddMobOpen] = useState(false)
    const [mobSearch, setMobSearch] = useState('')
    const [selectedMobId, setSelectedMobId] = useState<number | null>(null)
    const [addSpawnCount, setAddSpawnCount] = useState('1')
    const [addRespawnTime, setAddRespawnTime] = useState('00:05:00')
    const [editingMobId, setEditingMobId] = useState<number | null>(null)
    const [editCount, setEditCount] = useState('')
    const [editTime, setEditTime] = useState('')
    const [deleteConfirm, setDeleteConfirm] = useState(false)

    const { data: sz, isLoading, error, refetch } = trpc.zones.getSpawnZoneById.useQuery(spawnZoneId)
    const { data: zonesData } = trpc.zones.list.useQuery({ page: 1, pageSize: 200 })
    const { data: mobsList, refetch: refetchMobs } = trpc.zones.listSpawnZoneMobs.useQuery(spawnZoneId)
    const { data: allMobs } = trpc.zones.allMobs.useQuery(undefined, { staleTime: 60_000 })

    const updateMutation = trpc.zones.updateSpawnZone.useMutation({
        onSuccess: () => { toast.success(t('spawnZoneUpdated')); setEditing(false); refetch() },
        onError: (e) => toast.error(e.message),
    })
    const deleteMutation = trpc.zones.deleteSpawnZone.useMutation({
        onSuccess: () => { toast.success(t('spawnZoneDeleted')); window.location.href = `/${locale}/spawn-zones` },
        onError: (e) => toast.error(e.message),
    })
    const addMobMutation = trpc.zones.addSpawnZoneMob.useMutation({
        onSuccess: () => {
            toast.success(t('mobs.mobAdded')); refetchMobs();
            setAddMobOpen(false); setMobSearch(''); setSelectedMobId(null); setAddSpawnCount('1'); setAddRespawnTime('00:05:00');
        },
        onError: (e) => toast.error(e.message),
    })
    const updateMobMutation = trpc.zones.updateSpawnZoneMob.useMutation({
        onSuccess: () => { toast.success(t('mobs.mobUpdated')); refetchMobs(); setEditingMobId(null) },
        onError: (e) => toast.error(e.message),
    })
    const removeMobMutation = trpc.zones.removeSpawnZoneMob.useMutation({
        onSuccess: () => { toast.success(t('mobs.mobRemoved')); refetchMobs() },
        onError: (e) => toast.error(e.message),
    })

    const zoneOptions = zonesData?.data ?? []
    const filteredMobs = (allMobs ?? []).filter(
        m => mobSearch.length > 0 && m.name.toLowerCase().includes(mobSearch.toLowerCase()),
    )

    function startEdit() {
        if (!sz) return
        setEName(sz.zoneName)
        setEGameZoneId(sz.gameZoneId)
        setEExclusionZoneId(sz.exclusionGameZoneId)
        setEMinX(String(sz.minSpawnX))
        setEMinY(String(sz.minSpawnY))
        setEMinZ(String(sz.minSpawnZ))
        setEMaxX(String(sz.maxSpawnX))
        setEMaxY(String(sz.maxSpawnY))
        setEMaxZ(String(sz.maxSpawnZ))
        setEShapeType(sz.shapeType as SpawnZoneShape)
        setECenterX(String(sz.centerX))
        setECenterY(String(sz.centerY))
        setEInnerRadius(String(sz.innerRadius))
        setEOuterRadius(String(sz.outerRadius))
        setEditing(true)
    }

    function handleSave() {
        updateMutation.mutate({
            spawnZoneId,
            zoneName: eName,
            gameZoneId: eGameZoneId,
            exclusionGameZoneId: eExclusionZoneId,
            minSpawnX: Number(eMinX), minSpawnY: Number(eMinY), minSpawnZ: Number(eMinZ),
            maxSpawnX: Number(eMaxX), maxSpawnY: Number(eMaxY), maxSpawnZ: Number(eMaxZ),
            shapeType: eShapeType,
            centerX: Number(eCenterX),
            centerY: Number(eCenterY),
            innerRadius: Number(eInnerRadius),
            outerRadius: Number(eOuterRadius),
        })
    }

    if (error) return (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
            <AlertCircle className="h-10 w-10 text-destructive/70" />
            <p className="text-destructive font-medium">Error: {error.message}</p>
            <Button variant="outline" asChild><Link href={`/${locale}/spawn-zones`}><ArrowLeft className="h-4 w-4 mr-1" />{tc('back')}</Link></Button>
        </div>
    )

    if (isLoading || !sz) return (
        <div className="space-y-6 max-w-xl">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-64" />
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
                        <Map className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold tracking-tight">{editing ? t('editTitle') : sz.zoneName}</h1>
                        <p className="text-sm text-muted-foreground">{editing ? t('editSubtitle') : `Spawn zone #${spawnZoneId}`}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 ml-auto">
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="View on map">
                        <Link href={`/${locale}/maps?focus=spawnZone:${spawnZoneId}`} target="_blank">
                            <ExternalLink className="h-4 w-4" />
                        </Link>
                    </Button>
                    {!editing && (
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={startEdit}>
                            <Pencil className="h-4 w-4" />{tc('edit')}
                        </Button>
                    )}
                </div>
            </div>

            {/* Spawn Zone Fields */}
            <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-base">{t('fields.zoneName')}</CardTitle>
                    {editing && (
                        <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(false)}>
                                <X className="h-3.5 w-3.5 mr-1" />{tc('cancel')}
                            </Button>
                            <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={updateMutation.isPending}>
                                <Check className="h-3.5 w-3.5 mr-1" />{tc('save')}
                            </Button>
                        </div>
                    )}
                </CardHeader>
                <CardContent className="space-y-4">
                    {editing ? (
                        <>
                            <div className="space-y-1.5">
                                <Label>{t('fields.zoneName')}</Label>
                                <Input value={eName} onChange={e => setEName(e.target.value)} />
                            </div>

                            <div className="space-y-1.5">
                                <Label>{t('fields.gameZone')}</Label>
                                <Select value={eGameZoneId != null ? String(eGameZoneId) : ''} onValueChange={v => setEGameZoneId(v ? Number(v) : null)}>
                                    <SelectTrigger><SelectValue placeholder={t('fields.selectGameZone')} /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">— {t('fields.selectGameZone')} —</SelectItem>
                                        {zoneOptions.map(z => (
                                            <SelectItem key={z.id} value={String(z.id)}>{z.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label>{t('fields.exclusionGameZone')}</Label>
                                <Select value={eExclusionZoneId != null ? String(eExclusionZoneId) : ''} onValueChange={v => setEExclusionZoneId(v ? Number(v) : null)}>
                                    <SelectTrigger><SelectValue placeholder={t('fields.selectExclusionZone')} /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">{t('fields.noExclusion')}</SelectItem>
                                        {zoneOptions.map(z => (
                                            <SelectItem key={z.id} value={String(z.id)}>{z.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label>{t('fields.shapeType')}</Label>
                                <Select value={eShapeType} onValueChange={v => setEShapeType(v as SpawnZoneShape)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="RECT">{t('shapes.RECT')}</SelectItem>
                                        <SelectItem value="CIRCLE">{t('shapes.CIRCLE')}</SelectItem>
                                        <SelectItem value="ANNULUS">{t('shapes.ANNULUS')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {(eShapeType === 'CIRCLE' || eShapeType === 'ANNULUS') && (
                                <Card className="bg-muted/30">
                                    <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-sm">{t('fields.shapeParams')}</CardTitle></CardHeader>
                                    <CardContent className="space-y-3 px-4 pb-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-xs">{t('fields.centerX')}</Label>
                                                <Input type="number" step="any" className="h-8 text-sm" value={eCenterX} onChange={e => setECenterX(e.target.value)} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">{t('fields.centerY')}</Label>
                                                <Input type="number" step="any" className="h-8 text-sm" value={eCenterY} onChange={e => setECenterY(e.target.value)} />
                                            </div>
                                        </div>
                                        {eShapeType === 'ANNULUS' && (
                                            <div className="space-y-1">
                                                <Label className="text-xs">{t('fields.innerRadius')}</Label>
                                                <Input type="number" min={0} step="any" className="h-8 text-sm" value={eInnerRadius} onChange={e => setEInnerRadius(e.target.value)} />
                                            </div>
                                        )}
                                        <div className="space-y-1">
                                            <Label className="text-xs">{t('fields.outerRadius')}</Label>
                                            <Input type="number" min={0} step="any" className="h-8 text-sm" value={eOuterRadius} onChange={e => setEOuterRadius(e.target.value)} />
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {eShapeType === 'RECT' && (
                                <div className="space-y-1.5">
                                    <Label className="text-sm font-medium">{t('fields.coordinates')}</Label>
                                    <p className="text-xs text-muted-foreground">{t('fields.minCoords')}</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        <Input type="number" step="any" placeholder="X" className="h-8 text-sm" value={eMinX} onChange={e => setEMinX(e.target.value)} />
                                        <Input type="number" step="any" placeholder="Y" className="h-8 text-sm" value={eMinY} onChange={e => setEMinY(e.target.value)} />
                                        <Input type="number" step="any" placeholder="Z" className="h-8 text-sm" value={eMinZ} onChange={e => setEMinZ(e.target.value)} />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">{t('fields.maxCoords')}</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        <Input type="number" step="any" placeholder="X" className="h-8 text-sm" value={eMaxX} onChange={e => setEMaxX(e.target.value)} />
                                        <Input type="number" step="any" placeholder="Y" className="h-8 text-sm" value={eMaxY} onChange={e => setEMaxY(e.target.value)} />
                                        <Input type="number" step="any" placeholder="Z" className="h-8 text-sm" value={eMaxZ} onChange={e => setEMaxZ(e.target.value)} />
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                <div>
                                    <span className="text-muted-foreground">{t('fields.zoneName')}: </span>
                                    <span className="font-medium">{sz.zoneName}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">{t('table.gameZone')}: </span>
                                    <span>{sz.gameZoneName ?? '—'}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">{t('fields.shapeType')}: </span>
                                    <Badge variant="outline" className="text-xs">{t(`shapes.${sz.shapeType}`)}</Badge>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">{t('table.mobCount')}: </span>
                                    <Badge variant="secondary" className="text-xs">{(sz as any).mobCount ?? 0}</Badge>
                                </div>
                            </div>

                            {(sz.shapeType === 'CIRCLE' || sz.shapeType === 'ANNULUS') ? (
                                <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-sm bg-muted/30 rounded p-3">
                                    <div><span className="text-muted-foreground text-xs">{t('fields.centerX')}: </span><span className="font-mono text-xs">{sz.centerX}</span></div>
                                    <div><span className="text-muted-foreground text-xs">{t('fields.centerY')}: </span><span className="font-mono text-xs">{sz.centerY}</span></div>
                                    {sz.shapeType === 'ANNULUS' && (
                                        <div><span className="text-muted-foreground text-xs">{t('fields.innerRadius')}: </span><span className="font-mono text-xs">{sz.innerRadius}</span></div>
                                    )}
                                    <div className="col-span-2"><span className="text-muted-foreground text-xs">{t('fields.outerRadius')}: </span><span className="font-mono text-xs">{sz.outerRadius}</span></div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-sm bg-muted/30 rounded p-3">
                                    <div><span className="text-muted-foreground text-xs">{t('fields.minCoords')}: </span><span className="font-mono text-xs">{sz.minSpawnX}, {sz.minSpawnY}, {sz.minSpawnZ}</span></div>
                                    <div className="col-span-2"><span className="text-muted-foreground text-xs">{t('fields.maxCoords')}: </span><span className="font-mono text-xs">{sz.maxSpawnX}, {sz.maxSpawnY}, {sz.maxSpawnZ}</span></div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Mobs Section */}
            <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-base">{t('mobs.title')}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">{t('mobs.description')}</p>
                    </div>
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => setAddMobOpen(!addMobOpen)}>
                        <Plus className="h-3.5 w-3.5" />{t('mobs.addMob')}
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    {addMobOpen && (
                        <div className="px-4 pb-4 space-y-3 border-b border-border">
                            <div className="space-y-1.5">
                                <Label className="text-xs">{t('mobs.fields.mob')}</Label>
                                <Input placeholder={t('mobs.fields.selectMob')} value={mobSearch} onChange={e => { setMobSearch(e.target.value); setSelectedMobId(null) }} />
                                {filteredMobs.length > 0 && !selectedMobId && (
                                    <div className="border rounded-sm bg-popover max-h-40 overflow-y-auto">
                                        {filteredMobs.slice(0, 20).map(m => (
                                            <button key={m.id} className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent flex items-center justify-between"
                                                onClick={() => { setSelectedMobId(m.id); setMobSearch(m.name) }}>
                                                <span className="font-medium">{m.name}</span>
                                                <span className="text-xs text-muted-foreground">Lv{m.level}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {selectedMobId && (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs">{t('mobs.fields.spawnCount')}</Label>
                                            <Input type="number" min={1} className="h-8 text-sm" value={addSpawnCount} onChange={e => setAddSpawnCount(e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">{t('mobs.fields.respawnTime')}</Label>
                                            <Input className="h-8 text-sm font-mono" placeholder="HH:MM:SS" value={addRespawnTime} onChange={e => setAddRespawnTime(e.target.value)} />
                                            <p className="text-xs text-muted-foreground">{t('mobs.fields.respawnTimeHint')}</p>
                                        </div>
                                    </div>
                                    <Button size="sm" className="w-full" disabled={addMobMutation.isPending}
                                        onClick={() => addMobMutation.mutate({ spawnZoneId, mobId: selectedMobId, spawnCount: parseInt(addSpawnCount) || 1, respawnTime: addRespawnTime })}>
                                        <Plus className="h-3.5 w-3.5 mr-1" />{t('mobs.addMob')}
                                    </Button>
                                </>
                            )}
                        </div>
                    )}

                    {!mobsList ? (
                        <div className="p-4 text-sm text-muted-foreground">{tc('loading')}</div>
                    ) : mobsList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                            <Skull className="h-8 w-8 opacity-30" />
                            <p className="text-sm">{t('mobs.noMobs')}</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('mobs.table.mob')}</TableHead>
                                    <TableHead className="w-20 text-center">{t('mobs.table.level')}</TableHead>
                                    <TableHead className="w-20 text-center">{t('mobs.table.spawnCount')}</TableHead>
                                    <TableHead className="w-28 text-center">{t('mobs.table.respawnTime')}</TableHead>
                                    <TableHead className="w-20 text-right">{t('mobs.table.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {mobsList.map(entry => (
                                    <TableRow key={entry.id}>
                                        <TableCell className="font-medium">{entry.mobName ?? `Mob #${entry.mobId}`}</TableCell>
                                        <TableCell className="text-center text-sm text-muted-foreground">{entry.mobLevel}</TableCell>
                                        {editingMobId === entry.id ? (
                                            <>
                                                <TableCell>
                                                    <Input type="number" min={1} className="h-7 text-xs w-16 mx-auto" value={editCount} onChange={e => setEditCount(e.target.value)} />
                                                </TableCell>
                                                <TableCell>
                                                    <Input className="h-7 text-xs font-mono w-24 mx-auto" value={editTime} onChange={e => setEditTime(e.target.value)} />
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateMobMutation.mutate({ id: entry.id, spawnCount: parseInt(editCount) || 1, respawnTime: editTime })}>
                                                            <Check className="h-3.5 w-3.5 text-green-500" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingMobId(null)}>
                                                            <X className="h-3.5 w-3.5 text-muted-foreground" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </>
                                        ) : (
                                            <>
                                                <TableCell className="text-center text-sm tabular-nums">x{entry.spawnCount}</TableCell>
                                                <TableCell className="text-center font-mono text-xs tabular-nums">{entry.respawnTime}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7"
                                                            onClick={() => { setEditingMobId(entry.id); setEditCount(String(entry.spawnCount)); setEditTime(entry.respawnTime) }}>
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                                                            onClick={() => removeMobMutation.mutate({ id: entry.id })}>
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

            <div className="flex justify-end">
                <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => setDeleteConfirm(true)}>
                    <Trash2 className="h-4 w-4" />{tc('delete')}
                </Button>
            </div>

            <Dialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('deleteTitle', { name: sz.zoneName })}</DialogTitle>
                        <DialogDescription>{t('deleteDescription')}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirm(false)}>{tc('cancel')}</Button>
                        <Button variant="destructive" disabled={deleteMutation.isPending}
                            onClick={() => deleteMutation.mutate({ spawnZoneId })}>
                            {deleteMutation.isPending ? '…' : tc('delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
