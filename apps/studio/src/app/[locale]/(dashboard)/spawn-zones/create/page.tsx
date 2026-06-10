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

export default function CreateSpawnZonePage() {
    const locale = useLocale()
    const router = useRouter()
    const t = useTranslations('spawnZones')
    const tc = useTranslations('common')

    const [zoneName, setZoneName] = useState('')
    const [gameZoneId, setGameZoneId] = useState<number | null>(null)
    const [exclusionGameZoneId, setExclusionGameZoneId] = useState<number | null>(null)
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

    const { data: zonesData } = trpc.zones.list.useQuery({ page: 1, pageSize: 200 })
    const zoneOptions = zonesData?.data ?? []

    const create = trpc.zones.createSpawnZone.useMutation({
        onSuccess: (data) => {
            toast.success(t('spawnZoneCreated'))
            router.push(`/${locale}/spawn-zones/${data.zoneId}`)
        },
        onError: (e) => toast.error(e.message),
    })

    function handleSubmit() {
        if (!zoneName.trim()) return
        create.mutate({
            zoneName: zoneName.trim(),
            gameZoneId: gameZoneId ?? null,
            exclusionGameZoneId: exclusionGameZoneId ?? null,
            minSpawnX: Number(minX), minSpawnY: Number(minY), minSpawnZ: Number(minZ),
            maxSpawnX: Number(maxX), maxSpawnY: Number(maxY), maxSpawnZ: Number(maxZ),
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
                    <Link href={`/${locale}/spawn-zones`}><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                        <Map className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{t('createTitle')}</h1>
                        <p className="text-sm text-muted-foreground">{t('createSubtitle')}</p>
                    </div>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">{t('fields.zoneName')}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                        <Label>{t('fields.zoneName')}</Label>
                        <Input value={zoneName} onChange={e => setZoneName(e.target.value)} placeholder="Wolf Den" />
                    </div>

                    <div className="space-y-1.5">
                        <Label>{t('fields.gameZone')}</Label>
                        <Select value={gameZoneId != null ? String(gameZoneId) : ''} onValueChange={v => setGameZoneId(v ? Number(v) : null)}>
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
                        <Select value={exclusionGameZoneId != null ? String(exclusionGameZoneId) : ''} onValueChange={v => setExclusionGameZoneId(v ? Number(v) : null)}>
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
                        <Select value={shapeType} onValueChange={v => setShapeType(v as SpawnZoneShape)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="RECT">{t('shapes.RECT')}</SelectItem>
                                <SelectItem value="CIRCLE">{t('shapes.CIRCLE')}</SelectItem>
                                <SelectItem value="ANNULUS">{t('shapes.ANNULUS')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {(shapeType === 'CIRCLE' || shapeType === 'ANNULUS') && (
                        <Card className="bg-muted/30">
                            <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-sm">{t('fields.shapeParams')}</CardTitle></CardHeader>
                            <CardContent className="space-y-3 px-4 pb-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs">{t('fields.centerX')}</Label>
                                        <Input type="number" step="any" className="h-8 text-sm" value={centerX} onChange={e => setCenterX(e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">{t('fields.centerY')}</Label>
                                        <Input type="number" step="any" className="h-8 text-sm" value={centerY} onChange={e => setCenterY(e.target.value)} />
                                    </div>
                                </div>
                                {shapeType === 'ANNULUS' && (
                                    <div className="space-y-1">
                                        <Label className="text-xs">{t('fields.innerRadius')}</Label>
                                        <Input type="number" min={0} step="any" className="h-8 text-sm" value={innerRadius} onChange={e => setInnerRadius(e.target.value)} />
                                    </div>
                                )}
                                <div className="space-y-1">
                                    <Label className="text-xs">{t('fields.outerRadius')}</Label>
                                    <Input type="number" min={0} step="any" className="h-8 text-sm" value={outerRadius} onChange={e => setOuterRadius(e.target.value)} />
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {shapeType === 'RECT' && (
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium">{t('fields.coordinates')}</Label>
                            <p className="text-xs text-muted-foreground">{t('fields.minCoords')}</p>
                            <div className="grid grid-cols-3 gap-2">
                                <Input type="number" step="any" placeholder="X" className="h-8 text-sm" value={minX} onChange={e => setMinX(e.target.value)} />
                                <Input type="number" step="any" placeholder="Y" className="h-8 text-sm" value={minY} onChange={e => setMinY(e.target.value)} />
                                <Input type="number" step="any" placeholder="Z" className="h-8 text-sm" value={minZ} onChange={e => setMinZ(e.target.value)} />
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">{t('fields.maxCoords')}</p>
                            <div className="grid grid-cols-3 gap-2">
                                <Input type="number" step="any" placeholder="X" className="h-8 text-sm" value={maxX} onChange={e => setMaxX(e.target.value)} />
                                <Input type="number" step="any" placeholder="Y" className="h-8 text-sm" value={maxY} onChange={e => setMaxY(e.target.value)} />
                                <Input type="number" step="any" placeholder="Z" className="h-8 text-sm" value={maxZ} onChange={e => setMaxZ(e.target.value)} />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
                <Button variant="outline" asChild><Link href={`/${locale}/spawn-zones`}>{tc('cancel')}</Link></Button>
                <Button disabled={!zoneName.trim() || create.isPending} onClick={handleSubmit}>
                    {create.isPending ? tc('saving') : tc('create')}
                </Button>
            </div>
        </div>
    )
}
