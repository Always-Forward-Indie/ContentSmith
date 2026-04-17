'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Users, Sword, Sun, Moon, ScrollText, Settings } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navItems = [
    { href: '/accounts', label: 'Аккаунты', icon: Users },
    { href: '/characters', label: 'Персонажи', icon: Sword },
    { href: '/game-config', label: 'Конфиг', icon: Settings },
    { href: '/gm-log', label: 'Аудит', icon: ScrollText },
];

export function AppHeader() {
    const pathname = usePathname();
    const { theme, setTheme } = useTheme();

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center gap-6">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 font-bold text-sm">
                    <div className="flex items-center justify-center w-7 h-7 rounded bg-primary text-primary-foreground">
                        <Shield className="h-4 w-4" />
                    </div>
                    GM Panel
                </Link>

                {/* Nav */}
                <nav className="flex items-center gap-1">
                    {navItems.map(({ href, label, icon: Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
                                pathname.startsWith(href)
                                    ? 'bg-accent text-accent-foreground font-medium'
                                    : 'text-muted-foreground'
                            )}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            {label}
                        </Link>
                    ))}
                </nav>

                <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono">mmo_prototype</span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        aria-label="Переключить тему"
                    >
                        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    </Button>
                </div>
            </div>
        </header>
    );
}
