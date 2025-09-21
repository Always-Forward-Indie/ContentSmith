'use client'

import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LanguageSwitcher } from '@/components/ui/language-switcher'

export default function HomePage() {
    const t = useTranslations();
    const locale = useLocale();

    return (
        <main className="container mx-auto px-4 py-8">
            {/* Language switcher at the top */}
            <div className="flex justify-end mb-6">
                <LanguageSwitcher />
            </div>

            <div className="max-w-4xl mx-auto">
                <header className="text-center mb-12">
                    <h1 className="text-4xl font-bold tracking-tight mb-4">
                        {t('home.title')}
                    </h1>
                    <p className="text-xl text-muted-foreground">
                        {t('home.subtitle')}
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('home.dialogues.title')}</CardTitle>
                            <CardDescription>
                                {t('home.dialogues.description')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Link href={`/${locale}/dialogues`}>
                                <Button className="w-full">{t('home.dialogues.openEditor')}</Button>
                            </Link>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('home.quests.title')}</CardTitle>
                            <CardDescription>
                                {t('home.quests.description')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Link href={`/${locale}/quests`}>
                                <Button className="w-full">{t('home.quests.openEditor')}</Button>
                            </Link>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('home.localization.title')}</CardTitle>
                            <CardDescription>
                                {t('home.localization.description')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Link href="/localization">
                                <Button className="w-full">Open Localization</Button>
                            </Link>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Content Preview</CardTitle>
                            <CardDescription>
                                Preview content changes in real-time
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Link href="/preview">
                                <Button className="w-full">Open Preview</Button>
                            </Link>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Analytics</CardTitle>
                            <CardDescription>
                                View content usage statistics and metrics
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Link href="/analytics">
                                <Button className="w-full">View Analytics</Button>
                            </Link>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Settings</CardTitle>
                            <CardDescription>
                                Configure system settings and user permissions
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Link href="/settings">
                                <Button className="w-full">Open Settings</Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>

                <div className="mt-12 text-center">
                    <p className="text-sm text-muted-foreground">
                        © 2025 - {new Date().getFullYear()} ContentSmith.
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Built with Next.js, tRPC, Drizzle ORM, and Tailwind CSS
                    </p>
                </div>
            </div>
        </main>
    )
}