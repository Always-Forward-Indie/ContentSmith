'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

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
            router.push(`/dialogues/${dialogue.id}`)
        },
        onError: (error) => {
            if (error.message.includes('slug')) {
                setError('slug', { message: 'This slug already exists' })
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
                <h1 className="text-3xl font-bold tracking-tight">Create New Dialogue</h1>
                <p className="text-muted-foreground">
                    Create a new dialogue tree for NPCs
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Dialogue Details</CardTitle>
                    <CardDescription>
                        Enter the basic information for your new dialogue
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="slug" className="text-sm font-medium">
                                Slug *
                            </label>
                            <Input
                                id="slug"
                                placeholder="e.g., guard_greeting, merchant_intro"
                                {...register('slug')}
                                aria-invalid={errors.slug ? 'true' : 'false'}
                            />
                            {errors.slug && (
                                <p className="text-sm text-destructive">{errors.slug.message}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                                Unique identifier for this dialogue. Use lowercase with underscores.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="version" className="text-sm font-medium">
                                Version
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
                                Version number for content management
                            </p>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button
                                type="submit"
                                disabled={isSubmitting || createDialogue.isLoading}
                            >
                                {isSubmitting ? 'Creating...' : 'Create Dialogue'}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.push('/dialogues')}
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Next Steps</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                        <p>After creating the dialogue, you can:</p>
                        <ul className="list-disc list-inside space-y-1 ml-4">
                            <li>Add dialogue nodes (lines, choices, actions)</li>
                            <li>Connect nodes with edges</li>
                            <li>Set conditions and actions</li>
                            <li>Use the visual graph editor</li>
                            <li>Preview the dialogue flow</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}