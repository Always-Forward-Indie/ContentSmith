'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Search, Edit, Trash2, Zap, AlertCircle, X, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'

import { trpc } from '@/lib/trpc'

interface Skill {
    id: number
    name: string
    slug: string
    scaleStatId: number
    schoolId: number
    skillSchool?: { id: number; name: string; slug: string } | null
    skillScaleType?: { id: number; name: string; slug: string } | null
}

function TableSkeleton() {
    return (
        <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4">
                    <div className="h-4 bg-muted rounded animate-pulse flex-1" />
                    <div className="h-4 bg-muted rounded animate-pulse w-24" />
                    <div className="h-4 bg-muted rounded animate-pulse w-28" />
                    <div className="h-8 bg-muted rounded animate-pulse w-20" />
                </div>
            ))}
        </div>
    )
}

export default function SkillsPage() {
    const t = useTranslations('skills')
    const commonT = useTranslations('common')
    const locale = useLocale()
    const router = useRouter()

    const [searchInput, setSearchInput] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [schoolFilter, setSchoolFilter] = useState<string>('all')
    const [scaleTypeFilter, setScaleTypeFilter] = useState<string>('all')
    const [page, setPage] = useState(1)
    const [skillToDelete, setSkillToDelete] = useState<Skill | null>(null)
    const [showFilters, setShowFilters] = useState(false)

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => { setSearchTerm(searchInput); setPage(1) }, 350)
        return () => clearTimeout(timer)
    }, [searchInput])

    const { data: skills, isLoading, error, refetch } = trpc.skills.list.useQuery({
        search: searchTerm || undefined,
        schoolId: schoolFilter !== 'all' ? Number(schoolFilter) : undefined,
        scaleStatId: scaleTypeFilter !== 'all' ? Number(scaleTypeFilter) : undefined,
        page,
        limit: 20,
    })

    const { data: schools } = trpc.skills.getSchools.useQuery()
    const { data: scaleTypes } = trpc.skills.getScaleTypes.useQuery()

    const deleteSkill = trpc.skills.delete.useMutation({
        onSuccess: () => {
            refetch()
            setSkillToDelete(null)
        },
    })

    const handleDelete = async () => {
        if (!skillToDelete?.id) return
        await deleteSkill.mutateAsync({ id: skillToDelete.id })
    }

    const skillList = skills?.data ?? []
    const hasActiveFilters = schoolFilter !== 'all' || scaleTypeFilter !== 'all' || searchTerm
    const activeFilterCount = (schoolFilter !== 'all' ? 1 : 0) + (scaleTypeFilter !== 'all' ? 1 : 0)

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
                            <Zap className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold tracking-tight">{t('skillsManagement')}</h1>
                                {!isLoading && skills?.pagination?.total !== undefined && (
                                    <Badge variant="secondary" className="text-xs font-normal">
                                        {skills.pagination.total}
                                    </Badge>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">{t('description')}</p>
                        </div>
                    </div>
                    <Link href={`/${locale}/skills/create`}>
                        <Button size="sm" className="gap-1.5">
                            <Plus className="h-4 w-4" />
                            {t('createSkill')}
                        </Button>
                    </Link>
                </div>

                {/* Filters Bar */}
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input
                                placeholder={t('searchSkills')}
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                className="pl-9 pr-8 w-64"
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
                            className="gap-1.5"
                            onClick={() => setShowFilters(v => !v)}
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                            {commonT('filters')}
                            {activeFilterCount > 0 && (
                                <span className="flex items-center justify-center w-4 h-4 text-[10px] font-semibold rounded-full bg-primary text-primary-foreground">
                                    {activeFilterCount}
                                </span>
                            )}
                        </Button>

                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1.5 text-muted-foreground"
                                onClick={() => {
                                    setSearchInput('')
                                    setSearchTerm('')
                                    setSchoolFilter('all')
                                    setScaleTypeFilter('all')
                                    setPage(1)
                                }}
                            >
                                <X className="h-3.5 w-3.5" />
                                {commonT('reset')}
                            </Button>
                        )}
                    </div>

                    {showFilters && (
                        <div className="rounded-lg border bg-muted/30 p-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground">{t('filterBySchool')}</label>
                                    <Select value={schoolFilter} onValueChange={(v) => { setSchoolFilter(v); setPage(1); }}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('allSchools')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('allSchools')}</SelectItem>
                                            {(schools ?? []).map((s: { id: number; name: string }) => (
                                                <SelectItem key={s.id} value={String(s.id)}>
                                                    {s.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground">{t('filterByScaleType')}</label>
                                    <Select value={scaleTypeFilter} onValueChange={(v) => { setScaleTypeFilter(v); setPage(1); }}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('allScaleTypes')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('allScaleTypes')}</SelectItem>
                                            {(scaleTypes ?? []).map((st: { id: number; name: string }) => (
                                                <SelectItem key={st.id} value={String(st.id)}>
                                                    {st.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

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
                                    <TableHead className="pl-4">{t('table.name')}</TableHead>
                                    <TableHead>{t('table.school')}</TableHead>
                                    <TableHead>{t('table.scaleType')}</TableHead>
                                    <TableHead className="text-right pr-4">{commonT('actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {skillList.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="py-16">
                                            <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                                <Zap className="h-10 w-10 opacity-30" />
                                                <p className="text-sm font-medium">
                                                    {hasActiveFilters ? t('noSkillsFound') : t('noSkillsFound')}
                                                </p>
                                                {!hasActiveFilters && (
                                                    <Link href={`/${locale}/skills/create`}>
                                                        <Button variant="outline" size="sm" className="mt-1 gap-1.5">
                                                            <Plus className="h-3.5 w-3.5" />
                                                            {t('createSkill')}
                                                        </Button>
                                                    </Link>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    skillList.map((skill) => (
                                        <TableRow key={skill.id} className="group cursor-pointer" onClick={() => router.push(`/${locale}/skills/${skill.id}/edit`)}>
                                            <TableCell className="pl-4">
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{skill.name}</span>
                                                    <span className="text-xs text-muted-foreground font-mono">{skill.slug}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {skill.skillSchool ? (
                                                    <Badge variant="secondary" className="font-normal">
                                                        {skill.skillSchool.name}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {skill.skillScaleType ? (
                                                    <Badge variant="outline" className="font-normal">
                                                        {skill.skillScaleType.name}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="pr-4" onClick={e => e.stopPropagation()}>
                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Link href={`/${locale}/skills/${skill.id}/edit`}>
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
                                                                onClick={() => setSkillToDelete(skill)}
                                                                disabled={deleteSkill.isLoading}
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

                    {!isLoading && skillList.length > 0 && skills?.pagination && (
                        <div className="flex items-center justify-between px-4 py-3 border-t">
                            <p className="text-sm text-muted-foreground">
                                {t('showingResults', {
                                    from: (skills.pagination.page - 1) * skills.pagination.limit + 1,
                                    to: Math.min(skills.pagination.page * skills.pagination.limit, skills.pagination.total),
                                    total: skills.pagination.total,
                                })}
                            </p>
                            {skills.pagination.totalPages > 1 && (
                                <div className="flex items-center gap-1">
                                    <Button variant="outline" size="icon" className="h-8 w-8"
                                        onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <span className="text-sm font-medium px-2">{page}</span>
                                    <Button variant="outline" size="icon" className="h-8 w-8"
                                        onClick={() => setPage(p => p + 1)} disabled={page >= skills.pagination.totalPages}>
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Delete confirmation dialog */}
            <Dialog open={!!skillToDelete} onOpenChange={(open) => !open && setSkillToDelete(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10 text-destructive shrink-0">
                                <Trash2 className="h-5 w-5" />
                            </div>
                            <DialogTitle className="text-lg">{t('deleteSkillTitle')}</DialogTitle>
                        </div>
                        <DialogDescription className="pt-1">
                            {t('deleteSkillDescription', { name: skillToDelete?.name || '' })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setSkillToDelete(null)}
                            disabled={deleteSkill.isLoading}
                        >
                            {commonT('cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleteSkill.isLoading}
                        >
                            {deleteSkill.isLoading ? commonT('loading') : commonT('delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    )
}