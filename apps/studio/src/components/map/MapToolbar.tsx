'use client';

import { useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
    MapPin, Globe, MousePointer2, RotateCcw, Upload, Layers, PlusSquare,
    Maximize2, FileJson, Eye, EyeOff, Search, Crosshair, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { EntityLayer, MapTool } from './types';

interface Props {
    activeTool: MapTool;
    onToolChange: (tool: MapTool) => void;
    visibleLayers: Set<EntityLayer>;
    onLayerToggle: (layer: EntityLayer) => void;
    onZoomReset: () => void;
    onZoomToFit: () => void;
    onImageUpload: (file: File) => void;
    onMetaImport: (file: File) => void;
    isUploading: boolean;
    hasImage: boolean;
    zoom: number;
    showMapImage: boolean;
    onToggleMapImage: () => void;
    searchOpen: boolean;
    onSearchToggle: () => void;
    layerCounts?: Partial<Record<EntityLayer, number>>;
}

export function MapToolbar({
    activeTool,
    onToolChange,
    visibleLayers,
    onLayerToggle,
    onZoomReset,
    onZoomToFit,
    onImageUpload,
    onMetaImport,
    isUploading,
    hasImage,
    zoom,
    showMapImage,
    onToggleMapImage,
    searchOpen,
    onSearchToggle,
    layerCounts,
}: Props) {
    const t = useTranslations('editors.mapToolbar');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const metaInputRef = useRef<HTMLInputElement>(null);

    const LAYERS: { id: EntityLayer; label: string; color: string }[] = [
        { id: 'zones', label: t('layers.zones'), color: 'bg-yellow-400' },
        { id: 'npc', label: t('layers.npc'), color: 'bg-green-500' },
        { id: 'spawnZone', label: t('layers.spawnZone'), color: 'bg-blue-500' },
        { id: 'classSpawnZone', label: t('layers.classSpawnZone'), color: 'bg-teal-500' },
        { id: 'worldObject', label: t('layers.worldObject'), color: 'bg-orange-500' },
        { id: 'respawn', label: t('layers.respawn'), color: 'bg-purple-500' },
        { id: 'mob', label: t('layers.mob'), color: 'bg-red-500' },
    ];

    const NAV_TOOLS: { id: MapTool; label: string; icon: React.ReactNode; key: string }[] = [
        { id: 'select', label: t('tools.select'), icon: <MousePointer2 className="h-3.5 w-3.5" />, key: 'V' },
    ];

    const ADD_TOOLS: { id: MapTool; label: string; icon: React.ReactNode; key: string }[] = [
        { id: 'addZone', label: t('tools.addZone'), icon: <PlusSquare className="h-3.5 w-3.5" />, key: 'Z' },
        { id: 'addNpc', label: t('tools.addNpc'), icon: <MapPin className="h-3.5 w-3.5" />, key: 'N' },
        { id: 'addSpawnZone', label: t('tools.addSpawnZone'), icon: <Users className="h-3.5 w-3.5" />, key: 'S' },
        { id: 'addClassSpawnZone', label: t('tools.addClassSpawnZone'), icon: <PlusSquare className="h-3.5 w-3.5" />, key: 'C' },
        { id: 'addWorldObject', label: t('tools.addWorldObject'), icon: <Globe className="h-3.5 w-3.5" />, key: 'O' },
        { id: 'addRespawn', label: t('tools.addRespawn'), icon: <Crosshair className="h-3.5 w-3.5" />, key: 'R' },
    ];

    return (
        <div className="flex items-center border-b border-border bg-card shrink-0 h-10 px-2 overflow-x-auto gap-0">
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
            <input
                ref={metaInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onMetaImport(f);
                    e.target.value = '';
                }}
            />

            {NAV_TOOLS.map((tool) => (
                <Button
                    key={tool.id}
                    size="sm"
                    variant={activeTool === tool.id ? 'default' : 'ghost'}
                    className="h-7 px-2.5"
                    title={`${tool.label} (${tool.key})`}
                    onClick={() => onToolChange(tool.id)}
                >
                    {tool.icon}
                    <span className="ml-1.5 hidden lg:inline text-xs">{tool.label}</span>
                    <kbd className="hidden xl:inline text-[9px] opacity-40 bg-muted px-1 rounded ml-1">{tool.key}</kbd>
                </Button>
            ))}

            <div className="w-px h-5 bg-border mx-1.5 shrink-0" />

            <div className="flex items-center">
                {ADD_TOOLS.map((tool) => (
                    <Button
                        key={tool.id}
                        size="sm"
                        variant={activeTool === tool.id ? 'secondary' : 'ghost'}
                        className="h-7 px-2 gap-1"
                        title={`${tool.label} (${tool.key})`}
                        onClick={() => onToolChange(tool.id)}
                    >
                        {tool.icon}
                        <kbd className="hidden xl:inline text-[9px] opacity-40 bg-muted px-1 rounded">{tool.key}</kbd>
                    </Button>
                ))}
            </div>

            <div className="w-px h-5 bg-border mx-1.5 shrink-0" />

            <div className="flex items-center gap-0.5">
                <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0 mr-1" />
                {LAYERS.map((l) => {
                    const count = layerCounts?.[l.id];
                    return (
                        <button
                            key={l.id}
                            onClick={() => onLayerToggle(l.id)}
                            className="flex items-center gap-1 rounded px-1.5 py-1 text-[11px] font-medium transition-colors hover:bg-muted"
                            style={{ opacity: visibleLayers.has(l.id) ? 1 : 0.3 }}
                            title={`${visibleLayers.has(l.id) ? t('hide') : t('show')}: ${l.label}${count !== undefined ? ` (${count})` : ''}`}
                        >
                            <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${l.color}`} />
                            <span className="hidden md:inline">{l.label}</span>
                            {count !== undefined && (
                                <span className="hidden lg:inline text-[10px] text-muted-foreground tabular-nums">{count}</span>
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="w-px h-5 bg-border mx-1.5 shrink-0" />

            <Button
                size="sm"
                variant={showMapImage ? 'ghost' : 'secondary'}
                className="h-7 px-2.5 gap-1.5"
                title={showMapImage ? t('hideBackground') : t('showBackground')}
                onClick={onToggleMapImage}
            >
                {showMapImage ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                <span className="hidden lg:inline text-xs">{t('map')}</span>
            </Button>

            <Button
                size="sm"
                variant={searchOpen ? 'secondary' : 'ghost'}
                className="h-7 px-2.5 gap-1.5"
                title={t('searchHint')}
                onClick={onSearchToggle}
            >
                <Search className="h-3.5 w-3.5" />
                <span className="hidden lg:inline text-xs">{t('search')}</span>
                <kbd className="hidden xl:inline text-[9px] opacity-50 bg-muted px-1 rounded ml-0.5">⌘K</kbd>
            </Button>

            <div className="w-px h-5 bg-border mx-1.5 shrink-0" />

            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onZoomToFit} title={t('fitToScreen')}>
                <Maximize2 className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onZoomReset} title={t('resetZoom')}>
                <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <span className="text-[11px] text-muted-foreground tabular-nums w-10 text-center shrink-0 select-none">
                {Math.round(zoom * 100)}%
            </span>

            <div className="w-px h-5 bg-border mx-1.5 shrink-0" />

            <Button
                size="sm"
                variant="outline"
                className="h-7 px-2.5 gap-1.5 shrink-0"
                disabled={isUploading}
                title={hasImage ? t('changeImage') : t('uploadImage')}
                onClick={() => fileInputRef.current?.click()}
            >
                <Upload className="h-3.5 w-3.5" />
                <span className="hidden lg:inline text-xs">
                    {isUploading ? t('uploading') : hasImage ? t('change') : t('upload')}
                </span>
            </Button>
            <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                title={t('importMeta')}
                onClick={() => metaInputRef.current?.click()}
            >
                <FileJson className="h-3.5 w-3.5" />
            </Button>
        </div>
    );
}
