'use client';

import { useState, useMemo } from 'react';
import { Settings, Search, Save, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────
type ConfigRow = {
    key: string;
    value: string;
    valueType: string;
    description: string | null;
    updatedAt: Date | string;
};

// ─── ValueTypeColorMap ────────────────────────────────────
const valueTypeBadge: Record<string, string> = {
    int: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    float: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
};

function getValueTypeBadge(t: string) {
    return valueTypeBadge[t] ?? 'bg-muted text-muted-foreground';
}

// ─── Validate value by type ───────────────────────────────
function validateValue(value: string, valueType: string): boolean {
    if (valueType === 'int') return /^-?\d+$/.test(value.trim());
    if (valueType === 'float') return /^-?\d+(\.\d+)?$/.test(value.trim());
    return value.trim().length > 0;
}

// ─── Single config row ────────────────────────────────────
function ConfigRowItem({
    config,
    onSave,
    isSaving,
}: {
    config: ConfigRow;
    onSave: (key: string, value: string) => void;
    isSaving: boolean;
}) {
    const [draft, setDraft] = useState(config.value);
    const dirty = draft !== config.value;
    const valid = validateValue(draft, config.valueType);

    return (
        <div className="flex items-start gap-3 py-2.5 border-b last:border-0 group">
            {/* Key */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-xs font-mono text-foreground">{config.key.split('.').slice(1).join('.')}</code>
                    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium', getValueTypeBadge(config.valueType))}>
                        {config.valueType}
                    </span>
                </div>
                {config.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{config.description}</p>
                )}
            </div>

            {/* Value input */}
            <div className="flex items-center gap-1.5 shrink-0">
                <Input
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && dirty && valid && !isSaving) onSave(config.key, draft);
                        if (e.key === 'Escape') setDraft(config.value);
                    }}
                    className={cn(
                        'h-7 w-32 text-sm font-mono text-right',
                        dirty && valid && 'border-amber-400 dark:border-amber-600',
                        dirty && !valid && 'border-destructive',
                    )}
                />
                {dirty && (
                    <>
                        <Button
                            size="icon"
                            className="h-7 w-7"
                            disabled={!valid || isSaving}
                            onClick={() => onSave(config.key, draft)}
                            title="Сохранить"
                        >
                            <Save className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground"
                            onClick={() => setDraft(config.value)}
                            title="Сбросить"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}

// ─── Config group section ─────────────────────────────────
function ConfigGroup({
    group,
    configs,
    onSave,
    savingKey,
}: {
    group: string;
    configs: ConfigRow[];
    onSave: (key: string, value: string) => void;
    savingKey: string | null;
}) {
    const [open, setOpen] = useState(true);
    const dirtyCount = configs.filter(c => c.value !== c.value).length; // tracked externally via re-render

    return (
        <Card className="overflow-hidden">
            <button
                className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-accent/50 transition-colors"
                onClick={() => setOpen(v => !v)}
            >
                {open ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                <span className="font-semibold text-sm font-mono">{group}</span>
                <Badge variant="secondary" className="ml-auto text-xs">{configs.length}</Badge>
            </button>

            {open && (
                <CardContent className="px-4 pt-0 pb-2">
                    {configs.map(c => (
                        <ConfigRowItem
                            key={c.key}
                            config={c}
                            onSave={onSave}
                            isSaving={savingKey === c.key}
                        />
                    ))}
                </CardContent>
            )}
        </Card>
    );
}

// ─── Page ─────────────────────────────────────────────────
export default function GameConfigPage() {
    const [search, setSearch] = useState('');
    const [savingKey, setSavingKey] = useState<string | null>(null);

    const { data: configs, isLoading, refetch } = trpc.gameConfig.list.useQuery({ search: search || undefined });

    const update = trpc.gameConfig.update.useMutation({
        onSuccess: () => {
            refetch();
            toast.success('Значение сохранено');
            setSavingKey(null);
        },
        onError: (e) => {
            toast.error(e.message);
            setSavingKey(null);
        },
    });

    const handleSave = (key: string, value: string) => {
        setSavingKey(key);
        update.mutate({ key, value });
    };

    // Group configs by namespace prefix (e.g. "combat.xxx" → group "combat")
    const grouped = useMemo(() => {
        if (!configs) return [];
        const map = new Map<string, ConfigRow[]>();
        for (const c of configs) {
            const group = c.key.includes('.') ? c.key.split('.')[0]! : 'general';
            if (!map.has(group)) map.set(group, []);
            map.get(group)!.push(c);
        }
        return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    }, [configs]);

    const totalCount = configs?.length ?? 0;

    return (
        <div className="space-y-4">
            {/* Page header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary shrink-0">
                        <Settings className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold">Конфигурация игры</h1>
                        <p className="text-sm text-muted-foreground">
                            {isLoading ? '...' : `${totalCount} параметров в ${grouped.length} группах`}
                        </p>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                    className="pl-9"
                    placeholder="Поиск по ключу..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {/* Groups */}
            {isLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full rounded-lg" />
                    ))}
                </div>
            ) : grouped.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <p className="text-muted-foreground text-sm">
                            {search ? 'Ничего не найдено.' : 'Конфигурация пуста.'}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {grouped.map(([group, items]) => (
                        <ConfigGroup
                            key={group}
                            group={group}
                            configs={items}
                            onSave={handleSave}
                            savingKey={savingKey}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
