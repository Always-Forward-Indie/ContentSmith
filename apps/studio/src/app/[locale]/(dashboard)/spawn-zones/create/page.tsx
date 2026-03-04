'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MapPin } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

export default function CreateSpawnZonePage() {
    const locale = useLocale()
    const router = useRouter()
    const t = useTranslations('spawnZones')
    const tc = useTranslations('common')

    const [zoneName, setZoneName] = useState('')
    const [gameZoneId, setGameZoneId] = useState<string>('')
    const [minX, setMinX] = useState('0')
    const [minY, setMinY] = useState('0')
    const [minZ, setMinZ] = useState('0')
    const [maxX, setMaxX] = useState('0')
    const [maxY, setMaxY] = useState('0')
    const [maxZ, setMaxZ] = useState('0')

    const { data: gameZonesData } = trpc.zones.list.useQuery({ pageSize: 100 })
    const gameZones = gameZonesData?.data ?? []

    const create = trpc.zones.createSpawnZone.useMutation({
        onSuccess: (result) => {
            toast.success(t('spawnZoneCreated'))
            router.push(`/${locale}/spawn-zones/${result.zoneId}/edit`)
        },
    })

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        create.mutate({
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

    return (
        <div className="space-y-6 max-w-xl">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" asChild className="shrink-0">
                    <Link href={`/${locale}/spawn-zones`}><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                        <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{t('createTitle')}</h1>
                        <p className="text-sm text-muted-foreground">{t('createSubtitle')}</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">{tc('general')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="zoneName">{t('fields.zoneName')}</Label>
                            <Input
                                id="zoneName"
                                value={zoneName}
                                onChange={e => setZoneName(e.target.value)}
                                placeholder="Foxes Nest"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="gameZone">{t('fields.gameZone')}</Label>
                            <Select value={gameZoneId} onValueChange={setGameZoneId}>
                                <SelectTrigger id="gameZone">
                                    <SelectValue placeholder={t('fields.selectGameZone')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {gameZones.map(z => (
                                        <SelectItem key={z.id} value={String(z.id)}>
                                            {z.name}
                                        </SelectItem>
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
                    <Button type="submit" disabled={create.isPending || !zoneName}>
                        {create.isPending ? tc('saving') : tc('create')}
                    </Button>
                    <Button type="button" variant="outline" asChild>
                        <Link href={`/${locale}/spawn-zones`}>{tc('cancel')}</Link>
                    </Button>
                </div>
            </form>
        </div>
    )
}
