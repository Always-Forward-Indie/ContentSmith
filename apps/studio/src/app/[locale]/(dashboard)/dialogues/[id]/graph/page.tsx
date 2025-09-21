'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { trpc } from '@/lib/trpc'
import DialogueGraphEditor from '@/components/editors/DialogueGraphEditor'

export default function DialogueGraphPage() {
    const t = useTranslations('dialogues')
    const tCommon = useTranslations('common')
    const locale = useLocale()
    const params = useParams()
    const router = useRouter()
    const dialogueId = parseInt(params.id as string)

    const { data: dialogue, isLoading: dialogueLoading, error: dialogueError } = trpc.dialogue.byId.useQuery(
        { id: dialogueId },
        { enabled: !isNaN(dialogueId) }
    )

    const { data: graphData, isLoading: graphLoading, error: graphError } = trpc.dialogue.getGraph.useQuery(
        { id: dialogueId },
        { enabled: !isNaN(dialogueId) }
    )

    if (isNaN(dialogueId)) {
        return (
            <div className="text-center py-12">
                <p className="text-destructive">{t('invalidId')}</p>
                <Link href={`/${locale}/dialogues`}>
                    <Button className="mt-4">{t('backToDialogues')}</Button>
                </Link>
            </div>
        )
    }

    if (dialogueError || graphError) {
        return (
            <div className="text-center py-12">
                <p className="text-destructive mb-4">
                    {t('errorLoading')}: {dialogueError?.message || graphError?.message}
                </p>
                <Link href={`/${locale}/dialogues`}>
                    <Button>{t('backToDialogues')}</Button>
                </Link>
            </div>
        )
    }

    if (dialogueLoading || graphLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Link href={`/dialogues/${dialogueId}`}>
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            {tCommon('back')}
                        </Button>
                    </Link>
                    <div>
                        <div className="h-6 w-48 bg-muted animate-pulse rounded" />
                        <div className="h-4 w-32 bg-muted animate-pulse rounded mt-2" />
                    </div>
                </div>
                <Card>
                    <CardContent className="p-6">
                        <div className="h-[600px] bg-muted animate-pulse rounded" />
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href={`/dialogues/${dialogueId}`}>
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            {tCommon('back')}
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">{t('title')}</h1>
                        <p className="text-muted-foreground">
                            {dialogue?.slug} (ID: {dialogue?.id})
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link href={`/dialogues/${dialogueId}/edit`}>
                        <Button variant="outline">
                            {t('editDialogue')}
                        </Button>
                    </Link>
                    <Link href={`/dialogues/${dialogueId}`}>
                        <Button variant="outline">
                            {t('graph.viewDetails')}
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Graph Editor */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('graph.editorTitle')}</CardTitle>
                    <CardDescription>
                        {t('graph.editorDescription')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <DialogueGraphEditor
                        dialogueId={dialogueId}
                        graphData={graphData}
                        readOnly={false}
                    />
                </CardContent>
            </Card>
        </div>
    )
}