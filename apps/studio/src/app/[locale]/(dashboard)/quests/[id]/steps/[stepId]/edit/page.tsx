'use client'

import { useParams, useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { QuestStepEditor } from '@/components/quest/QuestStepEditor'
import { Skeleton } from '@/components/ui/skeleton'
import { trpc } from '@/lib/trpc'

export default function EditQuestStepPage() {
    const params = useParams()
    const router = useRouter()
    const locale = useLocale()
    const t = useTranslations('quests.stepPages.edit')
    const questId = parseInt(params.id as string, 10)
    const stepId = parseInt(params.stepId as string, 10)

    // Fetch quest steps to find the specific step
    const { data: questData, isLoading, error } = trpc.quest.getWithSteps.useQuery({
        id: questId,
    })

    const updateStep = trpc.quest.updateStep.useMutation({
        onSuccess: () => {
            router.push(`/${locale}/quests/${questId}`)
        },
    })

    const currentStep = questData?.steps.find(step => step.id === stepId)

    const handleSave = async (data: any) => {
        const { id, ...updateData } = data
        await updateStep.mutateAsync({
            id: stepId,
            ...updateData,
        })
    }

    const handleCancel = () => {
        router.push(`/${locale}/quests/${questId}`)
    }

    if (isLoading) {
        return (
            <div className="container mx-auto py-6">
                <div className="mb-6">
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-96" />
                </div>
                <Skeleton className="h-96 max-w-2xl" />
            </div>
        )
    }

    if (error || !currentStep) {
        return (
            <div className="container mx-auto py-6">
                <div className="text-center py-8">
                    <h1 className="text-2xl font-bold mb-2">{t('errorLoading')}</h1>
                    <p className="text-red-600 mb-4">
                        {error?.message || t('stepNotFound')}
                    </p>
                    <Button onClick={() => router.push(`/${locale}/quests/${questId}`)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {t('back')}
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-6">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="outline" onClick={() => router.push(`/${locale}/quests/${questId}`)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('back')}
                </Button>
                <div>
                    <h1 className="text-3xl font-bold">{t('title')}</h1>
                    <p className="text-muted-foreground">
                        {t('description', { stepIndex: currentStep.stepIndex, questId })}
                    </p>
                </div>
            </div>

            <div className="max-w-2xl">
                <QuestStepEditor
                    questId={questId}
                    step={currentStep}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    isSubmitting={updateStep.isPending}
                />

                {updateStep.error && (
                    <div className="mt-4 text-sm text-red-600">
                        {t('errorUpdating', { error: updateStep.error.message })}
                    </div>
                )}
            </div>
        </div>
    )
}