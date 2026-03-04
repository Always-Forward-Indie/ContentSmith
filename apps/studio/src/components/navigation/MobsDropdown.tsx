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

const MOBS_PATHS = ['/mobs', '/mob-races', '/mob-ranks', '/target-types', '/spawn-zones']

export function NavigationMobsDropdown() {
    const t = useTranslations('navigation')
    const locale = useLocale()
    const pathname = usePathname()
    const isActive = MOBS_PATHS.some((p) => pathname.includes(p))

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
                {t('mobs')}
                <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
                <DropdownMenuItem asChild>
                    <Link href={`/${locale}/mobs`} className="w-full">
                        {t('mobs')}
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href={`/${locale}/mob-races`} className="w-full">
                        {t('mobRaces')}
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href={`/${locale}/mob-ranks`} className="w-full">
                        {t('mobRanks')}
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href={`/${locale}/target-types`} className="w-full">
                        {t('targetTypes')}
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href={`/${locale}/spawn-zones`} className="w-full">
                        {t('spawnZones')}
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
