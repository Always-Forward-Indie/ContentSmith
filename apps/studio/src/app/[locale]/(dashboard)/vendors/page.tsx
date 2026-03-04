'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { ShoppingBag, Plus, Trash2, Edit, AlertCircle, Search, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function VendorsPage() {
    const locale = useLocale()
    const t = useTranslations('vendors')
    const tc = useTranslations('common')
    const [deleteTarget, setDeleteTarget] = useState<{ id: number; npcName: string | null } | null>(null)
    const [createOpen, setCreateOpen] = useState(false)
    const [newNpcId, setNewNpcId] = useState('')
    const [newMarkup, setNewMarkup] = useState('0')
    const [searchInput, setSearchInput] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [page, setPage] = useState(1)

    useEffect(() => {
        const timer = setTimeout(() => { setSearchTerm(searchInput); setPage(1) }, 350)
        return () => clearTimeout(timer)
    }, [searchInput])

    const { data, isLoading, error, refetch } = trpc.vendors.list.useQuery({
        search: searchTerm || undefined,
        page,
        pageSize: 20,
    })
    const { data: allNpcs } = trpc.vendors.allNpcs.useQuery()
    const createVendor = trpc.vendors.create.useMutation({ onSuccess: () => { toast.success(t('vendorCreated')); refetch(); setCreateOpen(false); setNewNpcId(''); setNewMarkup('0') } })
    const deleteVendor = trpc.vendors.delete.useMutation({ onSuccess: () => { toast.success(t('vendorDeleted')); refetch(); setDeleteTarget(null) } })

    const vendorList = data?.data ?? []
    const pag = data?.pagination
    const existingNpcIds = new Set(vendorList.map(v => v.npcId))
    const availableNpcs = (allNpcs ?? []).filter(n => !existingNpcIds.has(n.id))

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
                        <ShoppingBag className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
                            {!isLoading && pag && <Badge variant="secondary" className="text-xs font-normal">{pag.total}</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{t('description')}</p>
                    </div>
                </div>
                {availableNpcs.length > 0 && (
                    <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
                        <Plus className="h-4 w-4" />{t('addVendor')}
                    </Button>
                )}
            </div>

            {/* Search */}
            <div className="flex items-center gap-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                        placeholder={tc('searchPlaceholder')}
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
                    ) : vendorList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                            <ShoppingBag className="h-10 w-10 opacity-30" />
                            <p className="text-sm">{searchTerm ? tc('noResults') : t('noVendors')}</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('table.npc')}</TableHead>
                                    <TableHead>{t('table.slug')}</TableHead>
                                    <TableHead className="w-32">{t('table.markup')}</TableHead>
                                    <TableHead className="text-right w-24">{t('table.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {vendorList.map(v => (
                                    <TableRow key={v.id}>
                                        <TableCell>
                                            <Link href={`/${locale}/vendors/${v.id}`} className="font-medium hover:underline">{v.npcName ?? `NPC #${v.npcId}`}</Link>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-muted-foreground">{v.npcSlug ?? '—'}</TableCell>
                                        <TableCell>{v.markupPct}%</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                                    <Link href={`/${locale}/vendors/${v.id}`}><Edit className="h-4 w-4" /></Link>
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                                                    onClick={() => setDeleteTarget({ id: v.id, npcName: v.npcName })}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}

                    {/* Pagination */}
                    {!isLoading && vendorList.length > 0 && pag && (
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

            {/* Create dialog */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('addVendorTitle')}</DialogTitle>
                        <DialogDescription>{t('addVendorDescription')}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label>{t('fields.npc')}</Label>
                            <Select value={newNpcId} onValueChange={setNewNpcId}>
                                <SelectTrigger><SelectValue placeholder={t('selectNpc')} /></SelectTrigger>
                                <SelectContent>{availableNpcs.map(n => <SelectItem key={n.id} value={String(n.id)}>{n.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t('fields.markup')}</Label>
                            <Input type="number" min={0} max={1000} value={newMarkup} onChange={e => setNewMarkup(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>{tc('cancel')}</Button>
                        <Button disabled={!newNpcId || createVendor.isPending}
                            onClick={() => createVendor.mutate({ npcId: Number(newNpcId), markupPct: Number(newMarkup) })}>
                            {createVendor.isPending ? tc('adding') : tc('add')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete dialog */}
            <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('deleteTitle', { name: deleteTarget?.npcName ?? '' })}</DialogTitle>
                        <DialogDescription>{t('deleteDescription')}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>{tc('cancel')}</Button>
                        <Button variant="destructive" disabled={deleteVendor.isPending}
                            onClick={() => deleteTarget && deleteVendor.mutate({ id: deleteTarget.id })}>
                            {deleteVendor.isPending ? tc('removing') : tc('remove')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
