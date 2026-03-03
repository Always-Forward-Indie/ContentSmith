'use client'

import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl';
import { ArrowRight, MessageSquare, ScrollText, Users, Sword, Swords, Activity, Dna, Package, Globe } from 'lucide-react'
import { AppHeader } from '@/components/navigation/AppHeader'
import { cn } from '@/lib/utils'

interface SectionItem {
    key: string
    href: string
    icon: React.ElementType
    iconBg: string
    iconColor: string
    labelKey: string
    descKey: string
}

const NARRATIVE: SectionItem[] = [
    {
        key: 'dialogues',
        href: 'dialogues',
        icon: MessageSquare,
        iconBg: 'bg-blue-500/10',
        iconColor: 'text-blue-500',
        labelKey: 'home.dialogues.title',
        descKey: 'home.dialogues.description',
    },
    {
        key: 'quests',
        href: 'quests',
        icon: ScrollText,
        iconBg: 'bg-amber-500/10',
        iconColor: 'text-amber-500',
        labelKey: 'home.quests.title',
        descKey: 'home.quests.description',
    },
]

const WORLD: SectionItem[] = [
    {
        key: 'npcs',
        href: 'npcs',
        icon: Users,
        iconBg: 'bg-green-500/10',
        iconColor: 'text-green-500',
        labelKey: 'home.npcs.title',
        descKey: 'home.npcs.description',
    },
    {
        key: 'skills',
        href: 'skills',
        icon: Sword,
        iconBg: 'bg-purple-500/10',
        iconColor: 'text-purple-500',
        labelKey: 'home.skills.title',
        descKey: 'home.skills.description',
    },
    {
        key: 'entity-attributes',
        href: 'entity-attributes',
        icon: Activity,
        iconBg: 'bg-rose-500/10',
        iconColor: 'text-rose-500',
        labelKey: 'home.entityAttributes.title',
        descKey: 'home.entityAttributes.description',
    },
    {
        key: 'races',
        href: 'races',
        icon: Dna,
        iconBg: 'bg-teal-500/10',
        iconColor: 'text-teal-500',
        labelKey: 'home.races.title',
        descKey: 'home.races.description',
    },
    {
        key: 'items',
        href: 'items',
        icon: Package,
        iconBg: 'bg-orange-500/10',
        iconColor: 'text-orange-500',
        labelKey: 'home.items.title',
        descKey: 'home.items.description',
    },
    {
        key: 'mobs',
        href: 'mobs',
        icon: Swords,
        iconBg: 'bg-red-500/10',
        iconColor: 'text-red-500',
        labelKey: 'home.mobs.title',
        descKey: 'home.mobs.description',
    },
]

const TOOLS: SectionItem[] = [
    {
        key: 'localization',
        href: 'localization',
        icon: Globe,
        iconBg: 'bg-cyan-500/10',
        iconColor: 'text-cyan-500',
        labelKey: 'home.localization.title',
        descKey: 'home.localization.description',
    },
]

function SectionCard({ item, locale, t }: { item: SectionItem; locale: string; t: (k: string) => string }) {
    const Icon = item.icon
    return (
        <Link
            href={`/${locale}/${item.href}`}
            className={cn(
                'group flex items-start gap-4 rounded-xl border bg-card p-5 shadow-sm',
                'transition-all duration-200 hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5'
            )}
        >
            <div className={cn('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', item.iconBg)}>
                <Icon className={cn('h-5 w-5', item.iconColor)} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold leading-tight mb-1">{t(item.labelKey)}</p>
                <p className="text-sm text-muted-foreground leading-snug line-clamp-2">{t(item.descKey)}</p>
            </div>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
        </Link>
    )
}

function SectionGroup({
    label,
    items,
    locale,
    t,
    cols = 2,
}: {
    label: string
    items: SectionItem[]
    locale: string
    t: (k: string) => string
    cols?: number
}) {
    return (
        <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                {label}
            </h2>
            <div className={cn(
                'grid gap-3',
                cols === 1 && 'grid-cols-1',
                cols === 2 && 'grid-cols-1 sm:grid-cols-2',
                cols === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
            )}>
                {items.map(item => (
                    <SectionCard key={item.key} item={item} locale={locale} t={t} />
                ))}
            </div>
        </section>
    )
}

export default function HomePage() {
    const t = useTranslations() as unknown as (k: string) => string;
    const locale = useLocale();

    return (
        <div className="min-h-screen bg-muted/30">
            <AppHeader />

            <main className="container mx-auto max-w-3xl px-4 py-10">
                {/* Hero */}
                <header className="mb-10">
                    <h1 className="text-3xl font-bold tracking-tight mb-2">
                        {t('home.title')}
                    </h1>
                    <p className="text-muted-foreground">
                        {t('home.subtitle')}
                    </p>
                </header>

                <div className="flex flex-col gap-8">
                    <SectionGroup
                        label={t('home.categories.narrative')}
                        items={NARRATIVE}
                        locale={locale}
                        t={t}
                        cols={2}
                    />
                    <SectionGroup
                        label={t('home.categories.world')}
                        items={WORLD}
                        locale={locale}
                        t={t}
                        cols={2}
                    />
                    <SectionGroup
                        label={t('home.categories.tools')}
                        items={TOOLS}
                        locale={locale}
                        t={t}
                        cols={1}
                    />
                </div>

                <footer className="mt-12 text-center">
                    <p className="text-xs text-muted-foreground">
                        © 2025–{new Date().getFullYear()} ContentSmith
                    </p>
                </footer>
            </main>
        </div>
    )
}