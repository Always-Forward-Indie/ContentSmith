'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { ChevronRight, Users } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface PageProps {
    params: { id: string }
}

export default function EditRacePage({ params }: PageProps) {
    const t = useTranslations('races')
    const tCommon = useTranslations('common')
    const router = useRouter()
    const locale = useLocale()
    const raceId = parseInt(params.id)

    const [formData, setFormData] = useState({ name: '', slug: '' })
    const [errors, setErrors] = useState<Record<string, string>>({})

    const { data: race, isLoading } = trpc.race.getById.useQuery({ id: raceId })

    const updateRace = trpc.race.update.useMutation({
        onSuccess: () => {
            router.push(`/${locale}/races`)
        },
    })

    useEffect(() => {
        if (race) {
            setFormData({ name: race.name, slug: race.slug })
        }
    }, [race])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const newErrors: Record<string, string> = {}
        if (!formData.name.trim()) newErrors.name = t('nameRequired')
        if (!formData.slug.trim()) newErrors.slug = t('slugRequired')
        setErrors(newErrors)
        if (Object.keys(newErrors).length === 0) {
            updateRace.mutate({ id: raceId, name: formData.name.trim(), slug: formData.slug.trim() })
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

    if (!isLoading && !race) {
        return (
            <div className="max-w-lg mx-auto space-y-6">
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground">{t('raceNotFound')}</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="max-w-lg mx-auto space-y-6">
                <div className="flex items-center gap-1.5 text-sm">
                    <div className="h-4 bg-muted rounded animate-pulse w-20" />
                    <div className="h-4 bg-muted rounded animate-pulse w-4" />
                    <div className="h-4 bg-muted rounded animate-pulse w-28" />
                </div>
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted animate-pulse shrink-0" />
                    <div className="space-y-1.5">
                        <div className="h-6 bg-muted rounded animate-pulse w-44" />
                        <div className="h-4 bg-muted rounded animate-pulse w-32" />
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
                <Link href={`/${locale}/races`} className="hover:text-foreground transition-colors">
                    {t('races')}
                </Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-foreground font-medium">{t('editRace')}</span>
            </nav>

            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                    <Users className="h-5 w-5" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t('editRace')}</h1>
                    <p className="text-sm text-muted-foreground">{race?.name}</p>
                </div>
            </div>

            {/* Form Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{t('race')}</CardTitle>
                    <CardDescription>#{raceId}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Name */}
                        <div className="space-y-1.5">
                            <label htmlFor="name" className="text-sm font-medium">
                                {tCommon('name')}
                            </label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={handleNameChange}
                                placeholder={t('enterRaceName')}
                                aria-invalid={errors.name ? 'true' : 'false'}
                            />
                            {errors.name ? (
                                <p className="text-xs text-destructive">{errors.name}</p>
                            ) : null}
                        </div>

                        {/* Slug */}
                        <div className="space-y-1.5">
                            <label htmlFor="slug" className="text-sm font-medium">
                                {tCommon('slug')}
                            </label>
                            <Input
                                id="slug"
                                value={formData.slug}
                                onChange={handleSlugChange}
                                placeholder={t('raceSlugPlaceholder')}
                                className="font-mono"
                                aria-invalid={errors.slug ? 'true' : 'false'}
                            />
                            {errors.slug ? (
                                <p className="text-xs text-destructive">{errors.slug}</p>
                            ) : (
                                <p className="text-xs text-muted-foreground">{t('slugDescription')}</p>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" asChild>
                                <Link href={`/${locale}/races`}>{tCommon('cancel')}</Link>
                            </Button>
                            <Button type="submit" disabled={updateRace.isPending}>
                                {updateRace.isPending ? tCommon('loading') : tCommon('save')}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
