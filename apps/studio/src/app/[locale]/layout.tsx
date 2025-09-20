import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl';
import { locales } from '@/i18n/config';
import { Providers } from './providers'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin', 'cyrillic'] })

export const metadata: Metadata = {
    title: 'ContentSmith - MMORPG Content Editor',
    description: 'Professional content management system for MMORPG games',
}

export function generateStaticParams() {
    return locales.map((locale) => ({ locale }));
}

async function getMessages(locale: string) {
    const validLocales = ['en', 'ru'];
    const validatedLocale = validLocales.includes(locale) ? locale : 'en';

    try {
        return (await import(`../../../messages/${validatedLocale}.json`)).default;
    } catch (error) {
        return (await import(`../../../messages/en.json`)).default;
    }
}

export default async function RootLayout({
    children,
    params: { locale }
}: {
    children: React.ReactNode
    params: { locale: string };
}) {
    // Validate and get messages for the locale
    const validLocales = ['en', 'ru'];
    const validatedLocale = validLocales.includes(locale) ? locale : 'en';
    const messages = await getMessages(validatedLocale);

    return (
        <html lang={validatedLocale}>
            <body className={inter.className}>
                <NextIntlClientProvider messages={messages} locale={validatedLocale}>
                    <Providers>
                        {children}
                    </Providers>
                    <Toaster />
                </NextIntlClientProvider>
            </body>
        </html>
    )
}