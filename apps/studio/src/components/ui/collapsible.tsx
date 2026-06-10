'use client';

import { type ReactNode, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsibleSectionProps {
    title: ReactNode;
    defaultOpen?: boolean;
    children: ReactNode;
    className?: string;
    headerClassName?: string;
    badge?: ReactNode;
}

export function CollapsibleSection({
    title,
    defaultOpen = false,
    children,
    className,
    headerClassName,
    badge,
}: CollapsibleSectionProps) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className={cn('', className)}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className={cn(
                    'flex w-full items-center gap-1.5 text-left py-1.5 group',
                    headerClassName,
                )}
            >
                {open ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform" />
                ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform" />
                )}
                <span className="flex-1 min-w-0">{title}</span>
                {badge}
            </button>
            {open && children}
        </div>
    );
}
