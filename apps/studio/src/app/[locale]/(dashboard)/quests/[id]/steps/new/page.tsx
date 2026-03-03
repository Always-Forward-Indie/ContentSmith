'use client'

import { useParams, useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { ChevronRight, ScrollText } from 'lucide-react'
import Link from 'next/link'

import { QuestStepEditor } from '@/components/quest/QuestStepEditor'
import { trpc } from '@/lib/trpc'

export default function NewQuestStepPage() {
    const params = useParams()
    const router = useRouter()
    const locale = useLocale()
    const t = useTranslations('quests.stepPages.new')
    const tQuests = useTranslations('quests')
    const questId = parseInt(params.id as string, 10)

    const createStep = trpc.quest.createStep.useMutation({
        onSuccess: () => {
            router.push(`/${locale}/quests/${questId}`)
        },
    })

    const handleSave = async (data: any) => {
        await createStep.mutateAsync({ questId, ...data })
    }

    const handleCancel = () => {
        router.push(`/${locale}/quests/${questId}`)
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Link href={`/${locale}/quests`} className="hover:text-foreground transition-colors">
                    {tQuests('title')}
                </Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <Link href={`/${locale}/quests/${questId}`} className="hover:text-foreground transition-colors font-mono">
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
                    <p className="text-sm text-muted-foreground">{t('description', { questId })}</p>
                </div>
            </div>

            <QuestStepEditor
                questId={questId}
                onSave={handleSave}
                onCancel={handleCancel}
                isSubmitting={createStep.isPending}
            />

            {createStep.error && (
                <p className="text-sm text-destructive">
                    {t('errorCreating', { error: createStep.error.message })}
                </p>
            )}
        </div>
    )
}