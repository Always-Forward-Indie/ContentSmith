'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, MessageSquare, AlertCircle } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { trpc } from '@/lib/trpc'
import DialogueGraphEditor from '@/components/editors/DialogueGraphEditor'

export default function DialogueGraphPage() {
    const t = useTranslations('dialogues')
    const tCommon = useTranslations('common')
    const locale = useLocale()
    const params = useParams()
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
            <div className="flex flex-col items-center justify-center py-24 gap-3">
                <AlertCircle className="h-10 w-10 text-destructive/70" />
                <p className="text-destructive font-medium">{t('invalidId')}</p>
                <Link href={`/${locale}/dialogues`}>
                    <Button variant="outline" size="sm">{t('backToDialogues')}</Button>
                </Link>
            </div>
        )
    }

    if (dialogueError || graphError) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
                <AlertCircle className="h-10 w-10 text-destructive/70" />
                <p className="text-destructive font-medium">
                    {t('errorLoading')}: {dialogueError?.message || graphError?.message}
                </p>
                <Link href={`/${locale}/dialogues`}>
                    <Button variant="outline" size="sm">{t('backToDialogues')}</Button>
                </Link>
            </div>
        )
    }

    if (dialogueLoading || graphLoading) {
        return (
            <div className="space-y-5 animate-pulse">
                <div className="h-5 bg-muted rounded w-56" />
                <div className="h-8 bg-muted rounded w-48" />
                <div className="h-[600px] bg-muted rounded-lg" />
            </div>
        )
    }

    return (
        <div className="space-y-5">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Link href={`/${locale}/dialogues`} className="hover:text-foreground transition-colors">
                    {t('title')}
                </Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <Link
                    href={`/${locale}/dialogues/${dialogueId}`}
                    className="hover:text-foreground transition-colors font-mono"
                >
                    {dialogue?.slug ?? `#${dialogueId}`}
                </Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-foreground font-medium">{t('graph.editorTitle')}</span>
            </nav>

            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                        <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{t('graph.editorTitle')}</h1>
                        <p className="text-sm text-muted-foreground font-mono">
                            {dialogue?.slug}
                            <span className="text-muted-foreground/60 ml-1.5">#{dialogue?.id}</span>
                        </p>
                    </div>
                </div>
                <div className="flex gap-2 shrink-0">
                    <Link href={`/${locale}/dialogues/${dialogueId}/edit`}>
                        <Button variant="outline" size="sm">{t('editDialogue')}</Button>
                    </Link>
                    <Link href={`/${locale}/dialogues/${dialogueId}`}>
                        <Button variant="outline" size="sm">{t('graph.viewDetails')}</Button>
                    </Link>
                </div>
            </div>

            {/* Graph Editor */}
            <Card className="overflow-hidden">
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
