'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations, useLocale } from 'next-intl'

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
    const t = useTranslations()
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
                setError('slug', { message: t('dialogues.validation.slugExists') })
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
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{t('dialogues.form.newDialogueTitle')}</h1>
                <p className="text-muted-foreground">
                    {t('dialogues.form.newDialogueDescription')}
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('dialogues.form.dialogueDetails')}</CardTitle>
                    <CardDescription>
                        {t('dialogues.form.dialogueDetailsDescription')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="slug" className="text-sm font-medium">
                                {t('dialogues.form.slug')}
                            </label>
                            <Input
                                id="slug"
                                placeholder={t('dialogues.form.slugPlaceholder')}
                                {...register('slug')}
                                aria-invalid={errors.slug ? 'true' : 'false'}
                            />
                            {errors.slug && (
                                <p className="text-sm text-destructive">{errors.slug.message}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                                {t('dialogues.form.slugDescription')}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="version" className="text-sm font-medium">
                                {t('dialogues.form.version')}
                            </label>
                            <Input
                                id="version"
                                type="number"
                                min="1"
                                {...register('version', { valueAsNumber: true })}
                                aria-invalid={errors.version ? 'true' : 'false'}
                            />
                            {errors.version && (
                                <p className="text-sm text-destructive">{errors.version.message}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                                {t('dialogues.form.versionDescription')}
                            </p>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button
                                type="submit"
                                disabled={isSubmitting || createDialogue.isLoading}
                            >
                                {isSubmitting ? t('dialogues.creating') : t('dialogues.createNew')}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.push(`/${locale}/dialogues`)}
                            >
                                {t('common.cancel')}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t('dialogues.form.nextSteps')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                        <p>{t('dialogues.form.nextStepsDescription')}</p>
                        <ul className="list-disc list-inside space-y-1 ml-4">
                            <li>{t('dialogues.form.nextStepsItems.0')}</li>
                            <li>{t('dialogues.form.nextStepsItems.1')}</li>
                            <li>{t('dialogues.form.nextStepsItems.2')}</li>
                            <li>{t('dialogues.form.nextStepsItems.3')}</li>
                            <li>{t('dialogues.form.nextStepsItems.4')}</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}