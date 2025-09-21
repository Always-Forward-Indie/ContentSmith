'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
    DialogTrigger,
} from '@/components/ui/dialog'

import { trpc } from '@/lib/trpc'
import type { Dialogue } from '@contentsmith/validation'

export default function DialoguesPage() {
    const t = useTranslations('dialogues')
    const commonT = useTranslations('common')
    const [searchTerm, setSearchTerm] = useState('')
    const [page, setPage] = useState(1)
    const [dialogueToDelete, setDialogueToDelete] = useState<Dialogue | null>(null)

    // Fetch dialogues with tRPC
    const { data: dialoguesData, isLoading, error } = trpc.dialogue.list.useQuery({
        page,
        limit: 10,
        search: searchTerm || undefined,
    })

    const deleteDialogue = trpc.dialogue.delete.useMutation({
        onSuccess: () => {
            // Refresh the list
            window.location.reload()
            setDialogueToDelete(null)
        },
    })

    const handleDelete = async () => {
        if (!dialogueToDelete?.id) {
            console.error('Cannot delete dialogue without ID')
            return
        }

        await deleteDialogue.mutateAsync({ id: dialogueToDelete.id })
    }

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        setPage(1) // Reset to first page when searching
    }

    const dialogues = dialoguesData?.data || []

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-destructive">{commonT('error')}: {error.message}</p>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">{t('title')}</h1>
                    <p className="text-muted-foreground">
                        {t('description')}
                    </p>
                </div>
                <Link href="/dialogues/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        {t('createNew')}
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('list')}</CardTitle>
                    <CardDescription>
                        {t('listDescription')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                        <Input
                            placeholder={t('searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-1"
                        />
                        <Button type="submit" variant="outline">
                            <Search className="h-4 w-4" />
                        </Button>
                    </form>

                    {isLoading && (
                        <div className="text-center py-8">
                            {commonT('loading')}
                        </div>
                    )}

                    {error && (
                        <div className="text-center py-8 text-red-600">
                            {commonT('error')}: {String(error)}
                        </div>
                    )}

                    {!isLoading && !error && (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ID</TableHead>
                                        <TableHead>Slug</TableHead>
                                        <TableHead>{t('table.version')}</TableHead>
                                        <TableHead>{t('table.startNode')}</TableHead>
                                        <TableHead className="text-right">{commonT('actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {dialogues.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8">
                                                {searchTerm ? t('dialoguesNotFound') : t('noDialogues')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        dialogues.map((dialogue) => (
                                            <TableRow key={dialogue.id}>
                                                <TableCell className="font-medium">
                                                    {dialogue.id}
                                                </TableCell>
                                                <TableCell>{dialogue.slug}</TableCell>
                                                <TableCell>{dialogue.version}</TableCell>
                                                <TableCell>
                                                    {dialogue.startNodeId ? (
                                                        <span className="font-mono">#{dialogue.startNodeId}</span>
                                                    ) : (
                                                        <span className="text-muted-foreground">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Link href={`/dialogues/${dialogue.id}`}>
                                                            <Button variant="outline" size="sm">
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </Link>
                                                        <Link href={`/dialogues/${dialogue.id}/edit`}>
                                                            <Button variant="outline" size="sm">
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                        </Link>
                                                        <Link href={`/dialogues/${dialogue.id}/graph`}>
                                                            <Button variant="outline" size="sm">
                                                                {t('graph.title')}
                                                            </Button>
                                                        </Link>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setDialogueToDelete(dialogue)}
                                                            disabled={deleteDialogue.isLoading}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>

                            {dialogues.length > 0 && (
                                <div className="flex items-center justify-between mt-4">
                                    <div className="text-sm text-muted-foreground">
                                        {t('showingResults', {
                                            current: dialogues.length,
                                            page: page
                                        })}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                        >
                                            {commonT('previous')}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(p => p + 1)}
                                            disabled={dialogues.length < 10}
                                        >
                                            {commonT('next')}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Delete confirmation dialog */}
            <Dialog open={!!dialogueToDelete} onOpenChange={(open) => !open && setDialogueToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('deleteConfirmTitle')}</DialogTitle>
                        <DialogDescription>
                            {t('deleteConfirmDescription', { slug: dialogueToDelete?.slug || '' })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDialogueToDelete(null)}
                            disabled={deleteDialogue.isLoading}
                        >
                            {commonT('cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleteDialogue.isLoading}
                        >
                            {deleteDialogue.isLoading ? commonT('loading') : commonT('delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}