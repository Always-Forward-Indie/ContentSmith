'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { ArrowLeft, Map, Trash2, Pencil, Check, X, ExternalLink, AlertCircle } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import type { SpawnZoneShape } from '@contentsmith/validation'

export default function ClassSpawnZoneDetailPage() {
    const { id } = useParams<{ id: string }>()
    const locale = useLocale()
    const tc = useTranslations('common')
    const classSpawnZoneId = Number(id)

    const [editing, setEditing] = useState(false)
    const [eClassId, setEClassId] = useState<number>(0)
    const [eZoneId, setEZoneId] = useState<number | null>(null)
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
    const [deleteConfirm, setDeleteConfirm] = useState(false)

    const { data: csz, isLoading, error, refetch } = trpc.zones.listClassSpawnZones.useQuery({ page: 1, pageSize: 100 })
    const { data: classList } = trpc.classes.list.useQuery({ page: 1, pageSize: 200 })
    const { data: zonesData } = trpc.zones.list.useQuery({ page: 1, pageSize: 200 })
    const classOptions = classList?.data ?? []
    const zoneOptions = zonesData?.data ?? []

    const found = (csz?.data ?? []).find(c => c.id === classSpawnZoneId) as any

    const updateMutation = trpc.zones.updateClassSpawnZone.useMutation({
        onSuccess: () => { toast.success('Class spawn zone updated'); setEditing(false); refetch() },
        onError: (e) => toast.error(e.message),
    })
    const deleteMutation = trpc.zones.deleteClassSpawnZone.useMutation({
        onSuccess: () => { toast.success('Deleted'); window.location.href = `/${locale}/class-spawn-zones` },
        onError: (e) => toast.error(e.message),
    })

    function startEdit() {
        if (!found) return
        setEClassId(found.classId)
        setEZoneId(found.zoneId)
        setEMinX(String(found.minX))
        setEMinY(String(found.minY))
        setEMinZ(String(found.minZ))
        setEMaxX(String(found.maxX))
        setEMaxY(String(found.maxY))
        setEMaxZ(String(found.maxZ))
        setEShapeType(found.shapeType as SpawnZoneShape)
        setECenterX(String(found.centerX))
        setECenterY(String(found.centerY))
        setEInnerRadius(String(found.innerRadius))
        setEOuterRadius(String(found.outerRadius))
        setEditing(true)
    }

    function handleSave() {
        updateMutation.mutate({
            id: classSpawnZoneId,
            classId: eClassId,
            zoneId: eZoneId,
            minX: Number(eMinX), maxX: Number(eMaxX),
            minY: Number(eMinY), maxY: Number(eMaxY),
            minZ: Number(eMinZ), maxZ: Number(eMaxZ),
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
            <Button variant="outline" asChild><Link href={`/${locale}/class-spawn-zones`}><ArrowLeft className="h-4 w-4 mr-1" />Back</Link></Button>
        </div>
    )

    if (isLoading || !found) return (
        <div className="space-y-6 max-w-xl">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-64" />
        </div>
    )

    return (
        <div className="space-y-6 max-w-xl">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" asChild className="shrink-0">
                    <Link href={`/${locale}/class-spawn-zones`}><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                        <Map className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold tracking-tight">{editing ? 'Edit' : found.className ?? `Class #${found.classId}`}</h1>
                        <p className="text-sm text-muted-foreground">{editing ? 'Update class spawn zone' : `ID: ${found.id}`}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 ml-auto">
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="View on map">
                        <Link href={`/${locale}/maps?focus=classSpawnZone:${classSpawnZoneId}`} target="_blank">
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

            <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Class Spawn Zone</CardTitle>
                    {editing && (
                        <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(false)}><X className="h-3.5 w-3.5 mr-1" />{tc('cancel')}</Button>
                            <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={updateMutation.isPending}><Check className="h-3.5 w-3.5 mr-1" />{tc('save')}</Button>
                        </div>
                    )}
                </CardHeader>
                <CardContent className="space-y-4">
                    {editing ? (
                        <>
                            <div className="space-y-1.5">
                                <Label>Class</Label>
                                <Select value={String(eClassId)} onValueChange={v => setEClassId(Number(v))}>
                                    <SelectTrigger><SelectValue placeholder="Select class..." /></SelectTrigger>
                                    <SelectContent>
                                        {classOptions.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Game Zone</Label>
                                <Select value={eZoneId != null ? String(eZoneId) : ''} onValueChange={v => setEZoneId(v ? Number(v) : null)}>
                                    <SelectTrigger><SelectValue placeholder="Select zone..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">— None —</SelectItem>
                                        {zoneOptions.map(z => <SelectItem key={z.id} value={String(z.id)}>{z.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Shape</Label>
                                <Select value={eShapeType} onValueChange={v => setEShapeType(v as SpawnZoneShape)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="RECT">Rectangle</SelectItem>
                                        <SelectItem value="CIRCLE">Circle</SelectItem>
                                        <SelectItem value="ANNULUS">Ring</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {(eShapeType === 'CIRCLE' || eShapeType === 'ANNULUS') && (
                                <Card className="bg-muted/30">
                                    <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-sm">Shape Parameters</CardTitle></CardHeader>
                                    <CardContent className="space-y-3 px-4 pb-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1"><Label className="text-xs">Center X</Label><Input type="number" step="any" className="h-8 text-sm" value={eCenterX} onChange={e => setECenterX(e.target.value)} /></div>
                                            <div className="space-y-1"><Label className="text-xs">Center Y</Label><Input type="number" step="any" className="h-8 text-sm" value={eCenterY} onChange={e => setECenterY(e.target.value)} /></div>
                                        </div>
                                        {eShapeType === 'ANNULUS' && <div className="space-y-1"><Label className="text-xs">Inner Radius</Label><Input type="number" min={0} step="any" className="h-8 text-sm" value={eInnerRadius} onChange={e => setEInnerRadius(e.target.value)} /></div>}
                                        <div className="space-y-1"><Label className="text-xs">Outer Radius</Label><Input type="number" min={0} step="any" className="h-8 text-sm" value={eOuterRadius} onChange={e => setEOuterRadius(e.target.value)} /></div>
                                    </CardContent>
                                </Card>
                            )}
                            {eShapeType === 'RECT' && (
                                <>
                                    <p className="text-xs text-muted-foreground">Min Coords (X / Y / Z)</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        <Input type="number" step="any" placeholder="X" className="h-8 text-sm" value={eMinX} onChange={e => setEMinX(e.target.value)} />
                                        <Input type="number" step="any" placeholder="Y" className="h-8 text-sm" value={eMinY} onChange={e => setEMinY(e.target.value)} />
                                        <Input type="number" step="any" placeholder="Z" className="h-8 text-sm" value={eMinZ} onChange={e => setEMinZ(e.target.value)} />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">Max Coords (X / Y / Z)</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        <Input type="number" step="any" placeholder="X" className="h-8 text-sm" value={eMaxX} onChange={e => setEMaxX(e.target.value)} />
                                        <Input type="number" step="any" placeholder="Y" className="h-8 text-sm" value={eMaxY} onChange={e => setEMaxY(e.target.value)} />
                                        <Input type="number" step="any" placeholder="Z" className="h-8 text-sm" value={eMaxZ} onChange={e => setEMaxZ(e.target.value)} />
                                    </div>
                                </>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                <div><span className="text-muted-foreground">Class: </span><span className="font-medium">{found.className ?? `#${found.classId}`}</span></div>
                                <div><span className="text-muted-foreground">Shape: </span><Badge variant="outline" className="text-xs">{found.shapeType}</Badge></div>
                            </div>
                            {found.shapeType === 'CIRCLE' || found.shapeType === 'ANNULUS' ? (
                                <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-sm bg-muted/30 rounded p-3">
                                    <div><span className="text-muted-foreground text-xs">Center: </span><span className="font-mono text-xs">{found.centerX}, {found.centerY}</span></div>
                                    <div><span className="text-muted-foreground text-xs">Outer R: </span><span className="font-mono text-xs">{found.outerRadius}</span></div>
                                    {found.shapeType === 'ANNULUS' && <div><span className="text-muted-foreground text-xs">Inner R: </span><span className="font-mono text-xs">{found.innerRadius}</span></div>}
                                </div>
                            ) : (
                                <div className="bg-muted/30 rounded p-3">
                                    <div className="text-xs text-muted-foreground mb-1">Min/Max (X/Y/Z):</div>
                                    <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                                        <div>Min: {found.minX}, {found.minY}, {found.minZ}</div>
                                        <div>Max: {found.maxX}, {found.maxY}, {found.maxZ}</div>
                                    </div>
                                </div>
                            )}
                        </>
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
                        <DialogTitle>Delete class spawn zone?</DialogTitle>
                        <DialogDescription>{tc('confirmDelete')}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirm(false)}>{tc('cancel')}</Button>
                        <Button variant="destructive" disabled={deleteMutation.isPending}
                            onClick={() => deleteMutation.mutate({ id: classSpawnZoneId })}>
                            {deleteMutation.isPending ? '…' : tc('delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
