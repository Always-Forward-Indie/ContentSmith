'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Save, ChevronRight, MessageSquare, CheckCircle2, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { trpc } from '@/lib/trpc'
import { toast } from '@/hooks/use-toast'

export default function DialogueEditPage() {
    const t = useTranslations('dialogues')
    const tCommon = useTranslations('common')
    const locale = useLocale()
    const params = useParams()
    const dialogueId = parseInt(params.id as string)
    const router = useRouter()

    const { data: dialogue, isLoading, error, refetch } = trpc.dialogue.byId.useQuery(
        { id: dialogueId },
        { enabled: !isNaN(dialogueId) }
    )

    const { data: graphData } = trpc.dialogue.getGraph.useQuery(
        { id: dialogueId },
        { enabled: !isNaN(dialogueId) }
    )

    const [formData, setFormData] = useState({
        slug: '',
        version: 1,
        startNodeId: null as number | null,
    })

    React.useEffect(() => {
        if (dialogue) {
            setFormData({
                slug: dialogue.slug || '',
                version: dialogue.version || 1,
                startNodeId: dialogue.startNodeId || null,
            })
        }
    }, [dialogue])

    const updateDialogue = trpc.dialogue.update.useMutation({
        onSuccess: () => {
            toast.success(t('detail.nodeUpdated'), t('detail.nodeUpdatedDescription'))
            refetch()
        },
        onError: (error) => {
            toast.error(t('detail.nodeUpdateError'), error.message)
        },
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!dialogue) return
        try {
            await updateDialogue.mutateAsync({ id: dialogue.id, ...formData })
        } catch (err) {
            console.error('Update failed:', err)
        }
    }

    const availableNodes = graphData?.nodes || []

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

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
                <AlertCircle className="h-10 w-10 text-destructive/70" />
                <p className="text-destructive font-medium">{t('errorLoading')}: {error.message}</p>
                <Link href={`/${locale}/dialogues`}>
                    <Button variant="outline" size="sm">{t('backToDialogues')}</Button>
                </Link>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="max-w-lg mx-auto space-y-6 animate-pulse">
                <div className="h-5 bg-muted rounded w-48" />
                <div className="h-9 bg-muted rounded w-56" />
                <div className="h-64 bg-muted rounded-lg" />
            </div>
        )
    }

    return (
        <div className="max-w-lg mx-auto space-y-6">
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
                <span className="text-foreground font-medium">{t('form.editTitle')}</span>
            </nav>

            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                    <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t('form.editTitle')}</h1>
                    <p className="text-sm text-muted-foreground">{t('form.editDescription')}</p>
                </div>
            </div>

            {/* Form Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{t('form.basicInfo')}</CardTitle>
                    <CardDescription>{t('form.basicInfoDescription')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Slug */}
                        <div className="space-y-1.5">
                            <Label htmlFor="slug">{t('form.slug')}</Label>
                            <Input
                                id="slug"
                                value={formData.slug}
                                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                                placeholder={t('form.slugPlaceholder')}
                                className="font-mono"
                                required
                            />
                            <p className="text-xs text-muted-foreground">{t('form.slugDescription')}</p>
                        </div>

                        {/* Version */}
                        <div className="space-y-1.5">
                            <Label htmlFor="version">{t('form.version')}</Label>
                            <Input
                                id="version"
                                type="number"
                                min="1"
                                value={formData.version}
                                onChange={(e) => setFormData(prev => ({ ...prev, version: parseInt(e.target.value) || 1 }))}
                                className="w-28"
                                required
                            />
                            <p className="text-xs text-muted-foreground">{t('form.versionDescription')}</p>
                        </div>

                        {/* Start Node */}
                        <div className="space-y-1.5">
                            <Label htmlFor="startNodeId">{t('form.startNode')}</Label>
                            <select
                                id="startNodeId"
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={formData.startNodeId || ''}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    startNodeId: e.target.value ? parseInt(e.target.value) : null
                                }))}
                            >
                                <option value="">{t('form.noStartNode')}</option>
                                {availableNodes.map((node) => (
                                    <option key={node.id} value={node.id}>
                                        #{node.id} ({node.type}) — {node.clientNodeKey || t('form.untitled')}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-muted-foreground">{t('form.startNodeEditDescription')}</p>
                        </div>

                        {/* Status preview */}
                        <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-muted/50 text-sm">
                            {formData.startNodeId ? (
                                <>
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    <span className="text-muted-foreground">Start node: </span>
                                    <span className="font-mono font-medium">#{formData.startNodeId}</span>
                                </>
                            ) : (
                                <>
                                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                    <span className="text-muted-foreground">No start node — dialogue is a draft</span>
                                </>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2 border-t">
                            <Button
                                type="submit"
                                size="sm"
                                disabled={updateDialogue.isLoading}
                                className="gap-1.5"
                            >
                                <Save className="h-4 w-4" />
                                {updateDialogue.isLoading ? t('form.saving') : t('form.saveChanges')}
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/${locale}/dialogues/${dialogueId}`)}
                            >
                                {tCommon('cancel')}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}

