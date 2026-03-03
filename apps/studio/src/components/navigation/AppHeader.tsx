'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, Wand2 } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { NavigationSkillsDropdown } from '@/components/navigation/SkillsDropdown'
import { NavigationItemsDropdown } from '@/components/navigation/ItemsDropdown'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
    const pathname = usePathname()
    const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
    return (
        <Link
            href={href}
            className={cn(
                'relative text-sm font-medium transition-colors',
                'after:absolute after:-bottom-[1px] after:left-0 after:h-[2px] after:w-full after:rounded-full after:transition-all',
                isActive
                    ? 'text-foreground after:bg-primary'
                    : 'text-foreground/55 hover:text-foreground/80 after:scale-x-0 after:bg-primary hover:after:scale-x-100'
            )}
        >
            {children}
        </Link>
    )
}

function MobileNavLink({ href, children }: { href: string; children: React.ReactNode }) {
    const pathname = usePathname()
    const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
    return (
        <Link
            href={href}
            className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground/60 hover:bg-muted hover:text-foreground'
            )}
        >
            {children}
        </Link>
    )
}

export function AppHeader() {
    const t = useTranslations()
    const locale = useLocale()

    return (
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center gap-4">
                {/* Logo */}
                <Link href={`/${locale}`} className="flex items-center gap-2 shrink-0">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                        <Wand2 className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <span className="hidden font-bold sm:inline-block tracking-tight">
                        ContentSmith
                    </span>
                </Link>

                <Separator orientation="vertical" className="h-5 hidden md:block" />

                {/* Desktop nav */}
                <nav className="hidden md:flex items-center gap-5 flex-1">
                    <NavLink href={`/${locale}/dialogues`}>{t('navigation.dialogues')}</NavLink>
                    <NavLink href={`/${locale}/quests`}>{t('navigation.quests')}</NavLink>
                    <NavLink href={`/${locale}/npcs`}>{t('navigation.npcs')}</NavLink>
                    <NavLink href={`/${locale}/mobs`}>{t('navigation.mobs')}</NavLink>
                    <NavigationSkillsDropdown />
                    <NavLink href={`/${locale}/entity-attributes`}>{t('navigation.entityAttributes')}</NavLink>
                    <NavLink href={`/${locale}/races`}>{t('navigation.races')}</NavLink>
                    <NavigationItemsDropdown />
                </nav>

                <div className="ml-auto flex items-center gap-2">
                    <LanguageSwitcher />

                    {/* Mobile hamburger */}
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="md:hidden">
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Open menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-72 p-0">
                            <SheetHeader className="px-4 pt-5 pb-3">
                                <SheetTitle asChild>
                                    <Link href={`/${locale}`} className="flex items-center gap-2">
                                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                                            <Wand2 className="h-4 w-4 text-primary-foreground" />
                                        </div>
                                        <span className="font-bold tracking-tight">ContentSmith</span>
                                    </Link>
                                </SheetTitle>
                            </SheetHeader>
                            <Separator />
                            <nav className="flex flex-col gap-1 p-3">
                                <p className="px-3 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('home.categories.narrative')}
                                </p>
                                <MobileNavLink href={`/${locale}/dialogues`}>{t('navigation.dialogues')}</MobileNavLink>
                                <MobileNavLink href={`/${locale}/quests`}>{t('navigation.quests')}</MobileNavLink>
                                <MobileNavLink href={`/${locale}/npcs`}>{t('navigation.npcs')}</MobileNavLink>
                                <MobileNavLink href={`/${locale}/mobs`}>{t('navigation.mobs')}</MobileNavLink>

                                <p className="mt-2 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('home.categories.world')}
                                </p>
                                <MobileNavLink href={`/${locale}/skills`}>{t('navigation.skills')}</MobileNavLink>
                                <MobileNavLink href={`/${locale}/skill-schools`}>{t('navigation.skillSchools')}</MobileNavLink>
                                <MobileNavLink href={`/${locale}/skill-scale-types`}>{t('navigation.skillScaleTypes')}</MobileNavLink>
                                <MobileNavLink href={`/${locale}/skill-properties`}>{t('navigation.skillProperties')}</MobileNavLink>
                                <MobileNavLink href={`/${locale}/skill-effects-type`}>{t('navigation.skillEffectsType')}</MobileNavLink>
                                <MobileNavLink href={`/${locale}/skill-effects`}>{t('navigation.skillEffects')}</MobileNavLink>
                                <MobileNavLink href={`/${locale}/entity-attributes`}>{t('navigation.entityAttributes')}</MobileNavLink>
                                <MobileNavLink href={`/${locale}/races`}>{t('navigation.races')}</MobileNavLink>
                                <MobileNavLink href={`/${locale}/items`}>{t('navigation.items')}</MobileNavLink>
                                <MobileNavLink href={`/${locale}/item-types`}>{t('navigation.itemTypes')}</MobileNavLink>
                                <MobileNavLink href={`/${locale}/items-rarity`}>{t('navigation.itemsRarity')}</MobileNavLink>
                                <MobileNavLink href={`/${locale}/item-attributes`}>{t('navigation.itemAttributes')}</MobileNavLink>
                            </nav>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </header>
    )
}
