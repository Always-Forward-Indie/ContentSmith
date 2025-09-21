'use client';

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { useTranslations, useLocale } from 'next-intl'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const t = useTranslations();
    const locale = useLocale();
    return (
        <div className="min-h-screen bg-background">
            {/* Navigation Header */}
            <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-14 items-center">
                    <Link href={`/${locale}`} className="mr-6 flex items-center space-x-2">
                        <span className="hidden font-bold sm:inline-block">
                            ContentSmith
                        </span>
                    </Link>
                    <nav className="flex items-center space-x-6 text-sm font-medium">
                        <Link
                            href={`/${locale}/dialogues`}
                            className="transition-colors hover:text-foreground/80 text-foreground/60"
                        >
                            {t('navigation.dialogues')}
                        </Link>
                        <Link
                            href={`/${locale}/quests`}
                            className="transition-colors hover:text-foreground/80 text-foreground/60"
                        >
                            {t('navigation.quests')}
                        </Link>
                        <Link
                            href={`/${locale}/npcs`}
                            className="transition-colors hover:text-foreground/80 text-foreground/60"
                        >
                            {t('navigation.npcs')}
                        </Link>
                        <Link
                            href={`/${locale}/skills`}
                            className="transition-colors hover:text-foreground/80 text-foreground/60"
                        >
                            {t('navigation.skills')}
                        </Link>
                        <Link
                            href={`/${locale}/localization`}
                            className="transition-colors hover:text-foreground/80 text-foreground/60"
                        >
                            {t('navigation.localization')}
                        </Link>
                        <Link
                            href={`/${locale}/analytics`}
                            className="transition-colors hover:text-foreground/80 text-foreground/60"
                        >
                            {t('navigation.analytics')}
                        </Link>
                    </nav>
                    <div className="ml-auto flex items-center space-x-4">
                        <LanguageSwitcher />
                        <Button variant="outline" size="sm">
                            {t('navigation.settings')}
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                {children}
            </main>
        </div>
    )
}