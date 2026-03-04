'use client'

import { useState, useEffect } from 'react'
import { Swords, Plus, Trash2, Pencil, Check, X, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'

function RankRow({ row, onUpdate, onDelete }: {
    row: { rankId: number; code: string; mult: number | null }
    onUpdate: (rankId: number, data: { code: string; mult: number }) => void
    onDelete: (rankId: number, code: string) => void
}) {
    const [editing, setEditing] = useState(false)
    const [code, setCode] = useState(row.code)
    const [mult, setMult] = useState(String(row.mult ?? 1))

    function save() { onUpdate(row.rankId, { code, mult: Number(mult) }); setEditing(false) }
    function cancel() { setCode(row.code); setMult(String(row.mult ?? 1)); setEditing(false) }

    return (
        <TableRow>
            <TableCell className="w-16 text-muted-foreground font-mono text-sm">{row.rankId}</TableCell>
            <TableCell>
                {editing ? (
                    <Input autoFocus className="h-7 text-sm w-32" value={code}
                        onChange={e => setCode(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel() }} />
                ) : (
                    <span className="font-medium font-mono text-sm">{row.code}</span>
                )}
            </TableCell>
            <TableCell>
                {editing ? (
                    <Input type="number" step="0.01" className="h-7 text-sm w-24" value={mult}
                        onChange={e => setMult(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel() }} />
                ) : (
                    <span className="text-sm">{row.mult ?? 1}×</span>
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
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(row.rankId, row.code)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                )}
            </TableCell>
        </TableRow>
    )
}

export default function MobRanksPage() {
    const t = useTranslations('mobRanks')
    const tc = useTranslations('common')
    const [newId, setNewId] = useState('')
    const [newCode, setNewCode] = useState('')
    const [newMult, setNewMult] = useState('1')
    const [deleteTarget, setDeleteTarget] = useState<{ rankId: number; code: string } | null>(null)
    const [searchInput, setSearchInput] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [page, setPage] = useState(1)

    useEffect(() => {
        const timer = setTimeout(() => { setSearchTerm(searchInput); setPage(1) }, 350)
        return () => clearTimeout(timer)
    }, [searchInput])

    const { data, isLoading, refetch } = trpc.mobRanks.list.useQuery({ search: searchTerm || undefined, page, pageSize: 20 })
    const create = trpc.mobRanks.create.useMutation({ onSuccess: () => { toast.success(t('rankCreated')); refetch(); setNewId(''); setNewCode(''); setNewMult('1') } })
    const update = trpc.mobRanks.update.useMutation({ onSuccess: () => { toast.success(t('rankUpdated')); refetch() } })
    const del = trpc.mobRanks.delete.useMutation({ onSuccess: () => { toast.success(t('rankDeleted')); refetch(); setDeleteTarget(null) } })

    const ranks = data?.data ?? []
    const pag = data?.pagination

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                    <Swords className="h-5 w-5" />
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
                    <div className="flex flex-wrap items-end gap-2 p-3 border-b">
                        <div className="space-y-1">
                            <Label className="text-xs">{t('fields.rankId')}</Label>
                            <Input className="h-8 text-sm w-20" type="number" min={0} placeholder="0" value={newId} onChange={e => setNewId(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">{t('fields.code')}</Label>
                            <Input className="h-8 text-sm w-28" placeholder="normal" value={newCode} onChange={e => setNewCode(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">{t('fields.multiplier')}</Label>
                            <Input className="h-8 text-sm w-20" type="number" step="0.1" placeholder="1" value={newMult} onChange={e => setNewMult(e.target.value)} />
                        </div>
                        <Button size="sm" className="gap-1.5 h-8" disabled={!newCode.trim() || newId === '' || create.isPending}
                            onClick={() => create.mutate({ rankId: Number(newId), code: newCode.trim(), mult: Number(newMult) })}>
                            <Plus className="h-3.5 w-3.5" />{tc('add')}
                        </Button>
                    </div>
                    {isLoading ? (
                        <div className="space-y-3 p-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-9 bg-muted rounded animate-pulse" />)}</div>
                    ) : ranks.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground text-sm">{searchTerm ? tc('noResults') : t('noRanks')}</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-16">{t('table.id')}</TableHead>
                                    <TableHead>{t('table.code')}</TableHead>
                                    <TableHead className="w-24">{t('table.multiplier')}</TableHead>
                                    <TableHead className="text-right w-24">{t('table.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {ranks.map(r => (
                                    <RankRow key={r.rankId} row={r}
                                        onUpdate={(rankId, data) => update.mutate({ rankId, ...data })}
                                        onDelete={(rankId, code) => setDeleteTarget({ rankId, code })} />
                                ))}
                            </TableBody>
                        </Table>
                    )}

                    {/* Pagination */}
                    {!isLoading && ranks.length > 0 && pag && (
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
                        <DialogTitle>{t('deleteTitle', { code: deleteTarget?.code ?? '' })}</DialogTitle>
                        <DialogDescription>{t('deleteDescription')}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>{tc('cancel')}</Button>
                        <Button variant="destructive" disabled={del.isPending}
                            onClick={() => deleteTarget && del.mutate({ rankId: deleteTarget.rankId })}>
                            {del.isPending ? '…' : tc('delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
