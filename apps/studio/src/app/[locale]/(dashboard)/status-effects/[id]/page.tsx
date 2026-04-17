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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from '@/hooks/use-toast'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'

const optNum = () =>
    z.preprocess(
        v => v === '' || v === null || v === undefined || (typeof v === 'number' && isNaN(v as number)) ? undefined : Number(v),
        z.number().optional()
    )

const CATEGORIES = ['buff', 'debuff', 'dot', 'hot', 'cc'] as const
const MODIFIER_TYPES = ['flat', 'percent', 'percent_all'] as const

const formSchema = z.object({
    slug: z.string().min(1, 'Slug is required').max(120),
    category: z.enum(CATEGORIES),
    durationSec: optNum(),
})

const modifierFormSchema = z.object({
    attributeId: z.preprocess(
        v => v === '' || v === null || v === undefined ? undefined : Number(v),
        z.number({ required_error: 'Attribute ID is required' }).int().positive()
    ),
    modifierType: z.enum(MODIFIER_TYPES),
    value: z.preprocess(
        v => v === '' || v === null || v === undefined ? undefined : Number(v),
        z.number({ required_error: 'Value is required' })
    ),
})

type FormData = z.infer<typeof formSchema>
type ModifierFormData = z.infer<typeof modifierFormSchema>

interface Modifier {
    id: number
    attributeId?: number | null
    attributeName?: string | null
    modifierType?: string | null
    value?: string | null
}

export default function EditStatusEffectPage() {
    const t = useTranslations('statusEffects')
    const commonT = useTranslations('common')
    const router = useRouter()
    const locale = useLocale()
    const params = useParams()
    const id = Number(params.id)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const { data, isLoading, refetch } = trpc.statusEffects.getById.useQuery({ id })

    const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(formSchema),
    })

    const { register: regMod, handleSubmit: handleModSubmit, reset: resetMod, formState: { errors: modErrors } } = useForm<ModifierFormData>({
        resolver: zodResolver(modifierFormSchema),
        defaultValues: { modifierType: 'flat' },
    })

    useEffect(() => {
        if (data) {
            reset({
                slug: data.slug,
                category: data.category as typeof CATEGORIES[number],
                durationSec: data.durationSec ?? undefined,
            })
        }
    }, [data, reset])

    const updateMutation = trpc.statusEffects.update.useMutation({
        onSuccess: () => {
            toast.success(t('updateSuccess'))
            router.push(`/${locale}/status-effects`)
        },
        onError: (error) => {
            toast.error(commonT('error'), error.message)
            setIsSubmitting(false)
        },
    })

    const addModifierMutation = trpc.statusEffects.addModifier.useMutation({
        onSuccess: () => {
            toast.success(t('modifierAdded'))
            resetMod({ modifierType: 'flat' })
            refetch()
        },
        onError: (error) => {
            toast.error(commonT('error'), error.message)
        },
    })

    const removeModifierMutation = trpc.statusEffects.removeModifier.useMutation({
        onSuccess: () => {
            toast.success(t('modifierRemoved'))
            refetch()
        },
        onError: (error) => {
            toast.error(commonT('error'), error.message)
        },
    })

    const onSubmit = (formData: FormData) => {
        setIsSubmitting(true)
        updateMutation.mutate({ id, ...formData })
    }

    const onModifierSubmit = (modData: ModifierFormData) => {
        addModifierMutation.mutate({
            statusEffectId: id,
            attributeId: modData.attributeId,
            modifierType: modData.modifierType,
            value: modData.value,
        })
    }

    const modifiers: Modifier[] = data?.modifiers ?? []

    if (isLoading) return (
        <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
    )

    return (
        <div className="container mx-auto p-6 max-w-2xl space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => router.push(`/${locale}/status-effects`)}>
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
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="slug">{t('slug')}</Label>
                                <Input id="slug" {...register('slug')} />
                                {errors.slug && <p className="text-sm text-red-600">{errors.slug.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">{t('category')}</Label>
                                <select
                                    id="category"
                                    {...register('category')}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                    {CATEGORIES.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                                {errors.category && <p className="text-sm text-red-600">{errors.category.message}</p>}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="durationSec">{t('durationSec')}</Label>
                            <Input id="durationSec" type="number" {...register('durationSec')} />
                        </div>

                        <div className="flex gap-4 pt-4">
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? commonT('loading') : commonT('save')}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => router.push(`/${locale}/status-effects`)}>
                                {commonT('cancel')}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t('modifiers')}</CardTitle>
                    <CardDescription>{t('modifiersDescription')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {modifiers.length > 0 && (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead>{t('attribute')}</TableHead>
                                        <TableHead>{t('modifierType')}</TableHead>
                                        <TableHead>{t('value')}</TableHead>
                                        <TableHead className="text-right">{commonT('actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {modifiers.map((mod) => (
                                        <TableRow key={mod.id}>
                                            <TableCell className="font-mono text-xs">{mod.attributeName ?? mod.attributeId ?? '—'}</TableCell>
                                            <TableCell className="text-sm">{mod.modifierType ?? '—'}</TableCell>
                                            <TableCell className="text-sm">{mod.value ?? '—'}</TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => removeModifierMutation.mutate({ id: mod.id })}
                                                    disabled={removeModifierMutation.isLoading}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    <form onSubmit={handleModSubmit(onModifierSubmit)} className="space-y-4 pt-2">
                        <p className="text-sm font-medium">{t('addModifier')}</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="mod-attributeId">{t('attribute')} (ID)</Label>
                                <Input id="mod-attributeId" type="number" {...regMod('attributeId')} placeholder="1" />
                                {modErrors.attributeId && <p className="text-sm text-red-600">{modErrors.attributeId.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="mod-modifierType">{t('modifierType')}</Label>
                                <select
                                    id="mod-modifierType"
                                    {...regMod('modifierType')}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                    {MODIFIER_TYPES.map(mt => (
                                        <option key={mt} value={mt}>{mt}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="mod-value">{t('value')}</Label>
                            <Input id="mod-value" type="number" step="any" {...regMod('value')} placeholder="10.5" />
                            {modErrors.value && <p className="text-sm text-red-600">{modErrors.value.message}</p>}
                        </div>
                        <Button type="submit" size="sm" className="gap-1.5" disabled={addModifierMutation.isLoading}>
                            <Plus className="h-4 w-4" />
                            {addModifierMutation.isLoading ? commonT('loading') : t('addModifier')}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
