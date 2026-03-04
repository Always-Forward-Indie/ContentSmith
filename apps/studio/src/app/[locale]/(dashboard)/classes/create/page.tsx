'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { ChevronRight, Swords } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

export default function CreateClassPage() {
    const router = useRouter()
    const locale = useLocale()
    const t = useTranslations('classes')
    const tc = useTranslations('common')
    const [form, setForm] = useState({ name: '', slug: '', description: '' })

    const createClass = trpc.classes.create.useMutation({
        onSuccess: (data) => router.push(`/${locale}/classes/${data!.id}`),
    })

    const handleNameChange = (name: string) => {
        const slug = name.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '')
        setForm(prev => ({ ...prev, name, slug }))
    }

    return (
        <div className="max-w-lg mx-auto space-y-6">
            <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Link href={`/${locale}/classes`} className="hover:text-foreground transition-colors">{t('breadcrumb')}</Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-foreground font-medium">{t('createTitle')}</span>
            </nav>

            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                    <Swords className="h-5 w-5" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t('createTitle')}</h1>
                    <p className="text-sm text-muted-foreground">{t('createSubtitle')}</p>
                </div>
            </div>

            <Card>
                <CardHeader><CardTitle className="text-base">{t('classDetails')}</CardTitle></CardHeader>
                <CardContent>
                    <form className="space-y-5" onSubmit={e => { e.preventDefault(); createClass.mutate(form) }}>
                        <div className="space-y-1.5">
                            <Label htmlFor="name">{t('fields.name')}</Label>
                            <Input id="name" value={form.name} onChange={e => handleNameChange(e.target.value)} placeholder={t('namePlaceholder')} required />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="slug">{t('fields.slug')}</Label>
                            <Input id="slug" value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} placeholder={t('slugPlaceholder')} className="font-mono" />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="desc">{t('fields.description')}</Label>
                            <Textarea id="desc" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder={t('descPlaceholder')} rows={3} />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" asChild><Link href={`/${locale}/classes`}>{tc('cancel')}</Link></Button>
                            <Button type="submit" disabled={createClass.isPending || !form.name}>
                                {createClass.isPending ? tc('saving') : tc('create')}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
