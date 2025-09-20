'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Edit, Plus, Trash2, ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
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
import { Skeleton } from '@/components/ui/skeleton'

import { trpc } from '@/lib/trpc'

export default function QuestDetailPage() {
    const params = useParams()
    const router = useRouter()
    const questId = parseInt(params.id as string, 10)

    // Fetch quest with steps
    const { data: questData, isLoading, error } = trpc.quest.getWithSteps.useQuery({
        id: questId,
    })

    const deleteStep = trpc.quest.deleteStep.useMutation({
        onSuccess: () => {
            trpc.useUtils().quest.getWithSteps.invalidate({ id: questId })
        },
    })

    const handleDeleteStep = (stepId: number) => {
        if (confirm('Вы уверены, что хотите удалить этот шаг квеста?')) {
            deleteStep.mutate({ id: stepId })
        }
    }

    if (isLoading) {
        return (
            <div className="container mx-auto py-6">
                <div className="mb-6">
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-96" />
                </div>
                <div className="grid gap-6">
                    <Skeleton className="h-64" />
                    <Skeleton className="h-96" />
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="container mx-auto py-6">
                <div className="text-center py-8">
                    <h1 className="text-2xl font-bold mb-2">Ошибка загрузки</h1>
                    <p className="text-red-600 mb-4">{error.message}</p>
                    <Button onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Назад
                    </Button>
                </div>
            </div>
        )
    }

    const { quest, steps } = questData!

    const getStepTypeLabel = (type: string) => {
        const types: Record<string, string> = {
            collect: 'Собрать',
            kill: 'Убить',
            talk: 'Поговорить',
            reach: 'Достичь',
            custom: 'Пользовательский',
        }
        return types[type] || type
    }

    const formatStepParams = (params: Record<string, any>) => {
        return JSON.stringify(params, null, 2)
    }

    return (
        <div className="container mx-auto py-6">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Назад
                </Button>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold">{quest.slug}</h1>
                    <p className="text-muted-foreground">
                        Детали квеста и его шаги
                    </p>
                </div>
                <Link href={`/quests/${quest.id}/edit`}>
                    <Button>
                        <Edit className="mr-2 h-4 w-4" />
                        Редактировать
                    </Button>
                </Link>
            </div>

            <div className="grid gap-6">
                {/* Quest Info */}
                <Card>
                    <CardHeader>
                        <CardTitle>Информация о квесте</CardTitle>
                        <CardDescription>
                            Основные параметры и настройки квеста
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">ID</p>
                                <p className="text-lg">{quest.id}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Slug</p>
                                <p className="text-lg">{quest.slug}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Минимальный уровень</p>
                                <p className="text-lg">{quest.minLevel}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Повторяемый</p>
                                <p className="text-lg">{quest.repeatable ? 'Да' : 'Нет'}</p>
                            </div>
                            {quest.repeatable && (
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Кулдаун (сек)</p>
                                    <p className="text-lg">{quest.cooldownSec}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">NPC выдающий квест</p>
                                <p className="text-lg">{quest.giverNpcId || '—'}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">NPC принимающий квест</p>
                                <p className="text-lg">{quest.turninNpcId || '—'}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Ключ клиента</p>
                                <p className="text-lg">{quest.clientQuestKey || '—'}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Quest Steps */}
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>Шаги квеста</CardTitle>
                                <CardDescription>
                                    Список задач, которые нужно выполнить для завершения квеста
                                </CardDescription>
                            </div>
                            <Link href={`/quests/${quest.id}/steps/new`}>
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Добавить шаг
                                </Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {steps.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-muted-foreground mb-4">
                                    У этого квеста пока нет шагов
                                </p>
                                <Link href={`/quests/${quest.id}/steps/new`}>
                                    <Button>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Добавить первый шаг
                                    </Button>
                                </Link>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Индекс</TableHead>
                                        <TableHead>Тип</TableHead>
                                        <TableHead>Параметры</TableHead>
                                        <TableHead>Ключ клиента</TableHead>
                                        <TableHead className="text-right">Действия</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {steps.map((step) => (
                                        <TableRow key={step.id}>
                                            <TableCell className="font-medium">
                                                {step.stepIndex}
                                            </TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                                    {getStepTypeLabel(step.stepType)}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <pre className="text-xs bg-gray-50 p-2 rounded max-w-xs overflow-auto">
                                                    {formatStepParams(step.params as Record<string, any>)}
                                                </pre>
                                            </TableCell>
                                            <TableCell>
                                                {step.clientStepKey || '—'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Link href={`/quests/${quest.id}/steps/${step.id}/edit`}>
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
                                                                <DialogTitle>Удалить шаг квеста</DialogTitle>
                                                                <DialogDescription>
                                                                    Вы уверены, что хотите удалить шаг #{step.stepIndex}?
                                                                    Это действие нельзя отменить.
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            <div className="flex justify-end gap-2">
                                                                <Button variant="outline">
                                                                    Отмена
                                                                </Button>
                                                                <Button
                                                                    variant="destructive"
                                                                    onClick={() => handleDeleteStep(step.id)}
                                                                    disabled={deleteStep.isPending}
                                                                >
                                                                    {deleteStep.isPending ? 'Удаление...' : 'Удалить'}
                                                                </Button>
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}