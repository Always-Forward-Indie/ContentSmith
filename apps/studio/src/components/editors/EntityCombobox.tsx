'use client'

import React, { useState, useEffect, useRef } from 'react'
import { ChevronsUpDown, Check, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface EntityOption {
    value: number | string
    label: string
    sublabel?: string
}

interface EntityComboboxProps {
    value: number | string | null
    displayName: string | null
    onChange: (value: number | string | null) => void
    options: EntityOption[]
    isLoading?: boolean
    onSearch: (search: string) => void
    placeholder?: string
    className?: string
    clearable?: boolean
}

export default function EntityCombobox({
    value,
    displayName,
    onChange,
    options,
    isLoading = false,
    onSearch,
    placeholder = 'Выбрать...',
    className,
    clearable = true,
}: EntityComboboxProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [search, setSearch] = useState('')
    const containerRef = useRef<HTMLDivElement>(null)

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false)
                setSearch('')
            }
        }
        if (isOpen) document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [isOpen])

    const handleOpen = () => {
        setIsOpen(true)
        setSearch('')
        onSearch('')
    }

    const handleSearch = (s: string) => {
        setSearch(s)
        onSearch(s)
    }

    const handleSelect = (opt: EntityOption) => {
        onChange(opt.value)
        setIsOpen(false)
        setSearch('')
    }

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation()
        onChange(null)
    }

    const currentLabel = value !== null && displayName ? displayName : null

    return (
        <div ref={containerRef} className={cn('relative inline-flex shrink-0', className)}>
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs min-w-[120px] max-w-[200px] justify-between gap-1 px-2"
                onClick={handleOpen}
            >
                <span className="truncate">
                    {currentLabel ?? <span className="text-muted-foreground">{placeholder}</span>}
                </span>
                <div className="flex items-center gap-0.5 shrink-0">
                    {clearable && value !== null && (
                        <X
                            className="h-3 w-3 text-muted-foreground hover:text-foreground"
                            onClick={handleClear}
                        />
                    )}
                    <ChevronsUpDown className="h-3 w-3 text-muted-foreground" />
                </div>
            </Button>

            {isOpen && (
                <div className="absolute top-full left-0 z-50 mt-1 w-56 rounded-md border bg-popover shadow-lg">
                    <div className="p-1.5 border-b">
                        <Input
                            autoFocus
                            value={search}
                            onChange={(e) => handleSearch(e.target.value)}
                            placeholder="Поиск..."
                            className="h-7 text-xs"
                        />
                    </div>
                    <div className="max-h-48 overflow-y-auto p-1">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-4 gap-2 text-xs text-muted-foreground">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Загрузка...
                            </div>
                        ) : options.length === 0 ? (
                            <p className="py-4 text-center text-xs text-muted-foreground">Не найдено</p>
                        ) : (
                            options.map((opt) => (
                                <button
                                    key={String(opt.value)}
                                    type="button"
                                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent cursor-pointer text-left"
                                    onClick={() => handleSelect(opt)}
                                >
                                    <Check
                                        className={cn(
                                            'h-3 w-3 shrink-0',
                                            value === opt.value ? 'opacity-100' : 'opacity-0'
                                        )}
                                    />
                                    <span className="flex flex-col min-w-0">
                                        <span className="truncate font-medium">{opt.label}</span>
                                        {opt.sublabel && (
                                            <span className="truncate text-muted-foreground font-mono">{opt.sublabel}</span>
                                        )}
                                    </span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
