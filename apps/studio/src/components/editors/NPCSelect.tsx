'use client'

import React, { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Search, X, User } from 'lucide-react'

interface NPC {
    id: number
    name: string
    slug: string | null
    level: number
    isInteractable: boolean
}

interface NPCSelectProps {
    value: number | null
    onChange: (npcId: number | null) => void
    label?: string
}

export default function NPCSelect({ value, onChange, label }: NPCSelectProps) {
    const t = useTranslations('editors.npcSelect')
    const [isOpen, setIsOpen] = useState(false)
    const [search, setSearch] = useState('')
    const [selectedNpc, setSelectedNpc] = useState<any>(null)

    // Загружаем список NPC с поиском
    const { data: npcs = [], isLoading } = trpc.npc.list.useQuery({
        search: search.trim() || undefined,
        limit: 20
    }, {
        enabled: isOpen // Загружаем только когда выпадающий список открыт
    })

    // Загружаем выбранный NPC по ID
    const { data: currentNpc } = trpc.npc.getById.useQuery(value!, {
        enabled: !!value && !selectedNpc
    })

    useEffect(() => {
        if (currentNpc) {
            setSelectedNpc(currentNpc)
        } else if (value === null) {
            setSelectedNpc(null)
        }
    }, [currentNpc, value])

    const handleSelect = (npc: any) => {
        setSelectedNpc(npc)
        onChange(npc.id)
        setIsOpen(false)
        setSearch('')
    }

    const handleClear = () => {
        setSelectedNpc(null)
        onChange(null)
        setSearch('')
    }

    return (
        <div className="space-y-2">
            <Label>{label || t('defaultLabel')}</Label>

            {/* Выбранный NPC или кнопка выбора */}
            {selectedNpc ? (
                <div className="flex items-center gap-2 p-2 border rounded-md bg-background">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1">
                        <div className="font-medium">{selectedNpc.name}</div>
                        {selectedNpc.slug && (
                            <div className="text-xs text-muted-foreground">@{selectedNpc.slug}</div>
                        )}
                    </div>
                    <div className="text-xs text-muted-foreground">ID: {selectedNpc.id}</div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleClear}
                        className="h-6 w-6 p-0"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            ) : (
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOpen(true)}
                    className="w-full justify-start text-muted-foreground"
                >
                    <Search className="w-4 h-4 mr-2" />
                    {t('selectNpc')}
                </Button>
            )}

            {/* Выпадающий список для поиска */}
            {isOpen && (
                <Card className="absolute z-50 w-md mt-1 shadow-lg">
                    <CardContent className="p-3">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Search className="w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder={t('searchPlaceholder')}
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="border-0 focus-visible:ring-0 p-0"
                                    autoFocus
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsOpen(false)}
                                    className="h-6 w-6 p-0"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="max-h-48 overflow-y-auto space-y-1">
                                {isLoading ? (
                                    <div className="text-center py-4 text-muted-foreground">
                                        {t('loading')}
                                    </div>
                                ) : npcs.length === 0 ? (
                                    <div className="text-center py-4 text-muted-foreground">
                                        {search ? t('noNpcsFound') : t('noNpcsAvailable')}
                                    </div>
                                ) : (
                                    npcs.map((npc) => (
                                        <button
                                            type="button"
                                            key={npc.id}
                                            onClick={() => handleSelect(npc)}
                                            className="w-full text-left p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-muted-foreground" />
                                                <div className="flex-1">
                                                    <div className="font-medium">{npc.name}</div>
                                                    {npc.slug && (
                                                        <div className="text-xs text-muted-foreground">@{npc.slug}</div>
                                                    )}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    ID: {npc.id} | {t('level')}: {npc.level}
                                                </div>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}