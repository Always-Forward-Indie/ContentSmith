'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Search, Edit, Trash2, Shield, AlertCircle, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { trpc } from '@/lib/trpc'

interface Faction { id: number; slug: string; name: string }

export default function FactionsPage() {
    const t = useTranslations('factions')
    const commonT = useTranslations('common')
    const locale = useLocale()
    const router = useRouter()
    const [searchInput, setSearchInput] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [page, setPage] = useState(1)
    const [itemToDelete, setItemToDelete] = useState<Faction | null>(null)

    useEffect(() => {
        const timer = setTimeout(() => { setSearchTerm(searchInput); setPage(1) }, 350)
        return () => clearTimeout(timer)
    }, [searchInput])

    const { data, isLoading, error, refetch } = trpc.factions.list.useQuery({ search: searchTerm || undefined, page, pageSize: 20 })
    const deleteMutation = trpc.factions.delete.useMutation({ onSuccess: () => { refetch(); setItemToDelete(null) } })
    const list: Faction[] = data?.data ?? []
    const pagination = data?.pagination

    if (error) return (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
            <AlertCircle className="h-10 w-10 text-destructive/70" />
            <p className="text-destructive font-medium">{error.message}</p>
        </div>
    )

    return (
        <TooltipProvider delayDuration={300}>
            <div className="space-y-6">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                            <Shield className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
                                {!isLoading && <Badge variant="secondary" className="text-xs font-normal">{pagination?.total ?? 0}</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">{t('description')}</p>
                        </div>
                    </div>
                    <Link href={`/${locale}/factions/create`}>
                        <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />{t('createNew')}</Button>
                    </Link>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-9" placeholder={t('searchPlaceholder')} value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
                        {searchInput && (
                            <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearchInput('')}>
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="rounded-lg border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>{t('slug')}</TableHead>
                                <TableHead>{t('name')}</TableHead>
                                <TableHead className="w-20 text-right">{commonT('actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        {Array.from({ length: 4 }).map((_, j) => <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>)}
                                    </TableRow>
                                ))
                            ) : list.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">{t('noFactions')}</TableCell>
                                </TableRow>
                            ) : list.map((item) => (
                                <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/${locale}/factions/${item.id}`)}>
                                    <TableCell className="text-muted-foreground text-sm">{item.id}</TableCell>
                                    <TableCell className="font-mono text-sm">{item.slug}</TableCell>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex justify-end gap-1">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push(`/${locale}/factions/${item.id}`)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>{commonT('edit')}</TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive" onClick={() => setItemToDelete(item)}>
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
                </div>

                {pagination && pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">{commonT('page')} {pagination.page} {commonT('of')} {pagination.totalPages}</p>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={pagination.page <= 1}><ChevronLeft className="h-4 w-4" /></Button>
                            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={pagination.page >= pagination.totalPages}><ChevronRight className="h-4 w-4" /></Button>
                        </div>
                    </div>
                )}

                <Dialog open={itemToDelete !== null} onOpenChange={() => setItemToDelete(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('deleteConfirmTitle')}</DialogTitle>
                            <DialogDescription>{t('deleteConfirmDescription', { name: itemToDelete?.name ?? '' })}</DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setItemToDelete(null)}>{commonT('cancel')}</Button>
                            <Button variant="destructive" onClick={() => itemToDelete && deleteMutation.mutate({ id: itemToDelete.id })} disabled={deleteMutation.isPending}>{commonT('delete')}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    )
}
