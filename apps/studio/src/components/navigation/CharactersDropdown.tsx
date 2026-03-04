'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const CHARACTERS_PATHS = [
    '/classes',
    '/exp-for-level',
    '/races',
    '/character-genders',
    '/entity-attributes',
]

export function NavigationCharactersDropdown() {
    const t = useTranslations('navigation')
    const locale = useLocale()
    const pathname = usePathname()
    const isActive = CHARACTERS_PATHS.some((p) => pathname.includes(p))

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                className={cn(
                    'flex items-center gap-1 text-sm font-medium focus:outline-none transition-colors',
                    'relative after:absolute after:-bottom-[1px] after:left-0 after:h-[2px] after:w-full after:rounded-full after:transition-all',
                    isActive
                        ? 'text-foreground after:bg-primary'
                        : 'text-foreground/55 hover:text-foreground/80 after:scale-x-0 after:bg-primary hover:after:scale-x-100',
                )}
            >
                {t('characters')}
                <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem asChild>
                    <Link href={`/${locale}/classes`} className="w-full">
                        {t('classes')}
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href={`/${locale}/exp-for-level`} className="w-full">
                        {t('xpCurve')}
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href={`/${locale}/races`} className="w-full">
                        {t('races')}
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href={`/${locale}/character-genders`} className="w-full">
                        {t('characterGenders')}
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href={`/${locale}/entity-attributes`} className="w-full">
                        {t('entityAttributes')}
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
