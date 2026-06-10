'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Map } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import type { SpawnZoneShape } from '@contentsmith/validation'

export default function CreateClassSpawnZonePage() {
    const locale = useLocale()
    const router = useRouter()
    const tc = useTranslations('common')

    const [classId, setClassId] = useState<number | ''>('')
    const [zoneId, setZoneId] = useState<number | null>(null)
    const [minX, setMinX] = useState('0')
    const [minY, setMinY] = useState('0')
    const [minZ, setMinZ] = useState('0')
    const [maxX, setMaxX] = useState('0')
    const [maxY, setMaxY] = useState('0')
    const [maxZ, setMaxZ] = useState('0')
    const [shapeType, setShapeType] = useState<SpawnZoneShape>('RECT')
    const [centerX, setCenterX] = useState('0')
    const [centerY, setCenterY] = useState('0')
    const [innerRadius, setInnerRadius] = useState('0')
    const [outerRadius, setOuterRadius] = useState('0')

    const { data: classList } = trpc.classes.list.useQuery({ page: 1, pageSize: 200 })
    const { data: zonesData } = trpc.zones.list.useQuery({ page: 1, pageSize: 200 })
    const classOptions = classList?.data ?? []
    const zoneOptions = zonesData?.data ?? []

    const create = trpc.zones.createClassSpawnZone.useMutation({
        onSuccess: (data) => {
            toast.success('Class spawn zone created')
            router.push(`/${locale}/class-spawn-zones/${data.id}`)
        },
        onError: (e) => toast.error(e.message),
    })

    function handleSubmit() {
        if (!classId) return
        create.mutate({
            classId: Number(classId),
            zoneId: zoneId ?? null,
            minX: Number(minX), maxX: Number(maxX),
            minY: Number(minY), maxY: Number(maxY),
            minZ: Number(minZ), maxZ: Number(maxZ),
            shapeType,
            centerX: Number(centerX),
            centerY: Number(centerY),
            innerRadius: Number(innerRadius),
            outerRadius: Number(outerRadius),
        })
    }

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
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">New Class Spawn Zone</h1>
                        <p className="text-sm text-muted-foreground">Define a class spawn area</p>
                    </div>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Class Spawn</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                        <Label>Class *</Label>
                        <Select value={classId === '' ? '' : String(classId)} onValueChange={v => setClassId(v ? Number(v) : '')}>
                            <SelectTrigger><SelectValue placeholder="Select a class..." /></SelectTrigger>
                            <SelectContent>
                                {classOptions.map(c => (
                                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label>Game Zone (optional)</Label>
                        <Select value={zoneId != null ? String(zoneId) : ''} onValueChange={v => setZoneId(v ? Number(v) : null)}>
                            <SelectTrigger><SelectValue placeholder="Select a game zone..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">— None —</SelectItem>
                                {zoneOptions.map(z => (
                                    <SelectItem key={z.id} value={String(z.id)}>{z.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label>Shape</Label>
                        <Select value={shapeType} onValueChange={v => setShapeType(v as SpawnZoneShape)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="RECT">Rectangle</SelectItem>
                                <SelectItem value="CIRCLE">Circle</SelectItem>
                                <SelectItem value="ANNULUS">Ring (Annulus)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {(shapeType === 'CIRCLE' || shapeType === 'ANNULUS') && (
                        <Card className="bg-muted/30">
                            <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-sm">Shape Parameters</CardTitle></CardHeader>
                            <CardContent className="space-y-3 px-4 pb-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1"><Label className="text-xs">Center X</Label><Input type="number" step="any" className="h-8 text-sm" value={centerX} onChange={e => setCenterX(e.target.value)} /></div>
                                    <div className="space-y-1"><Label className="text-xs">Center Y</Label><Input type="number" step="any" className="h-8 text-sm" value={centerY} onChange={e => setCenterY(e.target.value)} /></div>
                                </div>
                                {shapeType === 'ANNULUS' && (
                                    <div className="space-y-1"><Label className="text-xs">Inner Radius</Label><Input type="number" min={0} step="any" className="h-8 text-sm" value={innerRadius} onChange={e => setInnerRadius(e.target.value)} /></div>
                                )}
                                <div className="space-y-1"><Label className="text-xs">Outer Radius</Label><Input type="number" min={0} step="any" className="h-8 text-sm" value={outerRadius} onChange={e => setOuterRadius(e.target.value)} /></div>
                            </CardContent>
                        </Card>
                    )}

                    {shapeType === 'RECT' && (
                        <>
                            <p className="text-xs text-muted-foreground">Min Coords (X / Y / Z)</p>
                            <div className="grid grid-cols-3 gap-2">
                                <Input type="number" step="any" placeholder="X" className="h-8 text-sm" value={minX} onChange={e => setMinX(e.target.value)} />
                                <Input type="number" step="any" placeholder="Y" className="h-8 text-sm" value={minY} onChange={e => setMinY(e.target.value)} />
                                <Input type="number" step="any" placeholder="Z" className="h-8 text-sm" value={minZ} onChange={e => setMinZ(e.target.value)} />
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">Max Coords (X / Y / Z)</p>
                            <div className="grid grid-cols-3 gap-2">
                                <Input type="number" step="any" placeholder="X" className="h-8 text-sm" value={maxX} onChange={e => setMaxX(e.target.value)} />
                                <Input type="number" step="any" placeholder="Y" className="h-8 text-sm" value={maxY} onChange={e => setMaxY(e.target.value)} />
                                <Input type="number" step="any" placeholder="Z" className="h-8 text-sm" value={maxZ} onChange={e => setMaxZ(e.target.value)} />
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
                <Button variant="outline" asChild><Link href={`/${locale}/class-spawn-zones`}>{tc('cancel')}</Link></Button>
                <Button disabled={!classId || create.isPending} onClick={handleSubmit}>
                    {create.isPending ? tc('saving') : tc('create')}
                </Button>
            </div>
        </div>
    )
}
