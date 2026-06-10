'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { Map, Plus, Trash2, Edit, AlertCircle, Search, X, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'

interface RespawnZoneItem {
    id: number
    name: string
    x: number
    y: number
    z: number
    zoneId: number
    isDefault: boolean
    zoneName: string | null
}

export default function RespawnZonesPage() {
    const locale = useLocale()
    const t = useTranslations('respawnZones')
    const tc = useTranslations('common')
    const [deleteTarget, setDeleteTarget] = useState<RespawnZoneItem | null>(null)
    const [searchInput, setSearchInput] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [page, setPage] = useState(1)

    useEffect(() => {
        const timer = setTimeout(() => { setSearchTerm(searchInput); setPage(1) }, 350)
        return () => clearTimeout(timer)
    }, [searchInput])

    const { data, isLoading, error, refetch } = trpc.respawnZones.list.useQuery({
        search: searchTerm || undefined,
        page,
        pageSize: 20,
    })
    const deleteRespawnZone = trpc.respawnZones.delete.useMutation({
        onSuccess: () => { toast.success(t('deleteSuccess')); refetch(); setDeleteTarget(null) }
    })

    const respawnList = (data?.data ?? []) as RespawnZoneItem[]
    const pag = data?.pagination

    if (error) return (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
            <AlertCircle className="h-10 w-10 text-destructive/70" />
            <p className="text-destructive font-medium">Error: {error.message}</p>
        </div>
    )

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                        <Map className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
                            {!isLoading && pag && <Badge variant="secondary" className="text-xs font-normal">{pag.total}</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{t('description')}</p>
                    </div>
                </div>
                <Button size="sm" className="gap-1.5" asChild>
                    <Link href={`/${locale}/respawn-zones/create`}><Plus className="h-4 w-4" />{t('createNew')}</Link>
                </Button>
            </div>

            <div className="flex items-center gap-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                        placeholder={t('searchPlaceholder')}
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        className="pl-9 pr-8 w-64"
                    />
                    {searchInput && (
                        <button onClick={() => setSearchInput('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
                {searchTerm && (
                    <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground"
                        onClick={() => { setSearchInput(''); setSearchTerm(''); setPage(1) }}>
                        <X className="h-3.5 w-3.5" />{tc('reset')}
                    </Button>
                )}
            </div>

            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="space-y-3 p-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-9 bg-muted rounded animate-pulse" />)}</div>
                    ) : respawnList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                            <Map className="h-10 w-10 opacity-30" />
                            <p className="text-sm">{searchTerm ? tc('noResults') : t('noItemsFound')}</p>
                            {!searchTerm && <Button size="sm" asChild><Link href={`/${locale}/respawn-zones/create`}>{t('createNew')}</Link></Button>}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('name')}</TableHead>
                                    <TableHead>{t('zoneName')}</TableHead>
                                    <TableHead className="w-32 text-center">{t('positionX')}/{t('positionY')}/{t('positionZ')}</TableHead>
                                    <TableHead className="w-24 text-center">{t('isDefault')}</TableHead>
                                    <TableHead className="text-right w-32">{tc('actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {respawnList.map(rz => (
                                    <TableRow key={rz.id}>
                                        <TableCell>
                                            <Link href={`/${locale}/respawn-zones/${rz.id}`} className="font-medium hover:underline">{rz.name}</Link>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">{rz.zoneName ?? '—'}</TableCell>
                                        <TableCell className="text-center font-mono text-xs tabular-nums">
                                            {rz.x}, {rz.y}, {rz.z}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {rz.isDefault ? <Badge variant="secondary" className="text-xs">Default</Badge> : <span className="text-muted-foreground text-xs">—</span>}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="View on map">
                                                    <Link href={`/${locale}/maps?focus=respawn:${rz.id}`} target="_blank">
                                                        <ExternalLink className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                                    <Link href={`/${locale}/respawn-zones/${rz.id}`}><Edit className="h-4 w-4" /></Link>
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                                                    onClick={() => setDeleteTarget(rz)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}

                    {!isLoading && respawnList.length > 0 && pag && (
                        <div className="flex items-center justify-between px-4 py-3 border-t">
                            <p className="text-sm text-muted-foreground">
                                {tc('showing', {
                                    from: (pag.page - 1) * pag.pageSize + 1,
                                    to: Math.min(pag.page * pag.pageSize, pag.total),
                                    total: pag.total,
                                })}
                            </p>
                            {pag.totalPages > 1 && (
                                <div className="flex items-center gap-1">
                                    <Button variant="outline" size="icon" className="h-8 w-8"
                                        onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <span className="text-sm font-medium px-2">{page} / {pag.totalPages}</span>
                                    <Button variant="outline" size="icon" className="h-8 w-8"
                                        onClick={() => setPage(p => p + 1)} disabled={page >= pag.totalPages}>
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('deleteConfirmDescription', { name: deleteTarget?.name ?? '' })}</DialogTitle>
                        <DialogDescription>{tc('confirmDelete')}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>{tc('cancel')}</Button>
                        <Button variant="destructive" disabled={deleteRespawnZone.isPending}
                            onClick={() => deleteTarget && deleteRespawnZone.mutate({ id: deleteTarget.id })}>
                            {deleteRespawnZone.isPending ? '…' : tc('delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
