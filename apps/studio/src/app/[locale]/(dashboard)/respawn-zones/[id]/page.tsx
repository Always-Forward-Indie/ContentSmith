'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { ArrowLeft, Map, Plus, Trash2, Edit, Pencil, Check, X, ExternalLink, AlertCircle } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

export default function RespawnZoneDetailPage() {
    const { id } = useParams<{ id: string }>()
    const locale = useLocale()
    const t = useTranslations('respawnZones')
    const tc = useTranslations('common')
    const respawnZoneId = Number(id)

    const [editing, setEditing] = useState(false)
    const [eName, setEName] = useState('')
    const [eX, setEX] = useState('0')
    const [eY, setEY] = useState('0')
    const [eZ, setEZ] = useState('0')
    const [eZoneId, setEZoneId] = useState<number>(1)
    const [eIsDefault, setEIsDefault] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState(false)

    const { data: rz, isLoading, error, refetch } = trpc.respawnZones.getById.useQuery({ id: respawnZoneId })
    const { data: zonesData } = trpc.zones.list.useQuery({ page: 1, pageSize: 200 })

    const updateMutation = trpc.respawnZones.update.useMutation({
        onSuccess: () => { toast.success(t('updateSuccess')); setEditing(false); refetch() },
        onError: (e) => toast.error(e.message),
    })
    const deleteMutation = trpc.respawnZones.delete.useMutation({
        onSuccess: () => { toast.success(t('deleteSuccess')); window.location.href = `/${locale}/respawn-zones` },
        onError: (e) => toast.error(e.message),
    })

    const zoneOptions = zonesData?.data ?? []

    function startEdit() {
        if (!rz) return
        setEName(rz.name)
        setEX(String(rz.x))
        setEY(String(rz.y))
        setEZ(String(rz.z))
        setEZoneId(rz.zoneId)
        setEIsDefault(rz.isDefault)
        setEditing(true)
    }

    function handleSave() {
        updateMutation.mutate({
            id: respawnZoneId,
            name: eName,
            x: Number(eX),
            y: Number(eY),
            z: Number(eZ),
            zoneId: eZoneId,
            isDefault: eIsDefault,
        })
    }

    if (error) return (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
            <AlertCircle className="h-10 w-10 text-destructive/70" />
            <p className="text-destructive font-medium">Error: {error.message}</p>
            <Button variant="outline" asChild><Link href={`/${locale}/respawn-zones`}><ArrowLeft className="h-4 w-4 mr-1" />{tc('back')}</Link></Button>
        </div>
    )

    if (isLoading || !rz) return (
        <div className="space-y-6 max-w-xl">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-48" />
        </div>
    )

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
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold tracking-tight">{editing ? t('editZone') : rz.name}</h1>
                        <p className="text-sm text-muted-foreground">
                            {editing ? t('deleteTitle') : `ID: ${rz.id}${rz.isDefault ? ' · Default' : ''}`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1 ml-auto">
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="View on map">
                        <Link href={`/${locale}/maps?focus=respawn:${respawnZoneId}`} target="_blank">
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
                    <CardTitle className="text-base">{t('editZone')}</CardTitle>
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
                                <Label>{t('name')}</Label>
                                <Input value={eName} onChange={e => setEName(e.target.value)} />
                            </div>

                            <div className="space-y-1.5">
                                <Label>{t('zone')}</Label>
                                <Select value={String(eZoneId)} onValueChange={v => setEZoneId(Number(v))}>
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
                                    <Input type="number" step="any" placeholder="X" className="h-8 text-sm" value={eX} onChange={e => setEX(e.target.value)} />
                                    <Input type="number" step="any" placeholder="Y" className="h-8 text-sm" value={eY} onChange={e => setEY(e.target.value)} />
                                    <Input type="number" step="any" placeholder="Z" className="h-8 text-sm" value={eZ} onChange={e => setEZ(e.target.value)} />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                                <Switch checked={eIsDefault} onCheckedChange={setEIsDefault} id="default-switch" />
                                <Label htmlFor="default-switch">{t('isDefault')}</Label>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                <div>
                                    <span className="text-muted-foreground">{t('name')}: </span>
                                    <span className="font-medium">{rz.name}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">{t('zoneName')}: </span>
                                    <span>{(rz as any).zoneName ?? t('zone') + ' #' + rz.zoneId}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">{t('isDefault')}: </span>
                                    {rz.isDefault ? <Badge variant="secondary" className="text-xs">Default</Badge> : <span className="text-muted-foreground">—</span>}
                                </div>
                            </div>

                            <div className="bg-muted/30 rounded p-3">
                                <p className="text-xs text-muted-foreground mb-1">{t('positionX')} / {t('positionY')} / {t('positionZ')}:</p>
                                <p className="font-mono text-sm tabular-nums">
                                    X: {rz.x} &nbsp; Y: {rz.y} &nbsp; Z: {rz.z}
                                </p>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <div className="flex justify-between">
                <Button variant="outline" size="sm" asChild>
                    <Link href={`/${locale}/respawn-zones`}><ArrowLeft className="h-4 w-4 mr-1" />{tc('back')}</Link>
                </Button>
                <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => setDeleteConfirm(true)}>
                    <Trash2 className="h-4 w-4" />{tc('delete')}
                </Button>
            </div>

            <Dialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('deleteConfirmDescription', { name: rz.name })}</DialogTitle>
                        <DialogDescription>{tc('confirmDelete')}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirm(false)}>{tc('cancel')}</Button>
                        <Button variant="destructive" disabled={deleteMutation.isPending}
                            onClick={() => deleteMutation.mutate({ id: respawnZoneId })}>
                            {deleteMutation.isPending ? '…' : tc('delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
