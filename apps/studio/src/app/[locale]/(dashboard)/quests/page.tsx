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
} from '@/components/ui/dialog'

import { trpc } from '@/lib/trpc'

export default function QuestsPage() {
    const t = useTranslations();
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
        if (confirm(t('common.confirmDelete'))) {
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
                    <h1 className="text-3xl font-bold">{t('quests.title')}</h1>
                    <p className="text-muted-foreground">
                        {t('quests.description')}
                    </p>
                </div>
                <Link href="/quests/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        {t('quests.createNew')}
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('quests.list')}</CardTitle>
                    <CardDescription>
                        {t('quests.listDescription')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                        <Input
                            placeholder={t('quests.searchPlaceholder')}
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
                            Ошибка загрузки: {error.message}
                        </div>
                    )}

                    {!isLoading && !error && (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>Slug</TableHead>
                                    <TableHead>Мин. уровень</TableHead>
                                    <TableHead>Повторяемый</TableHead>
                                    <TableHead>Кулдаун (сек)</TableHead>
                                    <TableHead>Ключ клиента</TableHead>
                                    <TableHead className="text-right">Действия</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {quests.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8">
                                            {searchTerm ? 'Квесты не найдены' : 'Нет квестов'}
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
                                                {quest.repeatable ? 'Да' : 'Нет'}
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
                                                                <DialogTitle>Удалить квест</DialogTitle>
                                                                <DialogDescription>
                                                                    Вы уверены, что хотите удалить квест "{quest.slug}"?
                                                                    Это действие нельзя отменить.
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            <div className="flex justify-end gap-2">
                                                                <Button variant="outline">
                                                                    Отмена
                                                                </Button>
                                                                <Button
                                                                    variant="destructive"
                                                                    onClick={() => handleDeleteQuest(quest.id)}
                                                                    disabled={deleteQuest.isPending}
                                                                >
                                                                    {deleteQuest.isPending ? 'Удаление...' : 'Удалить'}
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
                                Страница {page}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    Предыдущая
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={questsData.data.length < 10}
                                >
                                    Следующая
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}