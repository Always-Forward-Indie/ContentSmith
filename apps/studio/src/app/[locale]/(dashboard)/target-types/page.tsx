'use client'

import { useState, useEffect } from 'react'
import { Target, Plus, Trash2, Pencil, Check, X, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'

function TypeRow({ row, onUpdate, onDelete }: {
    row: { id: number; slug: string }
    onUpdate: (id: number, slug: string) => void
    onDelete: (id: number, slug: string) => void
}) {
    const [editing, setEditing] = useState(false)
    const [val, setVal] = useState(row.slug)

    function save() { onUpdate(row.id, val); setEditing(false) }
    function cancel() { setVal(row.slug); setEditing(false) }

    return (
        <TableRow>
            <TableCell className="w-16 text-muted-foreground font-mono text-xs">{row.id}</TableCell>
            <TableCell>
                {editing ? (
                    <Input autoFocus className="h-7 text-sm font-mono" value={val}
                        onChange={e => setVal(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel() }} />
                ) : (
                    <span className="font-mono text-sm">{row.slug}</span>
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
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(row.id, row.slug)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                )}
            </TableCell>
        </TableRow>
    )
}

export default function TargetTypesPage() {
    const t = useTranslations('targetTypes')
    const tc = useTranslations('common')
    const [newSlug, setNewSlug] = useState('')
    const [deleteTarget, setDeleteTarget] = useState<{ id: number; slug: string } | null>(null)
    const [searchInput, setSearchInput] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [page, setPage] = useState(1)

    useEffect(() => {
        const timer = setTimeout(() => { setSearchTerm(searchInput); setPage(1) }, 350)
        return () => clearTimeout(timer)
    }, [searchInput])

    const { data, isLoading, refetch } = trpc.targetType.list.useQuery({ search: searchTerm || undefined, page, pageSize: 20 })
    const create = trpc.targetType.create.useMutation({ onSuccess: () => { toast.success(t('typeCreated')); refetch(); setNewSlug('') } })
    const update = trpc.targetType.update.useMutation({ onSuccess: () => { toast.success(t('typeUpdated')); refetch() } })
    const del = trpc.targetType.delete.useMutation({ onSuccess: () => { toast.success(t('typeDeleted')); refetch(); setDeleteTarget(null) } })

    const types = data?.data ?? []
    const pag = data?.pagination

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                    <Target className="h-5 w-5" />
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
                        <Input className="h-8 text-sm font-mono" placeholder={t('newSlugPlaceholder')} value={newSlug} onChange={e => setNewSlug(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && newSlug.trim()) create.mutate({ slug: newSlug.trim() }) }} />
                        <Button size="sm" className="gap-1.5 h-8 shrink-0" disabled={!newSlug.trim() || create.isPending}
                            onClick={() => create.mutate({ slug: newSlug.trim() })}>
                            <Plus className="h-3.5 w-3.5" />{tc('add')}
                        </Button>
                    </div>
                    {isLoading ? (
                        <div className="space-y-3 p-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-9 bg-muted rounded animate-pulse" />)}</div>
                    ) : types.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground text-sm">{searchTerm ? tc('noResults') : t('noTypes')}</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-16">{t('table.id')}</TableHead>
                                    <TableHead>{t('table.slug')}</TableHead>
                                    <TableHead className="text-right w-24">{t('table.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {types.map(t => (
                                    <TypeRow key={t.id} row={t}
                                        onUpdate={(id, slug) => update.mutate({ id, slug })}
                                        onDelete={(id, slug) => setDeleteTarget({ id, slug })} />
                                ))}
                            </TableBody>
                        </Table>
                    )}

                    {/* Pagination */}
                    {!isLoading && types.length > 0 && pag && (
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
                        <DialogTitle>{t('deleteTitle', { slug: deleteTarget?.slug ?? '' })}</DialogTitle>
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
