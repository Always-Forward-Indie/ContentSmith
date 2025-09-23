'use client'

import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function NavigationItemsDropdown() {
    const t = useTranslations()
    const locale = useLocale()

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 transition-colors hover:text-foreground/80 text-foreground/60 text-sm font-medium focus:outline-none">
                {t('navigation.items')}
                <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem asChild>
                    <Link href={`/${locale}/items`} className="w-full">
                        {t('navigation.items')}
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href={`/${locale}/item-types`} className="w-full">
                        {t('navigation.itemTypes')}
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href={`/${locale}/items-rarity`} className="w-full">
                        {t('navigation.itemsRarity')}
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href={`/${locale}/item-attributes`} className="w-full">
                        {t('navigation.itemAttributes')}
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}