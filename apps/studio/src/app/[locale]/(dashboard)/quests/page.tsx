'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react'
import { useTranslations } from 'next-intl';

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
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from '@/components/ui/dialog'

import { trpc } from '@/lib/trpc'

export default function QuestsPage() {
    const t = useTranslations('quests')
    const commonT = useTranslations('common')
    const [searchTerm, setSearchTerm] = useState('')
    const [page, setPage] = useState(1)

    // Fetch quests with tRPC
    const { data: questsData, isLoading, error } = trpc.quest.list.useQuery({
        page,
        limit: 10,
        search: searchTerm || undefined,
    })

    const deleteQuest = trpc.quest.delete.useMutation({
        onSuccess: () => {
            // Refresh the list
            trpc.useUtils().quest.list.invalidate()
        },
    })

    const handleDeleteQuest = (id: number) => {
        if (confirm(commonT('confirmDelete'))) {
            deleteQuest.mutate({ id })
        }
    }

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        setPage(1) // Reset to first page when searching
    }

    const quests = questsData?.data || []

    return (
        <div className="container mx-auto py-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">{t('title')}</h1>
                    <p className="text-muted-foreground">
                        {t('description')}
                    </p>
                </div>
                <Link href="/quests/new">
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
                            {t('errorLoading')}: {error.message}
                        </div>
                    )}

                    {!isLoading && !error && (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>Slug</TableHead>
                                    <TableHead>{t('table.minLevel')}</TableHead>
                                    <TableHead>{t('table.repeatable')}</TableHead>
                                    <TableHead>{t('table.cooldown')}</TableHead>
                                    <TableHead>{t('table.clientKey')}</TableHead>
                                    <TableHead className="text-right">{commonT('actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {quests.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8">
                                            {searchTerm ? t('questsNotFound') : t('noQuests')}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    quests.map((quest) => (
                                        <TableRow key={quest.id}>
                                            <TableCell className="font-medium">
                                                {quest.id}
                                            </TableCell>
                                            <TableCell>{quest.slug}</TableCell>
                                            <TableCell>{quest.minLevel}</TableCell>
                                            <TableCell>
                                                {quest.repeatable ? commonT('yes') : commonT('no')}
                                            </TableCell>
                                            <TableCell>{quest.cooldownSec}</TableCell>
                                            <TableCell>
                                                {quest.clientQuestKey || '—'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Link href={`/quests/${quest.id}`}>
                                                        <Button variant="outline" size="sm">
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                    <Link href={`/quests/${quest.id}/edit`}>
                                                        <Button variant="outline" size="sm">
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Button variant="outline" size="sm">
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent>
                                                            <DialogHeader>
                                                                <DialogTitle>{t('deleteQuest')}</DialogTitle>
                                                                <DialogDescription>
                                                                    {t('deleteConfirm', { slug: quest.slug })}
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            <div className="flex justify-end gap-2">
                                                                <DialogClose asChild>
                                                                    <Button variant="outline">
                                                                        {commonT('cancel')}
                                                                    </Button>
                                                                </DialogClose>
                                                                <Button
                                                                    variant="destructive"
                                                                    onClick={() => handleDeleteQuest(quest.id)}
                                                                    disabled={deleteQuest.isPending}
                                                                >
                                                                    {deleteQuest.isPending ? t('deleting') : commonT('delete')}
                                                                </Button>
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}

                    {questsData && questsData.data.length > 0 && (
                        <div className="flex items-center justify-between mt-4">
                            <div className="text-sm text-muted-foreground">
                                {t('showingResults', {
                                    current: questsData.data.length,
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
                                    disabled={questsData.data.length < 10}
                                >
                                    {commonT('next')}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}