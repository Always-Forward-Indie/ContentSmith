'use client';

import { useRef } from 'react';
import {
    MapPin, Square, Globe, RefreshCw, MousePointer2, RotateCcw, Upload, Layers, PlusSquare, Maximize2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { EntityLayer, MapTool } from './types';

const LAYERS: { id: EntityLayer; label: string; color: string }[] = [
    { id: 'zones', label: 'Зоны', color: 'bg-yellow-400' },
    { id: 'npc', label: 'NPC', color: 'bg-green-500' },
    { id: 'spawnZone', label: 'Spawn', color: 'bg-blue-500' },
    { id: 'worldObject', label: 'Objects', color: 'bg-orange-500' },
    { id: 'respawn', label: 'Respawn', color: 'bg-purple-500' },
    { id: 'mob', label: 'Mobs', color: 'bg-red-500' },
];

const TOOLS: { id: MapTool; label: string; icon: React.ReactNode }[] = [
    { id: 'select', label: 'Выбрать', icon: <MousePointer2 className="h-4 w-4" /> },
    { id: 'addZone', label: 'Зона', icon: <PlusSquare className="h-4 w-4" /> },
    { id: 'addNpc', label: 'NPC', icon: <MapPin className="h-4 w-4" /> },
    { id: 'addSpawnZone', label: 'Spawn Zone', icon: <Square className="h-4 w-4" /> },
    { id: 'addWorldObject', label: 'World Object', icon: <Globe className="h-4 w-4" /> },
    { id: 'addRespawn', label: 'Respawn', icon: <RefreshCw className="h-4 w-4" /> },
];

interface Props {
    activeTool: MapTool;
    onToolChange: (tool: MapTool) => void;
    visibleLayers: Set<EntityLayer>;
    onLayerToggle: (layer: EntityLayer) => void;
    flipY: boolean;
    onFlipYToggle: () => void;
    onZoomReset: () => void;
    onZoomToFit: () => void;
    onImageUpload: (file: File) => void;
    isUploading: boolean;
    hasImage: boolean;
}

export function MapToolbar({
    activeTool,
    onToolChange,
    visibleLayers,
    onLayerToggle,
    flipY,
    onFlipYToggle,
    onZoomReset,
    onZoomToFit,
    onImageUpload,
    isUploading,
    hasImage,
}: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2 bg-card shrink-0">
            {/* Upload map image */}
            <div className="flex items-center gap-2">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onImageUpload(f);
                        e.target.value = '';
                    }}
                />
                <Button
                    size="sm"
                    variant="outline"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Upload className="mr-1.5 h-4 w-4" />
                    {isUploading ? 'Загрузка…' : hasImage ? 'Сменить карту' : 'Загрузить карту'}
                </Button>
            </div>

            <div className="w-px h-6 bg-border" />

            {/* Tools */}
            <div className="flex items-center gap-1">
                {TOOLS.map((t) => (
                    <Button
                        key={t.id}
                        size="sm"
                        variant={activeTool === t.id ? 'default' : 'ghost'}
                        title={t.label}
                        onClick={() => onToolChange(t.id)}
                    >
                        {t.icon}
                        <span className="ml-1.5 hidden lg:inline">{t.label}</span>
                    </Button>
                ))}
            </div>

            <div className="w-px h-6 bg-border" />

            {/* Layers */}
            <div className="flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
                {LAYERS.map((l) => (
                    <button
                        key={l.id}
                        onClick={() => onLayerToggle(l.id)}
                        className="flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-opacity hover:opacity-80"
                        style={{ opacity: visibleLayers.has(l.id) ? 1 : 0.3 }}
                        title={l.label}
                    >
                        <span className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${l.color}`} />
                        <span className="hidden md:inline">{l.label}</span>
                    </button>
                ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
                <Badge
                    variant={flipY ? 'default' : 'outline'}
                    className="cursor-pointer select-none"
                    onClick={onFlipYToggle}
                    title="Инвертировать ось Y (для координат Unity/Unreal)"
                >
                    Flip Y
                </Badge>
                <Button size="sm" variant="ghost" onClick={onZoomToFit} title="Вписать в экран">
                    <Maximize2 className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={onZoomReset} title="Сбросить масштаб">
                    <RotateCcw className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
