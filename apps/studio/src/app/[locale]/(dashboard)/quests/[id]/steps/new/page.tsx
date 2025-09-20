'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { QuestStepEditor } from '@/components/quest/QuestStepEditor'
import { trpc } from '@/lib/trpc'

export default function NewQuestStepPage() {
    const params = useParams()
    const router = useRouter()
    const questId = parseInt(params.id as string, 10)

    const createStep = trpc.quest.createStep.useMutation({
        onSuccess: () => {
            router.push(`/quests/${questId}`)
        },
    })

    const handleSave = async (data: any) => {
        await createStep.mutateAsync({
            questId,
            ...data,
        })
    }

    const handleCancel = () => {
        router.back()
    }

    return (
        <div className="container mx-auto py-6">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Назад
                </Button>
                <div>
                    <h1 className="text-3xl font-bold">Добавить шаг квеста</h1>
                    <p className="text-muted-foreground">
                        Создание нового шага для квеста #{questId}
                    </p>
                </div>
            </div>

            <div className="max-w-2xl">
                <QuestStepEditor
                    questId={questId}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    isSubmitting={createStep.isPending}
                />

                {createStep.error && (
                    <div className="mt-4 text-sm text-red-600">
                        Ошибка создания шага: {createStep.error.message}
                    </div>
                )}
            </div>
        </div>
    )
}