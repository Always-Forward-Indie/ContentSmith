'use client';

import { useState } from 'react';
import { X, Trash2, Pencil, Check, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { SelectedEntity, ZoneMetaUpdate } from './types';

interface Props {
    selected: SelectedEntity;
    onClose: () => void;
    onDelete: () => void;
    onSavePosition: (x: number, y: number, z: number, rotZ?: number) => void;
    onUpdateZone?: (data: ZoneMetaUpdate) => void;
}

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
            <span className="text-muted-foreground w-10 shrink-0">{label}</span>
            <Input
                className="h-7 px-2 font-mono text-xs"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    );
}

export function EntityDetailPanel({ selected, onClose, onDelete, onSavePosition, onUpdateZone }: Props) {
    const { type, data } = selected;

    const [editing, setEditing] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState(false);

    // Position edit state (NPC / worldObject / respawn / spawnZone)
    const [ex, setEx] = useState('');
    const [ey, setEy] = useState('');
    const [ez, setEz] = useState('');
    const [eRotZ, setERotZ] = useState('');

    // Zone metadata edit state
    const [eName, setEName] = useState('');
    const [eSlug, setESlug] = useState('');
    const [eMinLevel, setEMinLevel] = useState('');
    const [eMaxLevel, setEMaxLevel] = useState('');
    const [eIsPvp, setEIsPvp] = useState(false);
    const [eIsSafe, setEIsSafe] = useState(false);

    function startEdit() {
        if (type === 'zone') {
            setEName(data.name);
            setESlug(data.slug);
            setEMinLevel(String(data.minLevel));
            setEMaxLevel(String(data.maxLevel));
            setEIsPvp(data.isPvp);
            setEIsSafe(data.isSafeZone);
        } else if (type === 'npc') {
            setEx(String(data.x)); setEy(String(data.y)); setEz(String(data.z)); setERotZ(String(data.rotZ));
        } else if (type === 'worldObject') {
            setEx(String(data.posX)); setEy(String(data.posY)); setEz(String(data.posZ)); setERotZ(String(data.rotZ ?? 0));
        } else if (type === 'respawn') {
            setEx(String(data.x)); setEy(String(data.y)); setEz(String(data.z));
        } else if (type === 'spawnZone') {
            setEx(String(data.minSpawnX)); setEy(String(data.minSpawnY)); setEz('0');
        } else if (type === 'mob') {
            setEx(String(data.x)); setEy(String(data.y)); setEz(String(data.z)); setERotZ(String(data.rotZ));
        }
        setEditing(true);
    }

    function saveEdit() {
        if (type === 'zone') {
            const minLvl = parseInt(eMinLevel, 10);
            const maxLvl = parseInt(eMaxLevel, 10);
            if (!eName.trim() || !eSlug.trim() || !Number.isFinite(minLvl) || !Number.isFinite(maxLvl)) return;
            onUpdateZone?.({ name: eName.trim(), slug: eSlug.trim(), minLevel: minLvl, maxLevel: maxLvl, isPvp: eIsPvp, isSafeZone: eIsSafe });
            setEditing(false);
            return;
        }
        const nx = parseFloat(ex), ny = parseFloat(ey), nz = parseFloat(ez), nRotZ = parseFloat(eRotZ);
        if (!Number.isFinite(nx) || !Number.isFinite(ny) || !Number.isFinite(nz)) return;
        onSavePosition(nx, ny, nz, Number.isFinite(nRotZ) ? nRotZ : undefined);
        setEditing(false);
    }

    let title = '';
    let rows: { label: string; value: React.ReactNode }[] = [];
    let canDelete = false;
    let canEdit = false;
    let hasRotZ = false;

    if (type === 'zone') {
        title = data.name;
        canDelete = true; canEdit = true;
        rows = [
            { label: 'ID', value: data.id },
            { label: 'Slug', value: data.slug },
            { label: 'Min X', value: data.minX.toFixed(2) },
            { label: 'Max X', value: data.maxX.toFixed(2) },
            { label: 'Min Y', value: data.minY.toFixed(2) },
            { label: 'Max Y', value: data.maxY.toFixed(2) },
            { label: 'Уровни', value: `${data.minLevel ?? '—'} – ${data.maxLevel ?? '—'}` },
            { label: 'PvP', value: data.isPvp ? <Badge variant="destructive" className="text-xs">Да</Badge> : 'Нет' },
            { label: 'Безопасная', value: data.isSafeZone ? <Badge variant="outline" className="text-xs">Да</Badge> : 'Нет' },
        ];
    } else if (type === 'npc') {
        title = data.npcName ?? `NPC #${data.npcId}`;
        canDelete = true; canEdit = true; hasRotZ = true;
        rows = [
            { label: 'ID размещения', value: data.id },
            { label: 'NPC ID', value: data.npcId },
            { label: 'X', value: data.x.toFixed(2) },
            { label: 'Y', value: data.y.toFixed(2) },
            { label: 'Z', value: data.z.toFixed(2) },
            { label: 'RotZ', value: data.rotZ.toFixed(2) },
        ];
    } else if (type === 'spawnZone') {
        title = data.zoneName;
        canDelete = true; canEdit = true;
        rows = [
            { label: 'ID', value: data.spawnZoneId },
            { label: 'Min X', value: data.minSpawnX.toFixed(2) },
            { label: 'Max X', value: data.maxSpawnX.toFixed(2) },
            { label: 'Min Y', value: data.minSpawnY.toFixed(2) },
            { label: 'Max Y', value: data.maxSpawnY.toFixed(2) },
        ];
    } else if (type === 'worldObject') {
        title = data.nameKey;
        canDelete = true; canEdit = true; hasRotZ = true;
        rows = [
            { label: 'ID', value: data.id },
            { label: 'Slug', value: data.slug },
            { label: 'Тип', value: <Badge variant="outline">{data.objectType}</Badge> },
            { label: 'X', value: data.posX.toFixed(2) },
            { label: 'Y', value: data.posY.toFixed(2) },
            { label: 'Z', value: data.posZ.toFixed(2) },
            { label: 'RotZ', value: (data.rotZ ?? 0).toFixed(2) },
        ];
    } else if (type === 'respawn') {
        title = data.name;
        canDelete = true; canEdit = true;
        rows = [
            { label: 'ID', value: data.id },
            { label: 'Default', value: data.isDefault ? 'Да' : 'Нет' },
            { label: 'X', value: data.x.toFixed(2) },
            { label: 'Y', value: data.y.toFixed(2) },
            { label: 'Z', value: data.z.toFixed(2) },
        ];
    } else if (type === 'mob') {
        title = data.mobName ?? `Mob #${data.mobId}`;
        canDelete = true; canEdit = true; hasRotZ = true;
        rows = [
            { label: 'ID позиции', value: data.id },
            { label: 'Mob ID', value: data.mobId },
            { label: 'Уровень', value: data.mobLevel ?? '—' },
            { label: 'X', value: data.x.toFixed(2) },
            { label: 'Y', value: data.y.toFixed(2) },
            { label: 'Z', value: data.z.toFixed(2) },
        ];
    }

    return (
        <aside className="w-64 shrink-0 border-l border-border bg-card flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
                <span className="font-medium text-sm truncate" title={title}>{title}</span>
                <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Properties */}
            {!editing && (
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
                    {rows.map((r) => (
                        <Row key={r.label} label={r.label} value={r.value} />
                    ))}
                    {type === 'zone' && (
                        <p className="text-xs text-muted-foreground pt-1 border-t border-border mt-2">
                            Границы зоны можно изменить перетаскиванием на карте.
                        </p>
                    )}
                </div>
            )}

            {/* Zone metadata edit form */}
            {editing && type === 'zone' && (
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Название</Label>
                        <Input className="h-8 text-sm" value={eName} onChange={(e) => setEName(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Slug</Label>
                        <Input className="h-8 font-mono text-xs" value={eSlug} onChange={(e) => setESlug(e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                        <div className="flex-1 space-y-1">
                            <Label className="text-xs text-muted-foreground">Min Level</Label>
                            <Input type="number" min={1} className="h-8" value={eMinLevel} onChange={(e) => setEMinLevel(e.target.value)} />
                        </div>
                        <div className="flex-1 space-y-1">
                            <Label className="text-xs text-muted-foreground">Max Level</Label>
                            <Input type="number" min={1} className="h-8" value={eMaxLevel} onChange={(e) => setEMaxLevel(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <Label className="text-sm">PvP</Label>
                        <Switch checked={eIsPvp} onCheckedChange={setEIsPvp} />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label className="text-sm">Безопасная зона</Label>
                        <Switch checked={eIsSafe} onCheckedChange={setEIsSafe} />
                    </div>
                </div>
            )}

            {/* Position edit form (non-zone entities) */}
            {editing && type !== 'zone' && (
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
                    <NumField label="X" value={ex} onChange={setEx} />
                    <NumField label="Y" value={ey} onChange={setEy} />
                    <NumField label="Z" value={ez} onChange={setEz} />
                    {hasRotZ && <NumField label="RotZ" value={eRotZ} onChange={setERotZ} />}
                </div>
            )}

            {/* Actions */}
            <div className="border-t border-border px-3 py-2 space-y-1.5">
                {canEdit && !editing && (
                    <Button variant="secondary" size="sm" className="w-full" onClick={startEdit}>
                        <Pencil className="mr-1.5 h-3.5 w-3.5" />
                        {type === 'zone' ? 'Редактировать' : 'Редактировать позицию'}
                    </Button>
                )}
                {editing && (
                    <div className="flex gap-1.5">
                        <Button variant="default" size="sm" className="flex-1" onClick={saveEdit}>
                            <Check className="mr-1 h-3.5 w-3.5" />
                            Сохранить
                        </Button>
                        <Button variant="ghost" size="sm" className="flex-1" onClick={() => setEditing(false)}>
                            <XCircle className="mr-1 h-3.5 w-3.5" />
                            Отмена
                        </Button>
                    </div>
                )}
                {canDelete && !confirmingDelete && (
                    <Button
                        variant="outline" size="sm" className="w-full text-destructive border-destructive/40 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => setConfirmingDelete(true)}
                    >
                        <Trash2 className="mr-1.5 h-4 w-4" />
                        Удалить
                    </Button>
                )}
                {canDelete && confirmingDelete && (
                    <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground text-center">Подтвердить удаление?</p>
                        <div className="flex gap-1.5">
                            <Button variant="destructive" size="sm" className="flex-1" onClick={() => { onDelete(); setConfirmingDelete(false); }}>
                                Да, удалить
                            </Button>
                            <Button variant="ghost" size="sm" className="flex-1" onClick={() => setConfirmingDelete(false)}>
                                Отмена
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}
