'use client';

import {
    useCallback, useEffect, useMemo, useRef, useState,
    type MouseEvent as ReactMouseEvent,
} from 'react';
import { useTranslations } from 'next-intl';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { MapToolbar } from './MapToolbar';
import { AddEntityDialog } from './AddEntityDialog';
import { EntityDetailPanel } from './EntityDetailPanel';
import { Input } from '@/components/ui/input';
import {
    computeWorldBounds,
    worldToNorm,
    normToWorld,
    type AxisConfig,
    type ImageAxis,
    DEFAULT_AXIS_CONFIG,
    type EntityLayer,
    type MapTool,
    type SelectedEntity,
    type WorldBounds,
    type ZoneRecord,
    type ZoneExtra,
    type ZoneMetaUpdate,
    type SpawnZoneRect,
    type ClassSpawnZonePin,
    type RespawnPin,
    type NpcPlacement,
    type WorldObjectPin,
    type MobPositionPin,
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
    classSpawnZone: '#14b8a6',
    worldObject: '#f97316',
    respawn: '#a855f7',
    mob: '#ef4444',
};

type HandleDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

type DragState =
    | { type: 'pan'; startClientX: number; startClientY: number; startPanX: number; startPanY: number }
    | { type: 'moveZone'; zone: ZoneRecord; startWorld: [number, number]; origBounds: { minX: number; maxX: number; minY: number; maxY: number }; origCenter?: { cx: number; cy: number } }
    | { type: 'resizeZone'; zone: ZoneRecord; handleDir: HandleDir; startWorld: [number, number]; origBounds: { minX: number; maxX: number; minY: number; maxY: number } }
    | { type: 'resizeCircle'; zone: ZoneRecord; which: 'outer' | 'inner'; centerWorld: [number, number] }
    | { type: 'moveEntity'; entity: SelectedEntity; startClientX: number; startClientY: number; origWorldX: number; origWorldY: number }
    | { type: 'rotateEntity'; entity: SelectedEntity; cx: number; cy: number }
    | { type: 'drawRect'; tool: 'addZone' | 'addSpawnZone' | 'addClassSpawnZone'; startWorld: [number, number]; endWorld: [number, number] }
    | { type: 'moveRectShape'; id: number; kind: 'spawnZone' | 'respawn' | 'classSpawnZone'; startWorld: [number, number]; origBounds: { minX: number; maxX: number; minY: number; maxY: number }; origCenter?: { cx: number; cy: number } }
    | { type: 'resizeRectShape'; id: number; kind: 'spawnZone' | 'respawn' | 'classSpawnZone'; handleDir: HandleDir; startWorld: [number, number]; origBounds: { minX: number; maxX: number; minY: number; maxY: number } }
    | { type: 'resizeCircleShape'; id: number; kind: 'spawnZone' | 'respawn' | 'classSpawnZone'; which: 'outer' | 'inner'; centerWorld: [number, number] };

export function WorldMapEditor({ initialFocus }: { initialFocus?: string }) {
    const tm = useTranslations('editors.mapEditor');
    const { data, isLoading, refetch } = trpc.zones.getAllMapData.useQuery(undefined, {
        refetchOnWindowFocus: false,
    });

    const createZone = trpc.zones.create.useMutation({ onSuccess: () => { toast.success(tm('zoneCreated')); refetch(); }, onError: (e) => toast.error(e.message) });
    const updateZone = trpc.zones.update.useMutation({ onError: (e) => toast.error(e.message), onSuccess: () => refetch() });
    const deleteZone = trpc.zones.delete.useMutation({ onSuccess: () => { toast.success(tm('zoneDeleted')); refetch(); setSelected(null); }, onError: (e) => toast.error(e.message) });
    const createNpcPlacement = trpc.zones.createNpcPlacement.useMutation({ onSuccess: () => { toast.success(tm('npcPlaced')); refetch(); }, onError: (e) => toast.error(e.message) });
    const updateNpcPlacement = trpc.zones.updateNpcPlacement.useMutation({ onSuccess: () => { toast.success(tm('saved')); refetch(); }, onError: (e) => toast.error(e.message) });
    const deleteNpcPlacement = trpc.zones.deleteNpcPlacement.useMutation({ onSuccess: () => { toast.success(tm('placementDeleted')); refetch(); setSelected(null); }, onError: (e) => toast.error(e.message) });
    const createSpawnZone = trpc.zones.createSpawnZone.useMutation({ onSuccess: () => { toast.success(tm('spawnZoneCreated')); refetch(); }, onError: (e) => toast.error(e.message) });
    const deleteSpawnZone = trpc.zones.deleteSpawnZone.useMutation({ onSuccess: () => { toast.success(tm('spawnZoneDeleted')); refetch(); setSelected(null); }, onError: (e) => toast.error(e.message) });
    const createClassSpawnZone = trpc.zones.createClassSpawnZone.useMutation({ onSuccess: () => { toast.success(tm('classSpawnZoneCreated')); refetch(); }, onError: (e) => toast.error(e.message) });
    const deleteClassSpawnZone = trpc.zones.deleteClassSpawnZone.useMutation({ onSuccess: () => { toast.success(tm('classSpawnZoneDeleted')); refetch(); setSelected(null); }, onError: (e) => toast.error(e.message) });
    const updateClassSpawnZone = trpc.zones.updateClassSpawnZone.useMutation({ onSuccess: () => { toast.success(tm('saved')); refetch(); }, onError: (e) => toast.error(e.message) });
    const createRespawnZone = trpc.respawnZones.create.useMutation({ onSuccess: () => { toast.success(tm('respawnCreated')); refetch(); }, onError: (e) => toast.error(e.message) });
    const updateWorldObject = trpc.worldObjects.update.useMutation({ onSuccess: () => { toast.success(tm('saved')); refetch(); }, onError: (e) => toast.error(e.message) });
    const deleteWorldObject = trpc.worldObjects.delete.useMutation({ onSuccess: () => { toast.success(tm('worldObjectDeleted')); refetch(); setSelected(null); }, onError: (e) => toast.error(e.message) });
    const updateRespawnZone = trpc.respawnZones.update.useMutation({ onSuccess: () => { toast.success(tm('saved')); refetch(); }, onError: (e) => toast.error(e.message) });
    const deleteRespawnZone = trpc.respawnZones.delete.useMutation({ onSuccess: () => { toast.success(tm('respawnDeleted')); refetch(); setSelected(null); }, onError: (e) => toast.error(e.message) });
    const updateSpawnZone = trpc.zones.updateSpawnZone.useMutation({ onError: (e) => toast.error(e.message), onSuccess: () => refetch() });
    const updateMobPosition = trpc.mobs.updatePosition.useMutation({ onSuccess: () => { toast.success(tm('saved')); refetch(); }, onError: (e) => toast.error(e.message) });
    const deleteMobPosition = trpc.mobs.deletePosition.useMutation({ onSuccess: () => { toast.success(tm('mobDeleted')); refetch(); setSelected(null); }, onError: (e) => toast.error(e.message) });

    const [mapConfig, setMapConfig] = useState<MapConfig | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    useEffect(() => { fetch('/api/map-config').then((r) => r.json() as Promise<MapConfig>).then(setMapConfig).catch(() => { }); }, []);

    const [zoom, setZoom] = useState(1);
    const [panX, setPanX] = useState(0);
    const [panY, setPanY] = useState(0);

    // Derived from persisted mapConfig; no manual toggle — axes are set via meta import.
    const axisConfig: AxisConfig = useMemo(() => {
        const ix = mapConfig?.imageXAxis as ImageAxis | null | undefined;
        const iy = mapConfig?.imageYAxis as ImageAxis | null | undefined;
        const valid = (v: string | null | undefined): v is ImageAxis =>
            v === '+X' || v === '-X' || v === '+Y' || v === '-Y';
        if (valid(ix) && valid(iy)) return { imageXAxis: ix, imageYAxis: iy };
        return DEFAULT_AXIS_CONFIG;
    }, [mapConfig?.imageXAxis, mapConfig?.imageYAxis]);

    const viewportRef = useRef({ zoom: 1, panX: 0, panY: 0 });
    function setViewport(z: number, px: number, py: number) {
        viewportRef.current = { zoom: z, panX: px, panY: py };
        setZoom(z); setPanX(px); setPanY(py);
    }

    const [activeTool, setActiveTool] = useState<MapTool>('select');
    const [visibleLayers, setVisibleLayers] = useState<Set<EntityLayer>>(
        new Set<EntityLayer>(['zones', 'npc', 'spawnZone', 'classSpawnZone', 'worldObject', 'respawn', 'mob']),
    );
    const [selected, setSelected] = useState<SelectedEntity | null>(null);
    const [addDialog, setAddDialog] = useState<{ tool: MapTool; worldX: number; worldY: number; worldX2?: number; worldY2?: number; zoneId?: number } | null>(null);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showMapImage, setShowMapImage] = useState(true);
    const [draftZones, setDraftZones] = useState<Map<number, ZoneRecord>>(new Map());
    const [draftSpawnZones, setDraftSpawnZones] = useState<Map<number, SpawnZoneRect>>(new Map());
    const [draftRespawnZones, setDraftRespawnZones] = useState<Map<number, RespawnPin>>(new Map());
    const [draftClassSpawnZones, setDraftClassSpawnZones] = useState<Map<number, ClassSpawnZonePin>>(new Map());
    const [drawRect, setDrawRect] = useState<{ startWorld: [number, number]; endWorld: [number, number] } | null>(null);
    const [draftEntityPos, setDraftEntityPos] = useState<{ entityType: SelectedEntity['type']; id: number; wx: number; wy: number } | null>(null);
    const [draftEntityRot, setDraftEntityRot] = useState<{ entityType: SelectedEntity['type']; id: number; rotZ: number } | null>(null);
    const [cursorWorld, setCursorWorld] = useState<[number, number] | null>(null);

    // Sync selected entity with fresh data after every refetch
    useEffect(() => {
        if (!selected || !data) return;
        setSelected((prev: SelectedEntity | null): SelectedEntity | null => {
            if (!prev) return prev;
            switch (prev.type) {
                case 'npc': {
                    const fresh = data.npcPlacements.find((p) => p.id === prev.data.id);
                    return fresh ? { type: 'npc', data: fresh } : prev;
                }
                case 'mob': {
                    const fresh = data.mobPositions.find((p) => p.id === prev.data.id);
                    return fresh ? { type: 'mob', data: fresh } : prev;
                }
                case 'worldObject': {
                    const fresh = data.worldObjects.find((p) => p.id === prev.data.id);
                    return fresh ? { type: 'worldObject', data: fresh } : prev;
                }
                case 'zone': {
                    const fresh = data.zones.find((p) => p.id === prev.data.id);
                    return fresh ? { type: 'zone', data: fresh } : prev;
                }
                case 'spawnZone': {
                    const fresh = data.spawnZones.find((p) => p.spawnZoneId === prev.data.spawnZoneId);
                    return fresh ? { type: 'spawnZone', data: fresh } : prev;
                }
                case 'classSpawnZone': {
                    const fresh = data.classSpawnZones.find((p) => p.id === prev.data.id);
                    return fresh ? { type: 'classSpawnZone', data: fresh } : prev;
                }
                case 'respawn': {
                    const fresh = data.respawnZones.find((p) => p.id === prev.data.id);
                    return fresh ? { type: 'respawn', data: fresh } : prev;
                }
                default: return prev;
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data]);

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
    function resolveRespawnZone(rz: RespawnPin): RespawnPin { return draftRespawnZones.get(rz.id) ?? rz; }
    function resolveClassSpawnZone(csz: ClassSpawnZonePin): ClassSpawnZonePin { return draftClassSpawnZones.get(csz.id) ?? csz; }

    function svgW() { return svgRef.current?.clientWidth ?? 800; }
    function svgH() { return svgRef.current?.clientHeight ?? 600; }

    function clientToGroup(cx: number, cy: number): [number, number] {
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return [0, 0];
        return [(cx - rect.left - panX) / zoom, (cy - rect.top - panY) / zoom];
    }
    function groupToWorld(gx: number, gy: number): [number, number] {
        const { cw, ch, ox, oy } = canvasDims();
        return normToWorld((gx - ox) / (cw || 1), (gy - oy) / (ch || 1), worldBounds, axisConfig);
    }
    function clientToWorld(cx: number, cy: number): [number, number] {
        return groupToWorld(...clientToGroup(cx, cy));
    }
    function worldToGroup(wx: number, wy: number): [number, number] {
        const [nx, ny] = worldToNorm(wx, wy, worldBounds, axisConfig);
        const { cw, ch, ox, oy } = canvasDims();
        return [ox + nx * cw, oy + ny * ch];
    }

    /**
     * Compute uniform-scale canvas dimensions that fit the world bounds
     * into the SVG viewport without distortion, centred in the remaining space.
     */
    function canvasDims(): { cw: number; ch: number; ox: number; oy: number } {
        const w = svgW(), h = svgH();
        const hRange = axisConfig.imageXAxis.endsWith('X')
            ? (worldBounds.maxX - worldBounds.minX) || 1
            : (worldBounds.maxY - worldBounds.minY) || 1;
        const vRange = axisConfig.imageYAxis.endsWith('X')
            ? (worldBounds.maxX - worldBounds.minX) || 1
            : (worldBounds.maxY - worldBounds.minY) || 1;
        const scale = Math.min(w / hRange, h / vRange);
        const cw = hRange * scale;
        const ch = vRange * scale;
        return { cw, ch, ox: (w - cw) / 2, oy: (h - ch) / 2 };
    }

    /** Convert a world-space radius to SVG group pixels (uniform scale). */
    function worldRadiusToPx(radius: number): number {
        const { cw } = canvasDims();
        const hRange = axisConfig.imageXAxis.endsWith('X')
            ? (worldBounds.maxX - worldBounds.minX) || 1
            : (worldBounds.maxY - worldBounds.minY) || 1;
        return Math.abs(radius / hRange) * cw;
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

    // Handle initialFocus param (e.g. "spawnZone:5", "respawn:3", "zone:1")
    const initialFocusAppliedRef = useRef(false);
    useEffect(() => {
        if (!data || !initialFocus || initialFocusAppliedRef.current) return;
        const colon = initialFocus.indexOf(':');
        if (colon === -1) return;
        const entityType = initialFocus.slice(0, colon);
        const entityId = parseInt(initialFocus.slice(colon + 1), 10);
        if (isNaN(entityId)) return;

        let target: SelectedEntity | null = null;
        let wx = 0, wy = 0;

        if (entityType === 'zone') {
            const z = data.zones.find((z: ZoneRecord) => z.id === entityId);
            if (z) {
                target = { type: 'zone', data: z };
                wx = z.shapeType === 'CIRCLE' || z.shapeType === 'ANNULUS' ? z.centerX : (z.minX + z.maxX) / 2;
                wy = z.shapeType === 'CIRCLE' || z.shapeType === 'ANNULUS' ? z.centerY : (z.minY + z.maxY) / 2;
            }
        } else if (entityType === 'spawnZone') {
            const sz = (data.spawnZones ?? []).find((s: SpawnZoneRect) => s.spawnZoneId === entityId);
            if (sz) {
                target = { type: 'spawnZone', data: sz };
                wx = sz.shapeType === 'CIRCLE' || sz.shapeType === 'ANNULUS' ? sz.centerX : (sz.minSpawnX + sz.maxSpawnX) / 2;
                wy = sz.shapeType === 'CIRCLE' || sz.shapeType === 'ANNULUS' ? sz.centerY : (sz.minSpawnY + sz.maxSpawnY) / 2;
            }
        } else if (entityType === 'respawn') {
            const rp = (data.respawnZones ?? []).find((r: RespawnPin) => r.id === entityId);
            if (rp) {
                target = { type: 'respawn', data: rp };
                wx = rp.x; wy = rp.y;
            }
        } else if (entityType === 'classSpawnZone') {
            const csz = (data.classSpawnZones ?? []).find((c: ClassSpawnZonePin) => c.id === entityId);
            if (csz) {
                target = { type: 'classSpawnZone', data: csz };
                wx = csz.shapeType !== 'RECT' ? csz.centerX : (csz.minX + csz.maxX) / 2;
                wy = csz.shapeType !== 'RECT' ? csz.centerY : (csz.minY + csz.maxY) / 2;
            }
        } else if (entityType === 'npc') {
            const np = (data.npcPlacements ?? []).find((n: NpcPlacement) => n.id === entityId);
            if (np) {
                target = { type: 'npc', data: np };
                wx = np.x; wy = np.y;
            }
        } else if (entityType === 'worldObject') {
            const wo = (data.worldObjects ?? []).find((w: WorldObjectPin) => w.id === entityId);
            if (wo) {
                target = { type: 'worldObject', data: wo };
                wx = wo.posX; wy = wo.posY;
            }
        } else if (entityType === 'mob') {
            const mp = (data.mobPositions ?? []).find((m: MobPositionPin) => m.id === entityId);
            if (mp) {
                target = { type: 'mob', data: mp };
                wx = mp.x; wy = mp.y;
            }
        }

        if (target) {
            initialFocusAppliedRef.current = true;
            requestAnimationFrame(() => {
                panToWorld(wx, wy);
                setSelected(target);
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, initialFocus]);

    // After every refetch, clear stale draft entries so fresh server data is used.
    // This fixes the bug where changing a zone's shapeType doesn't update the canvas
    // because resolveZone() returns the old draft (with the old shapeType).
    useEffect(() => {
        if (!data) return;
        setDraftZones((m) => {
            if (m.size === 0) return m;
            const n = new Map(m);
            data.zones.forEach((z) => n.delete(z.id));
            return n.size === m.size ? m : n;
        });
        setDraftSpawnZones((m) => {
            if (m.size === 0) return m;
            const n = new Map(m);
            (data.spawnZones ?? []).forEach((sz) => n.delete(sz.spawnZoneId));
            return n.size === m.size ? m : n;
        });
        // Also sync selected entity if its shapeType changed on the server
        setSelected((sel) => {
            if (!sel) return sel;
            if (sel.type === 'zone') {
                const fresh = data.zones.find((z) => z.id === sel.data.id);
                if (fresh && fresh.shapeType !== sel.data.shapeType) return { type: 'zone', data: fresh };
            }
            if (sel.type === 'spawnZone') {
                const fresh = (data.spawnZones ?? []).find((sz) => sz.spawnZoneId === sel.data.spawnZoneId);
                if (fresh && fresh.shapeType !== sel.data.shapeType) return { type: 'spawnZone', data: fresh };
            }
            return sel;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data]);

    // ESC → deselect; Ctrl+K / Ctrl+F → open search; V/Z/N/S/O/R → tools
    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            // Don't intercept shortcuts when typing in inputs/textareas
            const tag = (e.target as HTMLElement)?.tagName;
            const isEditing = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable;

            if (e.key === 'Escape') {
                if (searchOpen) { setSearchOpen(false); setSearchQuery(''); return; }
                setSelected(null);
                return;
            }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'f')) {
                e.preventDefault();
                setSearchOpen((v) => !v);
                setSearchQuery('');
                return;
            }
            if (!isEditing && !e.ctrlKey && !e.metaKey && !e.altKey) {
                switch (e.key.toLowerCase()) {
                    case 'v': setActiveTool('select'); break;
                    case 'z': setActiveTool('addZone'); break;
                    case 'n': setActiveTool('addNpc'); break;
                    case 's': setActiveTool('addSpawnZone'); break;
                    case 'c': if (!e.ctrlKey && !e.metaKey) { setActiveTool('addClassSpawnZone'); break; } break;
                    case 'o': setActiveTool('addWorldObject'); break;
                    case 'r': setActiveTool('addRespawn'); break;
                }
            }
        }
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [searchOpen]);

    function panToWorld(wx: number, wy: number) {
        const w = svgRef.current?.clientWidth ?? 800;
        const h = svgRef.current?.clientHeight ?? 600;
        const [gx, gy] = worldToGroup(wx, wy);
        const newPanX = w / 2 - gx * zoom;
        const newPanY = h / 2 - gy * zoom;
        viewportRef.current = { zoom, panX: newPanX, panY: newPanY };
        setPanX(newPanX); setPanY(newPanY);
    }

    /** Returns SVG path string for a donut/ring shape using evenodd fill rule. */
    function annulusPath(cx: number, cy: number, outerR: number, innerR: number): string {
        // Two full-circle paths; fillRule="evenodd" creates the ring without coordinate-system mask issues
        const outer = `M ${cx + outerR},${cy} A ${outerR},${outerR} 0 1,0 ${cx - outerR},${cy} A ${outerR},${outerR} 0 1,0 ${cx + outerR},${cy} Z`;
        const inner = `M ${cx + innerR},${cy} A ${innerR},${innerR} 0 1,0 ${cx - innerR},${cy} A ${innerR},${innerR} 0 1,0 ${cx + innerR},${cy} Z`;
        return `${outer} ${inner}`;
    }

    function zoneContainsPoint(z: ZoneRecord, wx: number, wy: number): boolean {
        const shape = z.shapeType ?? 'RECT';
        if (shape === 'CIRCLE') {
            return Math.hypot(wx - z.centerX, wy - z.centerY) <= z.outerRadius;
        }
        if (shape === 'ANNULUS') {
            const d = Math.hypot(wx - z.centerX, wy - z.centerY);
            return d >= z.innerRadius && d <= z.outerRadius;
        }
        return wx >= z.minX && wx <= z.maxX && wy >= z.minY && wy <= z.maxY;
    }

    function handleSvgMouseDown(e: ReactMouseEvent<SVGSVGElement>) {
        if (e.button !== 0 && e.button !== 1) return;
        hasDragMovedRef.current = false;
        suppressClickClearRef.current = false;
        if (e.button === 1 || activeTool === 'select') {
            dragRef.current = { type: 'pan', startClientX: e.clientX, startClientY: e.clientY, startPanX: panX, startPanY: panY };
            e.preventDefault();
        } else if (activeTool === 'addZone' || activeTool === 'addSpawnZone' || activeTool === 'addClassSpawnZone') {
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
            if (drag.origCenter) {
                setDraftZones((m) => { const n = new Map(m); n.set(drag.zone.id, { ...drag.zone, centerX: drag.origCenter!.cx + dx, centerY: drag.origCenter!.cy + dy }); return n; });
            } else {
                setDraftZones((m) => { const n = new Map(m); n.set(drag.zone.id, { ...drag.zone, minX: drag.origBounds.minX + dx, maxX: drag.origBounds.maxX + dx, minY: drag.origBounds.minY + dy, maxY: drag.origBounds.maxY + dy }); return n; });
            }
        } else if (drag.type === 'resizeZone') {
            const ob = drag.origBounds, dir = drag.handleDir;
            const dx = wx - drag.startWorld[0], dy = wy - drag.startWorld[1];
            // Determine which world axis each screen axis drives.
            const xDrivesWorldX = axisConfig.imageXAxis.endsWith('X');
            const yDrivesWorldX = axisConfig.imageYAxis.endsWith('X');
            const hDelta = xDrivesWorldX ? dx : dy; // W/E handle delta
            const vDelta = yDrivesWorldX ? dx : dy; // N/S handle delta
            const p: Partial<typeof ob> = {};
            if (dir.includes('w')) { if (xDrivesWorldX) p.minX = ob.minX + hDelta; else p.minY = ob.minY + hDelta; }
            if (dir.includes('e')) { if (xDrivesWorldX) p.maxX = ob.maxX + hDelta; else p.maxY = ob.maxY + hDelta; }
            if (dir.includes('n')) { if (yDrivesWorldX) p.minX = ob.minX + vDelta; else p.minY = ob.minY + vDelta; }
            if (dir.includes('s')) { if (yDrivesWorldX) p.maxX = ob.maxX + vDelta; else p.maxY = ob.maxY + vDelta; }
            setDraftZones((m) => { const n = new Map(m); n.set(drag.zone.id, { ...drag.zone, ...ob, ...p } as ZoneRecord); return n; });
        } else if (drag.type === 'moveEntity') {
            const [gx, gy] = clientToGroup(e.clientX, e.clientY);
            const [nwx, nwy] = groupToWorld(gx, gy);
            setDraftEntityPos({ entityType: drag.entity.type, id: getEntityId(drag.entity), wx: nwx, wy: nwy });
        } else if (drag.type === 'rotateEntity') {
            const [gx, gy] = clientToGroup(e.clientX, e.clientY);
            // Compute angle from center to cursor in degrees, 0 = up (+Y group = -world)
            const rawAngle = Math.atan2(gx - drag.cx, -(gy - drag.cy)) * (180 / Math.PI);
            const snapped = e.shiftKey ? Math.round(rawAngle / 15) * 15 : rawAngle;
            setDraftEntityRot({ entityType: drag.entity.type, id: getEntityId(drag.entity), rotZ: snapped });
        } else if (drag.type === 'drawRect') {
            dragRef.current = { ...drag, endWorld: [wx, wy] };
            setDrawRect({ startWorld: drag.startWorld, endWorld: [wx, wy] });
        } else if (drag.type === 'moveRectShape') {
            const dx = wx - drag.startWorld[0], dy = wy - drag.startWorld[1];
            if (drag.origCenter) {
                if (drag.kind === 'spawnZone') {
                    setDraftSpawnZones((m) => { const n = new Map(m); const sz = n.get(drag.id) ?? data?.spawnZones?.find(s => s.spawnZoneId === drag.id); if (!sz) return m; n.set(drag.id, { ...sz, centerX: drag.origCenter!.cx + dx, centerY: drag.origCenter!.cy + dy }); return n; });
                } else if (drag.kind === 'respawn') {
                    setDraftRespawnZones((m) => { const n = new Map(m); const rz = n.get(drag.id) ?? data?.respawnZones?.find(r => r.id === drag.id); if (!rz) return m; n.set(drag.id, { ...rz, centerX: drag.origCenter!.cx + dx, centerY: drag.origCenter!.cy + dy }); return n; });
                } else if (drag.kind === 'classSpawnZone') {
                    setDraftClassSpawnZones((m) => { const n = new Map(m); const csz = n.get(drag.id) ?? data?.classSpawnZones?.find(c => c.id === drag.id); if (!csz) return m; n.set(drag.id, { ...csz, centerX: drag.origCenter!.cx + dx, centerY: drag.origCenter!.cy + dy }); return n; });
                }
            } else {
                if (drag.kind === 'spawnZone') {
                    setDraftSpawnZones((m) => { const n = new Map(m); const sz = n.get(drag.id) ?? data?.spawnZones?.find(s => s.spawnZoneId === drag.id); if (!sz) return m; n.set(drag.id, { ...sz, minSpawnX: drag.origBounds.minX + dx, maxSpawnX: drag.origBounds.maxX + dx, minSpawnY: drag.origBounds.minY + dy, maxSpawnY: drag.origBounds.maxY + dy }); return n; });
                } else if (drag.kind === 'respawn') {
                    setDraftRespawnZones((m) => { const n = new Map(m); const rz = n.get(drag.id) ?? data?.respawnZones?.find(r => r.id === drag.id); if (!rz) return m; n.set(drag.id, { ...rz, minX: drag.origBounds.minX + dx, maxX: drag.origBounds.maxX + dx, minY: drag.origBounds.minY + dy, maxY: drag.origBounds.maxY + dy }); return n; });
                } else if (drag.kind === 'classSpawnZone') {
                    setDraftClassSpawnZones((m) => { const n = new Map(m); const csz = n.get(drag.id) ?? data?.classSpawnZones?.find(c => c.id === drag.id); if (!csz) return m; n.set(drag.id, { ...csz, minX: drag.origBounds.minX + dx, maxX: drag.origBounds.maxX + dx, minY: drag.origBounds.minY + dy, maxY: drag.origBounds.maxY + dy }); return n; });
                }
            }
        } else if (drag.type === 'resizeCircle') {
            const newR = Math.hypot(wx - drag.centerWorld[0], wy - drag.centerWorld[1]);
            if (drag.which === 'outer') {
                setDraftZones((m) => { const n = new Map(m); n.set(drag.zone.id, { ...drag.zone, outerRadius: Math.max(1, newR) }); return n; });
            } else {
                const cur = draftZones.get(drag.zone.id) ?? drag.zone;
                setDraftZones((m) => { const n = new Map(m); n.set(drag.zone.id, { ...cur, innerRadius: Math.max(0, Math.min(newR, (draftZones.get(drag.zone.id)?.outerRadius ?? drag.zone.outerRadius) - 10)) }); return n; });
            }
        } else if (drag.type === 'resizeCircleShape') {
            const newR = Math.hypot(wx - drag.centerWorld[0], wy - drag.centerWorld[1]);
            if (drag.which === 'outer') {
                if (drag.kind === 'spawnZone') {
                    setDraftSpawnZones((m) => { const n = new Map(m); const sz = n.get(drag.id) ?? data?.spawnZones?.find(s => s.spawnZoneId === drag.id); if (!sz) return m; n.set(drag.id, { ...sz, outerRadius: Math.max(1, newR) }); return n; });
                } else if (drag.kind === 'respawn') {
                    setDraftRespawnZones((m) => { const n = new Map(m); const rz = n.get(drag.id) ?? data?.respawnZones?.find(r => r.id === drag.id); if (!rz) return m; n.set(drag.id, { ...rz, outerRadius: Math.max(1, newR) }); return n; });
                } else if (drag.kind === 'classSpawnZone') {
                    setDraftClassSpawnZones((m) => { const n = new Map(m); const csz = n.get(drag.id) ?? data?.classSpawnZones?.find(c => c.id === drag.id); if (!csz) return m; n.set(drag.id, { ...csz, outerRadius: Math.max(1, newR) }); return n; });
                }
            } else {
                if (drag.kind === 'spawnZone') {
                    const cur = draftSpawnZones.get(drag.id) ?? data?.spawnZones?.find(s => s.spawnZoneId === drag.id)!;
                    setDraftSpawnZones((m) => { const n = new Map(m); n.set(drag.id, { ...cur, innerRadius: Math.max(0, Math.min(newR, cur.outerRadius - 10)) }); return n; });
                } else if (drag.kind === 'respawn') {
                    const cur = draftRespawnZones.get(drag.id) ?? data?.respawnZones?.find(r => r.id === drag.id)!;
                    setDraftRespawnZones((m) => { const n = new Map(m); n.set(drag.id, { ...cur, innerRadius: Math.max(0, Math.min(newR, cur.outerRadius - 10)) }); return n; });
                } else if (drag.kind === 'classSpawnZone') {
                    const cur = draftClassSpawnZones.get(drag.id) ?? data?.classSpawnZones?.find(c => c.id === drag.id)!;
                    setDraftClassSpawnZones((m) => { const n = new Map(m); n.set(drag.id, { ...cur, innerRadius: Math.max(0, Math.min(newR, cur.outerRadius - 10)) }); return n; });
                }
            }
        } else if (drag.type === 'resizeRectShape') {
            const ob = drag.origBounds, dir = drag.handleDir;
            const dx = wx - drag.startWorld[0], dy = wy - drag.startWorld[1];
            const xDrivesWorldX = axisConfig.imageXAxis.endsWith('X');
            const yDrivesWorldX = axisConfig.imageYAxis.endsWith('X');
            const hDelta = xDrivesWorldX ? dx : dy;
            const vDelta = yDrivesWorldX ? dx : dy;
            let newMinX = ob.minX, newMaxX = ob.maxX, newMinY = ob.minY, newMaxY = ob.maxY;
            if (dir.includes('w')) { if (xDrivesWorldX) newMinX = ob.minX + hDelta; else newMinY = ob.minY + hDelta; }
            if (dir.includes('e')) { if (xDrivesWorldX) newMaxX = ob.maxX + hDelta; else newMaxY = ob.maxY + hDelta; }
            if (dir.includes('n')) { if (yDrivesWorldX) newMinX = ob.minX + vDelta; else newMinY = ob.minY + vDelta; }
            if (dir.includes('s')) { if (yDrivesWorldX) newMaxX = ob.maxX + vDelta; else newMaxY = ob.maxY + vDelta; }
            if (drag.kind === 'spawnZone') {
                setDraftSpawnZones((m) => { const n = new Map(m); const sz = n.get(drag.id) ?? data?.spawnZones?.find(s => s.spawnZoneId === drag.id); if (!sz) return m; n.set(drag.id, { ...sz, minSpawnX: newMinX, maxSpawnX: newMaxX, minSpawnY: newMinY, maxSpawnY: newMaxY }); return n; });
            } else if (drag.kind === 'respawn') {
                setDraftRespawnZones((m) => { const n = new Map(m); const rz = n.get(drag.id) ?? data?.respawnZones?.find(r => r.id === drag.id); if (!rz) return m; n.set(drag.id, { ...rz, minX: newMinX, maxX: newMaxX, minY: newMinY, maxY: newMaxY }); return n; });
            } else if (drag.kind === 'classSpawnZone') {
                setDraftClassSpawnZones((m) => { const n = new Map(m); const csz = n.get(drag.id) ?? data?.classSpawnZones?.find(c => c.id === drag.id); if (!csz) return m; n.set(drag.id, { ...csz, minX: newMinX, maxX: newMaxX, minY: newMinY, maxY: newMaxY }); return n; });
            }
        }
    }

    function handleSvgMouseUp(_e: ReactMouseEvent<SVGSVGElement>) {
        const drag = dragRef.current;
        if (!drag) return;

        if (drag.type === 'resizeCircle' && hasDragMovedRef.current) {
            const draft = draftZones.get(drag.zone.id);
            if (draft) {
                if (drag.which === 'outer') {
                    updateZone.mutate({ id: draft.id, slug: draft.slug, name: draft.name, outerRadius: draft.outerRadius });
                } else {
                    updateZone.mutate({ id: draft.id, slug: draft.slug, name: draft.name, innerRadius: draft.innerRadius });
                }
            }
        }
        if (drag.type === 'resizeCircleShape' && hasDragMovedRef.current) {
            if (drag.kind === 'spawnZone') {
                const draft = draftSpawnZones.get(drag.id);
                if (draft) {
                    if (drag.which === 'outer') updateSpawnZone.mutate({ spawnZoneId: draft.spawnZoneId, outerRadius: draft.outerRadius });
                    else updateSpawnZone.mutate({ spawnZoneId: draft.spawnZoneId, innerRadius: draft.innerRadius });
                }
            } else if (drag.kind === 'respawn') {
                const draft = draftRespawnZones.get(drag.id);
                if (draft) {
                    if (drag.which === 'outer') updateRespawnZone.mutate({ id: draft.id, outerRadius: draft.outerRadius });
                    else updateRespawnZone.mutate({ id: draft.id, innerRadius: draft.innerRadius });
                }
            } else {
                const draft = draftClassSpawnZones.get(drag.id);
                if (draft) {
                    if (drag.which === 'outer') updateClassSpawnZone.mutate({ id: draft.id, outerRadius: draft.outerRadius });
                    else updateClassSpawnZone.mutate({ id: draft.id, innerRadius: draft.innerRadius });
                }
            }
        }
        if ((drag.type === 'moveRectShape' || drag.type === 'resizeRectShape') && hasDragMovedRef.current) {
            const draft = drag.kind === 'spawnZone' ? draftSpawnZones.get(drag.id) :
                          drag.kind === 'respawn' ? draftRespawnZones.get(drag.id) :
                          draftClassSpawnZones.get(drag.id);
            if (draft) {
                const shape = draft.shapeType ?? 'RECT';
                const isMove = drag.type === 'moveRectShape';
                if (drag.kind === 'spawnZone') {
                    const sd = draft as SpawnZoneRect;
                    if (shape !== 'RECT' && isMove) {
                        updateSpawnZone.mutate({ spawnZoneId: sd.spawnZoneId, centerX: sd.centerX, centerY: sd.centerY });
                    } else {
                        updateSpawnZone.mutate({ spawnZoneId: sd.spawnZoneId, minSpawnX: Math.min(sd.minSpawnX, sd.maxSpawnX), maxSpawnX: Math.max(sd.minSpawnX, sd.maxSpawnX), minSpawnY: Math.min(sd.minSpawnY, sd.maxSpawnY), maxSpawnY: Math.max(sd.minSpawnY, sd.maxSpawnY) });
                    }
                } else if (drag.kind === 'respawn') {
                    const rd = draft as RespawnPin;
                    if (shape !== 'RECT' && isMove) {
                        updateRespawnZone.mutate({ id: rd.id, centerX: rd.centerX, centerY: rd.centerY });
                    } else {
                        updateRespawnZone.mutate({ id: rd.id, minX: Math.min(rd.minX, rd.maxX), maxX: Math.max(rd.minX, rd.maxX), minY: Math.min(rd.minY, rd.maxY), maxY: Math.max(rd.minY, rd.maxY) });
                    }
                } else {
                    const cd = draft as ClassSpawnZonePin;
                    if (shape !== 'RECT' && isMove) {
                        updateClassSpawnZone.mutate({ id: cd.id, centerX: cd.centerX, centerY: cd.centerY });
                    } else {
                        updateClassSpawnZone.mutate({ id: cd.id, minX: Math.min(cd.minX, cd.maxX), maxX: Math.max(cd.minX, cd.maxX), minY: Math.min(cd.minY, cd.maxY), maxY: Math.max(cd.minY, cd.maxY) });
                    }
                }
            }
        }
        if ((drag.type === 'moveZone' || drag.type === 'resizeZone') && hasDragMovedRef.current) {
            const draft = draftZones.get(drag.zone.id);
            if (draft) {
                const shape = draft.shapeType ?? 'RECT';
                if (shape !== 'RECT' && drag.type === 'moveZone') {
                    updateZone.mutate({ id: draft.id, slug: draft.slug, name: draft.name, centerX: draft.centerX, centerY: draft.centerY });
                } else {
                    const { id, slug, name, ...rest } = draft;
                    updateZone.mutate({ id, slug, name, ...rest, minX: Math.min(draft.minX, draft.maxX), maxX: Math.max(draft.minX, draft.maxX), minY: Math.min(draft.minY, draft.maxY), maxY: Math.max(draft.minY, draft.maxY) });
                }
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
        if (drag.type === 'rotateEntity') {
            if (hasDragMovedRef.current && draftEntityRot) {
                const { entity } = drag;
                const screenAngle = draftEntityRot.rotZ;
                if (entity.type === 'npc') updateNpcPlacement.mutate({ id: entity.data.id, rotZ: screenAngle });
                else if (entity.type === 'worldObject') updateWorldObject.mutate({ id: entity.data.id, rotZ: screenAngle });
                else if (entity.type === 'mob') updateMobPosition.mutate({ mobId: entity.data.mobId, rotZ: screenAngle });
            }
            setDraftEntityRot(null);
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
        if (activeTool !== 'addZone' && activeTool !== 'addSpawnZone' && activeTool !== 'addClassSpawnZone') {
            const [wx, wy] = clientToWorld(e.clientX, e.clientY);
            const hitZone = zones.find((z) => { const rz = resolveZone(z); return wx >= rz.minX && wx <= rz.maxX && wy >= rz.minY && wy <= rz.maxY; });
            setAddDialog({ tool: activeTool, worldX: wx, worldY: wy, zoneId: hitZone?.id });
        }
    }

    function handleZoneMouseDown(e: ReactMouseEvent<SVGElement>, zone: ZoneRecord, dir?: HandleDir, circleWhich?: 'outer' | 'inner') {
        if (activeTool !== 'select') return;
        const rz = resolveZone(zone);
        const shape = rz.shapeType ?? 'RECT';
        const alreadySelected = selected?.type === 'zone' && selected.data.id === zone.id;
        const [wx, wy] = clientToWorld(e.clientX, e.clientY);

        if (!alreadySelected && !dir && !circleWhich) {
            // Not selected yet — let event fall through to SVG pan handler
            return;
        }
        e.stopPropagation(); hasDragMovedRef.current = false;
        suppressClickClearRef.current = true;

        if (circleWhich) {
            // CIRCLE/ANNULUS radius resize handle
            dragRef.current = { type: 'resizeCircle', zone: rz, which: circleWhich, centerWorld: [rz.centerX, rz.centerY] };
        } else if (shape !== 'RECT') {
            // CIRCLE/ANNULUS body — move only
            dragRef.current = { type: 'moveZone', zone: rz, startWorld: [wx, wy], origBounds: { minX: rz.minX, maxX: rz.maxX, minY: rz.minY, maxY: rz.maxY }, origCenter: { cx: rz.centerX, cy: rz.centerY } };
        } else {
            dragRef.current = dir
                ? { type: 'resizeZone', zone: rz, handleDir: dir, startWorld: [wx, wy], origBounds: { minX: rz.minX, maxX: rz.maxX, minY: rz.minY, maxY: rz.maxY } }
                : { type: 'moveZone', zone: rz, startWorld: [wx, wy], origBounds: { minX: rz.minX, maxX: rz.maxX, minY: rz.minY, maxY: rz.maxY } };
        }
        setSelected({ type: 'zone', data: rz });
        e.preventDefault();
    }

    function handleZoneDoubleClick(e: ReactMouseEvent<SVGElement>, zone: ZoneRecord) {
        if (activeTool !== 'select') return;
        e.stopPropagation();
        suppressClickClearRef.current = true;
        const [wx, wy] = clientToWorld(e.clientX, e.clientY);
        // Find all zones that contain this point (for overlapping zones cycling)
        const hits = zones
            .filter((z) => zoneContainsPoint(resolveZone(z), wx, wy))
            .sort((a, b) => b.id - a.id); // newest (highest id) first = on top visually
        if (hits.length <= 1) {
            setSelected({ type: 'zone', data: resolveZone(zone) });
            return;
        }
        if (selected?.type !== 'zone') {
            setSelected({ type: 'zone', data: resolveZone(hits[0]) });
            return;
        }
        const curIdx = hits.findIndex((z) => z.id === selected.data.id);
        const nextIdx = (curIdx + 1) % hits.length;
        setSelected({ type: 'zone', data: resolveZone(hits[nextIdx]) });
    }

    function handleEntityMouseDown(e: ReactMouseEvent<SVGElement>, entity: SelectedEntity) {
        if (activeTool !== 'select') return;
        const alreadySelected =
            selected !== null &&
            selected.type === entity.type &&
            getEntityId(selected) === getEntityId(entity);
        if (!alreadySelected) {
            // Not selected yet — let mousedown fall through to SVG pan handler.
            // Selection happens only on double-click.
            return;
        }
        e.stopPropagation();
        e.preventDefault();
        hasDragMovedRef.current = false;
        suppressClickClearRef.current = true;
        const [origWX, origWY] = getEntityWorldPos(entity);
        dragRef.current = { type: 'moveEntity', entity, startClientX: e.clientX, startClientY: e.clientY, origWorldX: origWX, origWorldY: origWY };
    }

    function handleEntityDoubleClick(e: ReactMouseEvent<SVGElement>, entity: SelectedEntity) {
        if (activeTool !== 'select') return;
        e.stopPropagation();
        suppressClickClearRef.current = true;
        setSelected(entity);
    }

    function handleSpawnZoneMouseDown(e: ReactMouseEvent<SVGElement>, sz: SpawnZoneRect, dir?: HandleDir, circleWhich?: 'outer' | 'inner') {
        if (activeTool !== 'select') return;
        const rsz = resolveSpawnZone(sz);
        const isSel = selected?.type === 'spawnZone' && selected.data.spawnZoneId === sz.spawnZoneId;
        if (!isSel && !dir && !circleWhich) { return; }
        e.stopPropagation(); hasDragMovedRef.current = false;
        suppressClickClearRef.current = true;
        const [wx, wy] = clientToWorld(e.clientX, e.clientY);
        const shape = rsz.shapeType ?? 'RECT';
        const b = { minX: rsz.minSpawnX, maxX: rsz.maxSpawnX, minY: rsz.minSpawnY, maxY: rsz.maxSpawnY };
        if (circleWhich) {
            dragRef.current = { type: 'resizeCircleShape', id: rsz.spawnZoneId, kind: 'spawnZone', which: circleWhich, centerWorld: [rsz.centerX, rsz.centerY] };
        } else if (shape !== 'RECT') {
            dragRef.current = { type: 'moveRectShape', id: rsz.spawnZoneId, kind: 'spawnZone', startWorld: [wx, wy], origBounds: b, origCenter: { cx: rsz.centerX, cy: rsz.centerY } };
        } else {
            dragRef.current = dir
                ? { type: 'resizeRectShape', id: rsz.spawnZoneId, kind: 'spawnZone', handleDir: dir, startWorld: [wx, wy], origBounds: b }
                : { type: 'moveRectShape', id: rsz.spawnZoneId, kind: 'spawnZone', startWorld: [wx, wy], origBounds: b };
        }
        setSelected({ type: 'spawnZone', data: rsz });
        e.preventDefault();
    }

    function handleRespawnMouseDown(e: ReactMouseEvent<SVGElement>, rz: RespawnPin, dir?: HandleDir, circleWhich?: 'outer' | 'inner') {
        if (activeTool !== 'select') return;
        const rrz = resolveRespawnZone(rz);
        const isSel = selected?.type === 'respawn' && selected.data.id === rz.id;
        if (!isSel && !dir && !circleWhich) { return; }
        e.stopPropagation(); hasDragMovedRef.current = false;
        suppressClickClearRef.current = true;
        const [wx, wy] = clientToWorld(e.clientX, e.clientY);
        const shape = rrz.shapeType ?? 'RECT';
        const b = { minX: rrz.minX, maxX: rrz.maxX, minY: rrz.minY, maxY: rrz.maxY };
        if (circleWhich) {
            dragRef.current = { type: 'resizeCircleShape', id: rrz.id, kind: 'respawn', which: circleWhich, centerWorld: [rrz.centerX, rrz.centerY] };
        } else if (shape !== 'RECT') {
            dragRef.current = { type: 'moveRectShape', id: rrz.id, kind: 'respawn', startWorld: [wx, wy], origBounds: b, origCenter: { cx: rrz.centerX, cy: rrz.centerY } };
        } else {
            dragRef.current = dir
                ? { type: 'resizeRectShape', id: rrz.id, kind: 'respawn', handleDir: dir, startWorld: [wx, wy], origBounds: b }
                : { type: 'moveRectShape', id: rrz.id, kind: 'respawn', startWorld: [wx, wy], origBounds: b };
        }
        setSelected({ type: 'respawn', data: rrz });
        e.preventDefault();
    }

    function handleClassSpawnMouseDown(e: ReactMouseEvent<SVGElement>, csz: ClassSpawnZonePin, dir?: HandleDir, circleWhich?: 'outer' | 'inner') {
        if (activeTool !== 'select') return;
        const rcsz = resolveClassSpawnZone(csz);
        const isSel = selected?.type === 'classSpawnZone' && selected.data.id === csz.id;
        if (!isSel && !dir && !circleWhich) { return; }
        e.stopPropagation(); hasDragMovedRef.current = false;
        suppressClickClearRef.current = true;
        const [wx, wy] = clientToWorld(e.clientX, e.clientY);
        const shape = rcsz.shapeType ?? 'RECT';
        const b = { minX: rcsz.minX, maxX: rcsz.maxX, minY: rcsz.minY, maxY: rcsz.maxY };
        if (circleWhich) {
            dragRef.current = { type: 'resizeCircleShape', id: rcsz.id, kind: 'classSpawnZone', which: circleWhich, centerWorld: [rcsz.centerX, rcsz.centerY] };
        } else if (shape !== 'RECT') {
            dragRef.current = { type: 'moveRectShape', id: rcsz.id, kind: 'classSpawnZone', startWorld: [wx, wy], origBounds: b, origCenter: { cx: rcsz.centerX, cy: rcsz.centerY } };
        } else {
            dragRef.current = dir
                ? { type: 'resizeRectShape', id: rcsz.id, kind: 'classSpawnZone', handleDir: dir, startWorld: [wx, wy], origBounds: b }
                : { type: 'moveRectShape', id: rcsz.id, kind: 'classSpawnZone', startWorld: [wx, wy], origBounds: b };
        }
        setSelected({ type: 'classSpawnZone', data: rcsz });
        e.preventDefault();
    }

    function handleSpawnZoneDoubleClick(e: ReactMouseEvent<SVGElement>, sz: SpawnZoneRect) {
        if (activeTool !== 'select') return;
        e.stopPropagation();
        suppressClickClearRef.current = true;
        setSelected({ type: 'spawnZone', data: sz });
    }

    function getEntityId(entity: SelectedEntity): number {
        switch (entity.type) {
            case 'npc': return entity.data.id;
            case 'spawnZone': return entity.data.spawnZoneId;
            case 'classSpawnZone': return entity.data.id;
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
            case 'classSpawnZone': return [entity.data.minX, entity.data.minY];
            default: return [0, 0];
        }
    }
    function saveEntityPosition(entity: SelectedEntity, wx: number, wy: number) {
        if (entity.type === 'npc') updateNpcPlacement.mutate({ id: entity.data.id, x: wx, y: wy });
        else if (entity.type === 'worldObject') updateWorldObject.mutate({ id: entity.data.id, posX: wx, posY: wy });
        else if (entity.type === 'respawn') updateRespawnZone.mutate({ id: entity.data.id, x: wx, y: wy });
        else if (entity.type === 'mob') updateMobPosition.mutate({ mobId: entity.data.mobId, x: wx, y: wy });
        else if (entity.type === 'classSpawnZone') {
            const dx = wx - entity.data.minX;
            const dy = wy - entity.data.minY;
            updateClassSpawnZone.mutate({
                id: entity.data.id,
                minX: entity.data.minX + dx, maxX: entity.data.maxX + dx,
                minY: entity.data.minY + dy, maxY: entity.data.maxY + dy,
            });
        }
    }

    function handleEntityDelete() {
        if (!selected) return;
        const { type, data } = selected;

        function doDelete(undoFn?: () => void) {
            if (type === 'zone') deleteZone.mutate({ id: (data as typeof data & { id: number }).id });
            else if (type === 'npc') deleteNpcPlacement.mutate({ id: (data as typeof data & { id: number }).id });
            else if (type === 'spawnZone') deleteSpawnZone.mutate({ spawnZoneId: (data as typeof data & { spawnZoneId: number }).spawnZoneId });
            else if (type === 'classSpawnZone') deleteClassSpawnZone.mutate({ id: (data as typeof data & { id: number }).id });
            else if (type === 'worldObject') deleteWorldObject.mutate({ id: (data as typeof data & { id: number }).id });
            else if (type === 'respawn') deleteRespawnZone.mutate({ id: (data as typeof data & { id: number }).id });
            else if (type === 'mob') deleteMobPosition.mutate({ mobId: (data as typeof data & { mobId: number }).mobId });
        }

        let cancelled = false;
        const entityLabel = (() => {
            if (type === 'zone') return `зону «${(data as { name: string }).name}»`;
            if (type === 'npc') return `NPC #${(data as { id: number }).id}`;
            if (type === 'spawnZone') return `spawn zone #${(data as { spawnZoneId: number }).spawnZoneId}`;
            if (type === 'classSpawnZone') return `class spawn zone #${(data as { id: number }).id}`;
            if (type === 'worldObject') return `объект #${(data as { id: number }).id}`;
            if (type === 'respawn') return `respawn #${(data as { id: number }).id}`;
            if (type === 'mob') return `моба #${(data as { mobId: number }).mobId}`;
            return 'объект';
        })();

        toast(`Удалить ${entityLabel}?`, {
            action: {
                label: 'Удалить',
                onClick: () => { if (!cancelled) doDelete(); },
            },
            cancel: {
                label: 'Отмена',
                onClick: () => { cancelled = true; },
            },
            duration: 5000,
        });
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
        else if (type === 'mob') updateMobPosition.mutate({ mobId: data.mobId, x, y, z, ...(rotZ !== undefined ? { rotZ } : {}) });
        else if (type === 'classSpawnZone') {
            // For rect shapes, x/y/z from the panel are min/max Z only (not position)
            updateClassSpawnZone.mutate({ id: data.id, minZ: z, maxZ: z });
        }
    }

    async function handleAddEntity(entityId: number, name: string, extra?: ZoneExtra) {
        if (!addDialog) return;
        const { tool, worldX, worldY, worldX2, worldY2, zoneId } = addDialog;
        const hasRect = worldX2 !== undefined && worldY2 !== undefined && (Math.abs(worldX2 - worldX) > 1 || Math.abs(worldY2 - worldY) > 1);
        try {
            if (tool === 'addZone' && extra) {
                const shapeType = extra.shapeType ?? 'RECT';
                const minX = hasRect ? worldX : worldX - 500;
                const maxX = hasRect ? worldX2! : worldX + 500;
                const minY = hasRect ? worldY : worldY - 500;
                const maxY = hasRect ? worldY2! : worldY + 500;
                if (shapeType !== 'RECT') {
                    const cx = (minX + maxX) / 2;
                    const cy = (minY + maxY) / 2;
                    const outerRadius = extra.outerRadius ?? Math.round(Math.min(maxX - minX, maxY - minY) / 2);
                    await createZone.mutateAsync({ name, slug: extra.slug, minLevel: extra.minLevel, maxLevel: extra.maxLevel, isPvp: extra.isPvp, isSafeZone: extra.isSafeZone, minX, maxX, minY, maxY, shapeType, centerX: cx, centerY: cy, outerRadius, innerRadius: extra.innerRadius });
                } else {
                    await createZone.mutateAsync({ name, slug: extra.slug, minLevel: extra.minLevel, maxLevel: extra.maxLevel, isPvp: extra.isPvp, isSafeZone: extra.isSafeZone, minX, maxX, minY, maxY });
                }
            } else if (tool === 'addNpc') {
                await createNpcPlacement.mutateAsync({ npcId: entityId, zoneId, x: worldX, y: worldY, z: 0, rotZ: 0 });
            } else if (tool === 'addSpawnZone') {
                const shapeType = extra?.shapeType ?? 'RECT';
                const minSpawnX = hasRect ? worldX : worldX - 100;
                const maxSpawnX = hasRect ? worldX2! : worldX + 100;
                const minSpawnY = hasRect ? worldY : worldY - 100;
                const maxSpawnY = hasRect ? worldY2! : worldY + 100;
                const minSpawnZ = extra?.minSpawnZ ?? 0;
                const maxSpawnZ = extra?.maxSpawnZ ?? 0;
                if (shapeType !== 'RECT') {
                    const cx = (minSpawnX + maxSpawnX) / 2;
                    const cy = (minSpawnY + maxSpawnY) / 2;
                    const outerRadius = extra?.outerRadius ?? Math.round(Math.min(maxSpawnX - minSpawnX, maxSpawnY - minSpawnY) / 2);
                    await createSpawnZone.mutateAsync({ zoneName: name, gameZoneId: zoneId, minSpawnX, maxSpawnX, minSpawnY, maxSpawnY, minSpawnZ, maxSpawnZ, shapeType, centerX: cx, centerY: cy, outerRadius, innerRadius: extra?.innerRadius });
                } else {
                    await createSpawnZone.mutateAsync({ zoneName: name, gameZoneId: zoneId, minSpawnX, maxSpawnX, minSpawnY, maxSpawnY, minSpawnZ, maxSpawnZ });
                }
            } else if (tool === 'addClassSpawnZone') {
                const shapeType = extra?.shapeType ?? 'RECT';
                const minX = hasRect ? worldX : worldX - 100;
                const maxX = hasRect ? worldX2! : worldX + 100;
                const minY = hasRect ? worldY : worldY - 100;
                const maxY = hasRect ? worldY2! : worldY + 100;
                const minZ = extra?.minSpawnZ ?? 0;
                const maxZ = extra?.maxSpawnZ ?? 0;
                if (shapeType !== 'RECT') {
                    const cx = (minX + maxX) / 2;
                    const cy = (minY + maxY) / 2;
                    const outerRadius = extra?.outerRadius ?? Math.round(Math.min(maxX - minX, maxY - minY) / 2);
                    await createClassSpawnZone.mutateAsync({ classId: entityId, zoneId: zoneId, minX, maxX, minY, maxY, minZ, maxZ, shapeType, centerX: cx, centerY: cy, outerRadius, innerRadius: extra?.innerRadius });
                } else {
                    await createClassSpawnZone.mutateAsync({ classId: entityId, zoneId: zoneId, minX, maxX, minY, maxY, minZ, maxZ });
                }
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
            if (!res.ok || !json.url) throw new Error(json.error ?? tm('uploadError'));
            setMapConfig((c) => ({ ...(c ?? {}), imageUrl: json.url! } as MapConfig));
            toast.success(tm('uploadSuccess'));
        } catch (err: unknown) { toast.error(err instanceof Error ? err.message : tm('uploadError')); }
        finally { setIsUploading(false); }
    }

    async function persistMapConfig(patch: Partial<MapConfig>) {
        try {
            const res = await fetch('/api/map-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patch),
            });
            if (!res.ok) throw new Error('Save failed');
            const saved = await res.json() as MapConfig;
            setMapConfig(saved);
        } catch (err: unknown) { toast.error(err instanceof Error ? err.message : tm('configSaveError')); }
    }

    interface UEWorldMapMeta {
        world_min_x: number; world_max_x: number;
        world_min_y: number; world_max_y: number;
        image_x_axis?: string; image_y_axis?: string;
        units_per_pixel?: number;
    }

    async function handleMetaImport(file: File) {
        try {
            const text = await file.text();
            const meta = JSON.parse(text) as UEWorldMapMeta;
            if (typeof meta.world_min_x !== 'number' || typeof meta.world_max_x !== 'number' ||
                typeof meta.world_min_y !== 'number' || typeof meta.world_max_y !== 'number') {
                toast.error(tm('metaInvalid'));
                return;
            }
            const patch: Partial<MapConfig> = {
                worldMinX: meta.world_min_x,
                worldMaxX: meta.world_max_x,
                worldMinY: meta.world_min_y,
                worldMaxY: meta.world_max_y,
                // Use axes from meta if present; fall back to UE top-down defaults
                imageXAxis: meta.image_x_axis ?? '+Y',
                imageYAxis: meta.image_y_axis ?? '-X',
                unitsPerPixel: meta.units_per_pixel ?? null,
            };
            await persistMapConfig(patch);
            toast.success(tm('boundsUpdated'));
        } catch {
            toast.error(tm('metaReadError'));
        }
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

    function renderCircleZoneHandles(zone: ZoneRecord, rz: ZoneRecord) {
        const [gcx, gcy] = worldToGroup(rz.centerX, rz.centerY);
        const outerRpx = worldRadiusToPx(rz.outerRadius);
        const hs = HANDLE_PX / zoom;
        const outerOffsets = [{ dx: outerRpx, dy: 0 }, { dx: -outerRpx, dy: 0 }, { dx: 0, dy: outerRpx }, { dx: 0, dy: -outerRpx }];
        const handles = outerOffsets.map((h, i) => (
            <rect key={`o${i}`}
                x={gcx + h.dx - hs} y={gcy + h.dy - hs} width={hs * 2} height={hs * 2}
                fill="#fff" stroke="#1e1e1e" strokeWidth={1 / zoom}
                style={{ cursor: 'ew-resize' }}
                onMouseDown={(e) => handleZoneMouseDown(e, zone, undefined, 'outer')} />
        ));
        if (rz.shapeType === 'ANNULUS') {
            const actualInnerR = rz.innerRadius > 0 ? rz.innerRadius : rz.outerRadius * 0.4;
            const innerRpx = worldRadiusToPx(actualInnerR);
            const innerOffsets = [{ dx: innerRpx, dy: 0 }, { dx: -innerRpx, dy: 0 }, { dx: 0, dy: innerRpx }, { dx: 0, dy: -innerRpx }];
            innerOffsets.forEach((h, i) => handles.push(
                <rect key={`i${i}`}
                    x={gcx + h.dx - hs} y={gcy + h.dy - hs} width={hs * 2} height={hs * 2}
                    fill="#facc15" stroke="#1e1e1e" strokeWidth={1 / zoom}
                    style={{ cursor: 'ew-resize' }}
                    onMouseDown={(e) => handleZoneMouseDown(e, zone, undefined, 'inner')} />
            ));
        }
        return handles;
    }

    function renderCircleSpawnZoneHandles(sz: SpawnZoneRect, rsz: SpawnZoneRect) {
        const [gcx, gcy] = worldToGroup(rsz.centerX, rsz.centerY);
        const outerRpx = worldRadiusToPx(rsz.outerRadius);
        const hs = HANDLE_PX / zoom;
        const outerOffsets = [{ dx: outerRpx, dy: 0 }, { dx: -outerRpx, dy: 0 }, { dx: 0, dy: outerRpx }, { dx: 0, dy: -outerRpx }];
        const handles = outerOffsets.map((h, i) => (
            <rect key={`o${i}`}
                x={gcx + h.dx - hs} y={gcy + h.dy - hs} width={hs * 2} height={hs * 2}
                fill="#fff" stroke="#1e1e1e" strokeWidth={1 / zoom}
                style={{ cursor: 'ew-resize' }}
                onMouseDown={(e) => handleSpawnZoneMouseDown(e, sz, undefined, 'outer')} />
        ));
        if (rsz.shapeType === 'ANNULUS') {
            const actualInnerR = rsz.innerRadius > 0 ? rsz.innerRadius : rsz.outerRadius * 0.4;
            const innerRpx = worldRadiusToPx(actualInnerR);
            const innerOffsets = [{ dx: innerRpx, dy: 0 }, { dx: -innerRpx, dy: 0 }, { dx: 0, dy: innerRpx }, { dx: 0, dy: -innerRpx }];
            innerOffsets.forEach((h, i) => handles.push(
                <rect key={`i${i}`}
                    x={gcx + h.dx - hs} y={gcy + h.dy - hs} width={hs * 2} height={hs * 2}
                    fill="#facc15" stroke="#1e1e1e" strokeWidth={1 / zoom}
                    style={{ cursor: 'ew-resize' }}
                    onMouseDown={(e) => handleSpawnZoneMouseDown(e, sz, undefined, 'inner')} />
            ));
        }
        return handles;
    }

    if (isLoading) return <div className="flex h-full items-center justify-center text-muted-foreground text-sm">{tm('loading')}</div>;

    const imageUrl = mapConfig?.imageUrl ?? null;
    const sw = svgRef.current?.clientWidth ?? 800;
    const sh = svgRef.current?.clientHeight ?? 600;

    const searchResults = (() => {
        if (!searchQuery.trim() || !data) return [];
        const q = searchQuery.toLowerCase();
        type SR = { label: string; sub: string; wx: number; wy: number; entity: SelectedEntity };
        const results: SR[] = [];
        zones.forEach((z) => {
            if (z.name.toLowerCase().includes(q) || z.slug.toLowerCase().includes(q)) {
                const rz = resolveZone(z);
                const wx = rz.shapeType !== 'RECT' ? rz.centerX : (rz.minX + rz.maxX) / 2;
                const wy = rz.shapeType !== 'RECT' ? rz.centerY : (rz.minY + rz.maxY) / 2;
                results.push({ label: z.name, sub: z.slug, wx, wy, entity: { type: 'zone', data: z } });
            }
        });
        (data.spawnZones ?? []).forEach((sz) => {
            if (sz.zoneName.toLowerCase().includes(q)) {
                const rsz = resolveSpawnZone(sz);
                const wx = rsz.shapeType !== 'RECT' ? rsz.centerX : (rsz.minSpawnX + rsz.maxSpawnX) / 2;
                const wy = rsz.shapeType !== 'RECT' ? rsz.centerY : (rsz.minSpawnY + rsz.maxSpawnY) / 2;
                results.push({ label: sz.zoneName, sub: 'Spawn Zone', wx, wy, entity: { type: 'spawnZone', data: sz } });
            }
        });
        (data.classSpawnZones ?? []).forEach((csz) => {
            const label = csz.className ?? `Class Spawn #${csz.id}`;
            if (label.toLowerCase().includes(q))
                results.push({ label, sub: 'Class Spawn', wx: csz.shapeType !== 'RECT' ? csz.centerX : (csz.minX + csz.maxX) / 2, wy: csz.shapeType !== 'RECT' ? csz.centerY : (csz.minY + csz.maxY) / 2, entity: { type: 'classSpawnZone', data: csz } });
        });
        (data.npcPlacements ?? []).forEach((p) => {
            const label = p.npcName ?? `NPC #${p.npcId}`;
            if (label.toLowerCase().includes(q))
                results.push({ label, sub: 'NPC', wx: p.x, wy: p.y, entity: { type: 'npc', data: p } });
        });
        (data.mobPositions ?? []).forEach((mp) => {
            const label = mp.mobName ?? `Mob #${mp.mobId}`;
            if (label.toLowerCase().includes(q))
                results.push({ label, sub: 'Mob', wx: mp.x, wy: mp.y, entity: { type: 'mob', data: mp } });
        });
        (data.respawnZones ?? []).forEach((rz) => {
            if (rz.name.toLowerCase().includes(q))
                results.push({ label: rz.name, sub: 'Respawn', wx: rz.x, wy: rz.y, entity: { type: 'respawn', data: rz } });
        });
        (data.worldObjects ?? []).forEach((wo) => {
            if (wo.nameKey.toLowerCase().includes(q))
                results.push({ label: wo.nameKey, sub: 'Object', wx: wo.posX, wy: wo.posY, entity: { type: 'worldObject', data: wo } });
        });
        return results.slice(0, 20);
    })();

    const layerCounts = data ? {
        zones: data.zones?.length ?? 0,
        npc: data.npcPlacements?.length ?? 0,
        spawnZone: data.spawnZones?.length ?? 0,
        classSpawnZone: data.classSpawnZones?.length ?? 0,
        worldObject: data.worldObjects?.length ?? 0,
        respawn: data.respawnZones?.length ?? 0,
        mob: data.mobPositions?.length ?? 0,
    } : undefined;

    // ── Pill label renderer ───────────────────────────────────────────────────
    // Renders a two-line label with a semi-transparent rect background.
    // `ly` is the vertical centre of the whole label group.
    function renderLabel(
        lx: number, ly: number,
        nameText: string, nameFs: number,
        subText: string, subFs: number,
        accentColor: string,
        isSel: boolean,
    ) {
        const pad = 4 / zoom;
        const nameW = nameText.length * nameFs * 0.65 + pad * 2;
        const nameH = nameFs * 1.4;
        const subW = subText.length * subFs * 0.65 + pad * 2;
        const subH = subFs * 1.4;
        const gap = 2 / zoom;
        const totalH = nameH + gap + subH;
        const topY = ly - totalH / 2;
        const nameCY = topY + nameH / 2;
        const subCY = topY + nameH + gap + subH / 2;
        return (
            <g style={{ pointerEvents: 'none', userSelect: 'none' }}>
                <rect x={lx - nameW / 2} y={topY} width={nameW} height={nameH}
                    rx={3 / zoom}
                    fill={isSel ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.62)'}
                    stroke={isSel ? 'rgba(255,255,255,0.28)' : 'none'}
                    strokeWidth={0.5 / zoom}
                />
                <text x={lx} y={nameCY} textAnchor="middle" dominantBaseline="middle"
                    fill="#f4f4f5" fontSize={nameFs}
                    fontWeight={isSel ? '600' : '500'}
                    style={{ userSelect: 'none' }}>
                    {nameText}
                </text>
                <rect x={lx - subW / 2} y={topY + nameH + gap} width={subW} height={subH}
                    rx={2 / zoom}
                    fill={isSel ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.55)'}
                />
                <text x={lx} y={subCY} textAnchor="middle" dominantBaseline="middle"
                    fill="rgba(255,255,255,0.6)" fontSize={subFs}
                    style={{ userSelect: 'none' }}>
                    {subText}
                </text>
            </g>
        );
    }

    // ── Unified label visibility: zones + spawnZones, pill-vs-pill AABB ────────
    // Both layers share one pass so cross-layer labels don't overlap.
    // Larger zones get priority. Selected zone always shows its label.
    const labelVisibility = (() => {
        const PAD = 4 / zoom;
        const GAP = 2 / zoom;
        const OVERLAP_PAD = 2 / zoom;

        /** Compute where the label pill will be drawn and how big it is, in group-space. */
        function pillFor(
            shape: string,
            wCx: number, wCy: number, outerR: number, innerR: number,
            minX: number, minY: number, maxX: number, maxY: number,
            nameText: string, subText: string,
        ): { lx: number; ly: number; pw: number; ph: number; size: number } | null {
            let lx: number, ly: number, nameFs: number, size: number;
            if (shape !== 'RECT') {
                const [cgx, cgy] = worldToGroup(wCx, wCy);
                const outerRpx = worldRadiusToPx(outerR);
                const innerRpx = shape === 'ANNULUS' && innerR > 0 ? worldRadiusToPx(innerR) : outerRpx * 0.4;
                const hitR = Math.max(outerRpx, 16 / zoom);
                nameFs = Math.max(11, Math.min(14, hitR / 5)) / zoom;
                lx = cgx;
                ly = shape === 'ANNULUS' ? cgy - (outerRpx + innerRpx) / 2 : cgy;
                size = outerR ** 2;
            } else {
                if (maxX === minX || maxY === minY) return null;
                const [x1, y1] = worldToGroup(minX, minY);
                const [x2, y2] = worldToGroup(maxX, maxY);
                const rw = Math.abs(x2 - x1);
                lx = (Math.min(x1, x2) + Math.max(x1, x2)) / 2;
                ly = (Math.min(y1, y2) + Math.max(y1, y2)) / 2;
                nameFs = Math.max(11, Math.min(14, rw / 10)) / zoom;
                size = (maxX - minX) * (maxY - minY);
            }
            const subFs = Math.max(9, Math.min(12, nameFs * 0.8));
            const nameW = nameText.length * nameFs * 0.65 + PAD * 2;
            const subW = subText.length * subFs * 0.65 + PAD * 2;
            const nameH = nameFs * 1.4;
            const subH = subFs * 1.4;
            return { lx, ly, pw: Math.max(nameW, subW), ph: nameH + GAP + subH, size };
        }

        type Entry = {
            kind: 'zone' | 'spawnZone';
            id: number;
            isSel: boolean;
            pill: { lx: number; ly: number; pw: number; ph: number; size: number } | null;
        };

        const entries: Entry[] = [];

        for (const z of zones) {
            const rz = resolveZone(z);
            const shape = rz.shapeType ?? 'RECT';
            const subText = shape !== 'RECT'
                ? (shape === 'ANNULUS'
                    ? `R ${Math.round(rz.outerRadius / 100)}m / ${Math.round(rz.innerRadius / 100)}m`
                    : `R ${Math.round(rz.outerRadius / 100)}m`)
                : `${Math.round(Math.abs(rz.maxX - rz.minX) / 100)}m × ${Math.round(Math.abs(rz.maxY - rz.minY) / 100)}m`;
            entries.push({
                kind: 'zone', id: z.id,
                isSel: selected?.type === 'zone' && selected.data.id === z.id,
                pill: pillFor(shape, rz.centerX, rz.centerY, rz.outerRadius, rz.innerRadius,
                    rz.minX, rz.minY, rz.maxX, rz.maxY, rz.name, subText),
            });
        }

        for (const sz of (data?.spawnZones ?? [])) {
            const rsz = resolveSpawnZone(sz);
            const shape = rsz.shapeType ?? 'RECT';
            const subText = shape !== 'RECT'
                ? (shape === 'ANNULUS'
                    ? `R ${Math.round(rsz.outerRadius / 100)}m / ${Math.round(rsz.innerRadius / 100)}m`
                    : `R ${Math.round(rsz.outerRadius / 100)}m`)
                : `${Math.round(Math.abs(rsz.maxSpawnX - rsz.minSpawnX) / 100)}m × ${Math.round(Math.abs(rsz.maxSpawnY - rsz.minSpawnY) / 100)}m`;
            entries.push({
                kind: 'spawnZone', id: sz.spawnZoneId,
                isSel: selected?.type === 'spawnZone' && selected.data.spawnZoneId === sz.spawnZoneId,
                pill: pillFor(shape, rsz.centerX, rsz.centerY, rsz.outerRadius, rsz.innerRadius,
                    rsz.minSpawnX, rsz.minSpawnY, rsz.maxSpawnX, rsz.maxSpawnY, rsz.zoneName, subText),
            });
        }

        // Largest-first: bigger zones get label priority
        entries.sort((a, b) => (b.pill?.size ?? 0) - (a.pill?.size ?? 0));

        const visZones = new Set<number>();
        const visSpawnZones = new Set<number>();
        const slots: Array<{ cx: number; cy: number; w: number; h: number }> = [];

        for (const e of entries) {
            if (!e.pill) {
                if (e.isSel) (e.kind === 'zone' ? visZones : visSpawnZones).add(e.id);
                continue;
            }
            const { lx, ly, pw, ph } = e.pill;
            const vis = e.kind === 'zone' ? visZones : visSpawnZones;

            if (e.isSel) {
                vis.add(e.id);
                slots.push({ cx: lx, cy: ly, w: pw, h: ph });
                continue;
            }

            const overlaps = slots.some((s) =>
                Math.abs(s.cx - lx) < (s.w + pw) / 2 + OVERLAP_PAD &&
                Math.abs(s.cy - ly) < (s.h + ph) / 2 + OVERLAP_PAD,
            );
            if (!overlaps) {
                vis.add(e.id);
                slots.push({ cx: lx, cy: ly, w: pw, h: ph });
            }
        }

        return { zones: visZones, spawnZones: visSpawnZones };
    })();

    return (
        <div className="flex h-full flex-col overflow-hidden">
            <MapToolbar
                activeTool={activeTool} onToolChange={setActiveTool}
                visibleLayers={visibleLayers} onLayerToggle={toggleLayer}
                onZoomReset={resetViewport} onZoomToFit={fitToView} onImageUpload={handleImageUpload}
                onMetaImport={handleMetaImport}
                isUploading={isUploading} hasImage={!!imageUrl}
                zoom={zoom}
                showMapImage={showMapImage} onToggleMapImage={() => setShowMapImage((v) => !v)}
                searchOpen={searchOpen} onSearchToggle={() => { setSearchOpen((v) => !v); setSearchQuery(''); }}
                layerCounts={layerCounts}
            />
            <div className="relative flex-1 overflow-hidden">
                <svg ref={svgRef} className="w-full h-full bg-zinc-900 select-none"
                    style={{ cursor: dragRef.current?.type === 'pan' ? 'grabbing' : activeTool === 'select' ? 'grab' : 'crosshair' }}
                    onMouseDown={handleSvgMouseDown}
                    onMouseMove={handleSvgMouseMove}
                    onMouseUp={handleSvgMouseUp}
                    onMouseLeave={() => { dragRef.current = null; setDraftEntityPos(null); setDraftEntityRot(null); setCursorWorld(null); }}
                    onClick={handleSvgClick}
                >
                    <g transform={`translate(${panX},${panY}) scale(${zoom})`}>
                        {imageUrl && showMapImage ? (() => {
                            const { cw, ch, ox, oy } = canvasDims();
                            return <image href={imageUrl} x={ox} y={oy} width={cw} height={ch} preserveAspectRatio="none" style={{ pointerEvents: 'none' }} />;
                        })() : !imageUrl ? (
                            <text x={sw / zoom / 2} y={sh / zoom / 2} textAnchor="middle" dominantBaseline="middle" fill="#3f3f46" fontSize={14 / zoom} style={{ pointerEvents: 'none' }}>
                                Загрузите изображение карты через кнопку «Загрузить карту»
                            </text>
                        ) : null}

                        {visibleLayers.has('zones') && [...zones].sort((a, b) => {
                            const aIsSel = selected?.type === 'zone' && selected.data.id === a.id;
                            const bIsSel = selected?.type === 'zone' && selected.data.id === b.id;
                            if (aIsSel) return 1;
                            if (bIsSel) return -1;
                            const ra = resolveZone(a), rb = resolveZone(b);
                            const sa = ra.shapeType !== 'RECT' ? ra.outerRadius ** 2 : (ra.maxX - ra.minX) * (ra.maxY - ra.minY);
                            const sb = rb.shapeType !== 'RECT' ? rb.outerRadius ** 2 : (rb.maxX - rb.minX) * (rb.maxY - rb.minY);
                            return sb - sa; // larger zones render first = lower in SVG z-order = behind
                        }).map((z) => {
                            const rz = resolveZone(z);
                            const isSel = selected?.type === 'zone' && selected.data.id === z.id;
                            const shape = rz.shapeType ?? 'RECT';

                            if (shape === 'CIRCLE' || shape === 'ANNULUS') {
                                const [gcx, gcy] = worldToGroup(rz.centerX, rz.centerY);
                                const outerRpx = worldRadiusToPx(rz.outerRadius);
                                const innerRpx = worldRadiusToPx(rz.innerRadius);
                                const dispOuterR = outerRpx;
                                const hasRealInner = shape === 'ANNULUS' && rz.innerRadius > 0;
                                const dispInnerR = shape === 'ANNULUS'
                                    ? (hasRealInner ? Math.min(innerRpx, Math.max(0, outerRpx - 4 / zoom)) : outerRpx * 0.4)
                                    : 0;
                                const isInnerPlaceholder = shape === 'ANNULUS' && !hasRealInner;
                                const hitR = Math.max(outerRpx, 20 / zoom);
                                const labelFs = Math.max(11, Math.min(15, hitR / 5)) / zoom;
                                const spColor = LAYER_COLORS.zones;
                                const fillOp = isSel ? 0.3 : 0.1;
                                const sizeLabelFs = Math.max(9, Math.min(12, hitR / 6)) / zoom;
                                const radiusLabel = shape === 'ANNULUS'
                                    ? `R ${Math.round(rz.outerRadius / 100)}m / ${Math.round(rz.innerRadius / 100)}m`
                                    : `R ${Math.round(rz.outerRadius / 100)}m`;
                                return (
                                    <g key={`zone-${z.id}`}
                                        style={{ cursor: activeTool === 'select' ? (isSel ? 'move' : 'pointer') : 'default' }}>
                                        {/* ANNULUS: evenodd path avoids SVG mask coordinate-system issues */}
                                        {shape === 'ANNULUS' ? (
                                            <path
                                                d={annulusPath(gcx, gcy, dispOuterR, dispInnerR)}
                                                fill={spColor} fillOpacity={fillOp} fillRule="evenodd"
                                                stroke={isSel ? '#fff' : spColor} strokeWidth={(isSel ? 2 : 1) / zoom}
                                                style={{ pointerEvents: 'none' }} />
                                        ) : (
                                            <circle cx={gcx} cy={gcy} r={dispOuterR}
                                                fill={spColor} fillOpacity={fillOp}
                                                stroke={isSel ? '#fff' : spColor} strokeWidth={(isSel ? 2 : 1) / zoom}
                                                style={{ pointerEvents: 'none' }} />
                                        )}
                                        {/* Inner ring stroke — dashed when innerRadius is a placeholder (not yet set by user) */}
                                        {shape === 'ANNULUS' && dispInnerR > 0 && (
                                            <circle cx={gcx} cy={gcy} r={dispInnerR}
                                                fill="none" stroke={isSel ? '#fff' : spColor}
                                                strokeWidth={(isSel ? 1.5 : 1) / zoom}
                                                strokeDasharray={isInnerPlaceholder ? `${3 / zoom},${3 / zoom}` : undefined}
                                                style={{ pointerEvents: 'none' }} />
                                        )}
                                        {/* hit area: ANNULUS uses evenodd donut path so the inner hole doesn't capture events */}
                                        {shape === 'ANNULUS' ? (
                                            <path
                                                d={annulusPath(gcx, gcy, hitR, dispInnerR > 0 ? dispInnerR : hitR * 0.4)}
                                                fill="rgba(0,0,0,0)" fillRule="evenodd"
                                                onMouseDown={(e) => handleZoneMouseDown(e, z)}
                                                onDoubleClick={(e) => handleZoneDoubleClick(e, z)} />
                                        ) : (
                                            <circle cx={gcx} cy={gcy} r={hitR} fill="rgba(0,0,0,0)"
                                                onMouseDown={(e) => handleZoneMouseDown(e, z)}
                                                onDoubleClick={(e) => handleZoneDoubleClick(e, z)} />
                                        )}
                                        {isSel && renderCircleZoneHandles(z, rz)}
                                        {isSel && (
                                            <g style={{ pointerEvents: 'none' }}>
                                                <line x1={gcx - 8 / zoom} y1={gcy} x2={gcx + 8 / zoom} y2={gcy} stroke="#fff" strokeWidth={1.5 / zoom} />
                                                <line x1={gcx} y1={gcy - 8 / zoom} x2={gcx} y2={gcy + 8 / zoom} stroke="#fff" strokeWidth={1.5 / zoom} />
                                                <circle cx={gcx} cy={gcy} r={4 / zoom} fill="#fff" fillOpacity={0.9} style={{ pointerEvents: 'none' }} />
                                            </g>
                                        )}
                                        {labelVisibility.zones.has(z.id) && (() => {
                                            const labelY = shape === 'ANNULUS'
                                                ? gcy - (dispOuterR + (hasRealInner ? worldRadiusToPx(rz.innerRadius) : dispOuterR * 0.4)) / 2
                                                : gcy;
                                            return renderLabel(gcx, labelY, rz.name, labelFs, radiusLabel, sizeLabelFs, LAYER_COLORS.zones, isSel);
                                        })()}
                                    </g>
                                );
                            }

                            if (rz.maxX === rz.minX || rz.maxY === rz.minY) return null;
                            const [x1, y1] = worldToGroup(rz.minX, rz.minY);
                            const [x2, y2] = worldToGroup(rz.maxX, rz.maxY);
                            const rx = Math.min(x1, x2), ry = Math.min(y1, y2), rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1);
                            const nameFontSize = Math.max(11, Math.min(15, rw / 10)) / zoom;
                            const sizeFontSize = Math.max(9, Math.min(12, rw / 12)) / zoom;
                            const sizeLabel = `${Math.round(Math.abs(rz.maxX - rz.minX) / 100)}m × ${Math.round(Math.abs(rz.maxY - rz.minY) / 100)}m`;
                            return (
                                <g key={`zone-${z.id}`}>
                                    <rect x={rx} y={ry} width={rw} height={rh}
                                        fill={LAYER_COLORS.zones} fillOpacity={isSel ? 0.3 : 0.1}
                                        stroke={isSel ? '#fff' : LAYER_COLORS.zones} strokeWidth={(isSel ? 2 : 1) / zoom}
                                        style={{ cursor: isSel ? 'move' : 'pointer' }}
                                        onMouseDown={(e) => handleZoneMouseDown(e, z)}
                                        onDoubleClick={(e) => handleZoneDoubleClick(e, z)}
                                    />
                                    {labelVisibility.zones.has(z.id) && renderLabel(
                                        rx + rw / 2, ry + rh / 2,
                                        rz.name, nameFontSize,
                                        sizeLabel, sizeFontSize,
                                        LAYER_COLORS.zones, isSel,
                                    )}
                                    {isSel && renderZoneHandles(z, rz)}
                                </g>
                            );
                        })}

                        {visibleLayers.has('spawnZone') && (data?.spawnZones ?? []).slice().sort((a, b) => {
                            const aIsSel = selected?.type === 'spawnZone' && selected.data.spawnZoneId === a.spawnZoneId;
                            const bIsSel = selected?.type === 'spawnZone' && selected.data.spawnZoneId === b.spawnZoneId;
                            if (aIsSel) return 1;
                            if (bIsSel) return -1;
                            const ra = resolveSpawnZone(a), rb = resolveSpawnZone(b);
                            const sa = ra.shapeType !== 'RECT' ? ra.outerRadius ** 2 : (ra.maxSpawnX - ra.minSpawnX) * (ra.maxSpawnY - ra.minSpawnY);
                            const sb = rb.shapeType !== 'RECT' ? rb.outerRadius ** 2 : (rb.maxSpawnX - rb.minSpawnX) * (rb.maxSpawnY - rb.minSpawnY);
                            return sb - sa;
                        }).map((sz) => {
                            const rsz = resolveSpawnZone(sz);
                            const isSel = selected?.type === 'spawnZone' && selected.data.spawnZoneId === sz.spawnZoneId;
                            const shape = rsz.shapeType ?? 'RECT';

                            if (shape === 'CIRCLE' || shape === 'ANNULUS') {
                                const [gcx, gcy] = worldToGroup(rsz.centerX, rsz.centerY);
                                const outerRpx = worldRadiusToPx(rsz.outerRadius);
                                const innerRpx = worldRadiusToPx(rsz.innerRadius);
                                const dispOuterR = outerRpx;
                                const hasRealInner = shape === 'ANNULUS' && rsz.innerRadius > 0;
                                const dispInnerR = shape === 'ANNULUS'
                                    ? (hasRealInner ? Math.min(innerRpx, Math.max(0, outerRpx - 4 / zoom)) : outerRpx * 0.4)
                                    : 0;
                                const isInnerPlaceholder = shape === 'ANNULUS' && !hasRealInner;
                                const hitR = Math.max(outerRpx, 16 / zoom);
                                const labelFs = Math.max(11, Math.min(14, hitR / 5)) / zoom;
                                const spColor = LAYER_COLORS.spawnZone;
                                const fillOp = isSel ? 0.4 : 0.22;
                                const szSizeLabelFs = Math.max(9, Math.min(12, hitR / 6)) / zoom;
                                const szRadiusLabel = shape === 'ANNULUS'
                                    ? `R ${Math.round(rsz.outerRadius / 100)}m / ${Math.round(rsz.innerRadius / 100)}m`
                                    : `R ${Math.round(rsz.outerRadius / 100)}m`;
                                return (
                                    <g key={`sz-${sz.spawnZoneId}`}
                                        style={{ cursor: activeTool === 'select' ? (isSel ? 'move' : 'pointer') : 'default' }}>
                                        {shape === 'ANNULUS' ? (
                                            <path
                                                d={annulusPath(gcx, gcy, dispOuterR, dispInnerR)}
                                                fill={spColor} fillOpacity={fillOp} fillRule="evenodd"
                                                stroke={spColor} strokeWidth={(isSel ? 2 : 1) / zoom}
                                                style={{ pointerEvents: 'none' }} />
                                        ) : (
                                            <circle cx={gcx} cy={gcy} r={dispOuterR}
                                                fill={spColor} fillOpacity={fillOp}
                                                stroke={spColor} strokeWidth={(isSel ? 2 : 1) / zoom}
                                                style={{ pointerEvents: 'none' }} />
                                        )}
                                        {shape === 'ANNULUS' && dispInnerR > 0 && (
                                            <circle cx={gcx} cy={gcy} r={dispInnerR}
                                                fill="none" stroke={spColor}
                                                strokeWidth={(isSel ? 1.5 : 1) / zoom}
                                                strokeDasharray={isInnerPlaceholder ? `${3 / zoom},${3 / zoom}` : undefined}
                                                style={{ pointerEvents: 'none' }} />
                                        )}
                                        {/* hit area: ANNULUS uses evenodd donut path so inner hole doesn't capture events */}
                                        {shape === 'ANNULUS' ? (
                                            <path
                                                d={annulusPath(gcx, gcy, hitR, dispInnerR > 0 ? dispInnerR : hitR * 0.4)}
                                                fill="rgba(0,0,0,0)" fillRule="evenodd"
                                                onMouseDown={(e) => handleSpawnZoneMouseDown(e, sz)}
                                                onDoubleClick={(e) => handleSpawnZoneDoubleClick(e, sz)} />
                                        ) : (
                                            <circle cx={gcx} cy={gcy} r={hitR} fill="rgba(0,0,0,0)"
                                                onMouseDown={(e) => handleSpawnZoneMouseDown(e, sz)}
                                                onDoubleClick={(e) => handleSpawnZoneDoubleClick(e, sz)} />
                                        )}
                                        {isSel && renderCircleSpawnZoneHandles(sz, rsz)}
                                        {isSel && (
                                            <g style={{ pointerEvents: 'none' }}>
                                                <line x1={gcx - 8 / zoom} y1={gcy} x2={gcx + 8 / zoom} y2={gcy} stroke="#fff" strokeWidth={1.5 / zoom} />
                                                <line x1={gcx} y1={gcy - 8 / zoom} x2={gcx} y2={gcy + 8 / zoom} stroke="#fff" strokeWidth={1.5 / zoom} />
                                                <circle cx={gcx} cy={gcy} r={4 / zoom} fill="#fff" fillOpacity={0.9} style={{ pointerEvents: 'none' }} />
                                            </g>
                                        )}
                                        {(() => {
                                            const szLabelY = shape === 'ANNULUS'
                                                ? gcy - (dispOuterR + (hasRealInner ? worldRadiusToPx(rsz.innerRadius) : dispOuterR * 0.4)) / 2
                                                : gcy;
                                            return labelVisibility.spawnZones.has(sz.spawnZoneId) && renderLabel(gcx, szLabelY, rsz.zoneName, labelFs, szRadiusLabel, szSizeLabelFs, LAYER_COLORS.spawnZone, isSel);
                                        })()}
                                    </g>
                                );
                            }

                            const [x1, y1] = worldToGroup(rsz.minSpawnX, rsz.minSpawnY);
                            const [x2, y2] = worldToGroup(rsz.maxSpawnX, rsz.maxSpawnY);
                            const rx = Math.min(x1, x2), ry = Math.min(y1, y2), rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1);
                            const szNameFs = Math.max(11, Math.min(14, rw / 10)) / zoom;
                            const szSizeFs = Math.max(9, Math.min(12, rw / 12)) / zoom;
                            const szSizeLabel = `${Math.round(Math.abs(rsz.maxSpawnX - rsz.minSpawnX) / 100)}m × ${Math.round(Math.abs(rsz.maxSpawnY - rsz.minSpawnY) / 100)}m`;
                            return (
                                <g key={`sz-${sz.spawnZoneId}`}
                                    style={{ cursor: activeTool === 'select' ? (isSel ? 'move' : 'pointer') : 'default' }}
                                    onMouseDown={(e) => handleSpawnZoneMouseDown(e, sz)}
                                    onDoubleClick={(e) => handleSpawnZoneDoubleClick(e, sz)}>
                                    <rect x={rx} y={ry} width={rw} height={rh}
                                        fill={LAYER_COLORS.spawnZone} fillOpacity={isSel ? 0.35 : 0.18}
                                        stroke={LAYER_COLORS.spawnZone} strokeWidth={(isSel ? 2 : 1) / zoom} />
                                    {labelVisibility.spawnZones.has(sz.spawnZoneId) && renderLabel(
                                        rx + rw / 2, ry + rh / 2,
                                        rsz.zoneName, szNameFs,
                                        szSizeLabel, szSizeFs,
                                        LAYER_COLORS.spawnZone, isSel,
                                    )}
                                    {isSel && renderSpawnZoneHandles(sz, rsz)}
                                </g>
                            );
                        })}

                        {visibleLayers.has('classSpawnZone') && (data?.classSpawnZones ?? []).map((csz) => {
                            const isSel = selected?.type === 'classSpawnZone' && selected.data.id === csz.id;
                            const shape = csz.shapeType ?? 'RECT';
                            const csColor = LAYER_COLORS.classSpawnZone;

                            if (shape === 'CIRCLE' || shape === 'ANNULUS') {
                                const rcsz = resolveClassSpawnZone(csz);
                                const [gcx, gcy] = worldToGroup(rcsz.centerX, rcsz.centerY);
                                const outerRpx = worldRadiusToPx(rcsz.outerRadius);
                                const innerRpx = worldRadiusToPx(rcsz.innerRadius);
                                const hitR = Math.max(outerRpx, 16 / zoom);
                                const labelFs = Math.max(11, Math.min(14, hitR / 5)) / zoom;
                                const labelText = csz.className ?? `Class #${csz.classId}`;
                                const radiusLabel = shape === 'ANNULUS'
                                    ? `R ${Math.round(rcsz.outerRadius / 100)}m / ${Math.round(rcsz.innerRadius / 100)}m`
                                    : `R ${Math.round(rcsz.outerRadius / 100)}m`;
                                return (
                                    <g key={`csz-${csz.id}`}
                                        style={{ cursor: activeTool === 'select' ? (isSel ? 'move' : 'pointer') : 'default' }}>
                                        {shape === 'ANNULUS' ? (
                                            <path d={annulusPath(gcx, gcy, outerRpx, innerRpx > 0 ? innerRpx : outerRpx * 0.4)}
                                                fill={csColor} fillOpacity={isSel ? 0.4 : 0.22} fillRule="evenodd"
                                                stroke={csColor} strokeWidth={(isSel ? 2 : 1) / zoom}
                                                style={{ pointerEvents: 'none' }} />
                                        ) : (
                                            <circle cx={gcx} cy={gcy} r={outerRpx}
                                                fill={csColor} fillOpacity={isSel ? 0.4 : 0.22}
                                                stroke={csColor} strokeWidth={(isSel ? 2 : 1) / zoom}
                                                style={{ pointerEvents: 'none' }} />
                                        )}
                                        <circle cx={gcx} cy={gcy} r={hitR} fill="rgba(0,0,0,0)"
                                            onMouseDown={(e) => handleClassSpawnMouseDown(e, csz)}
                                            onDoubleClick={(e) => { e.stopPropagation(); handleEntityDoubleClick(e, { type: 'classSpawnZone', data: csz }); }} />
                                        {isSel && (
                                            <>
                                                <g style={{ pointerEvents: 'none' }}>
                                                    <line x1={gcx - 8 / zoom} y1={gcy} x2={gcx + 8 / zoom} y2={gcy} stroke="#fff" strokeWidth={1.5 / zoom} />
                                                    <line x1={gcx} y1={gcy - 8 / zoom} x2={gcx} y2={gcy + 8 / zoom} stroke="#fff" strokeWidth={1.5 / zoom} />
                                                    <circle cx={gcx} cy={gcy} r={4 / zoom} fill="#fff" fillOpacity={0.9} />
                                                </g>
                                                {(() => {
                                                    const hs = HANDLE_PX / zoom;
                                                    const outerOffsets = [{ dx: outerRpx, dy: 0 }, { dx: -outerRpx, dy: 0 }, { dx: 0, dy: outerRpx }, { dx: 0, dy: -outerRpx }];
                                                    const handles = outerOffsets.map((h, i) => (
                                                        <rect key={`o${i}`} x={gcx + h.dx - hs} y={gcy + h.dy - hs} width={hs * 2} height={hs * 2}
                                                            fill="#fff" stroke="#1e1e1e" strokeWidth={1 / zoom}
                                                            style={{ cursor: 'ew-resize' }}
                                                            onMouseDown={(e) => handleClassSpawnMouseDown(e, csz, undefined, 'outer')} />
                                                    ));
                                                    if (shape === 'ANNULUS' && rcsz.innerRadius > 0) {
                                                        const innerRpx2 = worldRadiusToPx(rcsz.innerRadius);
                                                        const innerOffsets = [{ dx: innerRpx2, dy: 0 }, { dx: -innerRpx2, dy: 0 }, { dx: 0, dy: innerRpx2 }, { dx: 0, dy: -innerRpx2 }];
                                                        innerOffsets.forEach((h, i) => handles.push(
                                                            <rect key={`i${i}`} x={gcx + h.dx - hs} y={gcy + h.dy - hs} width={hs * 2} height={hs * 2}
                                                                fill={csColor} stroke="#1e1e1e" strokeWidth={1 / zoom}
                                                                style={{ cursor: 'ew-resize' }}
                                                                onMouseDown={(e) => handleClassSpawnMouseDown(e, csz, undefined, 'inner')} />
                                                        ));
                                                    }
                                                    return handles;
                                                })()}
                                            </>
                                        )}
                                        {renderLabel(gcx, gcy, labelText, labelFs, radiusLabel, Math.max(6, Math.min(9, hitR / 6)) / zoom, csColor, isSel)}
                                    </g>
                                );
                            }

                            if (csz.maxX === csz.minX || csz.maxY === csz.minY) return null;
                            const rcsz = resolveClassSpawnZone(csz);
                            const [x1, y1] = worldToGroup(rcsz.minX, rcsz.minY);
                            const [x2, y2] = worldToGroup(rcsz.maxX, rcsz.maxY);
                            const rx = Math.min(x1, x2), ry = Math.min(y1, y2), rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1);
                            const nameFs = Math.max(11, Math.min(14, rw / 10)) / zoom;
                            const sizeFs = Math.max(9, Math.min(12, rw / 12)) / zoom;
                            const sizeLabel = `${Math.round(Math.abs(rcsz.maxX - rcsz.minX) / 100)}m × ${Math.round(Math.abs(rcsz.maxY - rcsz.minY) / 100)}m`;
                            const labelText = csz.className ?? `Class #${csz.classId}`;
                            return (
                                <g key={`csz-${csz.id}`}
                                    style={{ cursor: activeTool === 'select' ? (isSel ? 'move' : 'pointer') : 'default' }}
                                    onMouseDown={(e) => handleClassSpawnMouseDown(e, csz)}
                                    onDoubleClick={(e) => { e.stopPropagation(); handleEntityDoubleClick(e, { type: 'classSpawnZone', data: csz }); }}>
                                    <rect x={rx} y={ry} width={rw} height={rh}
                                        fill={csColor} fillOpacity={isSel ? 0.35 : 0.18}
                                        stroke={csColor} strokeWidth={(isSel ? 2 : 1) / zoom} />
                                    {isSel && (() => {
                                        const hx1 = rx, hx2 = rx + rw, hy1 = ry, hy2 = ry + rh, hcx = rx + rw / 2, hcy = ry + rh / 2, hs = HANDLE_PX / zoom;
                                        const HANDLES: { dir: HandleDir; x: number; y: number }[] = [
                                            { dir: 'nw', x: hx1, y: hy1 }, { dir: 'n', x: hcx, y: hy1 }, { dir: 'ne', x: hx2, y: hy1 },
                                            { dir: 'w', x: hx1, y: hcy }, { dir: 'e', x: hx2, y: hcy },
                                            { dir: 'sw', x: hx1, y: hy2 }, { dir: 's', x: hcx, y: hy2 }, { dir: 'se', x: hx2, y: hy2 },
                                        ];
                                        const CURSORS: Record<HandleDir, string> = { n: 'n-resize', s: 's-resize', e: 'e-resize', w: 'w-resize', ne: 'ne-resize', nw: 'nw-resize', se: 'se-resize', sw: 'sw-resize' };
                                        return HANDLES.map(({ dir, x, y }) => (
                                            <rect key={dir} x={x - hs} y={y - hs} width={hs * 2} height={hs * 2}
                                                fill="#fff" stroke="#1e1e1e" strokeWidth={1 / zoom}
                                                style={{ cursor: CURSORS[dir] }}
                                                onMouseDown={(e) => handleClassSpawnMouseDown(e, csz, dir)} />
                                        ));
                                    })()}
                                    {renderLabel(rx + rw / 2, ry + rh / 2, labelText, nameFs, sizeLabel, sizeFs, csColor, isSel)}
                                </g>
                            );
                        })}

                        {visibleLayers.has('npc') && (data?.npcPlacements ?? []).map((p) => {
                            const isDragging = draftEntityPos?.entityType === 'npc' && draftEntityPos.id === p.id;
                            const isRotating = draftEntityRot?.entityType === 'npc' && draftEntityRot.id === p.id;
                            const [gx, gy] = worldToGroup(isDragging ? draftEntityPos!.wx : p.x, isDragging ? draftEntityPos!.wy : p.y);
                            const r = 7 / zoom;
                            const isSel = selected?.type === 'npc' && selected.data.id === p.id;
                            const entity: SelectedEntity = { type: 'npc', data: p };
                            const rotDeg = isRotating ? draftEntityRot!.rotZ : p.rotZ;
                            const rotHandleR = r * 3.2;
                            const rotHandleX = gx + Math.sin(rotDeg * Math.PI / 180) * rotHandleR;
                            const rotHandleY = gy - Math.cos(rotDeg * Math.PI / 180) * rotHandleR;
                            return (
                                <g key={`npc-${p.id}`} style={{ cursor: activeTool === 'select' ? (isSel ? 'grab' : 'pointer') : 'default' }}
                                    onMouseDown={(e) => activeTool === 'select' && handleEntityMouseDown(e, entity)}
                                    onDoubleClick={(e) => handleEntityDoubleClick(e, entity)}
                                    onClick={(e) => e.stopPropagation()}>
                                    <circle cx={gx} cy={gy} r={r * 1.8} fill="transparent" stroke="none" />
                                    {/* Direction arrow */}
                                    <line x1={gx} y1={gy}
                                        x2={gx + Math.sin(rotDeg * Math.PI / 180) * r * 2}
                                        y2={gy - Math.cos(rotDeg * Math.PI / 180) * r * 2}
                                        stroke={LAYER_COLORS.npc} strokeWidth={1.5 / zoom} strokeLinecap="round"
                                        style={{ pointerEvents: 'none' }} />
                                    <circle cx={gx} cy={gy} r={r} fill={LAYER_COLORS.npc}
                                        stroke={isSel ? '#fff' : 'rgba(0,0,0,0.6)'} strokeWidth={(isSel ? 2 : 1) / zoom} />
                                    <text x={gx} y={gy + r + 11 / zoom} textAnchor="middle"
                                        fill="#e4e4e7" stroke="rgba(0,0,0,0.85)" strokeWidth={2.5 / zoom} paintOrder="stroke fill"
                                        fontSize={10 / zoom} style={{ pointerEvents: 'none', userSelect: 'none' }}>
                                        {p.npcName ?? `NPC #${p.npcId}`}
                                    </text>
                                    {/* Rotation handle — shown only when selected */}
                                    {isSel && (
                                        <g>
                                            <line x1={gx} y1={gy} x2={rotHandleX} y2={rotHandleY}
                                                stroke="rgba(255,255,255,0.35)" strokeWidth={1 / zoom} strokeDasharray={`${2 / zoom} ${2 / zoom}`}
                                                style={{ pointerEvents: 'none' }} />
                                            <circle cx={rotHandleX} cy={rotHandleY} r={4 / zoom}
                                                fill="#fff" fillOpacity={0.9} stroke="rgba(0,0,0,0.7)" strokeWidth={1 / zoom}
                                                style={{ cursor: 'crosshair' }}
                                                onMouseDown={(e) => {
                                                    e.stopPropagation();
                                                    hasDragMovedRef.current = false;
                                                    dragRef.current = { type: 'rotateEntity', entity, cx: gx, cy: gy };
                                                }} />
                                            {isRotating && (
                                                <text x={rotHandleX + 6 / zoom} y={rotHandleY}
                                                    dominantBaseline="middle"
                                                    fill="#fff" stroke="rgba(0,0,0,0.8)" strokeWidth={2 / zoom} paintOrder="stroke fill"
                                                    fontSize={9 / zoom} style={{ pointerEvents: 'none', userSelect: 'none' }}>
                                                    {Math.round(rotDeg)}°
                                                </text>
                                            )}
                                        </g>
                                    )}
                                </g>
                            );
                        })}

                        {visibleLayers.has('worldObject') && (data?.worldObjects ?? []).map((wo) => {
                            const isDragging = draftEntityPos?.entityType === 'worldObject' && draftEntityPos.id === wo.id;
                            const isRotating = draftEntityRot?.entityType === 'worldObject' && draftEntityRot.id === wo.id;
                            const [gx, gy] = worldToGroup(isDragging ? draftEntityPos!.wx : wo.posX, isDragging ? draftEntityPos!.wy : wo.posY);
                            const hs = 7 / zoom;
                            const isSel = selected?.type === 'worldObject' && selected.data.id === wo.id;
                            const entity: SelectedEntity = { type: 'worldObject', data: wo };
                            const rotDeg = isRotating ? draftEntityRot!.rotZ : (wo.rotZ ?? 0);
                            const rotHandleR = hs * 3.2;
                            const rotHandleX = gx + Math.sin(rotDeg * Math.PI / 180) * rotHandleR;
                            const rotHandleY = gy - Math.cos(rotDeg * Math.PI / 180) * rotHandleR;
                            return (
                                <g key={`wo-${wo.id}`} style={{ cursor: activeTool === 'select' ? (isSel ? 'grab' : 'pointer') : 'default' }}
                                    onMouseDown={(e) => activeTool === 'select' && handleEntityMouseDown(e, entity)}
                                    onDoubleClick={(e) => handleEntityDoubleClick(e, entity)}
                                    onClick={(e) => e.stopPropagation()}>
                                    <polygon points={`${gx},${gy - hs * 1.8} ${gx + hs * 1.8},${gy} ${gx},${gy + hs * 1.8} ${gx - hs * 1.8},${gy}`} fill="transparent" stroke="none" />
                                    {/* Direction arrow */}
                                    <line x1={gx} y1={gy}
                                        x2={gx + Math.sin(rotDeg * Math.PI / 180) * hs * 2}
                                        y2={gy - Math.cos(rotDeg * Math.PI / 180) * hs * 2}
                                        stroke={LAYER_COLORS.worldObject} strokeWidth={1.5 / zoom} strokeLinecap="round"
                                        style={{ pointerEvents: 'none' }} />
                                    <polygon points={`${gx},${gy - hs} ${gx + hs},${gy} ${gx},${gy + hs} ${gx - hs},${gy}`}
                                        fill={LAYER_COLORS.worldObject} stroke={isSel ? '#fff' : 'rgba(0,0,0,0.6)'} strokeWidth={(isSel ? 2 : 1) / zoom} />
                                    <text x={gx} y={gy + hs + 11 / zoom} textAnchor="middle"
                                        fill="#e4e4e7" stroke="rgba(0,0,0,0.85)" strokeWidth={2.5 / zoom} paintOrder="stroke fill"
                                        fontSize={10 / zoom} style={{ pointerEvents: 'none', userSelect: 'none' }}>{wo.nameKey}</text>
                                    {isSel && (
                                        <g>
                                            <line x1={gx} y1={gy} x2={rotHandleX} y2={rotHandleY}
                                                stroke="rgba(255,255,255,0.35)" strokeWidth={1 / zoom} strokeDasharray={`${2 / zoom} ${2 / zoom}`}
                                                style={{ pointerEvents: 'none' }} />
                                            <circle cx={rotHandleX} cy={rotHandleY} r={4 / zoom}
                                                fill="#fff" fillOpacity={0.9} stroke="rgba(0,0,0,0.7)" strokeWidth={1 / zoom}
                                                style={{ cursor: 'crosshair' }}
                                                onMouseDown={(e) => {
                                                    e.stopPropagation();
                                                    hasDragMovedRef.current = false;
                                                    dragRef.current = { type: 'rotateEntity', entity, cx: gx, cy: gy };
                                                }} />
                                            {isRotating && (
                                                <text x={rotHandleX + 6 / zoom} y={rotHandleY}
                                                    dominantBaseline="middle"
                                                    fill="#fff" stroke="rgba(0,0,0,0.8)" strokeWidth={2 / zoom} paintOrder="stroke fill"
                                                    fontSize={9 / zoom} style={{ pointerEvents: 'none', userSelect: 'none' }}>
                                                    {Math.round(rotDeg)}°
                                                </text>
                                            )}
                                        </g>
                                    )}
                                </g>
                            );
                        })}

                        {visibleLayers.has('respawn') && (data?.respawnZones ?? []).slice().sort((a, b) => {
                            const aIsSel = selected?.type === 'respawn' && selected.data.id === a.id;
                            const bIsSel = selected?.type === 'respawn' && selected.data.id === b.id;
                            if (aIsSel) return 1; if (bIsSel) return -1;
                            const sa = a.shapeType !== 'RECT' ? a.outerRadius ** 2 : (a.maxX - a.minX) * (a.maxY - a.minY);
                            const sb = b.shapeType !== 'RECT' ? b.outerRadius ** 2 : (b.maxX - b.minX) * (b.maxY - b.minY);
                            return sb - sa;
                        }).map((rz) => {
                            const isSel = selected?.type === 'respawn' && selected.data.id === rz.id;
                            const shape = rz.shapeType ?? 'RECT';
                            const rpColor = LAYER_COLORS.respawn;

                            if (shape === 'CIRCLE' || shape === 'ANNULUS') {
                                const rrz = resolveRespawnZone(rz);
                                const [gcx, gcy] = worldToGroup(rrz.centerX, rrz.centerY);
                                const outerRpx = worldRadiusToPx(rrz.outerRadius);
                                const innerRpx = worldRadiusToPx(rrz.innerRadius);
                                const hitR = Math.max(outerRpx, 16 / zoom);
                                const labelFs = Math.max(11, Math.min(14, hitR / 5)) / zoom;
                                const lbl = rz.name + (rz.isDefault ? ' ★' : '');
                                const radiusLabel = shape === 'ANNULUS'
                                    ? `R ${Math.round(rrz.outerRadius / 100)}m / ${Math.round(rrz.innerRadius / 100)}m`
                                    : `R ${Math.round(rrz.outerRadius / 100)}m`;
                                return (
                                    <g key={`rz-${rz.id}`} style={{ cursor: activeTool === 'select' ? (isSel ? 'move' : 'pointer') : 'default' }}>
                                        {shape === 'ANNULUS' ? (
                                            <path d={annulusPath(gcx, gcy, outerRpx, innerRpx > 0 ? innerRpx : outerRpx * 0.4)}
                                                fill={rpColor} fillOpacity={isSel ? 0.4 : 0.22} fillRule="evenodd"
                                                stroke={rpColor} strokeWidth={(isSel ? 2 : 1) / zoom} style={{ pointerEvents: 'none' }} />
                                        ) : (
                                            <circle cx={gcx} cy={gcy} r={outerRpx}
                                                fill={rpColor} fillOpacity={isSel ? 0.4 : 0.22}
                                                stroke={rpColor} strokeWidth={(isSel ? 2 : 1) / zoom} style={{ pointerEvents: 'none' }} />
                                        )}
                                        <circle cx={gcx} cy={gcy} r={hitR} fill="rgba(0,0,0,0)"
                                            onMouseDown={(e) => handleRespawnMouseDown(e, rz)}
                                            onDoubleClick={(e) => { e.stopPropagation(); handleEntityDoubleClick(e, { type: 'respawn', data: rz }); }} />
                                        {isSel && (
                                            <>
                                                <g style={{ pointerEvents: 'none' }}>
                                                    <line x1={gcx - 8 / zoom} y1={gcy} x2={gcx + 8 / zoom} y2={gcy} stroke="#fff" strokeWidth={1.5 / zoom} />
                                                    <line x1={gcx} y1={gcy - 8 / zoom} x2={gcx} y2={gcy + 8 / zoom} stroke="#fff" strokeWidth={1.5 / zoom} />
                                                    <circle cx={gcx} cy={gcy} r={4 / zoom} fill="#fff" fillOpacity={0.9} />
                                                </g>
                                                {(() => {
                                                    const hs = HANDLE_PX / zoom;
                                                    const outerOffsets = [{ dx: outerRpx, dy: 0 }, { dx: -outerRpx, dy: 0 }, { dx: 0, dy: outerRpx }, { dx: 0, dy: -outerRpx }];
                                                    const handles = outerOffsets.map((h, i) => (
                                                        <rect key={`ro${i}`} x={gcx + h.dx - hs} y={gcy + h.dy - hs} width={hs * 2} height={hs * 2}
                                                            fill="#fff" stroke="#1e1e1e" strokeWidth={1 / zoom}
                                                            style={{ cursor: 'ew-resize' }}
                                                            onMouseDown={(e) => handleRespawnMouseDown(e, rz, undefined, 'outer')} />
                                                    ));
                                                    if (shape === 'ANNULUS' && rrz.innerRadius > 0) {
                                                        const innerRpx2 = worldRadiusToPx(rrz.innerRadius);
                                                        const innerOffsets = [{ dx: innerRpx2, dy: 0 }, { dx: -innerRpx2, dy: 0 }, { dx: 0, dy: innerRpx2 }, { dx: 0, dy: -innerRpx2 }];
                                                        innerOffsets.forEach((h, i) => handles.push(
                                                            <rect key={`ri${i}`} x={gcx + h.dx - hs} y={gcy + h.dy - hs} width={hs * 2} height={hs * 2}
                                                                fill={rpColor} stroke="#1e1e1e" strokeWidth={1 / zoom}
                                                                style={{ cursor: 'ew-resize' }}
                                                                onMouseDown={(e) => handleRespawnMouseDown(e, rz, undefined, 'inner')} />
                                                        ));
                                                    }
                                                    return handles;
                                                })()}
                                            </>
                                        )}
                                        {renderLabel(gcx, gcy, lbl, labelFs, radiusLabel, Math.max(6, Math.min(9, hitR / 6)) / zoom, rpColor, isSel)}
                                    </g>
                                );
                            }

                            if (rz.maxX === rz.minX || rz.maxY === rz.minY) {
                                // Show as point if no shape bounds
                                const [gx, gy] = worldToGroup(rz.x, rz.y);
                                const arm = 8 / zoom;
                                return (
                                    <g key={`rz-${rz.id}`} style={{ cursor: activeTool === 'select' ? (isSel ? 'grab' : 'pointer') : 'default' }}
                                        onMouseDown={(e) => { e.stopPropagation(); setSelected({ type: 'respawn', data: rz }); }}
                                        onDoubleClick={(e) => { e.stopPropagation(); handleEntityDoubleClick(e, { type: 'respawn', data: rz }); }}>
                                        <line x1={gx - arm} y1={gy} x2={gx + arm} y2={gy} stroke={rpColor} strokeWidth={2 / zoom} />
                                        <line x1={gx} y1={gy - arm} x2={gx} y2={gy + arm} stroke={rpColor} strokeWidth={2 / zoom} />
                                        <circle cx={gx} cy={gy} r={arm * 0.6} fill="none" stroke={isSel ? '#fff' : rpColor} strokeWidth={(isSel ? 2 : 1.5) / zoom} />
                                        <text x={gx} y={gy + arm + 11 / zoom} textAnchor="middle" fill="#e4e4e7" stroke="rgba(0,0,0,0.85)" strokeWidth={2.5 / zoom} paintOrder="stroke fill" fontSize={10 / zoom} style={{ pointerEvents: 'none', userSelect: 'none' }}>{rz.name}{rz.isDefault ? ' ★' : ''}</text>
                                    </g>
                                );
                            }

                            const rrz = resolveRespawnZone(rz);
                            const [x1, y1] = worldToGroup(rrz.minX, rrz.minY);
                            const [x2, y2] = worldToGroup(rrz.maxX, rrz.maxY);
                            const rx = Math.min(x1, x2), ry = Math.min(y1, y2), rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1);
                            const nameFs = Math.max(11, Math.min(14, rw / 10)) / zoom;
                            const sizeFs = Math.max(9, Math.min(12, rw / 12)) / zoom;
                            const sizeLabel = `${Math.round(Math.abs(rrz.maxX - rrz.minX) / 100)}m × ${Math.round(Math.abs(rrz.maxY - rrz.minY) / 100)}m`;
                            const lbl = rz.name + (rz.isDefault ? ' ★' : '');
                            return (
                                <g key={`rz-${rz.id}`} style={{ cursor: activeTool === 'select' ? (isSel ? 'move' : 'pointer') : 'default' }}
                                    onMouseDown={(e) => handleRespawnMouseDown(e, rz)}
                                    onDoubleClick={(e) => { e.stopPropagation(); handleEntityDoubleClick(e, { type: 'respawn', data: rz }); }}>
                                    <rect x={rx} y={ry} width={rw} height={rh}
                                        fill={rpColor} fillOpacity={isSel ? 0.35 : 0.18}
                                        stroke={rpColor} strokeWidth={(isSel ? 2 : 1) / zoom} />
                                    {isSel && (() => {
                                        const hx1 = rx, hx2 = rx + rw, hy1 = ry, hy2 = ry + rh, hcx = rx + rw / 2, hcy = ry + rh / 2, hs = HANDLE_PX / zoom;
                                        const HANDLES: { dir: HandleDir; x: number; y: number }[] = [
                                            { dir: 'nw', x: hx1, y: hy1 }, { dir: 'n', x: hcx, y: hy1 }, { dir: 'ne', x: hx2, y: hy1 },
                                            { dir: 'w', x: hx1, y: hcy }, { dir: 'e', x: hx2, y: hcy },
                                            { dir: 'sw', x: hx1, y: hy2 }, { dir: 's', x: hcx, y: hy2 }, { dir: 'se', x: hx2, y: hy2 },
                                        ];
                                        const CURSORS: Record<HandleDir, string> = { n: 'n-resize', s: 's-resize', e: 'e-resize', w: 'w-resize', ne: 'ne-resize', nw: 'nw-resize', se: 'se-resize', sw: 'sw-resize' };
                                        return HANDLES.map(({ dir, x, y }) => (
                                            <rect key={dir} x={x - hs} y={y - hs} width={hs * 2} height={hs * 2}
                                                fill="#fff" stroke="#1e1e1e" strokeWidth={1 / zoom}
                                                style={{ cursor: CURSORS[dir] }}
                                                onMouseDown={(e) => handleRespawnMouseDown(e, rz, dir)} />
                                        ));
                                    })()}
                                    {renderLabel(rx + rw / 2, ry + rh / 2, lbl, nameFs, sizeLabel, sizeFs, rpColor, isSel)}
                                </g>
                            );
                        })}

                        {visibleLayers.has('mob') && (data?.mobPositions ?? []).map((mp) => {
                            const isDragging = draftEntityPos?.entityType === 'mob' && draftEntityPos.id === mp.id;
                            const isRotating = draftEntityRot?.entityType === 'mob' && draftEntityRot.id === mp.id;
                            const [gx, gy] = worldToGroup(isDragging ? draftEntityPos!.wx : mp.x, isDragging ? draftEntityPos!.wy : mp.y);
                            const hs = 7 / zoom;
                            const isSel = selected?.type === 'mob' && selected.data.id === mp.id;
                            const entity: SelectedEntity = { type: 'mob', data: mp };
                            const rotDeg = isRotating ? draftEntityRot!.rotZ : mp.rotZ;
                            const rotHandleR = hs * 3.2;
                            const rotHandleX = gx + Math.sin(rotDeg * Math.PI / 180) * rotHandleR;
                            const rotHandleY = gy - Math.cos(rotDeg * Math.PI / 180) * rotHandleR;
                            return (
                                <g key={`mob-${mp.id}`} style={{ cursor: activeTool === 'select' ? (isSel ? 'grab' : 'pointer') : 'default' }}
                                    onMouseDown={(e) => activeTool === 'select' && handleEntityMouseDown(e, entity)}
                                    onDoubleClick={(e) => handleEntityDoubleClick(e, entity)}
                                    onClick={(e) => e.stopPropagation()}>
                                    <polygon points={`${gx - hs * 1.8},${gy - hs * 1.8} ${gx + hs * 1.8},${gy - hs * 1.8} ${gx},${gy + hs * 1.8}`} fill="transparent" stroke="none" />
                                    {/* Direction arrow */}
                                    <line x1={gx} y1={gy}
                                        x2={gx + Math.sin(rotDeg * Math.PI / 180) * hs * 2}
                                        y2={gy - Math.cos(rotDeg * Math.PI / 180) * hs * 2}
                                        stroke={LAYER_COLORS.mob} strokeWidth={1.5 / zoom} strokeLinecap="round"
                                        style={{ pointerEvents: 'none' }} />
                                    <polygon points={`${gx - hs},${gy - hs} ${gx + hs},${gy - hs} ${gx},${gy + hs}`}
                                        fill={LAYER_COLORS.mob} stroke={isSel ? '#fff' : 'rgba(0,0,0,0.6)'} strokeWidth={(isSel ? 2 : 1) / zoom} />
                                    <text x={gx} y={gy + hs + 11 / zoom} textAnchor="middle"
                                        fill="#e4e4e7" stroke="rgba(0,0,0,0.85)" strokeWidth={2.5 / zoom} paintOrder="stroke fill"
                                        fontSize={10 / zoom} style={{ pointerEvents: 'none', userSelect: 'none' }}>
                                        {mp.mobName ?? `Mob #${mp.mobId}`}
                                    </text>
                                    {isSel && (
                                        <g>
                                            <line x1={gx} y1={gy} x2={rotHandleX} y2={rotHandleY}
                                                stroke="rgba(255,255,255,0.35)" strokeWidth={1 / zoom} strokeDasharray={`${2 / zoom} ${2 / zoom}`}
                                                style={{ pointerEvents: 'none' }} />
                                            <circle cx={rotHandleX} cy={rotHandleY} r={4 / zoom}
                                                fill="#fff" fillOpacity={0.9} stroke="rgba(0,0,0,0.7)" strokeWidth={1 / zoom}
                                                style={{ cursor: 'crosshair' }}
                                                onMouseDown={(e) => {
                                                    e.stopPropagation();
                                                    hasDragMovedRef.current = false;
                                                    dragRef.current = { type: 'rotateEntity', entity, cx: gx, cy: gy };
                                                }} />
                                            {isRotating && (
                                                <text x={rotHandleX + 6 / zoom} y={rotHandleY}
                                                    dominantBaseline="middle"
                                                    fill="#fff" stroke="rgba(0,0,0,0.8)" strokeWidth={2 / zoom} paintOrder="stroke fill"
                                                    fontSize={9 / zoom} style={{ pointerEvents: 'none', userSelect: 'none' }}>
                                                    {Math.round(rotDeg)}°
                                                </text>
                                            )}
                                        </g>
                                    )}
                                </g>
                            );
                        })}
                        {/* Draw-rect preview */}
                        {drawRect && (activeTool === 'addZone' || activeTool === 'addSpawnZone' || activeTool === 'addClassSpawnZone') && (() => {
                            const color = activeTool === 'addZone' ? LAYER_COLORS.zones : activeTool === 'addClassSpawnZone' ? LAYER_COLORS.classSpawnZone : LAYER_COLORS.spawnZone;
                            const [gx1, gy1] = worldToGroup(drawRect.startWorld[0], drawRect.startWorld[1]);
                            const [gx2, gy2] = worldToGroup(drawRect.endWorld[0], drawRect.endWorld[1]);
                            const rx = Math.min(gx1, gx2), ry = Math.min(gy1, gy2);
                            const rw = Math.abs(gx2 - gx1), rh = Math.abs(gy2 - gy1);
                            const wM = Math.round(Math.abs(drawRect.endWorld[0] - drawRect.startWorld[0]) / 100);
                            const hM = Math.round(Math.abs(drawRect.endWorld[1] - drawRect.startWorld[1]) / 100);
                            const sizeLabel = `${wM}m × ${hM}m`;
                            return (
                                <g style={{ pointerEvents: 'none' }}>
                                    <rect
                                        x={rx} y={ry} width={rw} height={rh}
                                        fill={color} fillOpacity={0.15}
                                        stroke={color} strokeWidth={1.5 / zoom}
                                        strokeDasharray={`${5 / zoom} ${5 / zoom}`}
                                    />
                                    {rw > 20 / zoom && rh > 12 / zoom && (
                                        <text
                                            x={rx + rw / 2} y={ry + rh / 2}
                                            textAnchor="middle" dominantBaseline="middle"
                                            fill={color} stroke="rgba(0,0,0,0.85)" strokeWidth={2.5 / zoom} paintOrder="stroke fill"
                                            fontSize={11 / zoom} fontFamily="monospace"
                                        >
                                            {sizeLabel}
                                        </text>
                                    )}
                                </g>
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
                    <div className="absolute right-0 top-0 h-full z-10">
                        <EntityDetailPanel
                            key={`${selected.type}-${selected.type === 'spawnZone' ? selected.data.spawnZoneId : selected.data.id}`}
                            selected={selected}
                            onClose={() => setSelected(null)}
                            onDelete={handleEntityDelete}
                            onSavePosition={handleEntitySavePosition}
                            onUpdateZone={handleZoneMetaUpdate}
                            onRefetch={refetch}
                        />
                    </div>
                )}

                {searchOpen && (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 w-80 bg-background border border-border rounded-lg shadow-xl overflow-hidden">
                        <Input
                            autoFocus
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Поиск зон, NPC, мобов… (Esc — закрыть)"
                            className="border-0 rounded-none focus-visible:ring-0"
                        />
                        {searchResults.length > 0 && (
                            <div className="max-h-64 overflow-y-auto border-t border-border">
                                {searchResults.map((r, i) => (
                                    <button key={i} className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                                        onClick={() => {
                                            panToWorld(r.wx, r.wy);
                                            setSelected(r.entity);
                                            setSearchOpen(false);
                                            setSearchQuery('');
                                        }}>
                                        <span
                                            className="inline-block h-2 w-2 rounded-full shrink-0"
                                            style={{ background: LAYER_COLORS[r.entity.type === 'zone' ? 'zones' : r.entity.type as EntityLayer] }}
                                        />
                                        <span className="font-medium truncate flex-1">{r.label}</span>
                                        <span className="text-muted-foreground text-xs shrink-0">{r.sub}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        {searchQuery.trim() && searchResults.length === 0 && (
                            <div className="px-3 py-2 text-xs text-muted-foreground border-t border-border">{tm('noResults')}</div>
                        )}
                    </div>
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
