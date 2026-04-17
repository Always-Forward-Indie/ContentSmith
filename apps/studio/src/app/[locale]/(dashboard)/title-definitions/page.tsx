'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Edit, Trash2, AlertCircle } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { trpc } from '@/lib/trpc'

interface TitleDefinition {
    id: number
    slug: string
    displayName: string
    earnCondition?: string | null
    description?: string | null
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

export default function TitleDefinitionsPage() {
    const t = useTranslations('titleDefinitions')
    const commonT = useTranslations('common')
    const locale = useLocale()
    const router = useRouter()
    const [itemToDelete, setItemToDelete] = useState<TitleDefinition | null>(null)

    const { data, isLoading, error, refetch } = trpc.titleDefinitions.list.useQuery({})
    const deleteItem = trpc.titleDefinitions.delete.useMutation({ onSuccess: () => { refetch(); setItemToDelete(null) } })
    const list: TitleDefinition[] = data?.data ?? []

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
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
                            {!isLoading && <Badge variant="secondary" className="text-xs font-normal">{list.length}</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{t('description')}</p>
                    </div>
                    <Link href={`/${locale}/title-definitions/create`}>
                        <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />{t('createNew')}</Button>
                    </Link>
                </div>

                <div className="rounded-lg border bg-card">
                    {isLoading ? <div className="p-6"><TableSkeleton /></div> : (
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="pl-4">{t('id')}</TableHead>
                                    <TableHead>{t('slug')}</TableHead>
                                    <TableHead>{t('displayName')}</TableHead>
                                    <TableHead>{t('earnCondition')}</TableHead>
                                    <TableHead className="text-right pr-4">{commonT('actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {list.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-16">
                                            <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                                <p className="text-sm font-medium">{t('noItemsFound')}</p>
                                                <Link href={`/${locale}/title-definitions/create`}>
                                                    <Button variant="outline" size="sm" className="mt-1 gap-1.5"><Plus className="h-3.5 w-3.5" />{t('createNew')}</Button>
                                                </Link>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : list.map((item) => (
                                    <TableRow key={item.id} className="group cursor-pointer" onClick={() => router.push(`/${locale}/title-definitions/${item.id}`)}>
                                        <TableCell className="pl-4 font-mono text-sm">{item.id}</TableCell>
                                        <TableCell className="font-mono text-sm">{item.slug}</TableCell>
                                        <TableCell>{item.displayName}</TableCell>
                                        <TableCell>{item.earnCondition ?? '—'}</TableCell>
                                        <TableCell className="pr-4" onClick={e => e.stopPropagation()}>
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Link href={`/${locale}/title-definitions/${item.id}`}>
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
                        <DialogDescription className="pt-1">{t('deleteDescription', { name: itemToDelete?.slug || '' })}</DialogDescription>
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
