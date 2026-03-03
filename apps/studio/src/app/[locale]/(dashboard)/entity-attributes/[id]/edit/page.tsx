'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { ChevronRight, SlidersHorizontal } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface EditEntityAttributePageProps {
    params: { id: string }
}

export default function EditEntityAttributePage({ params }: EditEntityAttributePageProps) {
    const t = useTranslations('entityAttributes')
    const tCommon = useTranslations('common')
    const router = useRouter()
    const locale = useLocale()

    const attributeId = parseInt(params.id)

    const [formData, setFormData] = useState({ name: '', slug: '' })
    const [errors, setErrors] = useState<Record<string, string>>({})

    const { data: entityAttribute, isLoading, error } = trpc.entityAttributes.getById.useQuery(
        { id: attributeId },
        { enabled: !isNaN(attributeId) }
    )

    const updateEntityAttribute = trpc.entityAttributes.update.useMutation({
        onSuccess: () => {
            router.push(`/${locale}/entity-attributes`)
        },
    })

    useEffect(() => {
        if (entityAttribute) {
            setFormData({ name: entityAttribute.name, slug: entityAttribute.slug })
        }
    }, [entityAttribute])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const newErrors: Record<string, string> = {}
        if (!formData.name.trim()) newErrors.name = t('nameRequired')
        if (!formData.slug.trim()) newErrors.slug = t('slugRequired')
        setErrors(newErrors)
        if (Object.keys(newErrors).length === 0) {
            updateEntityAttribute.mutate({ id: attributeId, name: formData.name.trim(), slug: formData.slug.trim() })
        }
    }

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, name: e.target.value }))
        if (errors.name) setErrors(prev => ({ ...prev, name: '' }))
    }

    const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, slug: e.target.value }))
        if (errors.slug) setErrors(prev => ({ ...prev, slug: '' }))
    }

    if (isNaN(attributeId) || error) {
        return (
            <div className="max-w-lg mx-auto space-y-6">
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground">{t('entityAttributeNotFound')}</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="max-w-lg mx-auto space-y-6">
                <div className="flex items-center gap-1.5 text-sm">
                    <div className="h-4 bg-muted rounded animate-pulse w-32" />
                    <div className="h-4 bg-muted rounded animate-pulse w-4" />
                    <div className="h-4 bg-muted rounded animate-pulse w-24" />
                </div>
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted animate-pulse shrink-0" />
                    <div className="space-y-1.5">
                        <div className="h-6 bg-muted rounded animate-pulse w-56" />
                        <div className="h-4 bg-muted rounded animate-pulse w-40" />
                    </div>
                </div>
                <Card>
                    <CardContent className="pt-6 space-y-5">
                        <div className="space-y-1.5">
                            <div className="h-4 bg-muted rounded animate-pulse w-16" />
                            <div className="h-10 bg-muted rounded animate-pulse w-full" />
                        </div>
                        <div className="space-y-1.5">
                            <div className="h-4 bg-muted rounded animate-pulse w-12" />
                            <div className="h-10 bg-muted rounded animate-pulse w-full" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="max-w-lg mx-auto space-y-6">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Link href={`/${locale}/entity-attributes`} className="hover:text-foreground transition-colors">
                    {t('entityAttributes')}
                </Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-foreground font-medium">{t('editEntityAttribute')}</span>
            </nav>

            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                    <SlidersHorizontal className="h-5 w-5" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t('editEntityAttribute')}</h1>
                    <p className="text-sm text-muted-foreground">{entityAttribute?.name}</p>
                </div>
            </div>

            {/* Form Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{t('entityAttribute')}</CardTitle>
                    <CardDescription>#{attributeId}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Name */}
                        <div className="space-y-1.5">
                            <label htmlFor="name" className="text-sm font-medium">
                                {t('entityAttributeName')}
                            </label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={handleNameChange}
                                placeholder={t('entityAttributeName')}
                                aria-invalid={errors.name ? 'true' : 'false'}
                            />
                            {errors.name ? (
                                <p className="text-xs text-destructive">{errors.name}</p>
                            ) : null}
                        </div>

                        {/* Slug */}
                        <div className="space-y-1.5">
                            <label htmlFor="slug" className="text-sm font-medium">
                                {t('entityAttributeSlug')}
                            </label>
                            <Input
                                id="slug"
                                value={formData.slug}
                                onChange={handleSlugChange}
                                placeholder="entity-attribute-slug"
                                className="font-mono"
                                aria-invalid={errors.slug ? 'true' : 'false'}
                            />
                            {errors.slug ? (
                                <p className="text-xs text-destructive">{errors.slug}</p>
                            ) : (
                                <p className="text-xs text-muted-foreground">
                                    {tCommon('slug')} — используется для URL и идентификации
                                </p>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" asChild>
                                <Link href={`/${locale}/entity-attributes`}>{tCommon('cancel')}</Link>
                            </Button>
                            <Button type="submit" disabled={updateEntityAttribute.isPending}>
                                {updateEntityAttribute.isPending ? tCommon('loading') : tCommon('save')}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
