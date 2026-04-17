'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { ArrowLeft } from 'lucide-react'

const optNum = () =>
    z.preprocess(
        v => v === '' || v === null || v === undefined || (typeof v === 'number' && isNaN(v as number)) ? undefined : Number(v),
        z.number().optional()
    )

const formSchema = z.object({
    slug: z.string().min(1, 'Slug is required').max(255),
    name: z.string().min(1, 'Name is required').max(255),
    description: z.string().optional(),
    minPieces: optNum(),
    maxPieces: optNum(),
})

type FormData = z.infer<typeof formSchema>

export default function CreateItemSetPage() {
    const t = useTranslations('itemSets')
    const commonT = useTranslations('common')
    const router = useRouter()
    const locale = useLocale()
    const [isSubmitting, setIsSubmitting] = useState(false)

    const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(formSchema),
    })

    const createMutation = trpc.itemSets.create.useMutation({
        onSuccess: () => {
            toast.success(t('createSuccess'))
            router.push(`/${locale}/item-sets`)
        },
        onError: (error) => {
            toast.error(commonT('error'), error.message)
            setIsSubmitting(false)
        },
    })

    const onSubmit = (data: FormData) => {
        setIsSubmitting(true)
        createMutation.mutate(data)
    }

    const generateSlug = (name: string) =>
        name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim()

    return (
        <div className="container mx-auto p-6 max-w-2xl">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" onClick={() => router.push(`/${locale}/item-sets`)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {commonT('back')}
                </Button>
                <h1 className="text-3xl font-bold">{t('create')}</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('create')}</CardTitle>
                    <CardDescription>{t('createDescription')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">{t('name')}</Label>
                            <Input
                                id="name"
                                {...register('name')}
                                onChange={(e) => {
                                    register('name').onChange(e)
                                    setValue('slug', generateSlug(e.target.value))
                                }}
                                placeholder="Set of the Conqueror"
                            />
                            {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="slug">{t('slug')}</Label>
                            <Input id="slug" {...register('slug')} placeholder="set-of-the-conqueror" />
                            {errors.slug && <p className="text-sm text-red-600">{errors.slug.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">{t('description')}</Label>
                            <textarea
                                id="description"
                                {...register('description')}
                                rows={3}
                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-y"
                                placeholder="Set description..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="minPieces">{t('minPieces')}</Label>
                                <Input id="minPieces" type="number" {...register('minPieces')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="maxPieces">{t('maxPieces')}</Label>
                                <Input id="maxPieces" type="number" {...register('maxPieces')} />
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? commonT('loading') : commonT('create')}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => router.push(`/${locale}/item-sets`)}>
                                {commonT('cancel')}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
