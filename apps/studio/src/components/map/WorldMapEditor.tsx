'use client';

import {
    useCallback, useEffect, useMemo, useRef, useState,
    type MouseEvent as ReactMouseEvent,
} from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { MapToolbar } from './MapToolbar';
import { AddEntityDialog } from './AddEntityDialog';
import { EntityDetailPanel } from './EntityDetailPanel';
import {
    computeWorldBounds,
    worldToNorm,
    normToWorld,
    type EntityLayer,
    type MapTool,
    type SelectedEntity,
    type WorldBounds,
    type ZoneRecord,
    type ZoneExtra,
    type ZoneMetaUpdate,
    type SpawnZoneRect,
} from './types';
import type { MapConfig } from '@/lib/map-config';

const MIN_ZOOM = 0.05;
const MAX_ZOOM = 20;
const HANDLE_PX = 6;
const MIN_DRAG_PX = 4;

const LAYER_COLORS: Record<EntityLayer, string> = {
    zones: '#facc15',
    npc: '#22c55e',
    spawnZone: '#3b82f6',
    worldObject: '#f97316',
    respawn: '#a855f7',
    mob: '#ef4444',
};

type HandleDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

type DragState =
    | { type: 'pan'; startClientX: number; startClientY: number; startPanX: number; startPanY: number }
    | { type: 'moveZone'; zone: ZoneRecord; startWorld: [number, number]; origBounds: { minX: number; maxX: number; minY: number; maxY: number } }
    | { type: 'resizeZone'; zone: ZoneRecord; handleDir: HandleDir; startWorld: [number, number]; origBounds: { minX: number; maxX: number; minY: number; maxY: number } }
    | { type: 'moveEntity'; entity: SelectedEntity; startClientX: number; startClientY: number; origWorldX: number; origWorldY: number }
    | { type: 'drawRect'; tool: 'addZone' | 'addSpawnZone'; startWorld: [number, number]; endWorld: [number, number] }
    | { type: 'moveSpawnZone'; sz: SpawnZoneRect; startWorld: [number, number]; origBounds: { minX: number; maxX: number; minY: number; maxY: number } }
    | { type: 'resizeSpawnZone'; sz: SpawnZoneRect; handleDir: HandleDir; startWorld: [number, number]; origBounds: { minX: number; maxX: number; minY: number; maxY: number } };

export function WorldMapEditor() {
    const { data, isLoading, refetch } = trpc.zones.getAllMapData.useQuery(undefined, {
        refetchOnWindowFocus: false,
    });

    const createZone = trpc.zones.create.useMutation({ onSuccess: () => { toast.success('Зона создана'); refetch(); }, onError: (e) => toast.error(e.message) });
    const updateZone = trpc.zones.update.useMutation({ onError: (e) => toast.error(e.message), onSuccess: () => refetch() });
    const deleteZone = trpc.zones.delete.useMutation({ onSuccess: () => { toast.success('Зона удалена'); refetch(); setSelected(null); }, onError: (e) => toast.error(e.message) });
    const createNpcPlacement = trpc.zones.createNpcPlacement.useMutation({ onSuccess: () => { toast.success('NPC размещён'); refetch(); }, onError: (e) => toast.error(e.message) });
    const updateNpcPlacement = trpc.zones.updateNpcPlacement.useMutation({ onSuccess: () => { toast.success('Сохранено'); refetch(); }, onError: (e) => toast.error(e.message) });
    const deleteNpcPlacement = trpc.zones.deleteNpcPlacement.useMutation({ onSuccess: () => { toast.success('Размещение удалено'); refetch(); setSelected(null); }, onError: (e) => toast.error(e.message) });
    const createSpawnZone = trpc.zones.createSpawnZone.useMutation({ onSuccess: () => { toast.success('Spawn zone создана'); refetch(); }, onError: (e) => toast.error(e.message) });
    const deleteSpawnZone = trpc.zones.deleteSpawnZone.useMutation({ onSuccess: () => { toast.success('Spawn zone удалена'); refetch(); setSelected(null); }, onError: (e) => toast.error(e.message) });
    const createRespawnZone = trpc.respawnZones.create.useMutation({ onSuccess: () => { toast.success('Respawn точка создана'); refetch(); }, onError: (e) => toast.error(e.message) });
    const updateWorldObject = trpc.worldObjects.update.useMutation({ onSuccess: () => { toast.success('Сохранено'); refetch(); }, onError: (e) => toast.error(e.message) });
    const deleteWorldObject = trpc.worldObjects.delete.useMutation({ onSuccess: () => { toast.success('Объект удалён'); refetch(); setSelected(null); }, onError: (e) => toast.error(e.message) });
    const updateRespawnZone = trpc.respawnZones.update.useMutation({ onSuccess: () => { toast.success('Сохранено'); refetch(); }, onError: (e) => toast.error(e.message) });
    const deleteRespawnZone = trpc.respawnZones.delete.useMutation({ onSuccess: () => { toast.success('Respawn zone удалена'); refetch(); setSelected(null); }, onError: (e) => toast.error(e.message) });
    const updateSpawnZone = trpc.zones.updateSpawnZone.useMutation({ onError: (e) => toast.error(e.message), onSuccess: () => refetch() });
    const updateMobPosition = trpc.mobs.updatePosition.useMutation({ onSuccess: () => { toast.success('Сохранено'); refetch(); }, onError: (e) => toast.error(e.message) });
    const deleteMobPosition = trpc.mobs.deletePosition.useMutation({ onSuccess: () => { toast.success('Моб удалён'); refetch(); setSelected(null); }, onError: (e) => toast.error(e.message) });

    const [mapConfig, setMapConfig] = useState<MapConfig | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    useEffect(() => { fetch('/api/map-config').then((r) => r.json() as Promise<MapConfig>).then(setMapConfig).catch(() => { }); }, []);

    const [zoom, setZoom] = useState(1);
    const [panX, setPanX] = useState(0);
    const [panY, setPanY] = useState(0);
    const [flipY, setFlipY] = useState(false);

    const viewportRef = useRef({ zoom: 1, panX: 0, panY: 0 });
    function setViewport(z: number, px: number, py: number) {
        viewportRef.current = { zoom: z, panX: px, panY: py };
        setZoom(z); setPanX(px); setPanY(py);
    }

    const [activeTool, setActiveTool] = useState<MapTool>('select');
    const [visibleLayers, setVisibleLayers] = useState<Set<EntityLayer>>(
        new Set<EntityLayer>(['zones', 'npc', 'spawnZone', 'worldObject', 'respawn', 'mob']),
    );
    const [selected, setSelected] = useState<SelectedEntity | null>(null);
    const [addDialog, setAddDialog] = useState<{ tool: MapTool; worldX: number; worldY: number; worldX2?: number; worldY2?: number; zoneId?: number } | null>(null);
    const [draftZones, setDraftZones] = useState<Map<number, ZoneRecord>>(new Map());
    const [draftSpawnZones, setDraftSpawnZones] = useState<Map<number, SpawnZoneRect>>(new Map());
    const [drawRect, setDrawRect] = useState<{ startWorld: [number, number]; endWorld: [number, number] } | null>(null);
    const [draftEntityPos, setDraftEntityPos] = useState<{ entityType: SelectedEntity['type']; id: number; wx: number; wy: number } | null>(null);
    const [cursorWorld, setCursorWorld] = useState<[number, number] | null>(null);

    const dragRef = useRef<DragState | null>(null);
    const hasDragMovedRef = useRef(false);
    const suppressClickClearRef = useRef(false);
    const svgRef = useRef<SVGSVGElement>(null);
    const fittedRef = useRef(false);

    const zones: ZoneRecord[] = data?.zones ?? [];
    const worldBounds: WorldBounds = useMemo(
        () => computeWorldBounds(zones, { minX: mapConfig?.worldMinX ?? null, maxX: mapConfig?.worldMaxX ?? null, minY: mapConfig?.worldMinY ?? null, maxY: mapConfig?.worldMaxY ?? null } as Partial<WorldBounds>),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [zones, mapConfig],
    );

    function resolveZone(z: ZoneRecord): ZoneRecord { return draftZones.get(z.id) ?? z; }
    function resolveSpawnZone(sz: SpawnZoneRect): SpawnZoneRect { return draftSpawnZones.get(sz.spawnZoneId) ?? sz; }

    function svgW() { return svgRef.current?.clientWidth ?? 800; }
    function svgH() { return svgRef.current?.clientHeight ?? 600; }

    function clientToGroup(cx: number, cy: number): [number, number] {
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return [0, 0];
        return [(cx - rect.left - panX) / zoom, (cy - rect.top - panY) / zoom];
    }
    function groupToWorld(gx: number, gy: number): [number, number] {
        return normToWorld(gx / svgW(), gy / svgH(), worldBounds, flipY);
    }
    function clientToWorld(cx: number, cy: number): [number, number] {
        return groupToWorld(...clientToGroup(cx, cy));
    }
    function worldToGroup(wx: number, wy: number): [number, number] {
        const [nx, ny] = worldToNorm(wx, wy, worldBounds, flipY);
        return [nx * svgW(), ny * svgH()];
    }

    // stable wheel handler — uses viewportRef, registered once
    const handleWheel = useCallback((e: WheelEvent) => {
        e.preventDefault();
        const { zoom: z, panX: px, panY: py } = viewportRef.current;
        const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor));
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return;
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const ratio = newZoom / z;
        const newPanX = mx - (mx - px) * ratio;
        const newPanY = my - (my - py) * ratio;
        viewportRef.current = { zoom: newZoom, panX: newPanX, panY: newPanY };
        setZoom(newZoom); setPanX(newPanX); setPanY(newPanY);
    }, []);

    useEffect(() => {
        const el = svgRef.current;
        if (!el) return;
        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
        // isLoading: re-register after SVG mounts (was null during initial loading screen)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoading, handleWheel]);

    function resetViewport() { setViewport(1, 0, 0); }

    function fitToView() {
        const w = svgRef.current?.clientWidth ?? 800;
        const h = svgRef.current?.clientHeight ?? 600;
        const PAD = 40;
        const fitZoom = Math.min((w - PAD * 2) / w, (h - PAD * 2) / h, MAX_ZOOM);
        const newPanX = w * (1 - fitZoom) / 2;
        const newPanY = h * (1 - fitZoom) / 2;
        setViewport(fitZoom, newPanX, newPanY);
    }

    useEffect(() => {
        if (data && !fittedRef.current) {
            fittedRef.current = true;
            requestAnimationFrame(fitToView);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data]);

    function handleSvgMouseDown(e: ReactMouseEvent<SVGSVGElement>) {
        if (e.button !== 0 && e.button !== 1) return;
        hasDragMovedRef.current = false;
        suppressClickClearRef.current = false;
        if (e.button === 1 || activeTool === 'select') {
            dragRef.current = { type: 'pan', startClientX: e.clientX, startClientY: e.clientY, startPanX: panX, startPanY: panY };
            e.preventDefault();
        } else if (activeTool === 'addZone' || activeTool === 'addSpawnZone') {
            const [wx, wy] = clientToWorld(e.clientX, e.clientY);
            dragRef.current = { type: 'drawRect', tool: activeTool, startWorld: [wx, wy], endWorld: [wx, wy] };
            setDrawRect({ startWorld: [wx, wy], endWorld: [wx, wy] });
            e.preventDefault();
        }
    }

    function handleSvgMouseMove(e: ReactMouseEvent<SVGSVGElement>) {
        const [wx, wy] = clientToWorld(e.clientX, e.clientY);
        setCursorWorld([wx, wy]);
        const drag = dragRef.current;
        if (!drag) return;

        if (drag.type === 'pan') {
            const dx = e.clientX - drag.startClientX;
            const dy = e.clientY - drag.startClientY;
            if (!hasDragMovedRef.current && Math.hypot(dx, dy) > MIN_DRAG_PX) hasDragMovedRef.current = true;
            const newPanX = drag.startPanX + dx;
            const newPanY = drag.startPanY + dy;
            viewportRef.current.panX = newPanX;
            viewportRef.current.panY = newPanY;
            setPanX(newPanX); setPanY(newPanY);
            return;
        }

        hasDragMovedRef.current = true;

        if (drag.type === 'moveZone') {
            const dx = wx - drag.startWorld[0];
            const dy = wy - drag.startWorld[1];
            setDraftZones((m) => { const n = new Map(m); n.set(drag.zone.id, { ...drag.zone, minX: drag.origBounds.minX + dx, maxX: drag.origBounds.maxX + dx, minY: drag.origBounds.minY + dy, maxY: drag.origBounds.maxY + dy }); return n; });
        } else if (drag.type === 'resizeZone') {
            const ob = drag.origBounds, dir = drag.handleDir;
            const dx = wx - drag.startWorld[0], dy = wy - drag.startWorld[1];
            const p: Partial<typeof ob> = {};
            if (dir.includes('w')) p.minX = ob.minX + dx;
            if (dir.includes('e')) p.maxX = ob.maxX + dx;
            if (dir.includes('n') && !flipY) p.minY = ob.minY + dy;
            if (dir.includes('s') && !flipY) p.maxY = ob.maxY + dy;
            if (dir.includes('n') && flipY) p.maxY = ob.maxY - dy;
            if (dir.includes('s') && flipY) p.minY = ob.minY - dy;
            setDraftZones((m) => { const n = new Map(m); n.set(drag.zone.id, { ...drag.zone, ...ob, ...p } as ZoneRecord); return n; });
        } else if (drag.type === 'moveEntity') {
            const [gx, gy] = clientToGroup(e.clientX, e.clientY);
            const [nwx, nwy] = groupToWorld(gx, gy);
            setDraftEntityPos({ entityType: drag.entity.type, id: getEntityId(drag.entity), wx: nwx, wy: nwy });
        } else if (drag.type === 'drawRect') {
            dragRef.current = { ...drag, endWorld: [wx, wy] };
            setDrawRect({ startWorld: drag.startWorld, endWorld: [wx, wy] });
        } else if (drag.type === 'moveSpawnZone') {
            const dx = wx - drag.startWorld[0], dy = wy - drag.startWorld[1];
            setDraftSpawnZones((m) => { const n = new Map(m); n.set(drag.sz.spawnZoneId, { ...drag.sz, minSpawnX: drag.origBounds.minX + dx, maxSpawnX: drag.origBounds.maxX + dx, minSpawnY: drag.origBounds.minY + dy, maxSpawnY: drag.origBounds.maxY + dy }); return n; });
        } else if (drag.type === 'resizeSpawnZone') {
            const ob = drag.origBounds, dir = drag.handleDir;
            const dx = wx - drag.startWorld[0], dy = wy - drag.startWorld[1];
            let newMinX = ob.minX, newMaxX = ob.maxX, newMinY = ob.minY, newMaxY = ob.maxY;
            if (dir.includes('w')) newMinX = ob.minX + dx;
            if (dir.includes('e')) newMaxX = ob.maxX + dx;
            if (dir.includes('n') && !flipY) newMinY = ob.minY + dy;
            if (dir.includes('s') && !flipY) newMaxY = ob.maxY + dy;
            if (dir.includes('n') && flipY) newMaxY = ob.maxY - dy;
            if (dir.includes('s') && flipY) newMinY = ob.minY - dy;
            setDraftSpawnZones((m) => { const n = new Map(m); n.set(drag.sz.spawnZoneId, { ...drag.sz, minSpawnX: newMinX, maxSpawnX: newMaxX, minSpawnY: newMinY, maxSpawnY: newMaxY }); return n; });
        }
    }

    function handleSvgMouseUp(_e: ReactMouseEvent<SVGSVGElement>) {
        const drag = dragRef.current;
        if (!drag) return;

        if ((drag.type === 'moveZone' || drag.type === 'resizeZone') && hasDragMovedRef.current) {
            const draft = draftZones.get(drag.zone.id);
            if (draft) {
                const { id, slug, name, ...rest } = draft;
                updateZone.mutate({ id, slug, name, ...rest, minX: Math.min(draft.minX, draft.maxX), maxX: Math.max(draft.minX, draft.maxX), minY: Math.min(draft.minY, draft.maxY), maxY: Math.max(draft.minY, draft.maxY) });
            }
        }
        if ((drag.type === 'moveSpawnZone' || drag.type === 'resizeSpawnZone') && hasDragMovedRef.current) {
            const draft = draftSpawnZones.get(drag.sz.spawnZoneId);
            if (draft) {
                updateSpawnZone.mutate({
                    spawnZoneId: draft.spawnZoneId,
                    minSpawnX: Math.min(draft.minSpawnX, draft.maxSpawnX),
                    maxSpawnX: Math.max(draft.minSpawnX, draft.maxSpawnX),
                    minSpawnY: Math.min(draft.minSpawnY, draft.maxSpawnY),
                    maxSpawnY: Math.max(draft.minSpawnY, draft.maxSpawnY),
                });
            }
        }
        if (drag.type === 'drawRect') {
            const sw = drag.startWorld, ew = drag.endWorld;
            const worldX = Math.min(sw[0], ew[0]), worldX2 = Math.max(sw[0], ew[0]);
            const worldY = Math.min(sw[1], ew[1]), worldY2 = Math.max(sw[1], ew[1]);
            const hitZone = zones.find((z) => { const rz = resolveZone(z); return worldX >= rz.minX && worldX <= rz.maxX && worldY >= rz.minY && worldY <= rz.maxY; });
            suppressClickClearRef.current = true;
            setAddDialog({ tool: drag.tool, worldX, worldY, worldX2, worldY2, zoneId: hitZone?.id });
            setDrawRect(null);
        }
        if (drag.type === 'moveEntity') {
            if (hasDragMovedRef.current && draftEntityPos) {
                saveEntityPosition(drag.entity, draftEntityPos.wx, draftEntityPos.wy);
                setDraftEntityPos(null);
            } else if (!hasDragMovedRef.current) {
                suppressClickClearRef.current = true;
                setSelected(drag.entity);
                setDraftEntityPos(null);
            }
        }
        dragRef.current = null;
    }

    function handleSvgClick(e: ReactMouseEvent<SVGSVGElement>) {
        if (hasDragMovedRef.current) return;
        if (suppressClickClearRef.current) { suppressClickClearRef.current = false; return; }
        // In select mode don't clear selection on background click — user closes panel via × button.
        // Accidental SVG clicks while navigating to the delete button used to close the panel.
        if (activeTool === 'select') return;
        setSelected(null);
        if (activeTool !== 'addZone' && activeTool !== 'addSpawnZone') {
            const [wx, wy] = clientToWorld(e.clientX, e.clientY);
            const hitZone = zones.find((z) => { const rz = resolveZone(z); return wx >= rz.minX && wx <= rz.maxX && wy >= rz.minY && wy <= rz.maxY; });
            setAddDialog({ tool: activeTool, worldX: wx, worldY: wy, zoneId: hitZone?.id });
        }
    }

    function handleZoneMouseDown(e: ReactMouseEvent<SVGElement>, zone: ZoneRecord, dir?: HandleDir) {
        if (activeTool !== 'select') return;
        e.stopPropagation(); hasDragMovedRef.current = false;
        suppressClickClearRef.current = true;
        const rz = resolveZone(zone);
        const [wx, wy] = clientToWorld(e.clientX, e.clientY);
        dragRef.current = dir
            ? { type: 'resizeZone', zone: rz, handleDir: dir, startWorld: [wx, wy], origBounds: { minX: rz.minX, maxX: rz.maxX, minY: rz.minY, maxY: rz.maxY } }
            : { type: 'moveZone', zone: rz, startWorld: [wx, wy], origBounds: { minX: rz.minX, maxX: rz.maxX, minY: rz.minY, maxY: rz.maxY } };
        setSelected({ type: 'zone', data: rz });
        e.preventDefault();
    }

    function handleEntityMouseDown(e: ReactMouseEvent<SVGElement>, entity: SelectedEntity) {
        e.stopPropagation(); hasDragMovedRef.current = false;
        const [origWX, origWY] = getEntityWorldPos(entity);
        dragRef.current = { type: 'moveEntity', entity, startClientX: e.clientX, startClientY: e.clientY, origWorldX: origWX, origWorldY: origWY };
        e.preventDefault();
    }

    function handleSpawnZoneMouseDown(e: ReactMouseEvent<SVGElement>, sz: SpawnZoneRect, dir?: HandleDir) {
        if (activeTool !== 'select') return;
        e.stopPropagation(); hasDragMovedRef.current = false;
        suppressClickClearRef.current = true;
        const rsz = resolveSpawnZone(sz);
        const [wx, wy] = clientToWorld(e.clientX, e.clientY);
        dragRef.current = dir
            ? { type: 'resizeSpawnZone', sz: rsz, handleDir: dir, startWorld: [wx, wy], origBounds: { minX: rsz.minSpawnX, maxX: rsz.maxSpawnX, minY: rsz.minSpawnY, maxY: rsz.maxSpawnY } }
            : { type: 'moveSpawnZone', sz: rsz, startWorld: [wx, wy], origBounds: { minX: rsz.minSpawnX, maxX: rsz.maxSpawnX, minY: rsz.minSpawnY, maxY: rsz.maxSpawnY } };
        setSelected({ type: 'spawnZone', data: rsz });
        e.preventDefault();
    }

    function getEntityId(entity: SelectedEntity): number {
        switch (entity.type) {
            case 'npc': return entity.data.id;
            case 'spawnZone': return entity.data.spawnZoneId;
            case 'worldObject': return entity.data.id;
            case 'respawn': return entity.data.id;
            case 'mob': return entity.data.id;
            case 'zone': return entity.data.id;
        }
    }
    function getEntityWorldPos(entity: SelectedEntity): [number, number] {
        switch (entity.type) {
            case 'npc': return [entity.data.x, entity.data.y];
            case 'worldObject': return [entity.data.posX, entity.data.posY];
            case 'respawn': return [entity.data.x, entity.data.y];
            case 'mob': return [entity.data.x, entity.data.y];
            default: return [0, 0];
        }
    }
    function saveEntityPosition(entity: SelectedEntity, wx: number, wy: number) {
        if (entity.type === 'npc') updateNpcPlacement.mutate({ id: entity.data.id, x: wx, y: wy });
        else if (entity.type === 'worldObject') updateWorldObject.mutate({ id: entity.data.id, posX: wx, posY: wy });
        else if (entity.type === 'respawn') updateRespawnZone.mutate({ id: entity.data.id, x: wx, y: wy });
        else if (entity.type === 'mob') updateMobPosition.mutate({ mobId: entity.data.mobId, x: wx, y: wy });
    }

    function handleEntityDelete() {
        if (!selected) return;
        const { type, data } = selected;
        if (type === 'zone') deleteZone.mutate({ id: data.id });
        else if (type === 'npc') deleteNpcPlacement.mutate({ id: data.id });
        else if (type === 'spawnZone') deleteSpawnZone.mutate({ spawnZoneId: data.spawnZoneId });
        else if (type === 'worldObject') deleteWorldObject.mutate({ id: data.id });
        else if (type === 'respawn') deleteRespawnZone.mutate({ id: data.id });
        else if (type === 'mob') deleteMobPosition.mutate({ mobId: data.mobId });
    }

    function handleZoneMetaUpdate(meta: ZoneMetaUpdate) {
        if (!selected || selected.type !== 'zone') return;
        updateZone.mutate({ id: selected.data.id, ...meta });
    }
    function handleEntitySavePosition(x: number, y: number, z: number, rotZ?: number) {
        if (!selected) return;
        const { type, data } = selected;
        if (type === 'npc') updateNpcPlacement.mutate({ id: data.id, x, y, z, ...(rotZ !== undefined ? { rotZ } : {}) });
        else if (type === 'worldObject') updateWorldObject.mutate({ id: data.id, posX: x, posY: y, posZ: z, ...(rotZ !== undefined ? { rotZ } : {}) });
        else if (type === 'respawn') updateRespawnZone.mutate({ id: data.id, x, y, z });
        else if (type === 'mob') updateMobPosition.mutate({ mobId: data.mobId, x, y, z });
    }

    async function handleAddEntity(entityId: number, name: string, extra?: ZoneExtra) {
        if (!addDialog) return;
        const { tool, worldX, worldY, worldX2, worldY2, zoneId } = addDialog;
        const hasRect = worldX2 !== undefined && worldY2 !== undefined && (Math.abs(worldX2 - worldX) > 1 || Math.abs(worldY2 - worldY) > 1);
        try {
            if (tool === 'addZone' && extra) {
                const minX = hasRect ? worldX : worldX - 500;
                const maxX = hasRect ? worldX2! : worldX + 500;
                const minY = hasRect ? worldY : worldY - 500;
                const maxY = hasRect ? worldY2! : worldY + 500;
                await createZone.mutateAsync({ name, slug: extra.slug, minLevel: extra.minLevel, maxLevel: extra.maxLevel, isPvp: extra.isPvp, isSafeZone: extra.isSafeZone, minX, maxX, minY, maxY });
            } else if (tool === 'addNpc') {
                await createNpcPlacement.mutateAsync({ npcId: entityId, zoneId, x: worldX, y: worldY, z: 0, rotZ: 0 });
            } else if (tool === 'addSpawnZone') {
                const minSpawnX = hasRect ? worldX : worldX - 100;
                const maxSpawnX = hasRect ? worldX2! : worldX + 100;
                const minSpawnY = hasRect ? worldY : worldY - 100;
                const maxSpawnY = hasRect ? worldY2! : worldY + 100;
                await createSpawnZone.mutateAsync({ zoneName: name, gameZoneId: zoneId, minSpawnX, maxSpawnX, minSpawnY, maxSpawnY, minSpawnZ: 0, maxSpawnZ: 0 });
            } else if (tool === 'addRespawn') {
                await createRespawnZone.mutateAsync({ name, zoneId: zoneId ?? 1, x: worldX, y: worldY, z: 0, isDefault: false });
            }
        } finally { setAddDialog(null); }
    }

    async function handleImageUpload(file: File) {
        setIsUploading(true);
        try {
            const form = new FormData(); form.append('file', file);
            const res = await fetch('/api/upload', { method: 'POST', body: form });
            const json = await res.json() as { url?: string; error?: string };
            if (!res.ok || !json.url) throw new Error(json.error ?? 'Upload failed');
            setMapConfig((c) => ({ ...(c ?? {}), imageUrl: json.url! } as MapConfig));
            toast.success('Изображение карты обновлено');
        } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Ошибка загрузки'); }
        finally { setIsUploading(false); }
    }

    function toggleLayer(layer: EntityLayer) {
        setVisibleLayers((prev) => { const next = new Set(prev); next.has(layer) ? next.delete(layer) : next.add(layer); return next; });
    }

    function renderZoneHandles(zone: ZoneRecord, rz: ZoneRecord) {
        const [x1, y1] = worldToGroup(rz.minX, rz.minY);
        const [x2, y2] = worldToGroup(rz.maxX, rz.maxY);
        const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2, hs = HANDLE_PX / zoom;
        const HANDLES: { dir: HandleDir; x: number; y: number }[] = [
            { dir: 'nw', x: x1, y: y1 }, { dir: 'n', x: cx, y: y1 }, { dir: 'ne', x: x2, y: y1 },
            { dir: 'w', x: x1, y: cy }, { dir: 'e', x: x2, y: cy },
            { dir: 'sw', x: x1, y: y2 }, { dir: 's', x: cx, y: y2 }, { dir: 'se', x: x2, y: y2 },
        ];
        const CURSORS: Record<HandleDir, string> = { n: 'n-resize', s: 's-resize', e: 'e-resize', w: 'w-resize', ne: 'ne-resize', nw: 'nw-resize', se: 'se-resize', sw: 'sw-resize' };
        return HANDLES.map(({ dir, x, y }) => (
            <rect key={dir} x={x - hs} y={y - hs} width={hs * 2} height={hs * 2}
                fill="#fff" stroke="#1e1e1e" strokeWidth={1 / zoom}
                style={{ cursor: CURSORS[dir] }}
                onMouseDown={(e) => handleZoneMouseDown(e, zone, dir)}
            />
        ));
    }

    function renderSpawnZoneHandles(sz: SpawnZoneRect, rsz: SpawnZoneRect) {
        const [x1, y1] = worldToGroup(rsz.minSpawnX, rsz.minSpawnY);
        const [x2, y2] = worldToGroup(rsz.maxSpawnX, rsz.maxSpawnY);
        const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2, hs = HANDLE_PX / zoom;
        const HANDLES: { dir: HandleDir; x: number; y: number }[] = [
            { dir: 'nw', x: x1, y: y1 }, { dir: 'n', x: cx, y: y1 }, { dir: 'ne', x: x2, y: y1 },
            { dir: 'w', x: x1, y: cy }, { dir: 'e', x: x2, y: cy },
            { dir: 'sw', x: x1, y: y2 }, { dir: 's', x: cx, y: y2 }, { dir: 'se', x: x2, y: y2 },
        ];
        const CURSORS: Record<HandleDir, string> = { n: 'n-resize', s: 's-resize', e: 'e-resize', w: 'w-resize', ne: 'ne-resize', nw: 'nw-resize', se: 'se-resize', sw: 'sw-resize' };
        return HANDLES.map(({ dir, x, y }) => (
            <rect key={dir} x={x - hs} y={y - hs} width={hs * 2} height={hs * 2}
                fill="#fff" stroke="#1e1e1e" strokeWidth={1 / zoom}
                style={{ cursor: CURSORS[dir] }}
                onMouseDown={(e) => handleSpawnZoneMouseDown(e, sz, dir)}
            />
        ));
    }

    if (isLoading) return <div className="flex h-full items-center justify-center text-muted-foreground text-sm">Загрузка данных карты…</div>;

    const imageUrl = mapConfig?.imageUrl ?? null;
    const sw = svgRef.current?.clientWidth ?? 800;
    const sh = svgRef.current?.clientHeight ?? 600;

    return (
        <div className="flex h-full flex-col overflow-hidden">
            <MapToolbar
                activeTool={activeTool} onToolChange={setActiveTool}
                visibleLayers={visibleLayers} onLayerToggle={toggleLayer}
                flipY={flipY} onFlipYToggle={() => setFlipY((v) => !v)}
                onZoomReset={resetViewport} onZoomToFit={fitToView} onImageUpload={handleImageUpload}
                isUploading={isUploading} hasImage={!!imageUrl}
            />
            <div className="flex flex-1 overflow-hidden">
                <svg ref={svgRef} className="flex-1 bg-zinc-900 select-none"
                    style={{ cursor: dragRef.current?.type === 'pan' ? 'grabbing' : activeTool === 'select' ? 'grab' : 'crosshair' }}
                    onMouseDown={handleSvgMouseDown}
                    onMouseMove={handleSvgMouseMove}
                    onMouseUp={handleSvgMouseUp}
                    onMouseLeave={() => { dragRef.current = null; setDraftEntityPos(null); setCursorWorld(null); }}
                    onClick={handleSvgClick}
                >
                    <g transform={`translate(${panX},${panY}) scale(${zoom})`}>
                        {imageUrl ? (
                            <image href={imageUrl} x={0} y={0} width={sw / zoom} height={sh / zoom} preserveAspectRatio="xMidYMid meet" style={{ pointerEvents: 'none' }} />
                        ) : (
                            <text x={sw / zoom / 2} y={sh / zoom / 2} textAnchor="middle" dominantBaseline="middle" fill="#3f3f46" fontSize={14 / zoom} style={{ pointerEvents: 'none' }}>
                                Загрузите изображение карты через кнопку «Загрузить карту»
                            </text>
                        )}

                        {visibleLayers.has('zones') && zones.map((z) => {
                            const rz = resolveZone(z);
                            if (rz.maxX === rz.minX || rz.maxY === rz.minY) return null;
                            const [x1, y1] = worldToGroup(rz.minX, rz.minY);
                            const [x2, y2] = worldToGroup(rz.maxX, rz.maxY);
                            const rx = Math.min(x1, x2), ry = Math.min(y1, y2), rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1);
                            const isSel = selected?.type === 'zone' && selected.data.id === z.id;
                            return (
                                <g key={`zone-${z.id}`}>
                                    <rect x={rx} y={ry} width={rw} height={rh}
                                        fill={LAYER_COLORS.zones} fillOpacity={isSel ? 0.3 : 0.1}
                                        stroke={isSel ? '#fff' : LAYER_COLORS.zones} strokeWidth={(isSel ? 2 : 1) / zoom}
                                        style={{ cursor: 'move' }}
                                        onMouseDown={(e) => handleZoneMouseDown(e, z)}
                                    />
                                    <text x={rx + rw / 2} y={ry + rh / 2} textAnchor="middle" dominantBaseline="middle"
                                        fill="#fff" fontSize={Math.max(8, Math.min(14, rw / 10)) / zoom}
                                        style={{ pointerEvents: 'none', userSelect: 'none' }}>
                                        {rz.name}
                                    </text>
                                    {isSel && renderZoneHandles(z, rz)}
                                </g>
                            );
                        })}

                        {visibleLayers.has('spawnZone') && (data?.spawnZones ?? []).map((sz) => {
                            const rsz = resolveSpawnZone(sz);
                            const [x1, y1] = worldToGroup(rsz.minSpawnX, rsz.minSpawnY);
                            const [x2, y2] = worldToGroup(rsz.maxSpawnX, rsz.maxSpawnY);
                            const rx = Math.min(x1, x2), ry = Math.min(y1, y2), rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1);
                            const isSel = selected?.type === 'spawnZone' && selected.data.spawnZoneId === sz.spawnZoneId;
                            return (
                                <g key={`sz-${sz.spawnZoneId}`} style={{ cursor: activeTool === 'select' ? 'move' : 'default' }}
                                    onMouseDown={(e) => handleSpawnZoneMouseDown(e, sz)}>
                                    <rect x={rx} y={ry} width={rw} height={rh}
                                        fill={LAYER_COLORS.spawnZone} fillOpacity={isSel ? 0.35 : 0.18}
                                        stroke={LAYER_COLORS.spawnZone} strokeWidth={(isSel ? 2 : 1) / zoom} />
                                    <text x={rx + rw / 2} y={ry + rh / 2} textAnchor="middle" dominantBaseline="middle"
                                        fill="#fff" fontSize={Math.max(7, Math.min(11, rw / 10)) / zoom}
                                        style={{ pointerEvents: 'none', userSelect: 'none' }}>{rsz.zoneName}</text>
                                    {isSel && renderSpawnZoneHandles(sz, rsz)}
                                </g>
                            );
                        })}

                        {visibleLayers.has('npc') && (data?.npcPlacements ?? []).map((p) => {
                            const isDragging = draftEntityPos?.entityType === 'npc' && draftEntityPos.id === p.id;
                            const [gx, gy] = worldToGroup(isDragging ? draftEntityPos!.wx : p.x, isDragging ? draftEntityPos!.wy : p.y);
                            const r = 7 / zoom;
                            const isSel = selected?.type === 'npc' && selected.data.id === p.id;
                            const entity: SelectedEntity = { type: 'npc', data: p };
                            return (
                                <g key={`npc-${p.id}`} style={{ cursor: activeTool === 'select' ? 'grab' : 'default' }}
                                    onMouseDown={(e) => activeTool === 'select' && handleEntityMouseDown(e, entity)}>
                                    <circle cx={gx} cy={gy} r={r * 1.8} fill="transparent" stroke="none" />
                                    <circle cx={gx} cy={gy} r={r} fill={LAYER_COLORS.npc}
                                        stroke={isSel ? '#fff' : 'rgba(0,0,0,0.6)'} strokeWidth={(isSel ? 2 : 1) / zoom} />
                                    <text x={gx} y={gy + r + 11 / zoom} textAnchor="middle" fill="#e4e4e7" fontSize={10 / zoom}
                                        style={{ pointerEvents: 'none', userSelect: 'none' }}>
                                        {p.npcName ?? `NPC #${p.npcId}`}
                                    </text>
                                </g>
                            );
                        })}

                        {visibleLayers.has('worldObject') && (data?.worldObjects ?? []).map((wo) => {
                            const isDragging = draftEntityPos?.entityType === 'worldObject' && draftEntityPos.id === wo.id;
                            const [gx, gy] = worldToGroup(isDragging ? draftEntityPos!.wx : wo.posX, isDragging ? draftEntityPos!.wy : wo.posY);
                            const hs = 7 / zoom;
                            const isSel = selected?.type === 'worldObject' && selected.data.id === wo.id;
                            const entity: SelectedEntity = { type: 'worldObject', data: wo };
                            return (
                                <g key={`wo-${wo.id}`} style={{ cursor: activeTool === 'select' ? 'grab' : 'default' }}
                                    onMouseDown={(e) => activeTool === 'select' && handleEntityMouseDown(e, entity)}>
                                    <polygon points={`${gx},${gy - hs * 1.8} ${gx + hs * 1.8},${gy} ${gx},${gy + hs * 1.8} ${gx - hs * 1.8},${gy}`} fill="transparent" stroke="none" />
                                    <polygon points={`${gx},${gy - hs} ${gx + hs},${gy} ${gx},${gy + hs} ${gx - hs},${gy}`}
                                        fill={LAYER_COLORS.worldObject} stroke={isSel ? '#fff' : 'rgba(0,0,0,0.6)'} strokeWidth={(isSel ? 2 : 1) / zoom} />
                                    <text x={gx} y={gy + hs + 11 / zoom} textAnchor="middle" fill="#e4e4e7" fontSize={10 / zoom}
                                        style={{ pointerEvents: 'none', userSelect: 'none' }}>{wo.nameKey}</text>
                                </g>
                            );
                        })}

                        {visibleLayers.has('respawn') && (data?.respawnZones ?? []).map((rz) => {
                            const isDragging = draftEntityPos?.entityType === 'respawn' && draftEntityPos.id === rz.id;
                            const [gx, gy] = worldToGroup(isDragging ? draftEntityPos!.wx : rz.x, isDragging ? draftEntityPos!.wy : rz.y);
                            const arm = 8 / zoom;
                            const isSel = selected?.type === 'respawn' && selected.data.id === rz.id;
                            const entity: SelectedEntity = { type: 'respawn', data: rz };
                            return (
                                <g key={`rz-${rz.id}`} style={{ cursor: activeTool === 'select' ? 'grab' : 'default' }}
                                    onMouseDown={(e) => activeTool === 'select' && handleEntityMouseDown(e, entity)}>
                                    <circle cx={gx} cy={gy} r={arm * 1.3} fill="transparent" stroke="none" />
                                    <line x1={gx - arm} y1={gy} x2={gx + arm} y2={gy} stroke={LAYER_COLORS.respawn} strokeWidth={2 / zoom} />
                                    <line x1={gx} y1={gy - arm} x2={gx} y2={gy + arm} stroke={LAYER_COLORS.respawn} strokeWidth={2 / zoom} />
                                    <circle cx={gx} cy={gy} r={arm * 0.6} fill="none"
                                        stroke={isSel ? '#fff' : LAYER_COLORS.respawn} strokeWidth={(isSel ? 2 : 1.5) / zoom} />
                                    <text x={gx} y={gy + arm + 11 / zoom} textAnchor="middle" fill="#e4e4e7" fontSize={10 / zoom}
                                        style={{ pointerEvents: 'none', userSelect: 'none' }}>
                                        {rz.name}{rz.isDefault ? ' ★' : ''}
                                    </text>
                                </g>
                            );
                        })}

                        {visibleLayers.has('mob') && (data?.mobPositions ?? []).map((mp) => {
                            const isDragging = draftEntityPos?.entityType === 'mob' && draftEntityPos.id === mp.id;
                            const [gx, gy] = worldToGroup(isDragging ? draftEntityPos!.wx : mp.x, isDragging ? draftEntityPos!.wy : mp.y);
                            const hs = 7 / zoom;
                            const isSel = selected?.type === 'mob' && selected.data.id === mp.id;
                            const entity: SelectedEntity = { type: 'mob', data: mp };
                            return (
                                <g key={`mob-${mp.id}`} style={{ cursor: activeTool === 'select' ? 'grab' : 'default' }}
                                    onMouseDown={(e) => activeTool === 'select' && handleEntityMouseDown(e, entity)}>
                                    <polygon points={`${gx - hs * 1.8},${gy - hs * 1.8} ${gx + hs * 1.8},${gy - hs * 1.8} ${gx},${gy + hs * 1.8}`} fill="transparent" stroke="none" />
                                    <polygon points={`${gx - hs},${gy - hs} ${gx + hs},${gy - hs} ${gx},${gy + hs}`}
                                        fill={LAYER_COLORS.mob} stroke={isSel ? '#fff' : 'rgba(0,0,0,0.6)'} strokeWidth={(isSel ? 2 : 1) / zoom} />
                                    {isSel && (
                                        <text x={gx} y={gy + hs + 11 / zoom} textAnchor="middle" fill="#e4e4e7" fontSize={10 / zoom}
                                            style={{ pointerEvents: 'none', userSelect: 'none' }}>
                                            {mp.mobName ?? `Mob #${mp.mobId}`}
                                        </text>
                                    )}
                                </g>
                            );
                        })}
                        {/* Draw-rect preview */}
                        {drawRect && (activeTool === 'addZone' || activeTool === 'addSpawnZone') && (() => {
                            const color = activeTool === 'addZone' ? LAYER_COLORS.zones : LAYER_COLORS.spawnZone;
                            const [gx1, gy1] = worldToGroup(drawRect.startWorld[0], drawRect.startWorld[1]);
                            const [gx2, gy2] = worldToGroup(drawRect.endWorld[0], drawRect.endWorld[1]);
                            return (
                                <rect
                                    x={Math.min(gx1, gx2)} y={Math.min(gy1, gy2)}
                                    width={Math.abs(gx2 - gx1)} height={Math.abs(gy2 - gy1)}
                                    fill={color} fillOpacity={0.15}
                                    stroke={color} strokeWidth={1.5 / zoom}
                                    strokeDasharray={`${5 / zoom} ${5 / zoom}`}
                                    style={{ pointerEvents: 'none' }}
                                />
                            );
                        })()}
                    </g>

                    {cursorWorld && (
                        <text x={8} y={(svgRef.current?.clientHeight ?? 600) - 8}
                            fill="rgba(255,255,255,0.5)" fontSize={11} fontFamily="monospace" style={{ pointerEvents: 'none' }}>
                            {`X ${cursorWorld[0].toFixed(1)}  Y ${cursorWorld[1].toFixed(1)}   ×${zoom.toFixed(2)}`}
                        </text>
                    )}
                </svg>

                {selected && (
                    <EntityDetailPanel
                        key={`${selected.type}-${selected.type === 'spawnZone' ? selected.data.spawnZoneId : selected.data.id}`}
                        selected={selected}
                        onClose={() => setSelected(null)}
                        onDelete={handleEntityDelete}
                        onSavePosition={handleEntitySavePosition}
                        onUpdateZone={handleZoneMetaUpdate}
                    />
                )}
            </div>

            {addDialog && (
                <AddEntityDialog
                    tool={addDialog.tool} worldX={addDialog.worldX} worldY={addDialog.worldY}
                    worldX2={addDialog.worldX2} worldY2={addDialog.worldY2}
                    onConfirm={handleAddEntity} onCancel={() => setAddDialog(null)}
                />
            )}
        </div>
    );
}
