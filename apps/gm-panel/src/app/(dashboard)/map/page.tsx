'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  MapPin, Upload, Wifi, WifiOff, RefreshCw, Settings,
  X, Loader2, RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

// ─── Types ────────────────────────────────────────────────────────────────────

type PlayerPos = {
  id: number;
  name: string;
  level: number;
  isOnline: boolean | null;
  posX: string | null;
  posY: string | null;
  posZ: string | null;
  zoneId: number | null;
  rotZ: number | null;
  className: string | null;
  ownerLogin: string | null;
};

type MapConfig = {
  imageUrl: string;
  worldMinX: number;
  worldMaxX: number;
  worldMinY: number;
  worldMaxY: number;
  unitsPerPixel: number;
  imageXAxis: string;
  imageYAxis: string;
};

const DEFAULT_CONFIG: MapConfig = {
  imageUrl: '',
  worldMinX: -42210,
  worldMaxX: 41610,
  worldMinY: -41910,
  worldMaxY: 41910,
  unitsPerPixel: 20.4638671875,
  imageXAxis: '+Y',
  imageYAxis: '-X',
};

const REFRESH_OPTIONS = [
  { value: '5', label: '5 сек' },
  { value: '10', label: '10 сек' },
  { value: '30', label: '30 сек' },
  { value: '60', label: '1 мин' },
];

// ─── Coordinate transform ─────────────────────────────────────────────────────

function worldToSvg(
  wx: number, wy: number,
  cfg: MapConfig,
  imgW: number, imgH: number,
): { sx: number; sy: number } | null {
  const tw = cfg.worldMaxX - cfg.worldMinX;
  const th = cfg.worldMaxY - cfg.worldMinY;
  if (tw <= 0 || th <= 0 || imgW <= 0 || imgH <= 0) return null;

  const nx = (wx - cfg.worldMinX) / tw;
  const ny = (wy - cfg.worldMinY) / th;

  let sx: number, sy: number;
  if (cfg.imageXAxis === '+Y') sx = ny * imgW;
  else if (cfg.imageXAxis === '-Y') sx = (1 - ny) * imgW;
  else sx = nx * imgW;

  if (cfg.imageYAxis === '-X') sy = (1 - nx) * imgH;
  else if (cfg.imageYAxis === '+X') sy = nx * imgH;
  else sy = ny * imgH;

  return { sx, sy };
}

function svgToWorld(
  sx: number, sy: number,
  cfg: MapConfig,
  imgW: number, imgH: number,
): { wx: number; wy: number } | null {
  const tw = cfg.worldMaxX - cfg.worldMinX;
  const th = cfg.worldMaxY - cfg.worldMinY;
  if (tw <= 0 || th <= 0 || imgW <= 0 || imgH <= 0) return null;

  let nx: number, ny: number;
  if (cfg.imageXAxis === '+Y') ny = sx / imgW;
  else if (cfg.imageXAxis === '-Y') ny = 1 - sx / imgW;
  else nx = sx / imgW;

  if (cfg.imageYAxis === '-X') nx = 1 - sy / imgH;
  else if (cfg.imageYAxis === '+X') nx = sy / imgH;
  else ny = sy / imgH;

  return {
    wx: cfg.worldMinX + nx! * tw,
    wy: cfg.worldMinY + ny! * th,
  };
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MapPage() {
  const [config, setConfig] = useState<MapConfig>(DEFAULT_CONFIG);
  const [configLoading, setConfigLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'online' | 'offline'>('online');
  const [intervalSec, setIntervalSec] = useState(30);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerPos | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [mapClickPos, setMapClickPos] = useState<{ x: number; y: number } | null>(null);
  const [tpCharName, setTpCharName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const mouseDownPos = useRef({ x: 0, y: 0 });

  // Natural image dimensions (populated by programmatic Image() onLoad)
  const [imgNaturalW, setImgNaturalW] = useState(0);
  const [imgNaturalH, setImgNaturalH] = useState(0);
  const [imgError, setImgError] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);

  const { data: positions, isLoading: posLoading, isError: posError, error: posErrorObj, refetch } = trpc.characters.positions.useQuery(
    { filter },
    { refetchInterval: intervalSec * 1000 },
  );

  useEffect(() => {
    if (posError) {
      toast.error(`Ошибка загрузки позиций: ${(posErrorObj as any)?.message ?? 'неизвестная ошибка'}`);
    }
  }, [posError, posErrorObj]);

  const teleportCoords = trpc.characters.teleportToCoords.useMutation({
    onSuccess: () => { toast.success('Телепортирован'); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const teleportPlayer = trpc.characters.teleportToPlayer.useMutation({
    onSuccess: (data) => { toast.success(`Телепортирован к ${data.targetName}`); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  // ── Load config from server ──
  useEffect(() => {
    fetch('/api/map-config')
      .then(res => res.json())
      .then(data => { setConfig({ ...DEFAULT_CONFIG, ...data }); })
      .catch(() => {})
      .finally(() => setConfigLoading(false));
  }, []);

  const saveConfig = useCallback(async (c: MapConfig) => {
    setConfig(c);
    try {
      await fetch('/api/map-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(c),
      });
    } catch {}
  }, []);

  // ── Image upload ──
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload-map', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error ?? 'Upload failed');
      setImgNaturalW(0);
      setImgNaturalH(0);
      await saveConfig({ ...config, imageUrl: json.url });
      toast.success('Карта загружена');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // ── Load image dimensions via programmatic Image() (not hidden DOM img) ──
  useEffect(() => {
    if (!config.imageUrl) {
      setImgNaturalW(0);
      setImgNaturalH(0);
      setImgError(false);
      return;
    }
    setImgNaturalW(0);
    setImgNaturalH(0);
    setImgError(false);
    const img = new Image();
    img.onload = () => {
      setImgNaturalW(img.naturalWidth);
      setImgNaturalH(img.naturalHeight);
      setImgError(false);
    };
    img.onerror = () => {
      setImgError(true);
      toast.error('Не удалось загрузить изображение карты');
    };
    img.src = config.imageUrl;
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [config.imageUrl]);

  // ── Players ──
  const players = useMemo(() => {
    if (!positions) return [] as PlayerPos[];
    return (positions as PlayerPos[]).filter(p => p.posX != null && p.posY != null);
  }, [positions]);

  const onlineCount = players.filter(p => p.isOnline).length;
  const offlineCount = players.filter(p => !p.isOnline).length;

  const sourceChar = useMemo(() => {
    if (!tpCharName || !positions) return null;
    return (positions as PlayerPos[]).find(
      p => p.name.toLowerCase() === tpCharName.toLowerCase(),
    ) ?? null;
  }, [tpCharName, positions]);

  const hasImage = !!config.imageUrl;
  const imgReady = imgNaturalW > 0 && imgNaturalH > 0;
  const svgW = imgReady ? imgNaturalW : 800;
  const svgH = imgReady ? imgNaturalH : 600;

  // ── Viewport → SVG coords with zoom/pan ──
  const clientToSvg = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const vb = svgRef.current.viewBox.baseVal;
    const vx = (clientX - rect.left) * (vb.width / rect.width);
    const vy = (clientY - rect.top) * (vb.height / rect.height);
    return {
      sx: (vx - panX) / zoom,
      sy: (vy - panY) / zoom,
    };
  }, [zoom, panX, panY]);

  // ── SVG click → world coords (single click, no drag) ──
  const handleSvgMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    isPanning.current = true;
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isPanning.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setPanX(p => p + dx);
    setPanY(p => p + dy);
  };

  const handleSvgMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isPanning.current) return;
    isPanning.current = false;
    const totalDx = Math.abs(e.clientX - mouseDownPos.current.x);
    const totalDy = Math.abs(e.clientY - mouseDownPos.current.y);
    if (totalDx < 3 && totalDy < 3 && imgReady) {
      const pos = clientToSvg(e.clientX, e.clientY);
      if (!pos) return;
      const world = svgToWorld(pos.sx, pos.sy, config, svgW, svgH);
      if (world) {
        setMapClickPos({ x: world.wx, y: world.wy });
        setSelectedPlayer(null);
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    if (!svgRef.current || !imgReady) return;
    const rect = svgRef.current.getBoundingClientRect();
    const vb = svgRef.current.viewBox.baseVal;
    const vx = (e.clientX - rect.left) * (vb.width / rect.width);
    const vy = (e.clientY - rect.top) * (vb.height / rect.height);

    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const newZoom = Math.min(10, Math.max(0.1, zoom * factor));

    setPanX(vx - (vx - panX) * (newZoom / zoom));
    setPanY(vy - (vy - panY) * (newZoom / zoom));
    setZoom(newZoom);
  };

  const resetView = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  if (configLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Карта мира</h1>
          <p className="text-sm text-muted-foreground">
            Позиции игроков · онлайн {onlineCount} · оффлайн {offlineCount}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все игроки</SelectItem>
              <SelectItem value="online">Онлайн</SelectItem>
              <SelectItem value="offline">Оффлайн</SelectItem>
            </SelectContent>
          </Select>

          <Select value={String(intervalSec)} onValueChange={(v) => setIntervalSec(Number(v))}>
            <SelectTrigger className="h-8 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REFRESH_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5" />Обновить
          </Button>

          <label>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden" onChange={handleImageUpload} />
            <Button size="sm" variant="outline" className="h-8 gap-1.5" disabled={isUploading} asChild>
              <span>
                {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                Загрузить карту
              </span>
            </Button>
          </label>

          <label>
            <input type="file" accept=".json,application/json"
              className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const text = await file.text();
                  const parsed = JSON.parse(text);
                  await saveConfig({ ...config, ...parsed });
                  toast.success('Конфиг загружен');
                } catch {
                  toast.error('Неверный JSON-файл');
                }
                e.target.value = '';
              }} />
            <Button size="sm" variant="outline" className="h-8 gap-1.5" asChild>
              <span>
                <Upload className="h-3.5 w-3.5" />
                Загрузить конфиг
              </span>
            </Button>
          </label>

          <Badge variant="secondary" className="text-xs font-mono" title="Масштаб">
            {Math.round(zoom * 100)}%
          </Badge>

          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={resetView} title="Сбросить вид">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>

          <Button size="sm" variant="ghost" className="h-8 gap-1.5"
            onClick={() => setShowConfig(!showConfig)}>
            <Settings className="h-3.5 w-3.5" />
            {showConfig ? 'Скрыть' : 'Настройки'}
          </Button>
        </div>
      </div>

      {/* Config panel */}
      {showConfig && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Min X</Label>
                <Input type="number" className="h-7 text-xs" value={config.worldMinX}
                  onChange={e => saveConfig({ ...config, worldMinX: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Max X</Label>
                <Input type="number" className="h-7 text-xs" value={config.worldMaxX}
                  onChange={e => saveConfig({ ...config, worldMaxX: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Min Y</Label>
                <Input type="number" className="h-7 text-xs" value={config.worldMinY}
                  onChange={e => saveConfig({ ...config, worldMinY: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Max Y</Label>
                <Input type="number" className="h-7 text-xs" value={config.worldMaxY}
                  onChange={e => saveConfig({ ...config, worldMaxY: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ед./пикс.</Label>
                <Input type="number" className="h-7 text-xs" value={config.unitsPerPixel}
                  onChange={e => saveConfig({ ...config, unitsPerPixel: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ось X изобр.</Label>
                <Select value={config.imageXAxis} onValueChange={v => saveConfig({ ...config, imageXAxis: v })}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="+X">+X</SelectItem>
                    <SelectItem value="-X">-X</SelectItem>
                    <SelectItem value="+Y">+Y</SelectItem>
                    <SelectItem value="-Y">-Y</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ось Y изобр.</Label>
                <Select value={config.imageYAxis} onValueChange={v => saveConfig({ ...config, imageYAxis: v })}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="+X">+X</SelectItem>
                    <SelectItem value="-X">-X</SelectItem>
                    <SelectItem value="+Y">+Y</SelectItem>
                    <SelectItem value="-Y">-Y</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">URL карты</Label>
                <Input className="h-7 text-xs" value={config.imageUrl}
                  onChange={e => saveConfig({ ...config, imageUrl: e.target.value })}
                  placeholder="/uploads/map/..." />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Map container */}
      <div className="relative border rounded-lg overflow-hidden bg-muted/30 flex-1">
        {(hasImage && !imgReady && !imgError)
          ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : null}

        {!hasImage && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background/80 text-xs text-muted-foreground shadow-sm">
              <MapPin className="h-3 w-3" />
              Загрузите изображение карты
            </div>
          </div>
        )}

        {hasImage && imgError && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-destructive/10 text-xs text-destructive shadow-sm">
              <X className="h-3 w-3" />
              Изображение карты не загружено
            </div>
          </div>
        )}

        {posLoading && positions == null && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="w-full block cursor-grab active:cursor-grabbing select-none"
          style={{ aspectRatio: `${svgW} / ${svgH}` }}
          onMouseDown={handleSvgMouseDown}
          onMouseMove={handleSvgMouseMove}
          onMouseUp={handleSvgMouseUp}
          onMouseLeave={() => { isPanning.current = false; }}
          onWheel={handleWheel}
          preserveAspectRatio="xMidYMid meet"
        >
          <g transform={`translate(${panX},${panY}) scale(${zoom})`}>
            <rect width={svgW} height={svgH} fill="#1e293b" />

            {hasImage && imgReady && (
              <image
                href={config.imageUrl}
                width={svgW}
                height={svgH}
                preserveAspectRatio="none"
                style={{ pointerEvents: 'none' }}
              />
            )}

            {players.map((p) => {
              const pos = worldToSvg(Number(p.posX), Number(p.posY), config, svgW, svgH);
              if (!pos) return null;
              const isOnline = !!p.isOnline;
              const r = Math.max(4, svgW / 400);
              const selected = selectedPlayer?.id === p.id;
              return (
                <g key={p.id} cursor="pointer"
                  onClick={(e) => { e.stopPropagation(); setSelectedPlayer(p); setMapClickPos(null); }}>
                  <circle cx={pos.sx} cy={pos.sy} r={r}
                    fill={isOnline ? '#10b981' : '#6b7280'}
                    stroke="#fff" strokeWidth={r * 0.3}
                    opacity={isOnline ? 0.9 : 0.6} />
                  {isOnline && (
                    <circle cx={pos.sx} cy={pos.sy} r={r * 1.8}
                      fill="none" stroke="#10b981" strokeWidth={r * 0.2} opacity={0.3}>
                      <animate attributeName="r" from={r * 1.8} to={r * 3} dur="1.5s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.3" to="0" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                  )}
                  {selected && (
                    <circle cx={pos.sx} cy={pos.sy} r={r * 2.2}
                      fill="none" stroke="#fbbf24" strokeWidth={r * 0.35}>
                      <animate attributeName="opacity" from="1" to="0.5" dur="0.8s" repeatCount="indefinite" />
                    </circle>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Zoom slider */}
        <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1.5 bg-background/80 rounded-md px-2 py-1 shadow-sm">
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5"
            onClick={() => { setZoom(z => Math.min(10, z + 0.1)); setPanX(0); setPanY(0); }}
            title="Приблизить"
          >+</Button>
          <input
            type="range"
            min={10}
            max={1000}
            value={Math.round(zoom * 100)}
            onChange={e => { const v = Number(e.target.value) / 100; setZoom(v); setPanX(0); setPanY(0); }}
            className="w-20 h-1 accent-primary cursor-pointer"
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5"
            onClick={() => { setZoom(z => Math.max(0.1, z - 0.1)); setPanX(0); setPanY(0); }}
            title="Отдалить"
          >−</Button>
        </div>

        {/* Player popover */}
        {selectedPlayer && (
          <div className="absolute bottom-4 left-4 z-10 w-72">
            <Card className="shadow-lg">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{selectedPlayer.name}</span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="text-xs">Lv {selectedPlayer.level}</Badge>
                    {selectedPlayer.isOnline
                      ? <Badge className="text-xs bg-emerald-500/10 text-emerald-500 border-emerald-500/20"><Wifi className="h-2.5 w-2.5 mr-0.5" />Онлайн</Badge>
                      : <Badge variant="outline" className="text-xs"><WifiOff className="h-2.5 w-2.5 mr-0.5" />Оффлайн</Badge>}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedPlayer.className ?? '—'} · {selectedPlayer.ownerLogin ?? '—'}
                </p>
                <p className="font-mono text-[10px] text-muted-foreground">
                  X: {Number(selectedPlayer.posX).toFixed(1)} Y: {Number(selectedPlayer.posY).toFixed(1)} Z: {Number(selectedPlayer.posZ).toFixed(1)}
                </p>
                <div className="space-y-1.5">
                  <Label className="text-xs">Телепортировать персонажа</Label>
                  <Input className="h-7 text-xs" placeholder="Ник персонажа"
                    value={tpCharName} onChange={e => setTpCharName(e.target.value)} />
                  {tpCharName && sourceChar && (
                    <p className="text-[10px] text-muted-foreground">
                      Найден: {sourceChar.name} (Lv {sourceChar.level})
                    </p>
                  )}
                  {tpCharName && !sourceChar && (
                    <p className="text-[10px] text-destructive">Персонаж не найден</p>
                  )}
                </div>
                <Button size="sm" className="w-full h-7 text-xs"
                  disabled={!sourceChar}
                  onClick={() => {
                    if (!sourceChar) return;
                    teleportPlayer.mutate({
                      sourceCharacterId: sourceChar.id,
                      targetNickname: selectedPlayer.name,
                    });
                  }}>
                  {sourceChar
                    ? `Телепортировать ${sourceChar.name} → ${selectedPlayer.name}`
                    : `Телепортировать к ${selectedPlayer.name}`}
                </Button>
                <Button size="sm" variant="ghost" className="w-full h-6 text-xs"
                  onClick={() => setSelectedPlayer(null)}>
                  <X className="h-3 w-3 mr-1" />Закрыть
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Map click teleport dialog */}
        {mapClickPos && !selectedPlayer && (
          <Dialog open onOpenChange={() => setMapClickPos(null)}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Телепортировать персонажа</DialogTitle>
                <DialogDescription>
                  На координаты X: {mapClickPos.x.toFixed(0)} Y: {mapClickPos.y.toFixed(0)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1.5">
                  <Label>Ник персонажа</Label>
                  <Input placeholder="Введите ник персонажа" value={tpCharName}
                    onChange={e => setTpCharName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && sourceChar) {
                        teleportCoords.mutate({
                          characterId: sourceChar.id,
                          x: mapClickPos.x,
                          y: mapClickPos.y,
                          z: 200,
                        });
                        setMapClickPos(null);
                        setTpCharName('');
                      }
                    }} />
                  {tpCharName && sourceChar && (
                    <p className="text-[10px] text-muted-foreground">
                      Найден: {sourceChar.name} (Lv {sourceChar.level})
                    </p>
                  )}
                  {tpCharName && !sourceChar && (
                    <p className="text-[10px] text-destructive">Персонаж не найден</p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setMapClickPos(null)}>Отмена</Button>
                <Button disabled={!sourceChar || teleportCoords.isLoading}
                  onClick={() => {
                    if (!sourceChar) return;
                    teleportCoords.mutate({
                      characterId: sourceChar.id,
                      x: mapClickPos.x,
                      y: mapClickPos.y,
                      z: 200,
                    });
                    setMapClickPos(null);
                    setTpCharName('');
                  }}>
                  Телепортировать
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
