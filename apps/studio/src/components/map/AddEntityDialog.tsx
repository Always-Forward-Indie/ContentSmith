'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { MapTool, ZoneExtra } from './types';

const TOOL_LABELS: Partial<Record<MapTool, string>> = {
    addNpc: 'Выберите NPC',
    addSpawnZone: 'Название spawn zone',
    addWorldObject: 'Выберите World Object',
    addRespawn: 'Название respawn точки',
    addZone: 'Новая игровая зона',
};

interface Props {
    tool: MapTool;
    worldX: number;
    worldY: number;
    worldX2?: number;
    worldY2?: number;
    onConfirm: (entityId: number, name: string, extra?: ZoneExtra) => void;
    onCancel: () => void;
}

function toSlug(s: string) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function AddEntityDialog({ tool, worldX, worldY, worldX2, worldY2, onConfirm, onCancel }: Props) {
    const [search, setSearch] = useState('');
    const [name, setName] = useState('');

    // Zone-specific fields
    const [zoneSlug, setZoneSlug] = useState('');
    const [zoneSlugManual, setZoneSlugManual] = useState(false);
    const [zoneMinLevel, setZoneMinLevel] = useState('1');
    const [zoneMaxLevel, setZoneMaxLevel] = useState('999');
    const [zoneIsPvp, setZoneIsPvp] = useState(false);
    const [zoneIsSafe, setZoneIsSafe] = useState(false);

    function handleZoneNameChange(v: string) {
        setName(v);
        if (!zoneSlugManual) setZoneSlug(toSlug(v));
    }

    // NPC search
    const { data: npcList } = trpc.npc.list.useQuery(
        { search, page: 1, limit: 20, sortBy: 'name', sortOrder: 'asc' },
        { enabled: tool === 'addNpc' },
    );

    // World object search
    const { data: woList } = trpc.worldObjects.list.useQuery(
        { search, page: 1, pageSize: 20 },
        { enabled: tool === 'addWorldObject' },
    );

    const isZone = tool === 'addZone';
    const isTextOnly = tool === 'addSpawnZone' || tool === 'addRespawn';
    const title = TOOL_LABELS[tool] ?? 'Добавить';

    const items: { id: number; label: string }[] =
        tool === 'addNpc'
            ? (npcList?.data ?? []).map((n: { id: number; name: string }) => ({ id: n.id, label: n.name }))
            : tool === 'addWorldObject'
                ? (woList?.data ?? []).map((w: { id: number; slug: string; nameKey: string }) => ({ id: w.id, label: `${w.nameKey} (${w.slug})` }))
                : [];

    function submitZone() {
        if (!name.trim()) return;
        const minLevel = parseInt(zoneMinLevel, 10);
        const maxLevel = parseInt(zoneMaxLevel, 10);
        onConfirm(0, name.trim(), {
            slug: zoneSlug.trim() || toSlug(name.trim()),
            minLevel: Number.isFinite(minLevel) ? minLevel : 1,
            maxLevel: Number.isFinite(maxLevel) ? maxLevel : 999,
            isPvp: zoneIsPvp,
            isSafeZone: zoneIsSafe,
        });
    }

    return (
        <Dialog open onOpenChange={(open) => !open && onCancel()}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                        {worldX2 !== undefined && worldY2 !== undefined && (Math.abs(worldX2 - worldX) > 1 || Math.abs(worldY2 - worldY) > 1)
                            ? `${worldX.toFixed(0)},${worldY.toFixed(0)} → ${worldX2.toFixed(0)},${worldY2.toFixed(0)} (${Math.abs(worldX2 - worldX).toFixed(0)}×${Math.abs(worldY2 - worldY).toFixed(0)})`
                            : `X ${worldX.toFixed(1)} / Y ${worldY.toFixed(1)}`}
                    </p>
                </DialogHeader>

                {isZone && (
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Название *</Label>
                            <Input
                                placeholder="Например: Тёмный лес"
                                value={name}
                                onChange={(e) => handleZoneNameChange(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Slug</Label>
                            <Input
                                className="font-mono text-xs"
                                placeholder="dark-forest"
                                value={zoneSlug}
                                onChange={(e) => { setZoneSlug(e.target.value); setZoneSlugManual(true); }}
                            />
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-1 space-y-1">
                                <Label className="text-xs text-muted-foreground">Min Level</Label>
                                <Input type="number" min={1} max={999} className="h-8" value={zoneMinLevel} onChange={(e) => setZoneMinLevel(e.target.value)} />
                            </div>
                            <div className="flex-1 space-y-1">
                                <Label className="text-xs text-muted-foreground">Max Level</Label>
                                <Input type="number" min={1} max={999} className="h-8" value={zoneMaxLevel} onChange={(e) => setZoneMaxLevel(e.target.value)} />
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <Label className="text-sm">PvP</Label>
                            <Switch checked={zoneIsPvp} onCheckedChange={setZoneIsPvp} />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label className="text-sm">Безопасная зона</Label>
                            <Switch checked={zoneIsSafe} onCheckedChange={setZoneIsSafe} />
                        </div>
                    </div>
                )}

                {isTextOnly && (
                    <Input
                        placeholder={title}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoFocus
                    />
                )}

                {!isZone && !isTextOnly && (
                    <div className="space-y-2">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                className="pl-8"
                                placeholder="Поиск…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <ul className="max-h-52 overflow-y-auto rounded border border-border text-sm divide-y divide-border">
                            {items.length === 0 && (
                                <li className="px-3 py-2 text-muted-foreground">Нет результатов</li>
                            )}
                            {items.map((item) => (
                                <li key={item.id}>
                                    <button
                                        className="w-full px-3 py-2 text-left hover:bg-accent transition-colors"
                                        onClick={() => onConfirm(item.id, item.label)}
                                    >
                                        {item.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="ghost" onClick={onCancel}>Отмена</Button>
                    {isZone && (
                        <Button disabled={!name.trim()} onClick={submitZone}>
                            Создать зону
                        </Button>
                    )}
                    {isTextOnly && (
                        <Button
                            disabled={!name.trim()}
                            onClick={() => onConfirm(0, name.trim())}
                        >
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
