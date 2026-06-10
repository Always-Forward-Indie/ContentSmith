'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface ComboboxOption {
    value: string;
    label: string;
    sublabel?: string;
}

interface ComboboxProps {
    options: ComboboxOption[];
    value: string | null;
    onChange: (value: string | null) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyText?: string;
    className?: string;
    triggerClassName?: string;
}

export function Combobox({
    options,
    value,
    onChange,
    placeholder = 'Select...',
    searchPlaceholder = 'Search...',
    emptyText = 'No results found.',
    className,
    triggerClassName,
}: ComboboxProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');

    const selected = options.find((o) => o.value === value);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return options;
        return options.filter(
            (o) =>
                o.label.toLowerCase().includes(q) ||
                (o.sublabel && o.sublabel.toLowerCase().includes(q)),
        );
    }, [options, search]);

    const handleOpenChange = (next: boolean) => {
        setOpen(next);
        if (!next) setSearch('');
    };

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn('justify-between font-normal gap-2 min-w-[160px]', triggerClassName)}
                >
                    <span className="truncate text-left">
                        {selected ? selected.label : <span className="text-muted-foreground">{placeholder}</span>}
                    </span>
                    <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className={cn('p-0 min-w-[200px]', className)} align="start">
                <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 border-b px-2.5 py-1.5">
                        <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <input
                            className="flex h-7 w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                            placeholder={searchPlaceholder}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoComplete="off"
                            autoFocus
                        />
                    </div>
                    <div className="max-h-[280px] overflow-y-auto p-1">
                        {filtered.length === 0 ? (
                            <p className="py-4 text-center text-xs text-muted-foreground">{emptyText}</p>
                        ) : (
                            filtered.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                        onChange(opt.value === value ? null : opt.value);
                                        setOpen(false);
                                        setSearch('');
                                    }}
                                    className={cn(
                                        'relative flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-left',
                                        'hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none',
                                        value === opt.value && 'bg-accent/50',
                                    )}
                                >
                                    <Check
                                        className={cn(
                                            'mr-2 h-3.5 w-3.5 shrink-0',
                                            value === opt.value ? 'opacity-100' : 'opacity-0',
                                        )}
                                    />
                                    <div className="flex flex-col min-w-0">
                                        <span className="truncate">{opt.label}</span>
                                        {opt.sublabel && (
                                            <span className="text-[11px] text-muted-foreground truncate">{opt.sublabel}</span>
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
