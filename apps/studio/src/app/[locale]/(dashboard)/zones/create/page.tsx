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
import { toast } from 'sonner'

function slugify(str: string) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

export default function CreateZonePage() {
    const locale = useLocale()
    const router = useRouter()
    const t = useTranslations('zones')
    const tc = useTranslations('common')

    const [name, setName] = useState('')
    const [slug, setSlug] = useState('')
    const [slugEdited, setSlugEdited] = useState(false)
    const [minLevel, setMinLevel] = useState('1')
    const [maxLevel, setMaxLevel] = useState('999')
    const [isPvp, setIsPvp] = useState(false)
    const [isSafeZone, setIsSafeZone] = useState(false)
    const [minX, setMinX] = useState('0')
    const [maxX, setMaxX] = useState('0')
    const [minY, setMinY] = useState('0')
    const [maxY, setMaxY] = useState('0')
    const [explorationXp, setExplorationXp] = useState('100')
    const [championKills, setChampionKills] = useState('100')

    const create = trpc.zones.create.useMutation({
        onSuccess: data => {
            toast.success(t('zoneCreated'))
            router.push(`/${locale}/zones/${data.id}`)
        }
    })

    function handleNameChange(val: string) {
        setName(val)
        if (!slugEdited) setSlug(slugify(val))
    }

    return (
        <div className="space-y-6 max-w-xl">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" asChild className="shrink-0">
                    <Link href={`/${locale}/zones`}><ArrowLeft className="h-4 w-4" /></Link>
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
                <CardHeader className="pb-3"><CardTitle className="text-base">{t('zoneInfo')}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                        <Label>{t('fields.name')}</Label>
                        <Input value={name} onChange={e => handleNameChange(e.target.value)} placeholder="Dark Forest" />
                    </div>
                    <div className="space-y-1.5">
                        <Label>{t('fields.slug')}</Label>
                        <Input value={slug} onChange={e => { setSlug(e.target.value); setSlugEdited(true) }} placeholder="dark_forest" className="font-mono text-sm" />
                        <p className="text-xs text-muted-foreground">{t('slugHint')}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>{t('fields.minLevel')}</Label>
                            <Input type="number" min={1} value={minLevel} onChange={e => setMinLevel(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t('fields.maxLevel')}</Label>
                            <Input type="number" min={1} value={maxLevel} onChange={e => setMaxLevel(e.target.value)} />
                        </div>
                    </div>

                    <div className="flex items-center gap-8 pt-1">
                        <div className="flex items-center gap-2">
                            <Switch checked={isPvp} onCheckedChange={setIsPvp} id="pvp-switch" />
                            <Label htmlFor="pvp-switch">{t('fields.pvpZone')}</Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch checked={isSafeZone} onCheckedChange={setIsSafeZone} id="safe-switch" />
                            <Label htmlFor="safe-switch">{t('fields.safeZone')}</Label>
                        </div>
                    </div>

                    {/* Boundaries */}
                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium">{t('boundaries')}</Label>
                        <p className="text-xs text-muted-foreground">{t('boundariesDescription')}</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs">{t('fields.minX')}</Label>
                                <Input type="number" value={minX} onChange={e => setMinX(e.target.value)} className="h-8 text-sm" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">{t('fields.maxX')}</Label>
                                <Input type="number" value={maxX} onChange={e => setMaxX(e.target.value)} className="h-8 text-sm" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">{t('fields.minY')}</Label>
                                <Input type="number" value={minY} onChange={e => setMinY(e.target.value)} className="h-8 text-sm" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">{t('fields.maxY')}</Label>
                                <Input type="number" value={maxY} onChange={e => setMaxY(e.target.value)} className="h-8 text-sm" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>{t('fields.explorationXpReward')}</Label>
                            <Input type="number" min={0} value={explorationXp} onChange={e => setExplorationXp(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t('fields.championThresholdKills')}</Label>
                            <Input type="number" min={0} value={championKills} onChange={e => setChampionKills(e.target.value)} />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
                <Button variant="outline" asChild><Link href={`/${locale}/zones`}>{tc('cancel')}</Link></Button>
                <Button disabled={!name || !slug || create.isPending}
                    onClick={() => create.mutate({
                        name, slug,
                        minLevel: Number(minLevel), maxLevel: Number(maxLevel),
                        isPvp, isSafeZone,
                        minX: Number(minX), maxX: Number(maxX),
                        minY: Number(minY), maxY: Number(maxY),
                        explorationXpReward: Number(explorationXp),
                        championThresholdKills: Number(championKills),
                    })}>
                    {create.isPending ? t('creating') : t('createZone')}
                </Button>
            </div>
        </div>
    )
}
