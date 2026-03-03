import { AppHeader } from '@/components/navigation/AppHeader';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-background">
            <AppHeader />
            <main className="container mx-auto px-4 py-8">
                {children}
            </main>
        </div>
    );
}
