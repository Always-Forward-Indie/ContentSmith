'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
    Plus, Search, Edit, Trash2, Eye, ScrollText, AlertCircle,
    ChevronLeft, ChevronRight, RefreshCw, Clock, X, SlidersHorizontal,
    ChevronUp, ChevronDown, ChevronsUpDown
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

interface Quest {
    id: number
    slug: string
    minLevel: number
    repeatable: boolean
    cooldownSec: number | null
    clientQuestKey: string | null
    giverNpcId: number | null
    turninNpcId: number | null
    giverNpcName: string | null
    turninNpcName: string | null
}

function TableSkeleton() {
    return (
        <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-1">
                    <div className="h-4 bg-muted rounded animate-pulse flex-1" />
                    <div className="h-4 bg-muted rounded animate-pulse w-12" />
                    <div className="h-5 bg-muted rounded-full animate-pulse w-20" />
                    <div className="h-4 bg-muted rounded animate-pulse w-16" />
                    <div className="h-8 bg-muted rounded animate-pulse w-24" />
                </div>
            ))}
        </div>
    )
}

export default function QuestsPage() {
    const t = useTranslations('quests')
    const commonT = useTranslations('common')
    const locale = useLocale()
    const router = useRouter()
    const [searchInput, setSearchInput] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [page, setPage] = useState(1)
    const [questToDelete, setQuestToDelete] = useState<Quest | null>(null)
    const [filterRepeatable, setFilterRepeatable] = useState<boolean | undefined>(undefined)
    const [filterGiverNpcId, setFilterGiverNpcId] = useState<number | undefined>(undefined)
    const [filterTurninNpcId, setFilterTurninNpcId] = useState<number | undefined>(undefined)
    const [minLevelInput, setMinLevelInput] = useState('')
    const [maxLevelInput, setMaxLevelInput] = useState('')
    const [minLevel, setMinLevel] = useState<number | undefined>(undefined)
    const [maxLevel, setMaxLevel] = useState<number | undefined>(undefined)
    const [sortBy, setSortBy] = useState<'id' | 'slug' | 'minLevel'>('id')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
    const [showFilters, setShowFilters] = useState(false)
    const utils = trpc.useUtils()

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchTerm(searchInput)
            setPage(1)
        }, 350)
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

    const { data: questsData, isLoading, error } = trpc.quest.list.useQuery({
        page,
        limit: 10,
        search: searchTerm || undefined,
        repeatable: filterRepeatable,
        minLevel,
        maxLevel,
        giverNpcId: filterGiverNpcId,
        turninNpcId: filterTurninNpcId,
        sortBy,
        sortOrder,
    })

    const { data: questNpcs } = trpc.quest.getQuestNpcs.useQuery()

    const deleteQuest = trpc.quest.delete.useMutation({
        onSuccess: () => {
            utils.quest.list.invalidate()
            setQuestToDelete(null)
        },
    })

    const handleDelete = async () => {
        if (!questToDelete?.id) return
        await deleteQuest.mutateAsync({ id: questToDelete.id })
    }

    const quests = questsData?.data || []
    const totalCount = questsData?.pagination?.total ?? null

    const activeFilterCount = [filterRepeatable, filterGiverNpcId, filterTurninNpcId, minLevel, maxLevel]
        .filter(v => v !== undefined).length

    const clearFilters = () => {
        setFilterRepeatable(undefined)
        setFilterGiverNpcId(undefined)
        setFilterTurninNpcId(undefined)
        setMinLevelInput('')
        setMaxLevelInput('')
        setMinLevel(undefined)
        setMaxLevel(undefined)
        setPage(1)
    }

    const toggleSort = (col: 'id' | 'slug' | 'minLevel') => {
        if (sortBy === col) setSortOrder(o => o === 'asc' ? 'desc' : 'asc')
        else { setSortBy(col); setSortOrder('asc') }
        setPage(1)
    }

    const SortIcon = ({ col }: { col: 'id' | 'slug' | 'minLevel' }) => {
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
                            <ScrollText className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
                                {totalCount !== null && (
                                    <Badge variant="secondary" className="text-xs font-normal">
                                        {totalCount}
                                    </Badge>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">{t('description')}</p>
                        </div>
                    </div>
                    <Link href={`/${locale}/quests/new`}>
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-1.5">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('table.repeatable')}</p>
                                <Select
                                    value={filterRepeatable === undefined ? 'all' : String(filterRepeatable)}
                                    onValueChange={v => { setFilterRepeatable(v === 'all' ? undefined : v === 'true'); setPage(1) }}
                                >
                                    <SelectTrigger className="h-8 bg-background">
                                        <SelectValue placeholder={t('table.repeatable')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Все квесты</SelectItem>
                                        <SelectItem value="true">Повторяемые</SelectItem>
                                        <SelectItem value="false">Одноразовые</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('table.giver')}</p>
                                <Select
                                    value={filterGiverNpcId !== undefined ? String(filterGiverNpcId) : 'all'}
                                    onValueChange={v => { setFilterGiverNpcId(v === 'all' ? undefined : Number(v)); setPage(1) }}
                                >
                                    <SelectTrigger className="h-8 bg-background">
                                        <SelectValue placeholder={t('table.giver')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Любой NPC</SelectItem>
                                        {questNpcs?.map(n => (
                                            <SelectItem key={n.id} value={String(n.id)}>{n.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('table.receiver')}</p>
                                <Select
                                    value={filterTurninNpcId !== undefined ? String(filterTurninNpcId) : 'all'}
                                    onValueChange={v => { setFilterTurninNpcId(v === 'all' ? undefined : Number(v)); setPage(1) }}
                                >
                                    <SelectTrigger className="h-8 bg-background">
                                        <SelectValue placeholder={t('table.receiver')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Любой NPC</SelectItem>
                                        {questNpcs?.map(n => (
                                            <SelectItem key={n.id} value={String(n.id)}>{n.name}</SelectItem>
                                        ))}
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
                        <div className="p-6">
                            <TableSkeleton />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead
                                        className="pl-4 cursor-pointer select-none hover:text-foreground"
                                        onClick={() => toggleSort('slug')}
                                    >
                                        <span className="inline-flex items-center">Slug<SortIcon col="slug" /></span>
                                    </TableHead>
                                    <TableHead>{t('table.giver')}</TableHead>
                                    <TableHead>{t('table.receiver')}</TableHead>
                                    <TableHead
                                        className="cursor-pointer select-none hover:text-foreground"
                                        onClick={() => toggleSort('minLevel')}
                                    >
                                        <span className="inline-flex items-center">{t('table.minLevel')}<SortIcon col="minLevel" /></span>
                                    </TableHead>
                                    <TableHead>{t('table.repeatable')}</TableHead>
                                    <TableHead>{t('table.cooldown')}</TableHead>
                                    <TableHead className="text-right pr-4">{commonT('actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {quests.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="py-16">
                                            <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                                <ScrollText className="h-10 w-10 opacity-30" />
                                                <p className="text-sm font-medium">
                                                    {searchTerm ? t('questsNotFound') : t('noQuests')}
                                                </p>
                                                {!searchTerm && (
                                                    <Link href={`/${locale}/quests/new`}>
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
                                    quests.map((quest) => (
                                        <TableRow
                                            key={quest.id}
                                            className="group cursor-pointer"
                                            onClick={() => router.push(`/${locale}/quests/${quest.id}`)}
                                        >
                                            <TableCell className="pl-4">
                                                <div className="flex flex-col">
                                                    <span className="font-medium font-mono text-sm">{quest.slug}</span>
                                                    <span className="text-xs text-muted-foreground">#{quest.id}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {quest.giverNpcName
                                                    ? <span className="text-sm">{quest.giverNpcName}</span>
                                                    : <span className="text-muted-foreground text-sm">—</span>}
                                            </TableCell>
                                            <TableCell>
                                                {quest.turninNpcName
                                                    ? <span className="text-sm">{quest.turninNpcName}</span>
                                                    : <span className="text-muted-foreground text-sm">—</span>}
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm font-medium">{quest.minLevel}</span>
                                            </TableCell>
                                            <TableCell>
                                                {quest.repeatable ? (
                                                    <div className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                                                        <RefreshCw className="h-3.5 w-3.5 shrink-0" />
                                                        <span>{commonT('yes')}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {quest.repeatable && quest.cooldownSec != null && quest.cooldownSec > 0 ? (
                                                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                        <Clock className="h-3.5 w-3.5 shrink-0" />
                                                        <span>{quest.cooldownSec}s</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="pr-4" onClick={e => e.stopPropagation()}>
                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8"
                                                                onClick={() => router.push(`/${locale}/quests/${quest.id}`)}>
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>{commonT('view')}</TooltipContent>
                                                    </Tooltip>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8"
                                                                onClick={() => router.push(`/${locale}/quests/${quest.id}/edit`)}>
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
                                                                onClick={() => setQuestToDelete(quest)}
                                                                disabled={deleteQuest.isPending}
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

                    {/* Pagination */}
                    {!isLoading && quests.length > 0 && questsData?.pagination && (
                        <div className="flex items-center justify-between px-4 py-3 border-t">
                            <p className="text-sm text-muted-foreground">
                                {t('showingResults', {
                                    from: (questsData.pagination.page - 1) * questsData.pagination.limit + 1,
                                    to: Math.min(questsData.pagination.page * questsData.pagination.limit, questsData.pagination.total),
                                    total: questsData.pagination.total,
                                })}
                            </p>
                            {questsData.pagination.totalPages > 1 && (
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <span className="text-sm font-medium px-2">{page}</span>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setPage(p => p + 1)}
                                        disabled={page >= questsData.pagination.totalPages}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Delete confirmation dialog */}
            <Dialog open={!!questToDelete} onOpenChange={(open) => !open && setQuestToDelete(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10 text-destructive shrink-0">
                                <Trash2 className="h-5 w-5" />
                            </div>
                            <DialogTitle className="text-lg">{t('deleteQuest')}</DialogTitle>
                        </div>
                        <DialogDescription className="pt-1">
                            {t('deleteConfirm', { slug: questToDelete?.slug || '' })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setQuestToDelete(null)}
                            disabled={deleteQuest.isPending}
                        >
                            {commonT('cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleteQuest.isPending}
                        >
                            {deleteQuest.isPending ? commonT('loading') : commonT('delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    )
}