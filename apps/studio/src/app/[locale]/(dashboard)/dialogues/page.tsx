'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
    Plus, Search, Edit, Trash2, Eye, MessageSquare, GitBranch,
    CheckCircle2, AlertCircle, ChevronLeft, ChevronRight,
    X, SlidersHorizontal, ChevronUp, ChevronDown, ChevronsUpDown,
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

interface DialogueListItem {
    id: number
    slug: string
    version: number
    startNodeId: number | null
    npcNames: string | null
}

function TableSkeleton() {
    return (
        <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-1">
                    <div className="h-4 bg-muted rounded animate-pulse flex-1" />
                    <div className="h-4 bg-muted rounded animate-pulse w-16" />
                    <div className="h-4 bg-muted rounded animate-pulse w-20" />
                    <div className="h-8 bg-muted rounded animate-pulse w-28" />
                </div>
            ))}
        </div>
    )
}

export default function DialoguesPage() {
    const t = useTranslations('dialogues')
    const commonT = useTranslations('common')
    const locale = useLocale()
    const router = useRouter()
    const [searchInput, setSearchInput] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [page, setPage] = useState(1)
    const [dialogueToDelete, setDialogueToDelete] = useState<DialogueListItem | null>(null)
    const [filterNpcId, setFilterNpcId] = useState<number | undefined>(undefined)
    const [sortBy, setSortBy] = useState<'id' | 'slug' | 'version'>('id')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
    const [showFilters, setShowFilters] = useState(false)

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchTerm(searchInput)
            setPage(1)
        }, 350)
        return () => clearTimeout(timer)
    }, [searchInput])

    const { data: dialoguesData, isLoading, error } = trpc.dialogue.list.useQuery({
        page,
        limit: 10,
        search: searchTerm || undefined,
        npcId: filterNpcId,
        sortBy,
        sortOrder,
    })

    const { data: dialogueNpcs } = trpc.dialogue.getDialogueNpcs.useQuery()

    const deleteDialogue = trpc.dialogue.delete.useMutation({
        onSuccess: () => {
            window.location.reload()
            setDialogueToDelete(null)
        },
    })

    const handleDelete = async () => {
        if (!dialogueToDelete?.id) return
        await deleteDialogue.mutateAsync({ id: dialogueToDelete.id })
    }

    const dialogues = (dialoguesData?.data || []) as DialogueListItem[]
    const totalCount = dialoguesData?.pagination?.total ?? null

    const activeFilterCount = [filterNpcId].filter(v => v !== undefined).length

    const clearFilters = () => {
        setFilterNpcId(undefined)
        setPage(1)
    }

    const toggleSort = (col: 'id' | 'slug' | 'version') => {
        if (sortBy === col) setSortOrder(o => o === 'asc' ? 'desc' : 'asc')
        else { setSortBy(col); setSortOrder('asc') }
        setPage(1)
    }

    const SortIcon = ({ col }: { col: 'id' | 'slug' | 'version' }) => {
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
                            <MessageSquare className="h-5 w-5" />
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
                    <Link href={`/${locale}/dialogues/new`}>
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
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('table.npc')}</p>
                                <Select
                                    value={filterNpcId !== undefined ? String(filterNpcId) : 'all'}
                                    onValueChange={v => { setFilterNpcId(v === 'all' ? undefined : Number(v)); setPage(1) }}
                                >
                                    <SelectTrigger className="h-8 bg-background">
                                        <SelectValue placeholder={t('table.npc')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Все NPC</SelectItem>
                                        {dialogueNpcs?.map(n => (
                                            <SelectItem key={n.id} value={String(n.id)}>{n.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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
                                    <TableHead>{t('table.npc')}</TableHead>
                                    <TableHead
                                        className="cursor-pointer select-none hover:text-foreground"
                                        onClick={() => toggleSort('version')}
                                    >
                                        <span className="inline-flex items-center">{t('table.version')}<SortIcon col="version" /></span>
                                    </TableHead>
                                    <TableHead>{t('table.startNode')}</TableHead>
                                    <TableHead className="text-right pr-4">{commonT('actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {dialogues.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-16">
                                            <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                                <MessageSquare className="h-10 w-10 opacity-30" />
                                                <p className="text-sm font-medium">
                                                    {searchTerm ? t('dialoguesNotFound') : t('noDialogues')}
                                                </p>
                                                {!searchTerm && (
                                                    <Link href={`/${locale}/dialogues/new`}>
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
                                    dialogues.map((dialogue) => (
                                        <TableRow
                                            key={dialogue.id}
                                            className="group cursor-pointer"
                                            onClick={() => router.push(`/${locale}/dialogues/${dialogue.id}`)}
                                        >
                                            <TableCell className="pl-4">
                                                <div className="flex flex-col">
                                                    <span className="font-medium font-mono text-sm">{dialogue.slug}</span>
                                                    <span className="text-xs text-muted-foreground">#{dialogue.id}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {dialogue.npcNames
                                                    ? <span className="text-sm">{dialogue.npcNames}</span>
                                                    : <span className="text-muted-foreground text-sm">—</span>}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-xs font-normal">
                                                    v{dialogue.version}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {dialogue.startNodeId ? (
                                                    <div className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                                                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                                        <span className="font-mono">#{dialogue.startNodeId}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
                                                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                                        <span>{t('table.noStartNode')}</span>
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="pr-4" onClick={e => e.stopPropagation()}>
                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8"
                                                                onClick={() => router.push(`/${locale}/dialogues/${dialogue.id}`)}>
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>{t('actions.view')}</TooltipContent>
                                                    </Tooltip>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8"
                                                                onClick={() => router.push(`/${locale}/dialogues/${dialogue.id}/graph`)}>
                                                                <GitBranch className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>{t('graph.title')}</TooltipContent>
                                                    </Tooltip>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8"
                                                                onClick={() => router.push(`/${locale}/dialogues/${dialogue.id}/edit`)}>
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
                                                                onClick={() => setDialogueToDelete(dialogue)}
                                                                disabled={deleteDialogue.isPending}
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
                    {!isLoading && dialogues.length > 0 && dialoguesData?.pagination && (
                        <div className="flex items-center justify-between px-4 py-3 border-t">
                            <p className="text-sm text-muted-foreground">
                                {t('showingResults', {
                                    from: (dialoguesData.pagination.page - 1) * dialoguesData.pagination.limit + 1,
                                    to: Math.min(dialoguesData.pagination.page * dialoguesData.pagination.limit, dialoguesData.pagination.total),
                                    total: dialoguesData.pagination.total,
                                })}
                            </p>
                            {dialoguesData.pagination.totalPages > 1 && (
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
                                        disabled={page >= dialoguesData.pagination.totalPages}
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
            <Dialog open={!!dialogueToDelete} onOpenChange={(open) => !open && setDialogueToDelete(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10 text-destructive shrink-0">
                                <Trash2 className="h-5 w-5" />
                            </div>
                            <DialogTitle className="text-lg">{t('deleteConfirmTitle')}</DialogTitle>
                        </div>
                        <DialogDescription className="pt-1">
                            {t('deleteConfirmDescription', { slug: dialogueToDelete?.slug || '' })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setDialogueToDelete(null)}
                            disabled={deleteDialogue.isPending}
                        >
                            {commonT('cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleteDialogue.isPending}
                        >
                            {deleteDialogue.isPending ? commonT('loading') : commonT('delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    )
}