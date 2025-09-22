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

export function NavigationSkillsDropdown() {
    const t = useTranslations()
    const locale = useLocale()

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 transition-colors hover:text-foreground/80 text-foreground/60 text-sm font-medium focus:outline-none">
                {t('navigation.skills')}
                <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem asChild>
                    <Link href={`/${locale}/skills`} className="w-full">
                        {t('navigation.skills')}
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href={`/${locale}/skill-schools`} className="w-full">
                        {t('navigation.skillSchools')}
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href={`/${locale}/skill-scale-types`} className="w-full">
                        {t('navigation.skillScaleTypes')}
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href={`/${locale}/skill-properties`} className="w-full">
                        {t('navigation.skillProperties')}
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href={`/${locale}/skill-effects-type`} className="w-full">
                        {t('navigation.skillEffectsType')}
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href={`/${locale}/skill-effects`} className="w-full">
                        {t('navigation.skillEffects')}
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}