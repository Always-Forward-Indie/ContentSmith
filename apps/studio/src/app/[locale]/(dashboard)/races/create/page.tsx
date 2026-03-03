'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { ChevronRight, Users } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function CreateRacePage() {
    const t = useTranslations('races')
    const tCommon = useTranslations('common')
    const router = useRouter()
    const locale = useLocale()

    const [formData, setFormData] = useState({ name: '', slug: '' })
    const [errors, setErrors] = useState<Record<string, string>>({})

    const createRace = trpc.race.create.useMutation({
        onSuccess: () => {
            router.push(`/${locale}/races`)
        },
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const newErrors: Record<string, string> = {}
        if (!formData.name.trim()) newErrors.name = t('nameRequired')
        if (!formData.slug.trim()) newErrors.slug = t('slugRequired')
        setErrors(newErrors)
        if (Object.keys(newErrors).length === 0) {
            createRace.mutate({ name: formData.name.trim(), slug: formData.slug.trim() })
        }
    }

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value
        const slug = name
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '')
        setFormData(prev => ({ ...prev, name, slug }))
        if (errors.name) setErrors(prev => ({ ...prev, name: '' }))
    }

    const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, slug: e.target.value }))
        if (errors.slug) setErrors(prev => ({ ...prev, slug: '' }))
    }

    return (
        <div className="max-w-lg mx-auto space-y-6">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Link href={`/${locale}/races`} className="hover:text-foreground transition-colors">
                    {t('races')}
                </Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-foreground font-medium">{t('createRace')}</span>
            </nav>

            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                    <Users className="h-5 w-5" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t('createRace')}</h1>
                    <p className="text-sm text-muted-foreground">{t('raceDescription')}</p>
                </div>
            </div>

            {/* Form Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{t('race')}</CardTitle>
                    <CardDescription>{t('raceDescription')}</CardDescription>
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
                            <Button type="submit" disabled={createRace.isPending}>
                                {createRace.isPending ? tCommon('loading') : tCommon('create')}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
