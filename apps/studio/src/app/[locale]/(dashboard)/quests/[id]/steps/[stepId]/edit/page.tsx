'use client'

import { useParams, useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { ChevronRight, ScrollText, AlertCircle } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { QuestStepEditor } from '@/components/quest/QuestStepEditor'
import { trpc } from '@/lib/trpc'

export default function EditQuestStepPage() {
    const params = useParams()
    const router = useRouter()
    const locale = useLocale()
    const t = useTranslations('quests.stepPages.edit')
    const tQuests = useTranslations('quests')
    const questId = parseInt(params.id as string, 10)
    const stepId = parseInt(params.stepId as string, 10)

    const { data: questData, isLoading, error } = trpc.quest.getWithSteps.useQuery({ id: questId })

    const updateStep = trpc.quest.updateStep.useMutation({
        onSuccess: () => {
            router.push(`/${locale}/quests/${questId}`)
        },
    })

    const currentStep = questData?.steps.find(step => step.id === stepId)

    const handleSave = async (data: any) => {
        const { id, ...updateData } = data
        await updateStep.mutateAsync({ id: stepId, ...updateData })
    }

    const handleCancel = () => {
        router.push(`/${locale}/quests/${questId}`)
    }

    if (isLoading) {
        return (
            <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
                <div className="h-5 bg-muted rounded w-64" />
                <div className="h-9 bg-muted rounded w-56" />
                <div className="h-96 bg-muted rounded-lg" />
            </div>
        )
    }

    if (error || !currentStep) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
                <AlertCircle className="h-10 w-10 text-destructive/70" />
                <p className="text-destructive font-medium">
                    {error?.message || t('stepNotFound')}
                </p>
                <Link href={`/${locale}/quests/${questId}`}>
                    <Button variant="outline" size="sm">{t('back')}</Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Link href={`/${locale}/quests`} className="hover:text-foreground transition-colors">
                    {tQuests('title')}
                </Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <Link
                    href={`/${locale}/quests/${questId}`}
                    className="hover:text-foreground transition-colors font-mono"
                >
                    #{questId}
                </Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-foreground font-medium">{t('title')}</span>
            </nav>

            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                    <ScrollText className="h-5 w-5" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
                    <p className="text-sm text-muted-foreground">
                        {t('description', { stepIndex: currentStep.stepIndex, questId })}
                    </p>
                </div>
            </div>

            <QuestStepEditor
                questId={questId}
                step={currentStep}
                onSave={handleSave}
                onCancel={handleCancel}
                isSubmitting={updateStep.isPending}
            />

            {updateStep.error && (
                <p className="text-sm text-destructive">
                    {t('errorUpdating', { error: updateStep.error.message })}
                </p>
            )}
        </div>
    )
}