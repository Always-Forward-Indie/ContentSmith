'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Search, Edit, Trash2, Globe, AlertCircle, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { trpc } from '@/lib/trpc'
import { useEffect } from 'react'

interface WorldObject {
    id: number
    slug: string
    nameKey?: string | null
    objectType?: string | null
    zone?: { name?: string; slug?: string } | null
    scope?: string | null
    isActiveByDefault?: boolean | null
    minLevel?: number | null
}

function TableSkeleton() {
    return (
        <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4">
                    <div className="h-4 bg-muted rounded animate-pulse flex-1" />
                    <div className="h-8 bg-muted rounded animate-pulse w-20" />
                </div>
            ))}
        </div>
    )
}

export default function WorldObjectsPage() {
    const t = useTranslations('worldObjects')
    const commonT = useTranslations('common')
    const locale = useLocale()
    const router = useRouter()
    const [objectTypeFilter, setObjectTypeFilter] = useState('')
    const [objectTypeQuery, setObjectTypeQuery] = useState('')
    const [page, setPage] = useState(1)
    const [itemToDelete, setItemToDelete] = useState<WorldObject | null>(null)

    useEffect(() => {
        const timer = setTimeout(() => { setObjectTypeQuery(objectTypeFilter); setPage(1) }, 350)
        return () => clearTimeout(timer)
    }, [objectTypeFilter])

    const { data, isLoading, error, refetch } = trpc.worldObjects.list.useQuery({
        page,
        pageSize: 20,
        objectType: objectTypeQuery || undefined,
    })
    const deleteItem = trpc.worldObjects.delete.useMutation({ onSuccess: () => { refetch(); setItemToDelete(null) } })
    const list: WorldObject[] = data?.data ?? []

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
                            <Globe className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
                                {!isLoading && <Badge variant="secondary" className="text-xs font-normal">{data?.pagination?.total ?? 0}</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">{t('description')}</p>
                        </div>
                    </div>
                    <Link href={`/${locale}/world-objects/create`}>
                        <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />{t('create')}</Button>
                    </Link>
                </div>

                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                        placeholder={t('filterByType')}
                        value={objectTypeFilter}
                        onChange={(e) => setObjectTypeFilter(e.target.value)}
                        className="pl-9 pr-8"
                    />
                    {objectTypeFilter && (
                        <button onClick={() => setObjectTypeFilter('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                <div className="rounded-lg border bg-card">
                    {isLoading ? <div className="p-6"><TableSkeleton /></div> : (
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="pl-4">ID</TableHead>
                                    <TableHead>{t('slug')}</TableHead>
                                    <TableHead>{t('nameKey')}</TableHead>
                                    <TableHead>{t('objectType')}</TableHead>
                                    <TableHead>{t('zone')}</TableHead>
                                    <TableHead>{t('scope')}</TableHead>
                                    <TableHead>{t('isActiveByDefault')}</TableHead>
                                    <TableHead>{t('minLevel')}</TableHead>
                                    <TableHead className="text-right pr-4">{commonT('actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {list.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="py-16">
                                            <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                                <Globe className="h-10 w-10 opacity-30" />
                                                <p className="text-sm font-medium">{t('noItems')}</p>
                                                <Link href={`/${locale}/world-objects/create`}>
                                                    <Button variant="outline" size="sm" className="mt-1 gap-1.5"><Plus className="h-3.5 w-3.5" />{t('create')}</Button>
                                                </Link>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : list.map((item) => (
                                    <TableRow key={item.id} className="group cursor-pointer" onClick={() => router.push(`/${locale}/world-objects/${item.id}`)}>
                                        <TableCell className="pl-4 font-mono text-xs text-muted-foreground">{item.id}</TableCell>
                                        <TableCell className="font-medium font-mono text-xs">{item.slug}</TableCell>
                                        <TableCell className="text-sm font-mono text-xs">{item.nameKey ?? '—'}</TableCell>
                                        <TableCell className="text-sm">{item.objectType ?? '—'}</TableCell>
                                        <TableCell className="text-sm">{item.zone?.name ?? item.zone?.slug ?? '—'}</TableCell>
                                        <TableCell className="text-sm">{item.scope ?? '—'}</TableCell>
                                        <TableCell>
                                            <Badge variant={item.isActiveByDefault ? 'default' : 'secondary'} className="text-xs">
                                                {item.isActiveByDefault ? commonT('yes') : commonT('no')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm">{item.minLevel ?? '—'}</TableCell>
                                        <TableCell className="pr-4" onClick={e => e.stopPropagation()}>
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Link href={`/${locale}/world-objects/${item.id}`}>
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
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <span className="text-sm font-medium px-2">{page}</span>
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(p => p + 1)} disabled={page >= data.pagination.totalPages}>
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
                            <DialogTitle className="text-lg">{t('deleteTitle')}</DialogTitle>
                        </div>
                        <DialogDescription className="pt-1">{t('deleteDescription', { slug: itemToDelete?.slug || '' })}</DialogDescription>
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
