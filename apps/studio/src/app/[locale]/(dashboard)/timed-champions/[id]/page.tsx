'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
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

const reqNum = () =>
    z.preprocess(
        v => v === '' || v === null || v === undefined ? undefined : Number(v),
        z.number({ required_error: 'Required' })
    )

const formSchema = z.object({
    slug: z.string().min(1, 'Slug is required').max(255),
    zoneId: reqNum(),
    mobTemplateId: reqNum(),
    intervalHours: reqNum(),
    windowMinutes: optNum(),
    announcementKey: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

export default function EditTimedChampionPage() {
    const t = useTranslations('timedChampions')
    const commonT = useTranslations('common')
    const router = useRouter()
    const locale = useLocale()
    const params = useParams()
    const id = Number(params.id)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const { data: zonesData } = trpc.zones.list.useQuery({ pageSize: 200 })
    const zones = (zonesData?.data ?? []) as { id: number; name?: string; slug: string }[]

    const { data: mobsData } = trpc.mobs.list.useQuery({ limit: 100 })
    const mobs = (mobsData?.data ?? []) as { id: number; name?: string; slug: string }[]

    const { data, isLoading } = trpc.timedChampions.getById.useQuery({ id })

    const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(formSchema),
    })

    useEffect(() => {
        if (data) {
            reset({
                slug: data.slug,
                zoneId: data.zoneId ?? undefined,
                mobTemplateId: data.mobTemplateId ?? undefined,
                intervalHours: data.intervalHours ?? undefined,
                windowMinutes: data.windowMinutes ?? undefined,
                announcementKey: data.announcementKey ?? undefined,
            })
        }
    }, [data, reset])

    const updateMutation = trpc.timedChampions.update.useMutation({
        onSuccess: () => {
            toast.success(t('updateSuccess'))
            router.push(`/${locale}/timed-champions`)
        },
        onError: (error) => {
            toast.error(commonT('error'), error.message)
            setIsSubmitting(false)
        },
    })

    const onSubmit = (formData: FormData) => {
        setIsSubmitting(true)
        updateMutation.mutate({ id, ...formData })
    }

    if (isLoading) return (
        <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
    )

    return (
        <div className="container mx-auto p-6 max-w-2xl">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" onClick={() => router.push(`/${locale}/timed-champions`)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {commonT('back')}
                </Button>
                <h1 className="text-3xl font-bold">{t('edit')}</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('edit')}</CardTitle>
                    <CardDescription>{data?.slug}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="slug">{t('slug')}</Label>
                            <Input id="slug" {...register('slug')} />
                            {errors.slug && <p className="text-sm text-red-600">{errors.slug.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="zoneId">{t('zone')}</Label>
                            <select
                                id="zoneId"
                                {...register('zoneId')}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="">{t('selectZone')}</option>
                                {zones.map(z => (
                                    <option key={z.id} value={z.id}>{z.name ?? z.slug}</option>
                                ))}
                            </select>
                            {errors.zoneId && <p className="text-sm text-red-600">{errors.zoneId.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="mobTemplateId">{t('mob')}</Label>
                            <select
                                id="mobTemplateId"
                                {...register('mobTemplateId')}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="">{t('selectMob')}</option>
                                {mobs.map(m => (
                                    <option key={m.id} value={m.id}>{m.name ?? m.slug}</option>
                                ))}
                            </select>
                            {errors.mobTemplateId && <p className="text-sm text-red-600">{errors.mobTemplateId.message}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="intervalHours">{t('intervalHours')}</Label>
                                <Input id="intervalHours" type="number" {...register('intervalHours')} />
                                {errors.intervalHours && <p className="text-sm text-red-600">{errors.intervalHours.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="windowMinutes">{t('windowMinutes')}</Label>
                                <Input id="windowMinutes" type="number" {...register('windowMinutes')} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="announcementKey">{t('announcementKey')}</Label>
                            <Input id="announcementKey" {...register('announcementKey')} />
                        </div>

                        <div className="flex gap-4 pt-4">
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? commonT('loading') : commonT('save')}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => router.push(`/${locale}/timed-champions`)}>
                                {commonT('cancel')}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
