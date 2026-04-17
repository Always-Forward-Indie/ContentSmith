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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from '@/hooks/use-toast'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'

const optNum = () =>
    z.preprocess(
        v => v === '' || v === null || v === undefined || (typeof v === 'number' && isNaN(v as number)) ? undefined : Number(v),
        z.number().optional()
    )

const formSchema = z.object({
    slug: z.string().min(1, 'Slug is required').max(128),
    name: z.string().min(1, 'Name is required').max(128),
})

const bonusFormSchema = z.object({
    attributeId: z.preprocess(
        v => v === '' || v === null || v === undefined ? undefined : Number(v),
        z.number({ required_error: 'Attribute ID is required' }).int().positive()
    ),
    piecesRequired: z.preprocess(
        v => v === '' || v === null || v === undefined ? undefined : Number(v),
        z.number({ required_error: 'Required' }).int().positive()
    ),
    bonusValue: z.preprocess(
        v => v === '' || v === null || v === undefined ? undefined : Number(v),
        z.number({ required_error: 'Bonus value is required' }).int()
    ),
})

type FormData = z.infer<typeof formSchema>
type BonusFormData = z.infer<typeof bonusFormSchema>

interface SetItem {
    itemId: number
    itemSlug?: string | null
    itemName?: string | null
}

interface SetBonus {
    id: number
    piecesRequired?: number | null
    attributeId?: number | null
    attributeName?: string | null
    bonusValue?: number | null
}

export default function EditItemSetPage() {
    const t = useTranslations('itemSets')
    const commonT = useTranslations('common')
    const router = useRouter()
    const locale = useLocale()
    const params = useParams()
    const id = Number(params.id)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [addItemId, setAddItemId] = useState('')

    const { data, isLoading, refetch } = trpc.itemSets.getById.useQuery({ id })
    const { data: allItemsData } = trpc.items.list.useQuery({ limit: 100 })
    const allItems = (allItemsData?.items ?? []) as { id: number; slug: string; name: string }[]

    const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(formSchema),
    })

    const { register: regBonus, handleSubmit: handleBonusSubmit, reset: resetBonus, formState: { errors: bonusErrors } } = useForm<BonusFormData>({
        resolver: zodResolver(bonusFormSchema),
    })

    useEffect(() => {
        if (data) {
            reset({
                slug: data.slug,
                name: data.name ?? '',
            })
        }
    }, [data, reset])

    const updateMutation = trpc.itemSets.update.useMutation({
        onSuccess: () => {
            toast.success(t('updateSuccess'))
            router.push(`/${locale}/item-sets`)
        },
        onError: (error) => {
            toast.error(commonT('error'), error.message)
            setIsSubmitting(false)
        },
    })

    const addItemMutation = trpc.itemSets.addItem.useMutation({
        onSuccess: () => {
            toast.success(t('itemAdded'))
            setAddItemId('')
            refetch()
        },
        onError: (error) => toast.error(commonT('error'), error.message),
    })

    const removeItemMutation = trpc.itemSets.removeItem.useMutation({
        onSuccess: () => {
            toast.success(t('itemRemoved'))
            refetch()
        },
        onError: (error) => toast.error(commonT('error'), error.message),
    })

    const addBonusMutation = trpc.itemSets.addBonus.useMutation({
        onSuccess: () => {
            toast.success(t('bonusAdded'))
            resetBonus()
            refetch()
        },
        onError: (error) => toast.error(commonT('error'), error.message),
    })

    const removeBonusMutation = trpc.itemSets.removeBonus.useMutation({
        onSuccess: () => {
            toast.success(t('bonusRemoved'))
            refetch()
        },
        onError: (error) => toast.error(commonT('error'), error.message),
    })

    const onSubmit = (formData: FormData) => {
        setIsSubmitting(true)
        updateMutation.mutate({ id, ...formData })
    }

    const onBonusSubmit = (bonusData: BonusFormData) => {
        addBonusMutation.mutate({
            setId: id,
            attributeId: bonusData.attributeId as number,
            piecesRequired: bonusData.piecesRequired as number,
            bonusValue: bonusData.bonusValue as number,
        })
    }

    const members: SetItem[] = data?.members ?? []
    const bonuses: SetBonus[] = data?.bonuses ?? []

    if (isLoading) return (
        <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
    )

    return (
        <div className="container mx-auto p-6 max-w-3xl space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => router.push(`/${locale}/item-sets`)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {commonT('back')}
                </Button>
                <h1 className="text-3xl font-bold">{t('edit')}</h1>
            </div>

            <Tabs defaultValue="general">
                <TabsList className="mb-4">
                    <TabsTrigger value="general">{t('tabGeneral')}</TabsTrigger>
                    <TabsTrigger value="members">{t('tabMembers')}</TabsTrigger>
                    <TabsTrigger value="bonuses">{t('tabBonuses')}</TabsTrigger>
                </TabsList>

                <TabsContent value="general">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('edit')}</CardTitle>
                            <CardDescription>{data?.slug}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="name">{t('name')}</Label>
                                    <Input id="name" {...register('name')} />
                                    {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="slug">{t('slug')}</Label>
                                    <Input id="slug" {...register('slug')} disabled className="opacity-60 cursor-not-allowed" />
                                    {errors.slug && <p className="text-sm text-red-600">{errors.slug.message}</p>}
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting ? commonT('loading') : commonT('save')}
                                    </Button>
                                    <Button type="button" variant="outline" onClick={() => router.push(`/${locale}/item-sets`)}>
                                        {commonT('cancel')}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="members">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('tabMembers')}</CardTitle>
                            <CardDescription>{t('membersDescription')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {members.length > 0 && (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead>ID</TableHead>
                                                <TableHead>{t('slug')}</TableHead>
                                                <TableHead>{t('name')}</TableHead>
                                                <TableHead className="text-right">{commonT('actions')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {members.map((item) => (
                                                <TableRow key={item.itemId}>
                                                    <TableCell className="font-mono text-xs text-muted-foreground">{item.itemId}</TableCell>
                                                    <TableCell className="font-mono text-xs">{item.itemSlug ?? '—'}</TableCell>
                                                    <TableCell className="text-sm">{item.itemName ?? '—'}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            onClick={() => removeItemMutation.mutate({ setId: id, itemId: item.itemId })}
                                                            disabled={removeItemMutation.isLoading}
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

                            <div className="pt-2 space-y-3">
                                <p className="text-sm font-medium">{t('addItem')}</p>
                                <div className="flex gap-2">
                                    <select
                                        value={addItemId}
                                        onChange={e => setAddItemId(e.target.value)}
                                        className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    >
                                        <option value="">{t('selectItem')}</option>
                                        {allItems.map(item => (
                                            <option key={item.id} value={item.id}>{item.name ?? item.slug}</option>
                                        ))}
                                    </select>
                                    <Button
                                        type="button"
                                        size="sm"
                                        className="gap-1.5"
                                        disabled={!addItemId || addItemMutation.isLoading}
                                        onClick={() => addItemId && addItemMutation.mutate({ setId: id, itemId: Number(addItemId) })}
                                    >
                                        <Plus className="h-4 w-4" />
                                        {addItemMutation.isLoading ? commonT('loading') : t('addItem')}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="bonuses">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('tabBonuses')}</CardTitle>
                            <CardDescription>{t('bonusesDescription')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {bonuses.length > 0 && (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead>{t('attribute')}</TableHead>
                                                <TableHead>{t('piecesRequired')}</TableHead>
                                                <TableHead>{t('bonusValue')}</TableHead>
                                                <TableHead className="text-right">{commonT('actions')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {bonuses.map((bonus) => (
                                                <TableRow key={bonus.id}>
                                                    <TableCell className="font-mono text-xs">{bonus.attributeName ?? bonus.attributeId ?? '—'}</TableCell>
                                                    <TableCell className="text-sm">{bonus.piecesRequired ?? '—'}</TableCell>
                                                    <TableCell className="text-sm">{bonus.bonusValue ?? '—'}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            onClick={() => removeBonusMutation.mutate({ id: bonus.id })}
                                                            disabled={removeBonusMutation.isLoading}
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

                            <form onSubmit={handleBonusSubmit(onBonusSubmit)} className="space-y-4 pt-2">
                                <p className="text-sm font-medium">{t('addBonus')}</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="bonus-attributeId">{t('attribute')} (ID)</Label>
                                        <Input id="bonus-attributeId" type="number" {...regBonus('attributeId')} placeholder="1" />
                                        {bonusErrors.attributeId && <p className="text-sm text-red-600">{bonusErrors.attributeId.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="bonus-piecesRequired">{t('piecesRequired')}</Label>
                                        <Input id="bonus-piecesRequired" type="number" {...regBonus('piecesRequired')} />
                                        {bonusErrors.piecesRequired && <p className="text-sm text-red-600">{bonusErrors.piecesRequired.message}</p>}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="bonus-bonusValue">{t('bonusValue')}</Label>
                                    <Input id="bonus-bonusValue" type="number" {...regBonus('bonusValue')} placeholder="10" />
                                    {bonusErrors.bonusValue && <p className="text-sm text-red-600">{bonusErrors.bonusValue.message}</p>}
                                </div>
                                <div className="flex justify-end">
                                    <Button type="submit" size="sm" className="gap-1.5" disabled={addBonusMutation.isLoading}>
                                        <Plus className="h-4 w-4" />
                                        {addBonusMutation.isLoading ? commonT('loading') : t('addBonus')}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
