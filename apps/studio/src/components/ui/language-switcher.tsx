'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { locales } from '@/i18n/config';

export function LanguageSwitcher() {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();

    const handleLanguageChange = (newLocale: string) => {
        if (newLocale === locale) return; // Don't do anything if same locale

        // Remove current locale from pathname
        const pathWithoutLocale = pathname.replace(/^\/(en|ru)/, '') || '/';

        // Navigate to new locale path - always include locale in path
        const newPath = `/${newLocale}${pathWithoutLocale}`;
        router.push(newPath);
    };

    const getLanguageLabel = (lang: string) => {
        switch (lang) {
            case 'en':
                return '🇺🇸 EN';
            case 'ru':
                return '🇷🇺 RU';
            default:
                return lang.toUpperCase();
        }
    };

    return (
        <div className="flex gap-1">
            {locales.map((lang) => (
                <Button
                    key={lang}
                    variant={locale === lang ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleLanguageChange(lang)}
                    className="text-xs"
                >
                    {getLanguageLabel(lang)}
                </Button>
            ))}
        </div>
    );
}