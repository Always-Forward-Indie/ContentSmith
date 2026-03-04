'use client'

import { useState, useCallback } from 'react'
import { TrendingUp, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

function formatNumber(n: number) {
    return new Intl.NumberFormat('en-US').format(n)
}

// ─── Inline edit row ──────────────────────────────────────────────────────────
function XpRow({ entry, onRefetch }: { entry: { id: number; level: number; experiencePoints: number }; onRefetch: () => void }) {
    const t = useTranslations('expForLevel')
    const [xp, setXp] = useState(String(entry.experiencePoints))
    const dirty = xp !== String(entry.experiencePoints)

    const upsert = trpc.expForLevel.upsert.useMutation({ onSuccess: () => { toast.success(t('savedLevel', { level: String(entry.level) })); onRefetch() } })
    const del = trpc.expForLevel.delete.useMutation({ onSuccess: () => { toast.success(t('deletedLevel', { level: String(entry.level) })); onRefetch() } })

    return (
        <TableRow>
            <TableCell className="font-mono font-medium">{entry.level}</TableCell>
            <TableCell>
                <Input type="number" min={0} value={xp} onChange={e => setXp(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && dirty) upsert.mutate({ level: entry.level, experiencePoints: Number(xp) }) }}
                    onBlur={() => { if (dirty) upsert.mutate({ level: entry.level, experiencePoints: Number(xp) }) }}
                    className="h-7 w-36 text-sm font-mono" />
            </TableCell>
            <TableCell className="text-right font-mono text-muted-foreground text-xs">{formatNumber(entry.experiencePoints)}</TableCell>
            <TableCell className="text-right">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" disabled={del.isPending}
                    onClick={() => del.mutate({ level: entry.level })}>
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </TableCell>
        </TableRow>
    )
}

export default function ExpForLevelPage() {
    const t = useTranslations('expForLevel')
    const tc = useTranslations('common')
    const [page, setPage] = useState(1)
    const { data, isLoading, refetch } = trpc.expForLevel.list.useQuery({ page, pageSize: 50 })
    const upsert = trpc.expForLevel.upsert.useMutation({ onSuccess: () => { toast.success(t('levelAdded')); refetch() } })
    const bulkUpsert = trpc.expForLevel.bulkUpsert.useMutation({ onSuccess: (res) => { toast.success(t('generated', { count: String(res.count) })); setPage(1); refetch() } })

    const entries = data?.data ?? []
    const pag = data?.pagination

    const [newLevel, setNewLevel] = useState('')
    const [newXp, setNewXp] = useState('')

    // ─── Generate formula ──────────────────────────────────────────────────────
    const [genBase, setGenBase] = useState('100')
    const [genMult, setGenMult] = useState('50')
    const [genExp, setGenExp] = useState('1.5')
    const [genMax, setGenMax] = useState('60')

    const generateCurve = useCallback(() => {
        const maxLevel = Number(genMax)
        const entries = Array.from({ length: maxLevel }, (_, i) => {
            const level = i + 1
            const xp = Math.round(Number(genBase) + Number(genMult) * Math.pow(level, Number(genExp)))
            return { level, experiencePoints: xp }
        })
        bulkUpsert.mutate({ entries })
    }, [genBase, genMult, genExp, genMax, bulkUpsert])

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                    <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
                        {!isLoading && pag && <Badge variant="secondary" className="text-xs font-normal">{t('levelsCount', { count: String(pag.total) })}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{t('description')}</p>
                </div>
            </div>

            {/* Generator */}
            <Card>
                <CardHeader><CardTitle className="text-base">{t('generateCurve')}</CardTitle></CardHeader>
                <CardContent>
                    <p className="text-xs text-muted-foreground mb-3">{t('generateFormula')}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-muted-foreground w-10">base</span>
                            <Input type="number" value={genBase} onChange={e => setGenBase(e.target.value)} className="w-24 h-8 text-sm font-mono" />
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-muted-foreground w-10">mult</span>
                            <Input type="number" value={genMult} onChange={e => setGenMult(e.target.value)} className="w-24 h-8 text-sm font-mono" />
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-muted-foreground w-8">exp</span>
                            <Input type="number" step="0.1" value={genExp} onChange={e => setGenExp(e.target.value)} className="w-24 h-8 text-sm font-mono" />
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-muted-foreground w-20">max level</span>
                            <Input type="number" min={1} max={200} value={genMax} onChange={e => setGenMax(e.target.value)} className="w-20 h-8 text-sm font-mono" />
                        </div>
                        <Button size="sm" className="h-8 gap-1.5" onClick={generateCurve} disabled={bulkUpsert.isPending}>
                            {bulkUpsert.isPending ? t('generating') : t('generate')}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <div className="px-4 pt-4 pb-3 border-b">
                    <p className="text-xs font-medium text-muted-foreground mb-2">{t('addSingleLevel')}</p>
                    <div className="flex items-center gap-2">
                        <Input type="number" placeholder={t('levelPlaceholder')} min={1} value={newLevel} onChange={e => setNewLevel(e.target.value)} className="w-24 h-8 text-sm" />
                        <Input type="number" placeholder={t('xpPlaceholder')} min={0} value={newXp} onChange={e => setNewXp(e.target.value)} className="w-40 h-8 text-sm" />
                        <Button size="sm" className="h-8 gap-1" disabled={!newLevel || !newXp || upsert.isPending}
                            onClick={() => { upsert.mutate({ level: Number(newLevel), experiencePoints: Number(newXp) }); setNewLevel(''); setNewXp('') }}>
                            <Plus className="h-3.5 w-3.5" />{tc('add')}
                        </Button>
                    </div>
                </div>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-20">{t('table.level')}</TableHead>
                                <TableHead>{t('table.xp')}</TableHead>
                                <TableHead className="text-right">{t('table.formatted')}</TableHead>
                                <TableHead className="text-right w-16">{tc('actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-7 w-full" /></TableCell></TableRow>
                                ))
                            ) : entries.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">{t('noEntries')}</TableCell></TableRow>
                            ) : entries.map(e => (
                                <XpRow key={e.level} entry={e} onRefetch={refetch} />
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>

                {/* Pagination */}
                {!isLoading && entries.length > 0 && pag && (
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
                                <Button size="sm" variant="outline" className="h-8 px-2.5"
                                    onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-sm font-medium px-2">{page} / {pag.totalPages}</span>
                                <Button size="sm" variant="outline" className="h-8 px-2.5"
                                    onClick={() => setPage(p => p + 1)} disabled={page >= pag.totalPages}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </Card>
        </div>
    )
}
