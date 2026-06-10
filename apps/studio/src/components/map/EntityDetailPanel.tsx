'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import {
    X, Trash2, Pencil, Check, XCircle,
    ExternalLink, Copy, Plus, Loader2, Skull,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import type { SelectedEntity, ZoneMetaUpdate, SpawnZoneShape } from './types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    selected: SelectedEntity;
    onClose: () => void;
    onDelete: () => void;
    onSavePosition: (x: number, y: number, z: number, rotZ?: number) => void;
    onUpdateZone?: (data: ZoneMetaUpdate) => void;
    onRefetch?: () => void;
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-2 text-sm">
            <span className="text-muted-foreground shrink-0">{label}</span>
            <span className="font-mono text-right break-all">{value}</span>
        </div>
    );
}

function NumField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
        <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground w-12 shrink-0">{label}</span>
            <Input
                className="h-7 px-2 font-mono text-xs"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    );
}

function CopyButton({ value }: { value: string | number }) {
    const [copied, setCopied] = useState(false);
    return (
        <button
            className="ml-1 text-muted-foreground hover:text-foreground transition-colors align-middle"
            title="Copy"
            onClick={() => {
                navigator.clipboard.writeText(String(value)).catch(() => { });
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
            }}
        >
            {copied
                ? <Check className="h-3 w-3 inline text-green-500" />
                : <Copy className="h-3 w-3 inline" />}
        </button>
    );
}

// ─── SpawnZone mobs sub-panel ─────────────────────────────────────────────────

function SpawnZoneMobsPanel({ spawnZoneId, onRefetch }: { spawnZoneId: number; onRefetch?: () => void }) {
    const t = useTranslations('editors.mapPanel');

    const [addOpen, setAddOpen] = useState(false);
    const [mobSearch, setMobSearch] = useState('');
    const [selectedMobId, setSelectedMobId] = useState<number | null>(null);
    const [spawnCount, setSpawnCount] = useState('1');
    const [respawnTime, setRespawnTime] = useState('00:05:00');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editCount, setEditCount] = useState('');
    const [editTime, setEditTime] = useState('');

    const { data: mobsList, refetch } = trpc.zones.listSpawnZoneMobs.useQuery(spawnZoneId);
    const { data: allMobs } = trpc.zones.allMobs.useQuery(undefined, { staleTime: 60_000 });

    const filteredMobs = (allMobs ?? []).filter(
        (m) => !selectedMobId && mobSearch.length > 1 && m.name.toLowerCase().includes(mobSearch.toLowerCase()),
    );

    function afterMutate() {
        refetch();
        onRefetch?.();
    }

    const addMutation = trpc.zones.addSpawnZoneMob.useMutation({
        onSuccess: () => {
            afterMutate();
            setAddOpen(false);
            setMobSearch('');
            setSelectedMobId(null);
            setSpawnCount('1');
            setRespawnTime('00:05:00');
            toast.success(t('mobAdded'));
        },
        onError: (e) => toast.error(e.message),
    });

    const updateMutation = trpc.zones.updateSpawnZoneMob.useMutation({
        onSuccess: () => { refetch(); setEditingId(null); toast.success(t('mobUpdated')); },
        onError: (e) => toast.error(e.message),
    });

    const removeMutation = trpc.zones.removeSpawnZoneMob.useMutation({
        onSuccess: () => { afterMutate(); toast.success(t('mobRemoved')); },
        onError: (e) => toast.error(e.message),
    });

    return (
        <div className="border-t border-border pt-2 mt-1">
            <div className="flex items-center justify-between py-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    {t('spawnMobs')}{mobsList ? ` (${mobsList.length})` : ''}
                </span>
                <button
                    className="text-muted-foreground hover:text-primary transition-colors"
                    onClick={() => setAddOpen(!addOpen)}
                    title={t('addMob')}
                >
                    <Plus className="h-3.5 w-3.5" />
                </button>
            </div>

            {addOpen && (
                <div className="pb-2 space-y-2">
                    <Input
                        className="h-7 text-xs"
                        placeholder={t('searchMob')}
                        value={mobSearch}
                        onChange={(e) => { setMobSearch(e.target.value); setSelectedMobId(null); }}
                    />
                    {filteredMobs.length > 0 && (
                        <div className="border border-border rounded-sm bg-popover max-h-28 overflow-y-auto">
                            {filteredMobs.slice(0, 12).map((m) => (
                                <button
                                    key={m.id}
                                    className="w-full text-left px-2 py-1 text-xs hover:bg-accent"
                                    onClick={() => { setSelectedMobId(m.id); setMobSearch(m.name); }}
                                >
                                    <span className="font-medium">{m.name}</span>
                                    <span className="text-muted-foreground ml-1">Lv{m.level}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    {selectedMobId && (
                        <div className="flex gap-1.5">
                            <div className="flex-1 space-y-0.5">
                                <Label className="text-[10px] text-muted-foreground">{t('spawnCount')}</Label>
                                <Input
                                    type="number" min={1} className="h-7 text-xs"
                                    value={spawnCount}
                                    onChange={(e) => setSpawnCount(e.target.value)}
                                />
                            </div>
                            <div className="flex-1 space-y-0.5">
                                <Label className="text-[10px] text-muted-foreground">{t('respawnTime')}</Label>
                                <Input
                                    className="h-7 text-xs font-mono" placeholder="HH:MM:SS"
                                    value={respawnTime}
                                    onChange={(e) => setRespawnTime(e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                    {selectedMobId && (
                        <Button
                            size="sm" className="w-full h-7 text-xs"
                            disabled={addMutation.isPending}
                            onClick={() => addMutation.mutate({
                                spawnZoneId,
                                mobId: selectedMobId,
                                spawnCount: parseInt(spawnCount) || 1,
                                respawnTime,
                            })}
                        >
                            {addMutation.isPending
                                ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                : <Plus className="h-3 w-3 mr-1" />}
                            {t('addMob')}
                        </Button>
                    )}
                </div>
            )}

            <div className="space-y-1 pb-1">
                {!mobsList && <p className="text-xs text-muted-foreground py-1">{t('loadingMobs')}</p>}
                {mobsList?.length === 0 && <p className="text-xs text-muted-foreground py-1">{t('noMobs')}</p>}
                {mobsList?.map((entry) => (
                    <div key={entry.id} className="rounded-sm bg-muted/40 px-2 py-1">
                        {editingId === entry.id ? (
                            <div className="space-y-1">
                                <div className="flex gap-1">
                                    <Input
                                        type="number" min={1} className="h-6 text-xs flex-1"
                                        value={editCount}
                                        onChange={(e) => setEditCount(e.target.value)}
                                    />
                                    <Input
                                        className="h-6 text-xs font-mono flex-1"
                                        value={editTime}
                                        onChange={(e) => setEditTime(e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-1">
                                    <Button
                                        size="sm" variant="default" className="h-6 text-xs flex-1"
                                        disabled={updateMutation.isPending}
                                        onClick={() => updateMutation.mutate({
                                            id: entry.id,
                                            spawnCount: parseInt(editCount) || 1,
                                            respawnTime: editTime,
                                        })}
                                    >
                                        <Check className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        size="sm" variant="ghost" className="h-6 text-xs flex-1"
                                        onClick={() => setEditingId(null)}
                                    >
                                        <XCircle className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1">
                                <Skull className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="text-xs flex-1 truncate font-medium">
                                    {entry.mobName ?? `Mob #${entry.mobId}`}
                                </span>
                                <span className="text-xs text-muted-foreground tabular-nums">×{entry.spawnCount}</span>
                                <button
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                    onClick={() => { setEditingId(entry.id); setEditCount(String(entry.spawnCount)); setEditTime(entry.respawnTime); }}
                                >
                                    <Pencil className="h-3 w-3" />
                                </button>
                                <button
                                    className="text-muted-foreground hover:text-destructive transition-colors"
                                    onClick={() => removeMutation.mutate({ id: entry.id })}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function compassDir(rotZ: number) {
    const norm = ((rotZ % 360) + 360) % 360;
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(norm / 45) % 8];
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function EntityDetailPanel({
    selected, onClose, onDelete, onSavePosition, onUpdateZone, onRefetch,
}: Props) {
    const { type, data } = selected;
    const locale = useLocale();
    const t = useTranslations('editors.mapPanel');

    const [editing, setEditing] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState(false);

    const [ex, setEx] = useState('');
    const [ey, setEy] = useState('');
    const [ez, setEz] = useState('');
    const [eRotZ, setERotZ] = useState('');

    const [eName, setEName] = useState('');
    const [eSlug, setESlug] = useState('');
    const [eMinLevel, setEMinLevel] = useState('');
    const [eMaxLevel, setEMaxLevel] = useState('');
    const [eIsPvp, setEIsPvp] = useState(false);
    const [eIsSafe, setEIsSafe] = useState(false);
    const [eShapeType, setEShapeType] = useState<SpawnZoneShape>('RECT');
    const [eCenterX, setECenterX] = useState('0');
    const [eCenterY, setECenterY] = useState('0');
    const [eInnerRadius, setEInnerRadius] = useState('0');
    const [eOuterRadius, setEOuterRadius] = useState('0');

    const [eRespawnName, setERespawnName] = useState('');
    const [eRespawnIsDefault, setERespawnIsDefault] = useState(false);

    const [eSpawnZoneName, setESpawnZoneName] = useState('');
    const [eGameZoneId, setEGameZoneId] = useState<string>('');
    const [eExclusionGameZoneId, setEExclusionGameZoneId] = useState<string>('');
    const [eMinSpawnZ, setEMinSpawnZ] = useState('0');
    const [eMaxSpawnZ, setEMaxSpawnZ] = useState('0');

    const [eRespawnZoneId, setERespawnZoneId] = useState<number>(1);

    const [eClassSpawnShapeType, setEClassSpawnShapeType] = useState<SpawnZoneShape>('RECT');
    const [eClassSpawnCenterX, setEClassSpawnCenterX] = useState('0');
    const [eClassSpawnCenterY, setEClassSpawnCenterY] = useState('0');
    const [eClassSpawnInnerR, setEClassSpawnInnerR] = useState('0');
    const [eClassSpawnOuterR, setEClassSpawnOuterR] = useState('0');

    // Fetch zones list for gameZoneId / exclusionGameZoneId dropdowns
    const { data: mapData } = trpc.zones.getAllMapData.useQuery(undefined, { staleTime: 60_000 });

    const updateRespawn = trpc.respawnZones.update.useMutation({
        onSuccess: () => { onRefetch?.(); setEditing(false); toast.success(t('saved')); },
        onError: (e) => toast.error(e.message),
    });

    const updateSpawnZone = trpc.zones.updateSpawnZone.useMutation({
        onSuccess: () => { onRefetch?.(); setEditing(false); toast.success(t('saved')); },
        onError: (e) => toast.error(e.message),
    });

    const updateClassSpawnZone = trpc.zones.updateClassSpawnZone.useMutation({
        onSuccess: () => { onRefetch?.(); setEditing(false); toast.success(t('saved')); },
        onError: (e) => toast.error(e.message),
    });

    function startEdit() {
        if (type === 'zone') {
            setEName(data.name); setESlug(data.slug);
            setEMinLevel(String(data.minLevel)); setEMaxLevel(String(data.maxLevel));
            setEIsPvp(data.isPvp); setEIsSafe(data.isSafeZone);
            setEShapeType((data.shapeType ?? 'RECT') as SpawnZoneShape);
            setECenterX(String(data.centerX ?? 0));
            setECenterY(String(data.centerY ?? 0));
            setEInnerRadius(String(data.innerRadius ?? 0));
            setEOuterRadius(String(data.outerRadius ?? 0));
        } else if (type === 'npc') {
            setEx(String(data.x)); setEy(String(data.y)); setEz(String(data.z)); setERotZ(String(data.rotZ));
        } else if (type === 'worldObject') {
            setEx(String(data.posX)); setEy(String(data.posY)); setEz(String(data.posZ)); setERotZ(String(data.rotZ ?? 0));
        } else if (type === 'respawn') {
            setEx(String(data.x)); setEy(String(data.y)); setEz(String(data.z));
            setERespawnName(data.name); setERespawnIsDefault(data.isDefault);
            setERespawnZoneId(data.zoneId);
            setEShapeType((data.shapeType ?? 'RECT') as SpawnZoneShape);
            setECenterX(String(data.centerX ?? 0));
            setECenterY(String(data.centerY ?? 0));
            setEInnerRadius(String(data.innerRadius ?? 0));
            setEOuterRadius(String(data.outerRadius ?? 0));
        } else if (type === 'spawnZone') {
            setESpawnZoneName(data.zoneName);
            setEShapeType((data.shapeType ?? 'RECT') as SpawnZoneShape);
            setECenterX(String(data.centerX ?? 0));
            setECenterY(String(data.centerY ?? 0));
            setEInnerRadius(String(data.innerRadius ?? 0));
            setEOuterRadius(String(data.outerRadius ?? 0));
            setEGameZoneId(data.gameZoneId != null ? String(data.gameZoneId) : '');
            setEExclusionGameZoneId(data.exclusionGameZoneId != null ? String(data.exclusionGameZoneId) : '');
            setEMinSpawnZ(String(data.minSpawnZ ?? 0));
            setEMaxSpawnZ(String(data.maxSpawnZ ?? 0));
        } else if (type === 'mob') {
            setEx(String(data.x)); setEy(String(data.y)); setEz(String(data.z)); setERotZ(String(data.rotZ));
        } else if (type === 'classSpawnZone') {
            setEx(String(data.minZ)); setEy(String(data.maxZ)); setEz('');
            setEClassSpawnShapeType((data.shapeType ?? 'RECT') as SpawnZoneShape);
            setEClassSpawnCenterX(String(data.centerX ?? 0));
            setEClassSpawnCenterY(String(data.centerY ?? 0));
            setEClassSpawnInnerR(String(data.innerRadius ?? 0));
            setEClassSpawnOuterR(String(data.outerRadius ?? 0));
        }
        setEditing(true);
    }

    function saveEdit() {
        if (type === 'zone') {
            const minLvl = parseInt(eMinLevel, 10), maxLvl = parseInt(eMaxLevel, 10);
            if (!eName.trim() || !eSlug.trim() || !Number.isFinite(minLvl) || !Number.isFinite(maxLvl)) return;
            onUpdateZone?.({
                name: eName.trim(), slug: eSlug.trim(), minLevel: minLvl, maxLevel: maxLvl,
                isPvp: eIsPvp, isSafeZone: eIsSafe,
                shapeType: eShapeType,
                centerX: eShapeType !== 'RECT' ? Number(eCenterX) : undefined,
                centerY: eShapeType !== 'RECT' ? Number(eCenterY) : undefined,
                innerRadius: Number(eInnerRadius),
                outerRadius: Number(eOuterRadius),
            });
            setEditing(false);
            return;
        }
        if (type === 'respawn') {
            const nx = parseFloat(ex), ny = parseFloat(ey), nz = parseFloat(ez);
            if (!Number.isFinite(nx) || !Number.isFinite(ny) || !Number.isFinite(nz)) return;
            updateRespawn.mutate({
                id: data.id, x: nx, y: ny, z: nz,
                name: eRespawnName.trim() || data.name,
                isDefault: eRespawnIsDefault,
                zoneId: eRespawnZoneId,
                shapeType: eShapeType,
                centerX: Number(eCenterX),
                centerY: Number(eCenterY),
                innerRadius: Number(eInnerRadius),
                outerRadius: Number(eOuterRadius),
            });
            return;
        }
        if (type === 'classSpawnZone') {
            updateClassSpawnZone.mutate({
                id: data.id,
                minZ: Number(ez), maxZ: Number(ez),
                shapeType: eClassSpawnShapeType,
                centerX: Number(eClassSpawnCenterX),
                centerY: Number(eClassSpawnCenterY),
                innerRadius: Number(eClassSpawnInnerR),
                outerRadius: Number(eClassSpawnOuterR),
            });
            return;
        }
        if (type === 'spawnZone') {
            if (!eSpawnZoneName.trim()) return;
            updateSpawnZone.mutate({
                spawnZoneId: data.spawnZoneId,
                zoneName: eSpawnZoneName.trim(),
                shapeType: eShapeType,
                centerX: eShapeType !== 'RECT' ? Number(eCenterX) : undefined,
                centerY: eShapeType !== 'RECT' ? Number(eCenterY) : undefined,
                innerRadius: Number(eInnerRadius),
                outerRadius: Number(eOuterRadius),
                gameZoneId: eGameZoneId ? parseInt(eGameZoneId) : null,
                exclusionGameZoneId: eExclusionGameZoneId ? parseInt(eExclusionGameZoneId) : null,
                minSpawnZ: Number(eMinSpawnZ),
                maxSpawnZ: Number(eMaxSpawnZ),
            });
            return;
        }
        const nx = parseFloat(ex), ny = parseFloat(ey), nz = parseFloat(ez), nRotZ = parseFloat(eRotZ);
        if (!Number.isFinite(nx) || !Number.isFinite(ny) || !Number.isFinite(nz)) return;
        onSavePosition(nx, ny, nz, Number.isFinite(nRotZ) ? nRotZ : undefined);
        setEditing(false);
    }

    // ── Editor link ────────────────────────────────────────────────────────────

    let editorHref = '';
    let editorLabel = '';
    if (type === 'zone') { editorHref = `/${locale}/zones/${data.id}`; editorLabel = t('actions.openZone'); }
    else if (type === 'npc') { editorHref = `/${locale}/npcs/${data.npcId}`; editorLabel = t('actions.openNpcTemplate'); }
    else if (type === 'worldObject') { editorHref = `/${locale}/world-objects/${data.id}`; editorLabel = t('actions.openWorldObject'); }
    else if (type === 'respawn') { editorHref = `/${locale}/respawn-zones/${data.id}`; editorLabel = t('actions.openRespawn'); }
    else if (type === 'spawnZone') { editorHref = `/${locale}/spawn-zones/${data.spawnZoneId}`; editorLabel = t('actions.openSpawnZone'); }
    else if (type === 'classSpawnZone') { editorHref = `/${locale}/class-spawn-zones/${data.id}`; editorLabel = 'Open Class Spawn'; }
    else if (type === 'mob') { editorHref = `/${locale}/mobs/${data.mobId}`; editorLabel = t('actions.openMobTemplate'); }

    // ── Display rows ───────────────────────────────────────────────────────────

    let title = '';
    let entityTypeBadge = '';
    let rows: { label: string; value: React.ReactNode }[] = [];
    let canDelete = false;
    let canEdit = false;
    let hasRotZ = false;

    if (type === 'zone') {
        title = data.name; entityTypeBadge = t('types.zone'); canDelete = true; canEdit = true;
        const shape = data.shapeType ?? 'RECT';
        rows = [
            { label: t('fields.id'), value: <span>{data.id}<CopyButton value={data.id} /></span> },
            { label: t('fields.slug'), value: data.slug },
            { label: t('fields.shapeType'), value: <Badge variant="outline" className="text-[10px] font-mono">{shape}</Badge> },
            ...(shape === 'CIRCLE' || shape === 'ANNULUS' ? [
                { label: t('fields.centerX'), value: data.centerX.toFixed(0) },
                { label: t('fields.centerY'), value: data.centerY.toFixed(0) },
                ...(shape === 'ANNULUS' ? [{ label: t('fields.innerRadius'), value: data.innerRadius.toFixed(0) }] : []),
                { label: t('fields.outerRadius'), value: data.outerRadius.toFixed(0) },
            ] : [
                { label: t('fields.minX'), value: data.minX.toFixed(0) },
                { label: t('fields.maxX'), value: data.maxX.toFixed(0) },
                { label: t('fields.minY'), value: data.minY.toFixed(0) },
                { label: t('fields.maxY'), value: data.maxY.toFixed(0) },
            ]),
            { label: t('fields.levels'), value: `${data.minLevel ?? '—'} – ${data.maxLevel ?? '—'}` },
            { label: t('fields.pvp'), value: data.isPvp ? <Badge variant="destructive" className="text-xs">{t('yes')}</Badge> : t('no') },
            { label: t('fields.safeZone'), value: data.isSafeZone ? <Badge variant="outline" className="text-xs">{t('yes')}</Badge> : t('no') },
        ];
    } else if (type === 'npc') {
        title = data.npcName ?? `NPC #${data.npcId}`; entityTypeBadge = t('types.npc'); canDelete = true; canEdit = true; hasRotZ = true;
        rows = [
            { label: t('fields.placementId'), value: <span>{data.id}<CopyButton value={data.id} /></span> },
            { label: t('fields.npcId'), value: <span>{data.npcId}<CopyButton value={data.npcId} /></span> },
            ...(data.npcLevel != null ? [{ label: t('fields.level'), value: String(data.npcLevel) }] : []),
            ...(data.npcTypeName ? [{ label: t('fields.npcType'), value: <Badge variant="outline" className="text-[10px]">{data.npcTypeName}</Badge> }] : []),
            ...(data.factionSlug ? [{ label: t('fields.faction'), value: <span className="font-mono text-xs">{data.factionSlug}</span> }] : []),
            ...(data.isInteractable != null ? [{ label: t('fields.interactable'), value: data.isInteractable ? <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-600/40">{t('yes')}</Badge> : <Badge variant="outline" className="text-[10px] text-muted-foreground">{t('no')}</Badge> }] : []),
            { label: t('fields.x'), value: data.x.toFixed(0) },
            { label: t('fields.y'), value: data.y.toFixed(0) },
            { label: t('fields.z'), value: data.z.toFixed(0) },
            { label: t('fields.rotZ'), value: <span className="tabular-nums">{data.rotZ.toFixed(1)}° <span className="text-muted-foreground font-mono text-[10px]">{compassDir(data.rotZ)}</span></span> },
        ];
    } else if (type === 'spawnZone') {
        title = data.zoneName; entityTypeBadge = t('types.spawnZone'); canDelete = true; canEdit = true;
        const shape = data.shapeType ?? 'RECT';
        const gameZoneName = mapData?.zones.find((z) => z.id === data.gameZoneId)?.name;
        const exclusionZoneName = mapData?.zones.find((z) => z.id === data.exclusionGameZoneId)?.name;
        rows = [
            { label: t('fields.id'), value: <span>{data.spawnZoneId}<CopyButton value={data.spawnZoneId} /></span> },
            { label: t('fields.gameZone'), value: gameZoneName ? <span>{gameZoneName} <span className="text-muted-foreground">#{data.gameZoneId}</span></span> : <span className="text-muted-foreground">—</span> },
            { label: t('fields.exclusionZone'), value: exclusionZoneName ? <span>{exclusionZoneName} <span className="text-muted-foreground">#{data.exclusionGameZoneId}</span></span> : <span className="text-muted-foreground">—</span> },
            { label: t('fields.shapeType'), value: <Badge variant="outline" className="text-[10px] font-mono">{shape}</Badge> },
            ...(shape === 'CIRCLE' || shape === 'ANNULUS' ? [
                { label: t('fields.centerX'), value: data.centerX.toFixed(0) },
                { label: t('fields.centerY'), value: data.centerY.toFixed(0) },
                ...(shape === 'ANNULUS' ? [{ label: t('fields.innerRadius'), value: data.innerRadius.toFixed(0) }] : []),
                { label: t('fields.outerRadius'), value: data.outerRadius.toFixed(0) },
            ] : [
                { label: t('fields.minX'), value: data.minSpawnX.toFixed(0) },
                { label: t('fields.maxX'), value: data.maxSpawnX.toFixed(0) },
                { label: t('fields.minY'), value: data.minSpawnY.toFixed(0) },
                { label: t('fields.maxY'), value: data.maxSpawnY.toFixed(0) },
            ]),
            { label: t('fields.minZ'), value: data.minSpawnZ.toFixed(0) },
            { label: t('fields.maxZ'), value: data.maxSpawnZ.toFixed(0) },
        ];
    } else if (type === 'worldObject') {
        title = data.nameKey; entityTypeBadge = t('types.worldObject'); canDelete = true; canEdit = true; hasRotZ = true;
        rows = [
            { label: t('fields.id'), value: <span>{data.id}<CopyButton value={data.id} /></span> },
            { label: t('fields.slug'), value: data.slug },
            { label: t('fields.type'), value: <Badge variant="outline">{data.objectType}</Badge> },
            { label: t('fields.x'), value: data.posX.toFixed(0) },
            { label: t('fields.y'), value: data.posY.toFixed(0) },
            { label: t('fields.z'), value: data.posZ.toFixed(0) },
            { label: t('fields.rotZ'), value: <span className="tabular-nums">{(data.rotZ ?? 0).toFixed(1)}° <span className="text-muted-foreground font-mono text-[10px]">{compassDir(data.rotZ ?? 0)}</span></span> },
        ];
    } else if (type === 'respawn') {
        title = data.name; entityTypeBadge = t('types.respawn'); canDelete = true; canEdit = true;
        rows = [
            { label: t('fields.id'), value: <span>{data.id}<CopyButton value={data.id} /></span> },
            { label: t('fields.name'), value: data.name },
            { label: t('fields.zoneName'), value: String(data.zoneId) },
            { label: t('fields.isDefault'), value: data.isDefault ? t('yes') : t('no') },
            { label: t('fields.x'), value: data.x.toFixed(0) },
            { label: t('fields.y'), value: data.y.toFixed(0) },
            { label: t('fields.z'), value: data.z.toFixed(0) },
        ];
    } else if (type === 'classSpawnZone') {
        title = (data as any).className ?? `Class #${data.classId}`; entityTypeBadge = t('types.spawnZone') + ' Class'; canDelete = true; canEdit = true;
        rows = [
            { label: t('fields.id'), value: <span>{data.id}<CopyButton value={data.id} /></span> },
            { label: t('fields.shapeType'), value: <Badge variant="outline" className="text-[10px] font-mono">{data.shapeType}</Badge> },
            { label: t('fields.x'), value: data.minX.toFixed(0) },
            { label: t('fields.y'), value: data.minY.toFixed(0) },
            { label: t('fields.z'), value: data.minZ.toFixed(0) },
        ];
    } else if (type === 'mob') {
        title = data.mobName ?? `Mob #${data.mobId}`; entityTypeBadge = t('types.mob'); canDelete = true; canEdit = true; hasRotZ = true;
        rows = [
            { label: t('fields.placementId'), value: <span>{data.id}<CopyButton value={data.id} /></span> },
            { label: t('fields.mobId'), value: <span>{data.mobId}<CopyButton value={data.mobId} /></span> },
            { label: t('fields.level'), value: data.mobLevel ?? '—' },
            { label: t('fields.x'), value: data.x.toFixed(0) },
            { label: t('fields.y'), value: data.y.toFixed(0) },
            { label: t('fields.z'), value: data.z.toFixed(0) },
            { label: t('fields.rotZ'), value: <span className="tabular-nums">{data.rotZ.toFixed(1)}° <span className="text-muted-foreground font-mono text-[10px]">{compassDir(data.rotZ)}</span></span> },
        ];
    }

    const isSaving = updateRespawn.isPending || updateSpawnZone.isPending || updateClassSpawnZone.isPending;

    return (
        <aside className="w-64 shrink-0 h-full border-l border-border bg-card shadow-xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
                <div className="flex items-center gap-1.5 min-w-0">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0 leading-5">
                        {entityTypeBadge}
                    </Badge>
                    <span className="font-medium text-sm truncate" title={title}>{title}</span>
                </div>
                <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* View mode */}
            {!editing && (
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
                    {rows.map((r) => (
                        <Row key={r.label} label={r.label} value={r.value} />
                    ))}
                    {type === 'zone' && (
                        <p className="text-xs text-muted-foreground pt-1 border-t border-border mt-2">
                            {t('actions.editZoneBounds')}
                        </p>
                    )}
                    {type === 'spawnZone' && (
                        <SpawnZoneMobsPanel spawnZoneId={data.spawnZoneId} onRefetch={onRefetch} />
                    )}
                </div>
            )}

            {/* Zone edit form */}
            {editing && type === 'zone' && (
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{t('fields.name')}</Label>
                        <Input className="h-8 text-sm" value={eName} onChange={(e) => setEName(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{t('fields.slug')}</Label>
                        <Input className="h-8 font-mono text-xs" value={eSlug} onChange={(e) => setESlug(e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                        <div className="flex-1 space-y-1">
                            <Label className="text-xs text-muted-foreground">{t('fields.minLevel')}</Label>
                            <Input type="number" min={1} className="h-8" value={eMinLevel} onChange={(e) => setEMinLevel(e.target.value)} />
                        </div>
                        <div className="flex-1 space-y-1">
                            <Label className="text-xs text-muted-foreground">{t('fields.maxLevel')}</Label>
                            <Input type="number" min={1} className="h-8" value={eMaxLevel} onChange={(e) => setEMaxLevel(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <Label className="text-sm">{t('fields.pvp')}</Label>
                        <Switch checked={eIsPvp} onCheckedChange={setEIsPvp} />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label className="text-sm">{t('fields.safeZone')}</Label>
                        <Switch checked={eIsSafe} onCheckedChange={setEIsSafe} />
                    </div>
                    <div className="space-y-1 border-t border-border pt-2">
                        <Label className="text-xs text-muted-foreground">{t('fields.shapeType')}</Label>
                        <Select value={eShapeType} onValueChange={(v) => setEShapeType(v as SpawnZoneShape)}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="RECT">Прямоугольник</SelectItem>
                                <SelectItem value="CIRCLE">Круг</SelectItem>
                                <SelectItem value="ANNULUS">Кольцо</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {eShapeType === 'RECT' && (
                        <p className="text-[10px] text-muted-foreground">{t('actions.editZoneBounds')}</p>
                    )}
                    {(eShapeType === 'CIRCLE' || eShapeType === 'ANNULUS') && (
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <div className="flex-1 space-y-1">
                                    <Label className="text-xs text-muted-foreground">{t('fields.centerX')}</Label>
                                    <Input type="number" step="any" className="h-7 text-xs font-mono" value={eCenterX} onChange={(e) => setECenterX(e.target.value)} />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <Label className="text-xs text-muted-foreground">{t('fields.centerY')}</Label>
                                    <Input type="number" step="any" className="h-7 text-xs font-mono" value={eCenterY} onChange={(e) => setECenterY(e.target.value)} />
                                </div>
                            </div>
                            {eShapeType === 'ANNULUS' && (
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">{t('fields.innerRadius')}</Label>
                                    <Input type="number" min={0} step="any" className="h-7 text-xs font-mono" value={eInnerRadius} onChange={(e) => setEInnerRadius(e.target.value)} />
                                </div>
                            )}
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">{t('fields.outerRadius')}</Label>
                                <Input type="number" min={0} step="any" className="h-7 text-xs font-mono" value={eOuterRadius} onChange={(e) => setEOuterRadius(e.target.value)} />
                            </div>
                            <p className="text-[10px] text-muted-foreground">Перетащи зону на карте чтобы переместить центр</p>
                        </div>
                    )}
                </div>
            )}

            {/* SpawnZone edit form */}
            {editing && type === 'spawnZone' && (
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{t('fields.zoneName')}</Label>
                        <Input className="h-8 text-sm" value={eSpawnZoneName} onChange={(e) => setESpawnZoneName(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{t('fields.gameZone')}</Label>
                        <Select value={eGameZoneId || '__none__'} onValueChange={(v) => setEGameZoneId(v === '__none__' ? '' : v)}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__none__">{t('fields.noZone')}</SelectItem>
                                {(mapData?.zones ?? []).map((z) => (
                                    <SelectItem key={z.id} value={String(z.id)}>{z.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{t('fields.exclusionZone')}</Label>
                        <Select value={eExclusionGameZoneId || '__none__'} onValueChange={(v) => setEExclusionGameZoneId(v === '__none__' ? '' : v)}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__none__">{t('fields.noExclusion')}</SelectItem>
                                {(mapData?.zones ?? []).map((z) => (
                                    <SelectItem key={z.id} value={String(z.id)}>{z.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1 border-t border-border pt-2">
                        <Label className="text-xs text-muted-foreground">{t('fields.shapeType')}</Label>
                        <Select value={eShapeType} onValueChange={(v) => setEShapeType(v as SpawnZoneShape)}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="RECT">Прямоугольник</SelectItem>
                                <SelectItem value="CIRCLE">Круг</SelectItem>
                                <SelectItem value="ANNULUS">Кольцо</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {eShapeType === 'RECT' && (
                        <p className="text-[10px] text-muted-foreground">{t('actions.editZoneBounds')}</p>
                    )}
                    {(eShapeType === 'CIRCLE' || eShapeType === 'ANNULUS') && (
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <div className="flex-1 space-y-1">
                                    <Label className="text-xs text-muted-foreground">{t('fields.centerX')}</Label>
                                    <Input type="number" step="any" className="h-7 text-xs font-mono" value={eCenterX} onChange={(e) => setECenterX(e.target.value)} />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <Label className="text-xs text-muted-foreground">{t('fields.centerY')}</Label>
                                    <Input type="number" step="any" className="h-7 text-xs font-mono" value={eCenterY} onChange={(e) => setECenterY(e.target.value)} />
                                </div>
                            </div>
                            {eShapeType === 'ANNULUS' && (
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">{t('fields.innerRadius')}</Label>
                                    <Input type="number" min={0} step="any" className="h-7 text-xs font-mono" value={eInnerRadius} onChange={(e) => setEInnerRadius(e.target.value)} />
                                </div>
                            )}
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">{t('fields.outerRadius')}</Label>
                                <Input type="number" min={0} step="any" className="h-7 text-xs font-mono" value={eOuterRadius} onChange={(e) => setEOuterRadius(e.target.value)} />
                            </div>
                            <p className="text-[10px] text-muted-foreground">{t('actions.editCircleBounds')}</p>
                        </div>
                    )}
                    <div className="flex gap-2 border-t border-border pt-2">
                        <div className="flex-1 space-y-1">
                            <Label className="text-xs text-muted-foreground">{t('fields.minZ')}</Label>
                            <Input type="number" step="any" className="h-7 text-xs font-mono" value={eMinSpawnZ} onChange={(e) => setEMinSpawnZ(e.target.value)} />
                        </div>
                        <div className="flex-1 space-y-1">
                            <Label className="text-xs text-muted-foreground">{t('fields.maxZ')}</Label>
                            <Input type="number" step="any" className="h-7 text-xs font-mono" value={eMaxSpawnZ} onChange={(e) => setEMaxSpawnZ(e.target.value)} />
                        </div>
                    </div>
                </div>
            )}

            {/* Respawn edit form */}
            {editing && type === 'respawn' && (
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{t('fields.name')}</Label>
                        <Input className="h-8 text-sm" value={eRespawnName} onChange={(e) => setERespawnName(e.target.value)} />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label className="text-sm">{t('fields.isDefault')}</Label>
                        <Switch checked={eRespawnIsDefault} onCheckedChange={setERespawnIsDefault} />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{t('fields.zoneName')}</Label>
                        <Input className="h-8 text-sm" type="number" value={String(eRespawnZoneId)} onChange={(e) => setERespawnZoneId(parseInt(e.target.value) || 1)} />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{t('fields.shapeType')}</Label>
                        <Select value={eShapeType} onValueChange={(v) => setEShapeType(v as SpawnZoneShape)}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="RECT">Rectangle</SelectItem>
                                <SelectItem value="CIRCLE">Circle</SelectItem>
                                <SelectItem value="ANNULUS">Ring</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {(eShapeType === 'CIRCLE' || eShapeType === 'ANNULUS') && (
                        <>
                            <NumField label={t('fields.centerX')} value={eCenterX} onChange={setECenterX} />
                            <NumField label={t('fields.centerY')} value={eCenterY} onChange={setECenterY} />
                            {eShapeType === 'ANNULUS' && <NumField label={t('fields.innerRadius')} value={eInnerRadius} onChange={setEInnerRadius} />}
                            <NumField label={t('fields.outerRadius')} value={eOuterRadius} onChange={setEOuterRadius} />
                        </>
                    )}
                    <NumField label={t('fields.x')} value={ex} onChange={setEx} />
                    <NumField label={t('fields.y')} value={ey} onChange={setEy} />
                    <NumField label={t('fields.z')} value={ez} onChange={setEz} />
                </div>
            )}

            {/* Class spawn zone edit form */}
            {editing && type === 'classSpawnZone' && (
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{t('fields.shapeType')}</Label>
                        <Select value={eClassSpawnShapeType} onValueChange={(v) => setEClassSpawnShapeType(v as SpawnZoneShape)}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="RECT">Rectangle</SelectItem>
                                <SelectItem value="CIRCLE">Circle</SelectItem>
                                <SelectItem value="ANNULUS">Ring</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {(eClassSpawnShapeType === 'CIRCLE' || eClassSpawnShapeType === 'ANNULUS') && (
                        <>
                            <NumField label={t('fields.centerX')} value={eClassSpawnCenterX} onChange={setEClassSpawnCenterX} />
                            <NumField label={t('fields.centerY')} value={eClassSpawnCenterY} onChange={setEClassSpawnCenterY} />
                            {eClassSpawnShapeType === 'ANNULUS' && (
                                <NumField label={t('fields.innerRadius')} value={eClassSpawnInnerR} onChange={setEClassSpawnInnerR} />
                            )}
                            <NumField label={t('fields.outerRadius')} value={eClassSpawnOuterR} onChange={setEClassSpawnOuterR} />
                        </>
                    )}
                    <p className="text-[10px] text-muted-foreground py-1">Bounds (X/Y) — drag on canvas to move/resize</p>
                    <NumField label={t('fields.minZ')} value={ex} onChange={setEx} />
                    <NumField label={t('fields.maxZ')} value={ey} onChange={setEy} />
                </div>
            )}

            {/* Position edit form (npc / worldObject / mob) */}
            {editing && type !== 'zone' && type !== 'spawnZone' && type !== 'respawn' && type !== 'classSpawnZone' && (
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
                    <NumField label={t('fields.x')} value={ex} onChange={setEx} />
                    <NumField label={t('fields.y')} value={ey} onChange={setEy} />
                    <NumField label={t('fields.z')} value={ez} onChange={setEz} />
                    {hasRotZ && <NumField label={t('fields.rotZ')} value={eRotZ} onChange={setERotZ} />}
                </div>
            )}

            {/* Actions */}
            <div className="border-t border-border px-3 py-2 space-y-1.5">
                {!editing && editorHref && (
                    <Link href={editorHref} target="_blank">
                        <Button variant="outline" size="sm" className="w-full">
                            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                            {editorLabel}
                        </Button>
                    </Link>
                )}
                {canEdit && !editing && (
                    <Button variant="secondary" size="sm" className="w-full" onClick={startEdit}>
                        <Pencil className="mr-1.5 h-3.5 w-3.5" />
                        {type === 'zone' || type === 'spawnZone' || type === 'respawn' || type === 'classSpawnZone'
                            ? t('actions.edit')
                            : t('actions.editPosition')}
                    </Button>
                )}
                {editing && (
                    <div className="flex gap-1.5">
                        <Button
                            variant="default" size="sm" className="flex-1"
                            disabled={isSaving}
                            onClick={saveEdit}
                        >
                            {isSaving
                                ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                : <Check className="mr-1 h-3.5 w-3.5" />}
                            {t('actions.save')}
                        </Button>
                        <Button variant="ghost" size="sm" className="flex-1" onClick={() => setEditing(false)}>
                            <XCircle className="mr-1 h-3.5 w-3.5" />
                            {t('actions.cancel')}
                        </Button>
                    </div>
                )}
                {canDelete && !confirmingDelete && (
                    <Button
                        variant="outline" size="sm"
                        className="w-full text-destructive border-destructive/40 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => setConfirmingDelete(true)}
                    >
                        <Trash2 className="mr-1.5 h-4 w-4" />
                        {t('actions.delete')}
                    </Button>
                )}
                {canDelete && confirmingDelete && (
                    <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground text-center">{t('actions.confirmDelete')}</p>
                        <div className="flex gap-1.5">
                            <Button
                                variant="destructive" size="sm" className="flex-1"
                                onClick={() => { onDelete(); setConfirmingDelete(false); }}
                            >
                                {t('actions.confirmDeleteYes')}
                            </Button>
                            <Button
                                variant="ghost" size="sm" className="flex-1"
                                onClick={() => setConfirmingDelete(false)}
                            >
                                {t('actions.cancel')}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}
