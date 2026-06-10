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
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

export default function CreateRespawnZonePage() {
    const locale = useLocale()
    const router = useRouter()
    const t = useTranslations('respawnZones')
    const tc = useTranslations('common')

    const [name, setName] = useState('')
    const [x, setX] = useState('0')
    const [y, setY] = useState('0')
    const [z, setZ] = useState('0')
    const [zoneId, setZoneId] = useState<number | ''>(1)
    const [isDefault, setIsDefault] = useState(false)

    const { data: zonesData } = trpc.zones.list.useQuery({ page: 1, pageSize: 200 })
    const zoneOptions = zonesData?.data ?? []

    const create = trpc.respawnZones.create.useMutation({
        onSuccess: (data) => {
            toast.success(t('createSuccess'))
            router.push(`/${locale}/respawn-zones/${data.id}`)
        },
        onError: (e) => toast.error(e.message),
    })

    function handleSubmit() {
        if (!name.trim()) return
        create.mutate({
            name: name.trim(),
            x: Number(x),
            y: Number(y),
            z: Number(z),
            zoneId: zoneId === '' ? 1 : Number(zoneId),
            isDefault,
        })
    }

    return (
        <div className="space-y-6 max-w-xl">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" asChild className="shrink-0">
                    <Link href={`/${locale}/respawn-zones`}><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                        <Map className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{t('createNew')}</h1>
                        <p className="text-sm text-muted-foreground">{t('description')}</p>
                    </div>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">{t('name')}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                        <Label>{t('name')}</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Graveyard" />
                    </div>

                    <div className="space-y-1.5">
                        <Label>{t('zone')}</Label>
                        <Select value={zoneId === '' ? '' : String(zoneId)} onValueChange={v => setZoneId(v ? Number(v) : '')}>
                            <SelectTrigger><SelectValue placeholder={t('selectZone')} /></SelectTrigger>
                            <SelectContent>
                                {zoneOptions.map(z => (
                                    <SelectItem key={z.id} value={String(z.id)}>{z.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label>{t('positionX')} / {t('positionY')} / {t('positionZ')}</Label>
                        <div className="grid grid-cols-3 gap-2">
                            <Input type="number" step="any" placeholder="X" className="h-8 text-sm" value={x} onChange={e => setX(e.target.value)} />
                            <Input type="number" step="any" placeholder="Y" className="h-8 text-sm" value={y} onChange={e => setY(e.target.value)} />
                            <Input type="number" step="any" placeholder="Z" className="h-8 text-sm" value={z} onChange={e => setZ(e.target.value)} />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                        <Switch checked={isDefault} onCheckedChange={setIsDefault} id="default-switch" />
                        <Label htmlFor="default-switch">{t('isDefault')}</Label>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
                <Button variant="outline" asChild><Link href={`/${locale}/respawn-zones`}>{tc('cancel')}</Link></Button>
                <Button disabled={!name.trim() || create.isPending} onClick={handleSubmit}>
                    {create.isPending ? tc('saving') : tc('create')}
                </Button>
            </div>
        </div>
    )
}
