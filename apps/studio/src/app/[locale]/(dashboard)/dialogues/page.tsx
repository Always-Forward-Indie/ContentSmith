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

import { trpc } from '@/lib/trpc'

export default function DialoguesPage() {
    const t = useTranslations()
    const [searchTerm, setSearchTerm] = useState('')
    const [page, setPage] = useState(1)

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
        },
    })

    const handleDelete = async (id: number) => {
        if (confirm(t('common.confirmDelete'))) {
            await deleteDialogue.mutateAsync({ id })
        }
    }

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        setPage(1) // Reset to first page when searching
    }

    const dialogues = dialoguesData?.data || []

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-destructive">{t('common.error')}: {error.message}</p>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">{t('dialogues.title')}</h1>
                    <p className="text-muted-foreground">
                        {t('dialogues.description')}
                    </p>
                </div>
                <Link href="/dialogues/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        {t('dialogues.createNew')}
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('dialogues.list')}</CardTitle>
                    <CardDescription>
                        {t('dialogues.listDescription')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                        <Input
                            placeholder={t('dialogues.searchPlaceholder')}
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
                            {t('common.loading')}
                        </div>
                    )}

                    {error && (
                        <div className="text-center py-8 text-red-600">
                            {t('common.error')}: {String(error)}
                        </div>
                    )}

                    {!isLoading && !error && (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ID</TableHead>
                                        <TableHead>Slug</TableHead>
                                        <TableHead>{t('dialogues.table.version')}</TableHead>
                                        <TableHead>{t('dialogues.table.startNode')}</TableHead>
                                        <TableHead className="text-right">{t('common.actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {dialogues.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8">
                                                {searchTerm ? t('dialogues.dialoguesNotFound') : t('dialogues.noDialogues')}
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
                                                                {t('dialogues.graph.title')}
                                                            </Button>
                                                        </Link>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleDelete(dialogue.id!)}
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
                                        {t('dialogues.showingResults', {
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
                                            {t('common.previous')}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(p => p + 1)}
                                            disabled={dialogues.length < 10}
                                        >
                                            {t('common.next')}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}