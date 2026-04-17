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
    nameKey: z.string().min(1, 'Name key is required').max(255),
    objectType: z.string().min(1, 'Object type is required').max(255),
    scope: z.string().optional(),
    zoneId: optNum(),
    posX: optNum(),
    posY: optNum(),
    posZ: optNum(),
    rotZ: optNum(),
    interactionRadius: optNum(),
    channelTimeSec: optNum(),
    respawnSec: optNum(),
    isActiveByDefault: z.boolean().default(true),
    minLevel: optNum(),
})

type FormData = z.infer<typeof formSchema>

export default function CreateWorldObjectPage() {
    const t = useTranslations('worldObjects')
    const commonT = useTranslations('common')
    const router = useRouter()
    const locale = useLocale()
    const [isSubmitting, setIsSubmitting] = useState(false)

    const { data: zonesData } = trpc.zones.list.useQuery({ pageSize: 200 })
    const zones = (zonesData?.data ?? []) as { id: number; name?: string; slug: string }[]

    const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: { isActiveByDefault: true },
    })

    const createMutation = trpc.worldObjects.create.useMutation({
        onSuccess: () => {
            toast.success(t('createSuccess'))
            router.push(`/${locale}/world-objects`)
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

    return (
        <div className="container mx-auto p-6 max-w-2xl">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" onClick={() => router.push(`/${locale}/world-objects`)}>
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
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="slug">{t('slug')}</Label>
                                <Input id="slug" {...register('slug')} placeholder="world-object-slug" />
                                {errors.slug && <p className="text-sm text-red-600">{errors.slug.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="nameKey">{t('nameKey')}</Label>
                                <Input id="nameKey" {...register('nameKey')} placeholder="world.object.name" />
                                {errors.nameKey && <p className="text-sm text-red-600">{errors.nameKey.message}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="objectType">{t('objectType')}</Label>
                                <Input id="objectType" {...register('objectType')} placeholder="CHEST" />
                                {errors.objectType && <p className="text-sm text-red-600">{errors.objectType.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="scope">{t('scope')}</Label>
                                <Input id="scope" {...register('scope')} placeholder="global" />
                            </div>
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
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="posX">posX</Label>
                                <Input id="posX" type="number" step="any" {...register('posX')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="posY">posY</Label>
                                <Input id="posY" type="number" step="any" {...register('posY')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="posZ">posZ</Label>
                                <Input id="posZ" type="number" step="any" {...register('posZ')} />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="rotZ">{t('rotationZ')}</Label>
                                <Input id="rotZ" type="number" step="any" {...register('rotZ')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="interactionRadius">{t('interactionRadius')}</Label>
                                <Input id="interactionRadius" type="number" step="any" {...register('interactionRadius')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="minLevel">{t('minLevel')}</Label>
                                <Input id="minLevel" type="number" {...register('minLevel')} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="channelTimeSec">{t('channelTimeSec')}</Label>
                                <Input id="channelTimeSec" type="number" step="any" {...register('channelTimeSec')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="respawnSec">{t('respawnSec')}</Label>
                                <Input id="respawnSec" type="number" step="any" {...register('respawnSec')} />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="isActiveByDefault" {...register('isActiveByDefault')} className="h-4 w-4 rounded border-input" />
                            <Label htmlFor="isActiveByDefault">{t('isActiveByDefault')}</Label>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? commonT('loading') : commonT('create')}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => router.push(`/${locale}/world-objects`)}>
                                {commonT('cancel')}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
