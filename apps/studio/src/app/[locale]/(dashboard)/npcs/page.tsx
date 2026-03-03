'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
    Plus, Search, Edit, Trash2, Eye,
    Shield, Skull, Users, AlertCircle,
    ChevronLeft, ChevronRight, X, SlidersHorizontal,
    ChevronUp, ChevronDown, ChevronsUpDown,
} from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
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

export default function NPCsPage() {
    const t = useTranslations('npcs')
    const commonT = useTranslations('common')
    const locale = useLocale()
    const router = useRouter()

    const [searchInput, setSearchInput] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [page, setPage] = useState(1)
    const [npcToDelete, setNpcToDelete] = useState<any | null>(null)
    const [filterRaceId, setFilterRaceId] = useState<number | undefined>(undefined)
    const [filterNpcType, setFilterNpcType] = useState<number | undefined>(undefined)
    const [filterInteractable, setFilterInteractable] = useState<boolean | undefined>(undefined)
    const [filterDead, setFilterDead] = useState<boolean | undefined>(undefined)
    const [minLevelInput, setMinLevelInput] = useState('')
    const [maxLevelInput, setMaxLevelInput] = useState('')
    const [minLevel, setMinLevel] = useState<number | undefined>(undefined)
    const [maxLevel, setMaxLevel] = useState<number | undefined>(undefined)
    const [sortBy, setSortBy] = useState<'id' | 'name' | 'level'>('id')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
    const [showFilters, setShowFilters] = useState(false)

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => { setSearchTerm(searchInput); setPage(1) }, 350)
        return () => clearTimeout(timer)
    }, [searchInput])

    // Debounce level range
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

    const { data: npcsData, isLoading, error, refetch } = trpc.npc.list.useQuery({
        search: searchTerm || undefined,
        page,
        limit: 20,
        raceId: filterRaceId,
        npcType: filterNpcType,
        isInteractable: filterInteractable,
        isDead: filterDead,
        minLevel,
        maxLevel,
        sortBy,
        sortOrder,
    })

    const { data: races } = trpc.npc.getRaces.useQuery()
    const { data: npcTypes } = trpc.npc.getNpcTypes.useQuery()

    const deleteNpcMutation = trpc.npc.delete.useMutation({
        onSuccess: () => {
            refetch()
            setNpcToDelete(null)
        },
        onError: (error) => {
            console.error('Failed to delete NPC:', error)
        },
    })

    const npcs = npcsData?.data ?? []
    const totalCount = npcsData?.pagination?.total ?? null

    const activeFilterCount = [filterRaceId, filterNpcType, filterInteractable, filterDead, minLevel, maxLevel]
        .filter(v => v !== undefined).length

    const clearFilters = () => {
        setFilterRaceId(undefined)
        setFilterNpcType(undefined)
        setFilterInteractable(undefined)
        setFilterDead(undefined)
        setMinLevelInput('')
        setMaxLevelInput('')
        setMinLevel(undefined)
        setMaxLevel(undefined)
        setPage(1)
    }

    const toggleSort = (col: 'id' | 'name' | 'level') => {
        if (sortBy === col) setSortOrder(o => o === 'asc' ? 'desc' : 'asc')
        else { setSortBy(col); setSortOrder('asc') }
        setPage(1)
    }

    const SortIcon = ({ col }: { col: 'id' | 'name' | 'level' }) => {
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
                {/* Page Header */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                            <Users className="h-5 w-5" />
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
                    <Link href={`/${locale}/npcs/new`}>
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
                            onChange={(e) => setSearchInput(e.target.value)}
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
                                    value={filterRaceId !== undefined ? String(filterRaceId) : 'all'}
                                    onValueChange={v => { setFilterRaceId(v === 'all' ? undefined : Number(v)); setPage(1) }}
                                >
                                    <SelectTrigger className="h-8 bg-background">
                                        <SelectValue placeholder={t('race')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Все расы</SelectItem>
                                        {races?.map(r => (
                                            <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('type')}</p>
                                <Select
                                    value={filterNpcType !== undefined ? String(filterNpcType) : 'all'}
                                    onValueChange={v => { setFilterNpcType(v === 'all' ? undefined : Number(v)); setPage(1) }}
                                >
                                    <SelectTrigger className="h-8 bg-background">
                                        <SelectValue placeholder={t('type')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Все типы</SelectItem>
                                        {npcTypes?.map(nt => (
                                            <SelectItem key={nt.id} value={String(nt.id)}>{nt.name}</SelectItem>
                                        ))}
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
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('interactable')}</p>
                                <Select
                                    value={filterInteractable === undefined ? 'all' : String(filterInteractable)}
                                    onValueChange={v => { setFilterInteractable(v === 'all' ? undefined : v === 'true'); setPage(1) }}
                                >
                                    <SelectTrigger className="h-8 bg-background">
                                        <SelectValue placeholder={t('interactable')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Все</SelectItem>
                                        <SelectItem value="true">Интерактивные</SelectItem>
                                        <SelectItem value="false">Неинтерактивные</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Уровень</p>
                                <div className="flex items-center gap-1.5">
                                    <Input
                                        type="number" min={1}
                                        placeholder="от"
                                        value={minLevelInput}
                                        onChange={e => setMinLevelInput(e.target.value)}
                                        className="h-8 w-full text-xs bg-background"
                                    />
                                    <span className="text-xs text-muted-foreground shrink-0">—</span>
                                    <Input
                                        type="number" min={1}
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
                                    <TableHead>{t('type')}</TableHead>
                                    <TableHead
                                        className="cursor-pointer select-none hover:text-foreground"
                                        onClick={() => toggleSort('level')}
                                    >
                                        <span className="inline-flex items-center">{t('level')}<SortIcon col="level" /></span>
                                    </TableHead>
                                    <TableHead>{t('status')}</TableHead>
                                    <TableHead>{t('interactable')}</TableHead>
                                    <TableHead className="text-right pr-4">{commonT('actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {npcs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="py-16">
                                            <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                                <Users className="h-10 w-10 opacity-30" />
                                                <p className="text-sm font-medium">
                                                    {searchTerm ? t('noNpcs') : t('noNpcs')}
                                                </p>
                                                {!searchTerm && (
                                                    <Link href={`/${locale}/npcs/new`}>
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
                                    npcs.map((npc) => (
                                        <TableRow
                                            key={npc.id}
                                            className="group cursor-pointer"
                                            onClick={() => router.push(`/${locale}/npcs/${npc.id}`)}
                                        >
                                            <TableCell className="pl-4">
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{npc.name}</span>
                                                    {npc.slug && (
                                                        <span className="text-xs text-muted-foreground font-mono">{npc.slug}</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm">{npc.raceName || `#${npc.raceId}`}</span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-xs font-mono text-muted-foreground">
                                                    {npc.npcTypeName || `#${npc.npcType}`}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 text-sm">
                                                    <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span className="font-medium">{npc.level}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {npc.isDead ? (
                                                    <Badge variant="destructive" className="gap-1 text-xs">
                                                        <Skull className="h-3 w-3" />
                                                        {t('dead')}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="gap-1 text-xs text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                        {t('alive')}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="flex items-center gap-1.5 w-fit cursor-default">
                                                            <div className={`h-2 w-2 rounded-full ${npc.isInteractable ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                                                            <span className="text-xs text-muted-foreground">
                                                                {npc.isInteractable ? t('interactable') : '—'}
                                                            </span>
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>{t('isInteractable')}</TooltipContent>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell className="pr-4" onClick={e => e.stopPropagation()}>
                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8"
                                                                onClick={() => router.push(`/${locale}/npcs/${npc.id}`)}>
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>{t('view')}</TooltipContent>
                                                    </Tooltip>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8"
                                                                onClick={() => router.push(`/${locale}/npcs/${npc.id}/edit`)}>
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>{commonT('edit')}</TooltipContent>
                                                    </Tooltip>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                onClick={() => setNpcToDelete(npc)}
                                                                disabled={deleteNpcMutation.isPending}
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

                    {!isLoading && npcs.length > 0 && npcsData?.pagination && (
                        <div className="flex items-center justify-between px-4 py-3 border-t">
                            <p className="text-sm text-muted-foreground">
                                {t('showingResults', {
                                    from: (npcsData.pagination.page - 1) * npcsData.pagination.limit + 1,
                                    to: Math.min(npcsData.pagination.page * npcsData.pagination.limit, npcsData.pagination.total),
                                    total: npcsData.pagination.total,
                                })}
                            </p>
                            {npcsData.pagination.totalPages > 1 && (
                                <div className="flex items-center gap-1">
                                    <Button variant="outline" size="icon" className="h-8 w-8"
                                        onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <span className="text-sm font-medium px-2">{page}</span>
                                    <Button variant="outline" size="icon" className="h-8 w-8"
                                        onClick={() => setPage(p => p + 1)} disabled={page >= npcsData.pagination.totalPages}>
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Delete confirmation dialog */}
            <Dialog open={!!npcToDelete} onOpenChange={(open) => !open && setNpcToDelete(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10 text-destructive shrink-0">
                                <Trash2 className="h-5 w-5" />
                            </div>
                            <DialogTitle className="text-lg">{t('deleteConfirmTitle')}</DialogTitle>
                        </div>
                        <DialogDescription className="pt-1">
                            {t('deleteConfirmDescription', { name: npcToDelete?.name || '' })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setNpcToDelete(null)}
                            disabled={deleteNpcMutation.isPending}
                        >
                            {commonT('cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => npcToDelete && deleteNpcMutation.mutate(npcToDelete.id)}
                            disabled={deleteNpcMutation.isPending}
                        >
                            {deleteNpcMutation.isPending ? commonT('loading') : commonT('delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    )
}