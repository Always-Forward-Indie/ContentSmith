import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl';
import { locales, type Locale } from '@/i18n/config';
import { loadMessages } from '@/i18n/loader';
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

export default async function RootLayout({
    children,
    params: { locale }
}: {
    children: React.ReactNode
    params: { locale: string };
}) {
    // Validate locale and load messages directly
    const validatedLocale = locales.includes(locale as Locale) ? (locale as Locale) : 'en';
    console.log(`🏠 Layout: Loading messages for locale: ${validatedLocale}`);
    const messages = await loadMessages(validatedLocale);

    return (
        <html lang={locale}>
            <body className={inter.className}>
                <NextIntlClientProvider messages={messages} locale={locale}>
                    <Providers>
                        {children}
                    </Providers>
                    <Toaster />
                </NextIntlClientProvider>
            </body>
        </html>
    )
}