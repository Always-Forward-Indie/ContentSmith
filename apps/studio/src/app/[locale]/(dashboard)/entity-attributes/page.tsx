'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Search, Edit, Trash2, SlidersHorizontal, AlertCircle, ChevronLeft, ChevronRight, X } from 'lucide-react'
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
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'

import { trpc } from '@/lib/trpc'

function TableSkeleton() {
    return (
        <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-1">
                    <div className="h-4 bg-muted rounded animate-pulse w-10" />
                    <div className="h-4 bg-muted rounded animate-pulse flex-1" />
                    <div className="h-4 bg-muted rounded animate-pulse w-36" />
                    <div className="h-8 bg-muted rounded animate-pulse w-20" />
                </div>
            ))}
        </div>
    )
}

export default function EntityAttributesPage() {
    const t = useTranslations('entityAttributes')
    const commonT = useTranslations('common')
    const locale = useLocale()
    const router = useRouter()

    const [searchInput, setSearchInput] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [page, setPage] = useState(1)
    const [attributeToDelete, setAttributeToDelete] = useState<{ id: number; name: string } | null>(null)

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchTerm(searchInput)
            setPage(1)
        }, 350)
        return () => clearTimeout(timer)
    }, [searchInput])

    const { data: entityAttributes, isLoading, error, refetch } = trpc.entityAttributes.list.useQuery({
        search: searchTerm || undefined,
        page,
        pageSize: 20,
    })

    const deleteEntityAttribute = trpc.entityAttributes.delete.useMutation({
        onSuccess: () => {
            refetch()
            setAttributeToDelete(null)
        },
    })

    const handleDelete = async () => {
        if (!attributeToDelete?.id) return
        await deleteEntityAttribute.mutateAsync({ id: attributeToDelete.id })
    }

    const totalCount = entityAttributes?.pagination?.total ?? null

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
                            <SlidersHorizontal className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold tracking-tight">{t('entityAttributes')}</h1>
                                {!isLoading && totalCount !== null && (
                                    <Badge variant="secondary" className="text-xs font-normal">
                                        {totalCount}
                                    </Badge>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">{t('description')}</p>
                        </div>
                    </div>
                    <Link href={`/${locale}/entity-attributes/create`}>
                        <Button size="sm" className="gap-1.5">
                            <Plus className="h-4 w-4" />
                            {t('addEntityAttribute')}
                        </Button>
                    </Link>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                        placeholder={t('search')}
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="pl-9 pr-8 max-w-sm"
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
                                    <TableHead className="pl-4 w-14">ID</TableHead>
                                    <TableHead>{t('entityAttributeName')}</TableHead>
                                    <TableHead>{t('entityAttributeSlug')}</TableHead>
                                    <TableHead className="text-right pr-4">{commonT('actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {!entityAttributes?.data || entityAttributes.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="py-16">
                                            <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                                <SlidersHorizontal className="h-10 w-10 opacity-30" />
                                                <p className="text-sm font-medium">
                                                    {searchTerm ? commonT('noResults') : t('noEntityAttributes')}
                                                </p>
                                                {!searchTerm && (
                                                    <Link href={`/${locale}/entity-attributes/create`}>
                                                        <Button variant="outline" size="sm" className="mt-1 gap-1.5">
                                                            <Plus className="h-3.5 w-3.5" />
                                                            {t('addEntityAttribute')}
                                                        </Button>
                                                    </Link>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    (entityAttributes?.data ?? []).map((attribute) => (
                                        <TableRow key={attribute.id} className="group cursor-pointer" onClick={() => router.push(`/${locale}/entity-attributes/${attribute.id}/edit`)}>
                                            <TableCell className="pl-4">
                                                <span className="text-xs text-muted-foreground font-mono">#{attribute.id}</span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-medium">{attribute.name}</span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-mono text-sm text-muted-foreground">{attribute.slug}</span>
                                            </TableCell>
                                            <TableCell className="pr-4" onClick={e => e.stopPropagation()}>
                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Link href={`/${locale}/entity-attributes/${attribute.id}/edit`}>
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
                                                                onClick={() => setAttributeToDelete({ id: attribute.id, name: attribute.name })}
                                                                disabled={deleteEntityAttribute.isPending}
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
                    {!isLoading && (entityAttributes?.data?.length ?? 0) > 0 && entityAttributes?.pagination && (
                        <div className="flex items-center justify-between px-4 py-3 border-t">
                            <p className="text-sm text-muted-foreground">{t('showingResults', {
                                from: (entityAttributes.pagination.page - 1) * entityAttributes.pagination.pageSize + 1,
                                to: Math.min(entityAttributes.pagination.page * entityAttributes.pagination.pageSize, entityAttributes.pagination.total),
                                total: entityAttributes.pagination.total,
                            })}</p>
                            {entityAttributes.pagination.totalPages > 1 && (
                                <div className="flex items-center gap-1">
                                    <Button variant="outline" size="icon" className="h-8 w-8"
                                        onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <span className="text-sm font-medium px-2">{page}</span>
                                    <Button variant="outline" size="icon" className="h-8 w-8"
                                        onClick={() => setPage(p => p + 1)} disabled={page >= entityAttributes.pagination.totalPages}>
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Delete confirmation dialog */}
            <Dialog open={!!attributeToDelete} onOpenChange={(open) => !open && setAttributeToDelete(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10 text-destructive shrink-0">
                                <Trash2 className="h-5 w-5" />
                            </div>
                            <DialogTitle className="text-lg">{t('deleteEntityAttribute')}</DialogTitle>
                        </div>
                        <DialogDescription className="pt-1">
                            {t('deleteEntityAttributeConfirm')}
                            {attributeToDelete && (
                                <span className="font-medium"> &quot;{attributeToDelete.name}&quot;</span>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setAttributeToDelete(null)}
                            disabled={deleteEntityAttribute.isPending}
                        >
                            {commonT('cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleteEntityAttribute.isPending}
                        >
                            {deleteEntityAttribute.isPending ? commonT('loading') : commonT('delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    )
}