'use client'

import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import {
    MessageSquare, ScrollText, Users, ShoppingCart, Sword, Swords,
    Package, Map, MapPin, Shield, Activity, Dna, BarChart2,
    Target, Skull, Crown, BookOpen, Zap, FlaskConical, Star,
    Tags, Gem, Plus, ChevronRight, Languages,
} from 'lucide-react'
import { AppHeader } from '@/components/navigation/AppHeader'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ─── Core sections ────────────────────────────────────────────────────────────
interface CoreItem {
    key: string
    href: string
    icon: React.ElementType
    bg: string
    color: string
    labelKey: string
    descKey: string
}

// ─── Reference items ─────────────────────────────────────────────────────────
interface RefItem {
    key: string
    href: string
    icon: React.ElementType
    label: string
}

const CORE: CoreItem[] = [
    { key: 'dialogues', href: 'dialogues', icon: MessageSquare, bg: 'bg-blue-500/10', color: 'text-blue-500', labelKey: 'home.dialogues.title', descKey: 'home.dialogues.description' },
    { key: 'quests', href: 'quests', icon: ScrollText, bg: 'bg-amber-500/10', color: 'text-amber-500', labelKey: 'home.quests.title', descKey: 'home.quests.description' },
    { key: 'npcs', href: 'npcs', icon: Users, bg: 'bg-green-500/10', color: 'text-green-500', labelKey: 'home.npcs.title', descKey: 'home.npcs.description' },
    { key: 'mobs', href: 'mobs', icon: Swords, bg: 'bg-red-500/10', color: 'text-red-500', labelKey: 'home.mobs.title', descKey: 'home.mobs.description' },
    { key: 'skills', href: 'skills', icon: Sword, bg: 'bg-purple-500/10', color: 'text-purple-500', labelKey: 'home.skills.title', descKey: 'home.skills.description' },
    { key: 'items', href: 'items', icon: Package, bg: 'bg-orange-500/10', color: 'text-orange-500', labelKey: 'home.items.title', descKey: 'home.items.description' },
    { key: 'vendors', href: 'vendors', icon: ShoppingCart, bg: 'bg-emerald-500/10', color: 'text-emerald-500', labelKey: 'home.vendors.title', descKey: 'home.vendors.description' },
    { key: 'zones', href: 'zones', icon: Map, bg: 'bg-sky-500/10', color: 'text-sky-500', labelKey: 'home.zones.title', descKey: 'home.zones.description' },
    { key: 'spawn-zones', href: 'spawn-zones', icon: MapPin, bg: 'bg-rose-500/10', color: 'text-rose-500', labelKey: 'home.spawnZones.title', descKey: 'home.spawnZones.description' },
]

const REFS: RefItem[] = [
    { key: 'classes', href: 'classes', icon: Shield, label: 'navigation.classes' },
    { key: 'races', href: 'races', icon: Dna, label: 'navigation.races' },
    { key: 'entity-attributes', href: 'entity-attributes', icon: Activity, label: 'navigation.entityAttributes' },
    { key: 'character-genders', href: 'character-genders', icon: Users, label: 'navigation.characterGenders' },
    { key: 'exp-for-level', href: 'exp-for-level', icon: BarChart2, label: 'navigation.xpCurve' },
    { key: 'target-types', href: 'target-types', icon: Target, label: 'navigation.targetTypes' },
    { key: 'mob-races', href: 'mob-races', icon: Skull, label: 'navigation.mobRaces' },
    { key: 'mob-ranks', href: 'mob-ranks', icon: Crown, label: 'navigation.mobRanks' },
    { key: 'skill-schools', href: 'skill-schools', icon: BookOpen, label: 'navigation.skillSchools' },
    { key: 'skill-scale-types', href: 'skill-scale-types', icon: BarChart2, label: 'navigation.skillScaleTypes' },
    { key: 'skill-properties', href: 'skill-properties', icon: Zap, label: 'navigation.skillProperties' },
    { key: 'skill-effects-type', href: 'skill-effects-type', icon: FlaskConical, label: 'navigation.skillEffectsType' },
    { key: 'skill-effects', href: 'skill-effects', icon: Star, label: 'navigation.skillEffects' },
    { key: 'item-types', href: 'item-types', icon: Tags, label: 'navigation.itemTypes' },
    { key: 'items-rarity', href: 'items-rarity', icon: Gem, label: 'navigation.itemsRarity' },
    { key: 'item-attributes', href: 'item-attributes', icon: Activity, label: 'navigation.itemAttributes' },
    { key: 'localization', href: 'localization', icon: Languages, label: 'home.localization.title' },
]

const QUICK_ADD = [
    { key: 'dialogue', href: 'dialogues/new', labelKey: 'home.quickAdd.dialogue' },
    { key: 'quest', href: 'quests/new', labelKey: 'home.quickAdd.quest' },
    { key: 'npc', href: 'npcs/new', labelKey: 'home.quickAdd.npc' },
    { key: 'mob', href: 'mobs/new', labelKey: 'home.quickAdd.mob' },
    { key: 'item', href: 'items/create', labelKey: 'home.quickAdd.item' },
]

// ─── CoreCard ─────────────────────────────────────────────────────────────────
function CoreCard({ item, locale, t }: { item: CoreItem; locale: string; t: (k: string) => string }) {
    const Icon = item.icon
    return (
        <Link
            href={`/${locale}/${item.href}`}
            className={cn(
                'group relative flex items-start gap-4 rounded-xl border bg-card p-5',
                'shadow-sm transition-all duration-200',
                'hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5',
            )}
        >
            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', item.bg)}>
                <Icon className={cn('h-5 w-5', item.color)} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm leading-tight mb-1">{t(item.labelKey)}</p>
                <p className="text-xs text-muted-foreground leading-snug line-clamp-2">{t(item.descKey)}</p>
            </div>
            <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/30 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-muted-foreground/60" />
        </Link>
    )
}

// ─── RefLink ──────────────────────────────────────────────────────────────────
function RefLink({ item, locale, t }: { item: RefItem; locale: string; t: (k: string) => string }) {
    const Icon = item.icon
    return (
        <Link
            href={`/${locale}/${item.href}`}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
        >
            <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
            <span className="truncate">{t(item.label)}</span>
        </Link>
    )
}

// ─── SectionLabel ─────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            {children}
        </h2>
    )
}

// ─── HomePage ─────────────────────────────────────────────────────────────────
export default function HomePage() {
    const t = useTranslations() as unknown as (k: string) => string
    const locale = useLocale()

    return (
        <div className="min-h-screen bg-muted/30">
            <AppHeader />

            <main className="container py-10 space-y-10">

                {/* Hero */}
                <header className="space-y-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{t('home.heroTitle')}</h1>
                        <p className="mt-1.5 text-muted-foreground text-sm">{t('home.heroSubtitle')}</p>
                    </div>

                    {/* Quick-add row */}
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground font-medium mr-1">{t('home.quickAdd.label')}</span>
                        {QUICK_ADD.map((action) => (
                            <Button key={action.key} variant="outline" size="sm" className="h-7 gap-1.5 text-xs" asChild>
                                <Link href={`/${locale}/${action.href}`}>
                                    <Plus className="h-3 w-3" />
                                    {t(action.labelKey)}
                                </Link>
                            </Button>
                        ))}
                    </div>
                </header>

                {/* Core content grid */}
                <section>
                    <SectionLabel>{t('home.categories.core')}</SectionLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {CORE.map((item) => (
                            <CoreCard key={item.key} item={item} locale={locale} t={t} />
                        ))}
                    </div>
                </section>

                {/* References */}
                <section>
                    <SectionLabel>{t('home.categories.references')}</SectionLabel>
                    <div className="rounded-xl border bg-card shadow-sm p-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-0.5">
                            {REFS.map((item) => (
                                <RefLink key={item.key} item={item} locale={locale} t={t} />
                            ))}
                        </div>
                    </div>
                </section>

            </main>
        </div>
    )
}

