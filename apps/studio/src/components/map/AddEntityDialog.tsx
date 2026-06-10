'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { MapTool, ZoneExtra, SpawnZoneShape } from './types';

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
    const td = useTranslations('editors.mapDialog');
    const [search, setSearch] = useState('');
    const [name, setName] = useState('');

    const [zoneSlug, setZoneSlug] = useState('');
    const [zoneSlugManual, setZoneSlugManual] = useState(false);
    const [zoneMinLevel, setZoneMinLevel] = useState('1');
    const [zoneMaxLevel, setZoneMaxLevel] = useState('999');
    const [zoneIsPvp, setZoneIsPvp] = useState(false);
    const [zoneIsSafe, setZoneIsSafe] = useState(false);
    const [zoneShapeType, setZoneShapeType] = useState<SpawnZoneShape>('RECT');
    const [zoneOuterRadius, setZoneOuterRadius] = useState('');
    const [zoneInnerRadius, setZoneInnerRadius] = useState('100');

    const [spawnShapeType, setSpawnShapeType] = useState<SpawnZoneShape>('RECT');
    const [spawnOuterRadius, setSpawnOuterRadius] = useState('');
    const [spawnInnerRadius, setSpawnInnerRadius] = useState('50');
    const [spawnMinZ, setSpawnMinZ] = useState('0');
    const [spawnMaxZ, setSpawnMaxZ] = useState('0');

    const { data: mapData } = trpc.zones.getAllMapData.useQuery(undefined, {
        enabled: tool === 'addSpawnZone',
        staleTime: 60_000,
    });

    function handleZoneNameChange(v: string) {
        setName(v);
        if (!zoneSlugManual) setZoneSlug(toSlug(v));
    }

    const { data: npcList } = trpc.npc.list.useQuery(
        { search, page: 1, limit: 20, sortBy: 'name', sortOrder: 'asc' },
        { enabled: tool === 'addNpc' },
    );

    const { data: classList } = trpc.classes.list.useQuery(
        { search, page: 1, pageSize: 20 },
        { enabled: tool === 'addClassSpawnZone' },
    );

    const { data: woList } = trpc.worldObjects.list.useQuery(
        { search, page: 1, pageSize: 20 },
        { enabled: tool === 'addWorldObject' },
    );

    const isZone = tool === 'addZone';
    const isSpawnZone = tool === 'addSpawnZone';
    const isClassSpawnZone = tool === 'addClassSpawnZone';
    const isTextOnly = tool === 'addRespawn';
    const TOOL_TITLES: Partial<Record<MapTool, string>> = {
        addNpc: td('addNpc'),
        addSpawnZone: td('addSpawnZone'),
        addClassSpawnZone: td('addClassSpawnZone'),
        addWorldObject: td('addWorldObject'),
        addRespawn: td('addRespawn'),
        addZone: td('addZone'),
    };
    const title = TOOL_TITLES[tool] ?? td('add');

    const hasDrawnRect = worldX2 !== undefined && worldY2 !== undefined && (Math.abs((worldX2 ?? worldX) - worldX) > 1 || Math.abs((worldY2 ?? worldY) - worldY) > 1);
    const drawnW = worldX2 !== undefined ? Math.abs(worldX2 - worldX) : 0;
    const drawnH = worldY2 !== undefined ? Math.abs(worldY2 - worldY) : 0;
    const defaultRadius = hasDrawnRect ? Math.round(Math.max(drawnW, drawnH) / 2) : 0;

    const items: { id: number; label: string }[] =
        tool === 'addNpc'
            ? (npcList?.data ?? []).map((n: { id: number; name: string }) => ({ id: n.id, label: n.name }))
            : tool === 'addClassSpawnZone'
                ? (classList?.data ?? []).map((c: { id: number; name: string }) => ({ id: c.id, label: c.name }))
            : tool === 'addWorldObject'
                ? (woList?.data ?? []).map((w: { id: number; slug: string; nameKey: string }) => ({ id: w.id, label: `${w.nameKey} (${w.slug})` }))
                : [];

    function submitZone() {
        if (!name.trim()) return;
        const minLevel = parseInt(zoneMinLevel, 10);
        const maxLevel = parseInt(zoneMaxLevel, 10);
        const outerR = parseFloat(zoneOuterRadius) || (defaultRadius > 0 ? defaultRadius : 500);
        const innerR = parseFloat(zoneInnerRadius) || 100;
        onConfirm(0, name.trim(), {
            slug: zoneSlug.trim() || toSlug(name.trim()),
            minLevel: Number.isFinite(minLevel) ? minLevel : 1,
            maxLevel: Number.isFinite(maxLevel) ? maxLevel : 999,
            isPvp: zoneIsPvp,
            isSafeZone: zoneIsSafe,
            shapeType: zoneShapeType,
            outerRadius: outerR,
            innerRadius: zoneShapeType === 'ANNULUS' ? innerR : 0,
        });
    }

    function submitSpawnZone() {
        if (!name.trim()) return;
        const outerR = parseFloat(spawnOuterRadius) || (defaultRadius > 0 ? defaultRadius : 100);
        const innerR = parseFloat(spawnInnerRadius) || 50;
        onConfirm(0, name.trim(), {
            slug: '',
            minLevel: 1,
            maxLevel: 999,
            isPvp: false,
            isSafeZone: false,
            shapeType: spawnShapeType,
            outerRadius: outerR,
            innerRadius: spawnShapeType === 'ANNULUS' ? innerR : 0,
            minSpawnZ: parseFloat(spawnMinZ) || 0,
            maxSpawnZ: parseFloat(spawnMaxZ) || 0,
        });
    }

    return (
        <Dialog open onOpenChange={(open) => !open && onCancel()}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                        {worldX2 !== undefined && worldY2 !== undefined && (Math.abs(worldX2 - worldX) > 1 || Math.abs(worldY2 - worldY) > 1)
                            ? td('coordinates', {
                                worldX: worldX.toFixed(0),
                                worldY: worldY.toFixed(0),
                                worldX2: worldX2.toFixed(0),
                                worldY2: worldY2.toFixed(0),
                                w: Math.abs(worldX2 - worldX).toFixed(0),
                                h: Math.abs(worldY2 - worldY).toFixed(0),
                            })
                            : td('singlePoint', { worldX: worldX.toFixed(1), worldY: worldY.toFixed(1) })}
                    </p>
                </DialogHeader>

                {isZone && (
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">{td('name')}</Label>
                            <Input
                                placeholder={td('namePlaceholder')}
                                value={name}
                                onChange={(e) => handleZoneNameChange(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">{td('slug')}</Label>
                            <Input
                                className="font-mono text-xs"
                                placeholder={td('slugPlaceholder')}
                                value={zoneSlug}
                                onChange={(e) => { setZoneSlug(e.target.value); setZoneSlugManual(true); }}
                            />
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-1 space-y-1">
                                <Label className="text-xs text-muted-foreground">{td('minLevel')}</Label>
                                <Input type="number" min={1} max={999} className="h-8" value={zoneMinLevel} onChange={(e) => setZoneMinLevel(e.target.value)} />
                            </div>
                            <div className="flex-1 space-y-1">
                                <Label className="text-xs text-muted-foreground">{td('maxLevel')}</Label>
                                <Input type="number" min={1} max={999} className="h-8" value={zoneMaxLevel} onChange={(e) => setZoneMaxLevel(e.target.value)} />
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <Label className="text-sm">{td('pvp')}</Label>
                            <Switch checked={zoneIsPvp} onCheckedChange={setZoneIsPvp} />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label className="text-sm">{td('safeZone')}</Label>
                            <Switch checked={zoneIsSafe} onCheckedChange={setZoneIsSafe} />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">{td('shape')}</Label>
                            <Select value={zoneShapeType} onValueChange={(v) => setZoneShapeType(v as SpawnZoneShape)}>
                                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="RECT">{td('shapeRect')}</SelectItem>
                                    <SelectItem value="CIRCLE">{td('shapeCircle')}</SelectItem>
                                    <SelectItem value="ANNULUS">{td('shapeAnnulus')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {(zoneShapeType === 'CIRCLE' || zoneShapeType === 'ANNULUS') && (
                            <div className="space-y-2 p-2 rounded bg-muted/40 border">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                    {td('circleInfo', { shape: zoneShapeType === 'CIRCLE' ? td('shapeCircle') : td('shapeAnnulus') })}
                                </p>
                                <div className="flex gap-2">
                                    {zoneShapeType === 'ANNULUS' && (
                                        <div className="flex-1 space-y-0.5">
                                            <Label className="text-[10px] text-muted-foreground">{td('innerRadius')}</Label>
                                            <Input type="number" min={0} step="any" className="h-7 text-xs font-mono"
                                                placeholder="100" value={zoneInnerRadius} onChange={(e) => setZoneInnerRadius(e.target.value)} />
                                        </div>
                                    )}
                                    <div className="flex-1 space-y-0.5">
                                        <Label className="text-[10px] text-muted-foreground">{td('outerRadius')}</Label>
                                        <Input type="number" min={0} step="any" className="h-7 text-xs font-mono"
                                            placeholder={defaultRadius > 0 ? String(defaultRadius) : '500'} value={zoneOuterRadius} onChange={(e) => setZoneOuterRadius(e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {isSpawnZone && (
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">{td('name')}</Label>
                            <Input
                                placeholder={td('namePlaceholder')}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">{td('shape')}</Label>
                            <Select value={spawnShapeType} onValueChange={(v) => setSpawnShapeType(v as SpawnZoneShape)}>
                                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="RECT">{td('shapeRect')}</SelectItem>
                                    <SelectItem value="CIRCLE">{td('shapeCircle')}</SelectItem>
                                    <SelectItem value="ANNULUS">{td('shapeAnnulus')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {(spawnShapeType === 'CIRCLE' || spawnShapeType === 'ANNULUS') && (
                            <div className="space-y-2 p-2 rounded bg-muted/40 border">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                    {td('circleInfo', { shape: spawnShapeType === 'CIRCLE' ? td('shapeCircle') : td('shapeAnnulus') })}
                                </p>
                                <div className="flex gap-2">
                                    {spawnShapeType === 'ANNULUS' && (
                                        <div className="flex-1 space-y-0.5">
                                            <Label className="text-[10px] text-muted-foreground">{td('innerRadius')}</Label>
                                            <Input type="number" min={0} step="any" className="h-7 text-xs font-mono"
                                                placeholder="50" value={spawnInnerRadius} onChange={(e) => setSpawnInnerRadius(e.target.value)} />
                                        </div>
                                    )}
                                    <div className="flex-1 space-y-0.5">
                                        <Label className="text-[10px] text-muted-foreground">{td('outerRadius')}</Label>
                                        <Input type="number" min={0} step="any" className="h-7 text-xs font-mono"
                                            placeholder={defaultRadius > 0 ? String(defaultRadius) : '100'} value={spawnOuterRadius} onChange={(e) => setSpawnOuterRadius(e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="flex gap-2">
                            <div className="flex-1 space-y-0.5">
                                <Label className="text-[10px] text-muted-foreground">{td('minZ')}</Label>
                                <Input type="number" step="any" className="h-7 text-xs font-mono"
                                    value={spawnMinZ} onChange={(e) => setSpawnMinZ(e.target.value)} />
                            </div>
                            <div className="flex-1 space-y-0.5">
                                <Label className="text-[10px] text-muted-foreground">{td('maxZ')}</Label>
                                <Input type="number" step="any" className="h-7 text-xs font-mono"
                                    value={spawnMaxZ} onChange={(e) => setSpawnMaxZ(e.target.value)} />
                            </div>
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

                {!isZone && !isSpawnZone && !isTextOnly && (
                    <div className="space-y-2">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                className="pl-8"
                                placeholder={td('search')}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <ul className="max-h-52 overflow-y-auto rounded border border-border text-sm divide-y divide-border">
                            {items.length === 0 && (
                                <li className="px-3 py-2 text-muted-foreground">{td('noResults')}</li>
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
                    <Button variant="ghost" onClick={onCancel}>{td('cancel')}</Button>
                    {isZone && (
                        <Button disabled={!name.trim()} onClick={submitZone}>
                            {td('createZone')}
                        </Button>
                    )}
                    {isSpawnZone && (
                        <Button disabled={!name.trim()} onClick={submitSpawnZone}>
                            {td('create')}
                        </Button>
                    )}
                    {isTextOnly && (
                        <Button
                            disabled={!name.trim()}
                            onClick={() => onConfirm(0, name.trim())}
                        >
                            {td('create')}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
