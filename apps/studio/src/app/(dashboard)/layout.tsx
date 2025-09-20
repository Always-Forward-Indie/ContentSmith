import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-background">
            {/* Navigation Header */}
            <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-14 items-center">
                    <Link href="/" className="mr-6 flex items-center space-x-2">
                        <span className="hidden font-bold sm:inline-block">
                            ContentSmith
                        </span>
                    </Link>
                    <nav className="flex items-center space-x-6 text-sm font-medium">
                        <Link
                            href="/dialogues"
                            className="transition-colors hover:text-foreground/80 text-foreground/60"
                        >
                            Dialogues
                        </Link>
                        <Link
                            href="/quests"
                            className="transition-colors hover:text-foreground/80 text-foreground/60"
                        >
                            Quests
                        </Link>
                        <Link
                            href="/localization"
                            className="transition-colors hover:text-foreground/80 text-foreground/60"
                        >
                            Localization
                        </Link>
                        <Link
                            href="/analytics"
                            className="transition-colors hover:text-foreground/80 text-foreground/60"
                        >
                            Analytics
                        </Link>
                    </nav>
                    <div className="ml-auto flex items-center space-x-4">
                        <Button variant="outline" size="sm">
                            Settings
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