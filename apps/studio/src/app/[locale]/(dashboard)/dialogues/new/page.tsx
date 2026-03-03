'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations, useLocale } from 'next-intl'
import { MessageSquare, ChevronRight, ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { trpc } from '@/lib/trpc'

const createDialogueSchema = z.object({
    slug: z.string().min(1, 'Slug is required').max(255, 'Slug too long'),
    version: z.number().min(1, 'Version must be at least 1').default(1),
})

type CreateDialogueForm = z.infer<typeof createDialogueSchema>

export default function NewDialoguePage() {
    const t = useTranslations('dialogues')
    const commonT = useTranslations('common')
    const locale = useLocale()
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
        setError,
    } = useForm<CreateDialogueForm>({
        resolver: zodResolver(createDialogueSchema),
        defaultValues: {
            version: 1,
        },
    })

    const createDialogue = trpc.dialogue.create.useMutation({
        onSuccess: (dialogue) => {
            router.push(`/${locale}/dialogues/${dialogue.id}`)
        },
        onError: (error) => {
            if (error.message.includes('slug')) {
                setError('slug', { message: t('validation.slugExists') })
            }
        },
    })

    const onSubmit = async (data: CreateDialogueForm) => {
        setIsSubmitting(true)
        try {
            await createDialogue.mutateAsync(data)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="max-w-lg mx-auto space-y-6">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Link href={`/${locale}/dialogues`} className="hover:text-foreground transition-colors">
                    {t('title')}
                </Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-foreground font-medium">{t('form.newDialogueTitle')}</span>
            </nav>

            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                    <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t('form.newDialogueTitle')}</h1>
                    <p className="text-sm text-muted-foreground">{t('form.newDialogueDescription')}</p>
                </div>
            </div>

            {/* Form Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{t('form.dialogueDetails')}</CardTitle>
                    <CardDescription>{t('form.dialogueDetailsDescription')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        {/* Slug */}
                        <div className="space-y-1.5">
                            <label htmlFor="slug" className="text-sm font-medium">
                                {t('form.slug')}
                            </label>
                            <Input
                                id="slug"
                                placeholder={t('form.slugPlaceholder')}
                                className="font-mono"
                                {...register('slug')}
                                aria-invalid={errors.slug ? 'true' : 'false'}
                            />
                            {errors.slug ? (
                                <p className="text-xs text-destructive">{errors.slug.message}</p>
                            ) : (
                                <p className="text-xs text-muted-foreground">{t('form.slugDescription')}</p>
                            )}
                        </div>

                        {/* Version */}
                        <div className="space-y-1.5">
                            <label htmlFor="version" className="text-sm font-medium">
                                {t('form.version')}
                            </label>
                            <Input
                                id="version"
                                type="number"
                                min="1"
                                className="w-28"
                                {...register('version', { valueAsNumber: true })}
                                aria-invalid={errors.version ? 'true' : 'false'}
                            />
                            {errors.version ? (
                                <p className="text-xs text-destructive">{errors.version.message}</p>
                            ) : (
                                <p className="text-xs text-muted-foreground">{t('form.versionDescription')}</p>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2 border-t">
                            <Button
                                type="submit"
                                size="sm"
                                disabled={isSubmitting || createDialogue.isLoading}
                                className="gap-1.5"
                            >
                                {isSubmitting ? t('creating') : t('createNew')}
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/${locale}/dialogues`)}
                            >
                                {commonT('cancel')}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}

