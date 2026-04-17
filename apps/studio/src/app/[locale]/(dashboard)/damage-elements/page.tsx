'use client'

import { useState } from 'react'
import { Plus, Trash2, Zap, AlertCircle, X } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { trpc } from '@/lib/trpc'

export default function DamageElementsPage() {
    const t = useTranslations('damageElements')
    const commonT = useTranslations('common')
    const [searchInput, setSearchInput] = useState('')
    const [newSlug, setNewSlug] = useState('')
    const [createError, setCreateError] = useState('')
    const [slugToDelete, setSlugToDelete] = useState<string | null>(null)
    const [isCreating, setIsCreating] = useState(false)

    const { data, isLoading, error, refetch } = trpc.damageElements.list.useQuery({
        search: searchInput || undefined,
        page: 1,
        pageSize: 100,
    })

    const createMutation = trpc.damageElements.create.useMutation({
        onSuccess: () => { refetch(); setNewSlug(''); setIsCreating(false); setCreateError('') },
        onError: (e) => setCreateError(e.message),
    })

    const deleteMutation = trpc.damageElements.delete.useMutation({
        onSuccess: () => { refetch(); setSlugToDelete(null) },
    })

    const handleCreate = () => {
        if (!newSlug.trim()) { setCreateError(commonT('required')); return }
        createMutation.mutate({ slug: newSlug.trim() })
    }

    if (error) return (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
            <AlertCircle className="h-10 w-10 text-destructive/70" />
            <p className="text-destructive font-medium">{error.message}</p>
        </div>
    )

    const list = data?.data ?? []

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                        <Zap className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
                            {!isLoading && <Badge variant="secondary" className="text-xs font-normal">{data?.pagination?.total ?? 0}</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{t('description')}</p>
                    </div>
                </div>
                <Button size="sm" className="gap-1.5" onClick={() => setIsCreating(true)}>
                    <Plus className="h-4 w-4" />{t('createNew')}
                </Button>
            </div>

            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Input
                        placeholder={t('searchPlaceholder')}
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                    />
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
                            <TableHead>{t('slug')}</TableHead>
                            <TableHead className="w-16 text-right">{commonT('actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><div className="h-4 bg-muted rounded animate-pulse w-24" /></TableCell>
                                    <TableCell />
                                </TableRow>
                            ))
                        ) : list.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={2} className="text-center py-10 text-muted-foreground">{t('noElements')}</TableCell>
                            </TableRow>
                        ) : list.map((el) => (
                            <TableRow key={el.slug}>
                                <TableCell className="font-mono font-medium">{el.slug}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive" onClick={() => setSlugToDelete(el.slug)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Create dialog */}
            <Dialog open={isCreating} onOpenChange={setIsCreating}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('createNew')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="new-slug">{t('slug')}</Label>
                            <Input
                                id="new-slug"
                                placeholder="fire"
                                value={newSlug}
                                onChange={(e) => setNewSlug(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                            />
                            <p className="text-xs text-muted-foreground">{t('slugDescription')}</p>
                            {createError && <p className="text-xs text-destructive">{createError}</p>}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setIsCreating(false); setNewSlug(''); setCreateError('') }}>{commonT('cancel')}</Button>
                        <Button onClick={handleCreate} disabled={createMutation.isPending}>{commonT('create')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete confirmation */}
            <Dialog open={slugToDelete !== null} onOpenChange={() => setSlugToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('deleteConfirmTitle')}</DialogTitle>
                        <DialogDescription>{t('deleteConfirmDescription', { slug: slugToDelete ?? '' })}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSlugToDelete(null)}>{commonT('cancel')}</Button>
                        <Button variant="destructive" onClick={() => slugToDelete && deleteMutation.mutate({ slug: slugToDelete })} disabled={deleteMutation.isPending}>{commonT('delete')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
