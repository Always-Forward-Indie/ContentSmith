'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'
import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'

import { Button } from '@/components/ui/button'
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
    const router = useRouter()
    const dialogueId = parseInt(params.id as string)

    const { data: dialogue, isLoading, error, refetch } = trpc.dialogue.byId.useQuery(
        { id: dialogueId },
        { enabled: !isNaN(dialogueId) }
    )

    const { data: graphData } = trpc.dialogue.getGraph.useQuery(
        { id: dialogueId },
        { enabled: !isNaN(dialogueId) }
    )

    // Form state
    const [formData, setFormData] = useState({
        slug: '',
        version: 1,
        startNodeId: null as number | null,
    })

    // Set form data when dialogue loads
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
            await updateDialogue.mutateAsync({
                id: dialogue.id,
                ...formData,
            })
        } catch (error) {
            console.error('Update failed:', error)
        }
    }

    // Get available nodes for start_node_id dropdown
    const availableNodes = graphData?.nodes || []

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

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-destructive mb-4">
                    {t('errorLoading')}: {error.message}
                </p>
                <Link href={`/${locale}/dialogues`}>
                    <Button>{t('backToDialogues')}</Button>
                </Link>
            </div>
        )
    }

    if (isLoading) {
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
                        <div className="h-[400px] bg-muted animate-pulse rounded" />
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
                        <h1 className="text-2xl font-bold">{t('form.editTitle')}</h1>
                        <p className="text-muted-foreground">
                            ID: {dialogue?.id}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link href={`/dialogues/${dialogueId}/graph`}>
                        <Button variant="outline">
                            {t('graph.editorTitle')}
                        </Button>
                    </Link>
                    <Link href={`/dialogues/${dialogueId}`}>
                        <Button variant="outline">
                            {t('graph.viewDetails')}
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Dialogue Form */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('form.basicInfo')}</CardTitle>
                    <CardDescription>
                        {t('form.basicInfoDescription')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Slug */}
                            <div className="space-y-2">
                                <Label htmlFor="slug">{t('form.slug')}</Label>
                                <Input
                                    id="slug"
                                    value={formData.slug}
                                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                                    placeholder={t('form.slugPlaceholder')}
                                    required
                                />
                                <p className="text-sm text-muted-foreground">
                                    {t('form.slugDescription')}
                                </p>
                            </div>

                            {/* Version */}
                            <div className="space-y-2">
                                <Label htmlFor="version">{t('form.version')}</Label>
                                <Input
                                    id="version"
                                    type="number"
                                    min="1"
                                    value={formData.version}
                                    onChange={(e) => setFormData(prev => ({ ...prev, version: parseInt(e.target.value) || 1 }))}
                                    required
                                />
                                <p className="text-sm text-muted-foreground">
                                    {t('form.versionDescription')}
                                </p>
                            </div>
                        </div>

                        {/* Start Node ID */}
                        <div className="space-y-2">
                            <Label htmlFor="startNodeId">{t('form.startNode')}</Label>
                            <select
                                id="startNodeId"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={formData.startNodeId || ''}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    startNodeId: e.target.value ? parseInt(e.target.value) : null
                                }))}
                            >
                                <option value="">{t('form.noStartNode')}</option>
                                {availableNodes.map((node) => (
                                    <option key={node.id} value={node.id}>
                                        Node {node.id} ({node.type}) - {node.clientNodeKey || t('form.untitled')}
                                    </option>
                                ))}
                            </select>
                            <p className="text-sm text-muted-foreground">
                                {t('form.startNodeEditDescription')}
                            </p>
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                disabled={updateDialogue.isLoading}
                                className="min-w-[120px]"
                            >
                                {updateDialogue.isLoading ? (
                                    t('form.saving')
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        {t('form.saveChanges')}
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Info Card */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('form.dialogueStructure')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                            <p className="font-medium">{t('form.totalNodes')}</p>
                            <p className="text-2xl font-bold text-primary">{availableNodes.length}</p>
                        </div>
                        <div>
                            <p className="font-medium">{t('form.totalEdges')}</p>
                            <p className="text-2xl font-bold text-primary">{graphData?.edges?.length || 0}</p>
                        </div>
                        <div>
                            <p className="font-medium">{t('form.startNode')}</p>
                            <p className="text-lg text-muted-foreground">
                                {formData.startNodeId ? `Node ${formData.startNodeId}` : t('form.notSet')}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}