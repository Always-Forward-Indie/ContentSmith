'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    Plus, Search, Edit, Trash2, Eye,
    AlertCircle, ChevronLeft, ChevronRight, Swords, X, SlidersHorizontal,
    ChevronUp, ChevronDown, ChevronsUpDown,
} from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow,
} from '@/components/ui/table'
import {
    Dialog, DialogContent, DialogDescription,
    DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'

import { trpc } from '@/lib/trpc'

function TableSkeleton() {
    return (
        <div className="space-y-3 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                    <div className="h-4 bg-muted rounded animate-pulse w-40" />
                    <div className="h-4 bg-muted rounded animate-pulse w-24" />
                    <div className="h-4 bg-muted rounded animate-pulse w-20" />
                    <div className="h-5 bg-muted rounded-full animate-pulse w-12" />
                    <div className="h-5 bg-muted rounded-full animate-pulse w-14" />
                    <div className="h-8 bg-muted rounded animate-pulse w-24 ml-auto" />
                </div>
            ))}
        </div>
    )
}

export default function MobsPage() {
    const t = useTranslations('mobs')
    const commonT = useTranslations('common')
    const locale = useLocale()
    const router = useRouter()

    const [searchInput, setSearchInput] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [page, setPage] = useState(1)
    const [mobToDelete, setMobToDelete] = useState<any | null>(null)
    const [filterRaceId, setFilterRaceId] = useState<number | undefined>(undefined)
    const [filterRankId, setFilterRankId] = useState<number | undefined>(undefined)
    const [filterAggressive, setFilterAggressive] = useState<boolean | undefined>(undefined)
    const [filterDead, setFilterDead] = useState<boolean | undefined>(undefined)
    const [minLevelInput, setMinLevelInput] = useState('')
    const [maxLevelInput, setMaxLevelInput] = useState('')
    const [minLevel, setMinLevel] = useState<number | undefined>(undefined)
    const [maxLevel, setMaxLevel] = useState<number | undefined>(undefined)
    const [sortBy, setSortBy] = useState<'id' | 'name' | 'level' | 'rankMult'>('id')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
    const [showFilters, setShowFilters] = useState(false)

    useEffect(() => {
        const timer = setTimeout(() => { setSearchTerm(searchInput); setPage(1) }, 350)
        return () => clearTimeout(timer)
    }, [searchInput])

    useEffect(() => {
        const timer = setTimeout(() => {
            const mn = minLevelInput ? parseInt(minLevelInput) : undefined
            const mx = maxLevelInput ? parseInt(maxLevelInput) : undefined
            setMinLevel(mn && !isNaN(mn) ? mn : undefined)
            setMaxLevel(mx && !isNaN(mx) ? mx : undefined)
            setPage(1)
        }, 400)
        return () => clearTimeout(timer)
    }, [minLevelInput, maxLevelInput])

    const { data: mobsData, isLoading, error, refetch } = trpc.mobs.list.useQuery({
        search: searchTerm || undefined,
        page,
        limit: 20,
        raceId: filterRaceId,
        rankId: filterRankId,
        isAggressive: filterAggressive,
        isDead: filterDead,
        minLevel,
        maxLevel,
        sortBy,
        sortOrder,
    })

    const { data: races } = trpc.mobs.getMobRaces.useQuery()
    const { data: ranks } = trpc.mobs.getMobRanks.useQuery()

    const deleteMobMutation = trpc.mobs.delete.useMutation({
        onSuccess: () => { setMobToDelete(null); refetch() },
        onError: (error) => { console.error('Failed to delete mob:', error) },
    })

    const mobs = mobsData?.data ?? []
    const totalCount = mobsData?.pagination?.total ?? null

    const activeFilterCount = [filterRaceId, filterRankId, filterAggressive, filterDead, minLevel, maxLevel]
        .filter(v => v !== undefined).length

    const clearFilters = () => {
        setFilterRaceId(undefined)
        setFilterRankId(undefined)
        setFilterAggressive(undefined)
        setFilterDead(undefined)
        setMinLevelInput('')
        setMaxLevelInput('')
        setMinLevel(undefined)
        setMaxLevel(undefined)
        setPage(1)
    }

    const toggleSort = (col: 'id' | 'name' | 'level' | 'rankMult') => {
        if (sortBy === col) {
            setSortOrder(o => o === 'asc' ? 'desc' : 'asc')
        } else {
            setSortBy(col)
            setSortOrder('asc')
        }
        setPage(1)
    }

    const SortIcon = ({ col }: { col: 'id' | 'name' | 'level' | 'rankMult' }) => {
        if (sortBy !== col) return <ChevronsUpDown className="h-3.5 w-3.5 ml-1 text-muted-foreground/50" />
        return sortOrder === 'asc'
            ? <ChevronUp className="h-3.5 w-3.5 ml-1" />
            : <ChevronDown className="h-3.5 w-3.5 ml-1" />
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
                <AlertCircle className="h-10 w-10 text-destructive/70" />
                <p className="text-destructive font-medium">{commonT('error')}: {error.message}</p>
            </div>
        )
    }

    return (
        <TooltipProvider delayDuration={300}>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-destructive/10 text-destructive shrink-0">
                            <Swords className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
                                {!isLoading && totalCount !== null && (
                                    <Badge variant="secondary" className="text-xs font-normal">
                                        {totalCount}
                                    </Badge>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">{t('description')}</p>
                        </div>
                    </div>
                    <Link href={`/${locale}/mobs/new`}>
                        <Button size="sm" className="gap-1.5">
                            <Plus className="h-4 w-4" />
                            {t('createNew')}
                        </Button>
                    </Link>
                </div>

                {/* Search + Filter bar */}
                <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                            placeholder={t('searchPlaceholder')}
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                            className="pl-9 pr-8"
                        />
                        {searchInput && (
                            <button
                                onClick={() => setSearchInput('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                    <Button
                        variant={showFilters || activeFilterCount > 0 ? 'secondary' : 'outline'}
                        size="sm"
                        className="gap-1.5 shrink-0"
                        onClick={() => setShowFilters(v => !v)}
                    >
                        <SlidersHorizontal className="h-4 w-4" />
                        Фильтры
                        {activeFilterCount > 0 && (
                            <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-medium">
                                {activeFilterCount}
                            </span>
                        )}
                    </Button>
                    {activeFilterCount > 0 && (
                        <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={clearFilters}>
                            <X className="h-3.5 w-3.5" />
                            Сбросить
                        </Button>
                    )}
                </div>

                {/* Expanded filters */}
                {showFilters && (
                    <div className="rounded-lg border bg-muted/30 p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                            <div className="space-y-1.5">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('race')}</p>
                                <Select
                                    value={filterRaceId?.toString() ?? 'all'}
                                    onValueChange={v => { setFilterRaceId(v === 'all' ? undefined : parseInt(v)); setPage(1) }}
                                >
                                    <SelectTrigger className="h-8 bg-background">
                                        <SelectValue placeholder={t('race')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Все расы</SelectItem>
                                        {races?.map(r => (
                                            <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('rank')}</p>
                                <Select
                                    value={filterRankId?.toString() ?? 'all'}
                                    onValueChange={v => { setFilterRankId(v === 'all' ? undefined : parseInt(v)); setPage(1) }}
                                >
                                    <SelectTrigger className="h-8 bg-background">
                                        <SelectValue placeholder={t('rank')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Все ранги</SelectItem>
                                        {ranks?.map(r => (
                                            <SelectItem key={r.rankId} value={r.rankId.toString()} className="capitalize">{r.code} ×{r.mult}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('behavior')}</p>
                                <Select
                                    value={filterAggressive === undefined ? 'all' : filterAggressive ? 'aggressive' : 'passive'}
                                    onValueChange={v => { setFilterAggressive(v === 'all' ? undefined : v === 'aggressive'); setPage(1) }}
                                >
                                    <SelectTrigger className="h-8 bg-background">
                                        <SelectValue placeholder={t('behavior')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Любое</SelectItem>
                                        <SelectItem value="passive">{t('passive')}</SelectItem>
                                        <SelectItem value="aggressive">{t('aggressive')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('status')}</p>
                                <Select
                                    value={filterDead === undefined ? 'all' : filterDead ? 'dead' : 'alive'}
                                    onValueChange={v => { setFilterDead(v === 'all' ? undefined : v === 'dead'); setPage(1) }}
                                >
                                    <SelectTrigger className="h-8 bg-background">
                                        <SelectValue placeholder={t('status')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Любой</SelectItem>
                                        <SelectItem value="alive">{t('alive')}</SelectItem>
                                        <SelectItem value="dead">{t('dead')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Уровень</p>
                                <div className="flex items-center gap-1.5">
                                    <Input
                                        type="number"
                                        min={1}
                                        placeholder="от"
                                        value={minLevelInput}
                                        onChange={e => setMinLevelInput(e.target.value)}
                                        className="h-8 w-full text-xs bg-background"
                                    />
                                    <span className="text-xs text-muted-foreground shrink-0">—</span>
                                    <Input
                                        type="number"
                                        min={1}
                                        placeholder="до"
                                        value={maxLevelInput}
                                        onChange={e => setMaxLevelInput(e.target.value)}
                                        className="h-8 w-full text-xs bg-background"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="rounded-lg border bg-card">
                    {isLoading ? (
                        <TableSkeleton />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead
                                        className="pl-4 cursor-pointer select-none hover:text-foreground"
                                        onClick={() => toggleSort('name')}
                                    >
                                        <span className="inline-flex items-center">{t('name')}<SortIcon col="name" /></span>
                                    </TableHead>
                                    <TableHead>{t('race')}</TableHead>
                                    <TableHead
                                        className="cursor-pointer select-none hover:text-foreground"
                                        onClick={() => toggleSort('rankMult')}
                                    >
                                        <span className="inline-flex items-center">{t('rank')}<SortIcon col="rankMult" /></span>
                                    </TableHead>
                                    <TableHead
                                        className="cursor-pointer select-none hover:text-foreground"
                                        onClick={() => toggleSort('level')}
                                    >
                                        <span className="inline-flex items-center">{t('level')}<SortIcon col="level" /></span>
                                    </TableHead>
                                    <TableHead>{t('behavior')}</TableHead>
                                    <TableHead>{t('status')}</TableHead>
                                    <TableHead>{t('spawnZones')}</TableHead>
                                    <TableHead className="text-right pr-4">{commonT('actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {mobs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="py-16">
                                            <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                                <Swords className="h-10 w-10 opacity-30" />
                                                <p className="text-sm font-medium">{t('noMobs')}</p>
                                                {!searchTerm && (
                                                    <Link href={`/${locale}/mobs/new`}>
                                                        <Button variant="outline" size="sm" className="mt-1 gap-1.5">
                                                            <Plus className="h-3.5 w-3.5" />
                                                            {t('createNew')}
                                                        </Button>
                                                    </Link>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    mobs.map(m => (
                                        <TableRow
                                            key={m.id}
                                            className="group cursor-pointer"
                                            onClick={() => router.push(`/${locale}/mobs/${m.id}`)}
                                        >
                                            <TableCell className="pl-4">
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{m.name}</span>
                                                    {m.slug && <span className="text-xs text-muted-foreground font-mono">{m.slug}</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm">{m.raceName ?? '—'}</span>
                                            </TableCell>
                                            <TableCell>
                                                {m.rankCode
                                                    ? <span className="text-sm font-mono">{m.rankCode} ×{m.rankMult}</span>
                                                    : <span className="text-muted-foreground">—</span>
                                                }
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm font-medium">Lv. {m.level}</span>
                                            </TableCell>
                                            <TableCell>
                                                {m.isAggressive
                                                    ? <span className="text-sm font-medium text-orange-600 dark:text-orange-400">{t('aggressive')}</span>
                                                    : <span className="text-sm text-emerald-600 dark:text-emerald-400">{t('passive')}</span>
                                                }
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    {m.isDead ? (
                                                        <Badge variant="destructive" className="text-xs">{t('dead')}</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="gap-1 text-xs text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800">
                                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                            {t('alive')}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {m.spawnZoneName
                                                    ? <span className="text-sm">{m.spawnZoneName}</span>
                                                    : <span className="text-muted-foreground">—</span>
                                                }
                                            </TableCell>
                                            <TableCell className="pr-4" onClick={e => e.stopPropagation()}>
                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Link href={`/${locale}/mobs/${m.id}`}>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                    <Eye className="h-4 w-4" />
                                                                </Button>
                                                            </Link>
                                                        </TooltipTrigger>
                                                        <TooltipContent>{t('view')}</TooltipContent>
                                                    </Tooltip>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Link href={`/${locale}/mobs/${m.id}/edit`}>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                            </Link>
                                                        </TooltipTrigger>
                                                        <TooltipContent>{commonT('edit')}</TooltipContent>
                                                    </Tooltip>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                onClick={() => setMobToDelete(m)}
                                                                disabled={deleteMobMutation.isPending}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>{commonT('delete')}</TooltipContent>
                                                    </Tooltip>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}

                    {!isLoading && mobs.length > 0 && mobsData?.pagination && (
                        <div className="flex items-center justify-between px-4 py-3 border-t">
                            <p className="text-sm text-muted-foreground">
                                {t('showingResults', {
                                    from: (mobsData.pagination.page - 1) * mobsData.pagination.limit + 1,
                                    to: Math.min(mobsData.pagination.page * mobsData.pagination.limit, mobsData.pagination.total),
                                    total: mobsData.pagination.total,
                                })}
                            </p>
                            {mobsData.pagination.totalPages > 1 && (
                                <div className="flex items-center gap-1">
                                    <Button variant="outline" size="icon" className="h-8 w-8"
                                        onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <span className="text-sm font-medium px-2">{page}</span>
                                    <Button variant="outline" size="icon" className="h-8 w-8"
                                        onClick={() => setPage(p => p + 1)} disabled={page >= mobsData.pagination.totalPages}>
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Delete confirmation dialog */}
            <Dialog open={!!mobToDelete} onOpenChange={(o) => { if (!o) setMobToDelete(null) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('deleteConfirmTitle')}</DialogTitle>
                        <DialogDescription>
                            {t('deleteConfirmDescription', { name: mobToDelete?.name ?? '' })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMobToDelete(null)}>{commonT('cancel')}</Button>
                        <Button variant="destructive" onClick={() => mobToDelete && deleteMobMutation.mutate(mobToDelete.id)}
                            disabled={deleteMobMutation.isPending}>
                            {deleteMobMutation.isPending ? commonT('deleting') : commonT('delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    )
}
