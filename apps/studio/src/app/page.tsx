import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function HomePage() {
    return (
        <main className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
                <header className="text-center mb-12">
                    <h1 className="text-4xl font-bold tracking-tight mb-4">
                        ContentSmith
                    </h1>
                    <p className="text-xl text-muted-foreground">
                        Professional MMORPG Content Management System
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Dialogues</CardTitle>
                            <CardDescription>
                                Manage NPC dialogues with visual graph editor
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Link href="/dialogues">
                                <Button className="w-full">Open Dialogue Editor</Button>
                            </Link>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Quests</CardTitle>
                            <CardDescription>
                                Create and manage quest chains and objectives
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Link href="/quests">
                                <Button className="w-full">Open Quest Editor</Button>
                            </Link>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Localization</CardTitle>
                            <CardDescription>
                                Manage translations and text content for UE5
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