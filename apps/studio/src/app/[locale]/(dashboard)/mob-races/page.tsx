'use client'

import { useState, useEffect } from 'react'
import { Dna, Plus, Trash2, Pencil, Check, X, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'

function RaceRow({ row, onUpdate, onDelete }: {
    row: { id: number; name: string }
    onUpdate: (id: number, name: string) => void
    onDelete: (id: number, name: string) => void
}) {
    const [editing, setEditing] = useState(false)
    const [val, setVal] = useState(row.name)

    function save() { onUpdate(row.id, val); setEditing(false) }
    function cancel() { setVal(row.name); setEditing(false) }

    return (
        <TableRow>
            <TableCell className="w-16 text-muted-foreground font-mono text-xs">{row.id}</TableCell>
            <TableCell>
                {editing ? (
                    <Input autoFocus className="h-7 text-sm" value={val}
                        onChange={e => setVal(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel() }} />
                ) : (
                    <span className="font-medium">{row.name}</span>
                )}
            </TableCell>
            <TableCell className="text-right w-24">
                {editing ? (
                    <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={save}><Check className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancel}><X className="h-4 w-4" /></Button>
                    </div>
                ) : (
                    <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(row.id, row.name)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                )}
            </TableCell>
        </TableRow>
    )
}

export default function MobRacesPage() {
    const t = useTranslations('mobRaces')
    const tc = useTranslations('common')
    const [newName, setNewName] = useState('')
    const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null)
    const [searchInput, setSearchInput] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [page, setPage] = useState(1)

    useEffect(() => {
        const timer = setTimeout(() => { setSearchTerm(searchInput); setPage(1) }, 350)
        return () => clearTimeout(timer)
    }, [searchInput])

    const { data, isLoading, refetch } = trpc.mobRace.list.useQuery({ search: searchTerm || undefined, page, pageSize: 20 })
    const create = trpc.mobRace.create.useMutation({ onSuccess: () => { toast.success(t('raceCreated')); refetch(); setNewName('') } })
    const update = trpc.mobRace.update.useMutation({ onSuccess: () => { toast.success(t('raceUpdated')); refetch() } })
    const del = trpc.mobRace.delete.useMutation({ onSuccess: () => { toast.success(t('raceDeleted')); refetch(); setDeleteTarget(null) } })

    const races = data?.data ?? []
    const pag = data?.pagination

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                    <Dna className="h-5 w-5" />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
                        {!isLoading && pag && <Badge variant="secondary" className="text-xs font-normal">{pag.total}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{t('description')}</p>
                </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input className="pl-9 pr-8 w-64" placeholder={tc('searchPlaceholder')} value={searchInput} onChange={e => setSearchInput(e.target.value)} />
                    {searchInput && (
                        <button onClick={() => setSearchInput('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
                {searchTerm && (
                    <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => { setSearchInput(''); setSearchTerm(''); setPage(1) }}>
                        <X className="h-3.5 w-3.5" />{tc('reset')}
                    </Button>
                )}
            </div>

            <Card>
                <CardContent className="p-0">
                    <div className="flex items-center gap-2 p-3 border-b">
                        <Input className="h-8 text-sm" placeholder={t('newRacePlaceholder')} value={newName} onChange={e => setNewName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) create.mutate({ name: newName.trim() }) }} />
                        <Button size="sm" className="gap-1.5 h-8 shrink-0" disabled={!newName.trim() || create.isPending}
                            onClick={() => create.mutate({ name: newName.trim() })}>
                            <Plus className="h-3.5 w-3.5" />{tc('add')}
                        </Button>
                    </div>
                    {isLoading ? (
                        <div className="space-y-3 p-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-9 bg-muted rounded animate-pulse" />)}</div>
                    ) : races.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground text-sm">{searchTerm ? tc('noResults') : t('noRaces')}</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-16">{t('table.id')}</TableHead>
                                    <TableHead>{t('table.name')}</TableHead>
                                    <TableHead className="text-right w-24">{t('table.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {races.map(r => (
                                    <RaceRow key={r.id} row={r}
                                        onUpdate={(id, name) => update.mutate({ id, name })}
                                        onDelete={(id, name) => setDeleteTarget({ id, name })} />
                                ))}
                            </TableBody>
                        </Table>
                    )}

                    {/* Pagination */}
                    {!isLoading && races.length > 0 && pag && (
                        <div className="flex items-center justify-between px-4 py-3 border-t">
                            <p className="text-sm text-muted-foreground">
                                {tc('showing', { from: (pag.page - 1) * pag.pageSize + 1, to: Math.min(pag.page * pag.pageSize, pag.total), total: pag.total })}
                            </p>
                            {pag.totalPages > 1 && (
                                <div className="flex items-center gap-1">
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
                                    <span className="text-sm font-medium px-2">{page} / {pag.totalPages}</span>
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(p => p + 1)} disabled={page >= pag.totalPages}><ChevronRight className="h-4 w-4" /></Button>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('deleteTitle', { name: deleteTarget?.name ?? '' })}</DialogTitle>
                        <DialogDescription>{t('deleteDescription')}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>{tc('cancel')}</Button>
                        <Button variant="destructive" disabled={del.isPending}
                            onClick={() => deleteTarget && del.mutate({ id: deleteTarget.id })}>
                            {del.isPending ? '…' : tc('delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
