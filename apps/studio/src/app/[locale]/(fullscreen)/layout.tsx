'use client';

import { AppHeader } from '@/components/navigation/AppHeader';

export default function FullscreenLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen flex-col overflow-hidden bg-background">
            <AppHeader />
            <div className="flex-1 overflow-hidden">{children}</div>
        </div>
    );
}
