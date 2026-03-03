'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Search, Edit, Trash2, Sparkles, AlertCircle, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { trpc } from '@/lib/trpc'

interface SkillEffect {
    id: number
    slug: string
    effectType: { id: number; slug: string } | null
}

function TableSkeleton() {
    return (
        <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4">
                    <div className="h-4 bg-muted rounded animate-pulse flex-1" />
                    <div className="h-4 bg-muted rounded animate-pulse w-24" />
                    <div className="h-8 bg-muted rounded animate-pulse w-20" />
                </div>
            ))}
        </div>
    )
}

export default function SkillEffectsPage() {
    const t = useTranslations('skillEffects')
    const commonT = useTranslations('common')
    const locale = useLocale()
    const router = useRouter()
    const [searchInput, setSearchInput] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [page, setPage] = useState(1)
    const [itemToDelete, setItemToDelete] = useState<SkillEffect | null>(null)

    useEffect(() => {
        const timer = setTimeout(() => { setSearchTerm(searchInput); setPage(1) }, 350)
        return () => clearTimeout(timer)
    }, [searchInput])

    const { data, isLoading, error, refetch } = trpc.skillEffects.list.useQuery({ search: searchTerm.trim() || undefined, page, pageSize: 20 })
    const deleteItem = trpc.skillEffects.delete.useMutation({ onSuccess: () => { refetch(); setItemToDelete(null) } })
    const list: SkillEffect[] = data?.data ?? []

    if (error) return (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
            <AlertCircle className="h-10 w-10 text-destructive/70" />
            <p className="text-destructive font-medium">{commonT('error')}: {error.message}</p>
        </div>
    )

    return (
        <TooltipProvider delayDuration={300}>
            <div className="space-y-6">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                            <Sparkles className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold tracking-tight">{t('skillEffects')}</h1>
                                {!isLoading && <Badge variant="secondary" className="text-xs font-normal">{data?.pagination?.total ?? 0}</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">{t('description')}</p>
                        </div>
                    </div>
                    <Link href={`/${locale}/skill-effects/create`}>
                        <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />{t('addSkillEffect')}</Button>
                    </Link>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input placeholder={t('search')} value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-9 pr-8 max-w-sm" />
                    {searchInput && (
                        <button
                            onClick={() => setSearchInput('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                <div className="rounded-lg border bg-card">
                    {isLoading ? <div className="p-6"><TableSkeleton /></div> : (
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="pl-4">{t('skillEffectSlug')}</TableHead>
                                    <TableHead>{t('effectType')}</TableHead>
                                    <TableHead className="text-right pr-4">{commonT('actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {list.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="py-16">
                                            <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                                <Sparkles className="h-10 w-10 opacity-30" />
                                                <p className="text-sm font-medium">{t('noSkillEffects')}</p>
                                                <Link href={`/${locale}/skill-effects/create`}>
                                                    <Button variant="outline" size="sm" className="mt-1 gap-1.5"><Plus className="h-3.5 w-3.5" />{t('addSkillEffect')}</Button>
                                                </Link>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : list.map((item) => (
                                    <TableRow key={item.id} className="group cursor-pointer" onClick={() => router.push(`/${locale}/skill-effects/${item.id}/edit`)}>
                                        <TableCell className="pl-4">
                                            <span className="font-medium font-mono text-sm">{item.slug}</span>
                                        </TableCell>
                                        <TableCell>
                                            {item.effectType ? (
                                                <Badge variant="secondary" className="font-normal font-mono text-xs">{item.effectType.slug}</Badge>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="pr-4" onClick={e => e.stopPropagation()}>
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Link href={`/${locale}/skill-effects/${item.id}/edit`}>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                                                        </Link>
                                                    </TooltipTrigger>
                                                    <TooltipContent>{commonT('edit')}</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setItemToDelete(item)} disabled={deleteItem.isLoading}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>{commonT('delete')}</TooltipContent>
                                                </Tooltip>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                    {!isLoading && list.length > 0 && data?.pagination && (
                        <div className="flex items-center justify-between px-4 py-3 border-t">
                            <p className="text-sm text-muted-foreground">{t('showingResults', {
                                from: (data.pagination.page - 1) * data.pagination.pageSize + 1,
                                to: Math.min(data.pagination.page * data.pagination.pageSize, data.pagination.total),
                                total: data.pagination.total,
                            })}</p>
                            {data.pagination.totalPages > 1 && (
                                <div className="flex items-center gap-1">
                                    <Button variant="outline" size="icon" className="h-8 w-8"
                                        onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <span className="text-sm font-medium px-2">{page}</span>
                                    <Button variant="outline" size="icon" className="h-8 w-8"
                                        onClick={() => setPage(p => p + 1)} disabled={page >= data.pagination.totalPages}>
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10 text-destructive shrink-0">
                                <Trash2 className="h-5 w-5" />
                            </div>
                            <DialogTitle className="text-lg">{t('deleteSkillEffect')}</DialogTitle>
                        </div>
                        <DialogDescription className="pt-1">{t('deleteSkillEffectConfirm')}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setItemToDelete(null)} disabled={deleteItem.isLoading}>{commonT('cancel')}</Button>
                        <Button variant="destructive" onClick={() => itemToDelete && deleteItem.mutate({ id: itemToDelete.id })} disabled={deleteItem.isLoading}>
                            {deleteItem.isLoading ? commonT('loading') : commonT('delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    )
}