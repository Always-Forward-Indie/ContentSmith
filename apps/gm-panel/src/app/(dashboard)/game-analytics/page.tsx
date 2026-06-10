'use client';

import { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
    Skull, Swords, Trophy, Scroll, Package, Coins,
    Activity, Clock, BarChart2, ChevronLeft, ChevronRight, Filter,
    TrendingUp, Users,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// ─── Constants ────────────────────────────────────────────────────────────────

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#ec4899', '#14b8a6', '#f97316', '#64748b'];

const EVENT_TYPE_META: Record<string, { label: string; color: string; icon?: string }> = {
    session_start: { label: 'Вход в мир', color: '#10b981' },
    session_end: { label: 'Выход из мира', color: '#64748b' },
    level_up: { label: 'Левел ап', color: '#6366f1' },
    player_death: { label: 'Смерть игрока', color: '#ef4444' },
    mob_killed: { label: 'Моб убит', color: '#f59e0b' },
    quest_accept: { label: 'Квест взят', color: '#3b82f6' },
    quest_complete: { label: 'Квест выполнен', color: '#10b981' },
    quest_abandon: { label: 'Квест брошен', color: '#f97316' },
    item_acquired: { label: 'Предмет получен', color: '#8b5cf6' },
    gold_change: { label: 'Изменение золота', color: '#eab308' },
};

const SOURCE_LABELS: Record<string, string> = {
    loot_pickup: 'Подобрано с земли',
    corpse_loot: 'Мародёрство трупа',
    vendor_buy: 'Покупка у торговца',
    quest: 'Награда квеста',
    dialogue: 'Диалог',
};

const DAYS_OPTIONS = [
    { value: '7', label: '7 дней' },
    { value: '14', label: '14 дней' },
    { value: '30', label: '30 дней' },
    { value: '90', label: '90 дней' },
];

// ─── Utilities ────────────────────────────────────────────────────────────────

function shortDate(iso: string) {
    return iso.slice(5); // YYYY-MM-DD → MM-DD
}

function formatDuration(sec: number): string {
    if (!sec || sec <= 0) return '—';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}ч ${m}м`;
    if (m > 0) return `${m}м ${s}с`;
    return `${s}с`;
}

function fmtNum(n: number) {
    return n.toLocaleString('ru-RU');
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: {
    active?: boolean;
    payload?: { name: string; value: number; color: string }[];
    label?: string;
}) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-lg">
            {label && <p className="mb-1 font-medium text-foreground">{label}</p>}
            {payload.map((e) => (
                <p key={e.name} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: e.color }} />
                    <span className="text-muted-foreground">{e.name}:</span>
                    <span className="font-medium">{fmtNum(Number(e.value))}</span>
                </p>
            ))}
        </div>
    );
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function EmptyState() {
    return (
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground">Нет данных за выбранный период</p>
        </div>
    );
}

function Sk({ h = 52 }: { h?: number }) {
    return <Skeleton style={{ height: h }} className="w-full" />;
}

function KpiCard({
    icon: Icon,
    label,
    value,
    iconColor = 'text-primary',
    bgColor = 'bg-primary/10',
    isLoading,
}: {
    icon: React.ElementType;
    label: string;
    value: number | string;
    iconColor?: string;
    bgColor?: string;
    isLoading?: boolean;
}) {
    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        {isLoading ? (
                            <Skeleton className="mt-1 h-7 w-14" />
                        ) : (
                            <p className="mt-0.5 text-2xl font-bold tabular-nums">
                                {typeof value === 'number' ? fmtNum(value) : value}
                            </p>
                        )}
                    </div>
                    <div className={`rounded-md p-2 ${bgColor}`}>
                        <Icon className={`h-4 w-4 ${iconColor}`} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ─── Days selector ────────────────────────────────────────────────────────────

function DaysFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger className="h-8 w-28 text-xs">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {DAYS_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value} className="text-xs">
                            {o.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

// ─── Activity Punch Card grid ────────────────────────────────────────────────

const DOW_LABELS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

function PunchCardGrid({
    data,
    isLoading,
}: {
    data: { dow: number; hour: number; count: number }[] | undefined;
    isLoading: boolean;
}) {
    const maxCount = useMemo(() => Math.max(1, ...(data ?? []).map((d) => d.count)), [data]);
    const grid = useMemo(() => {
        const m: Record<string, number> = {};
        for (const d of (data ?? [])) m[`${d.dow}_${d.hour}`] = d.count;
        return m;
    }, [data]);

    if (isLoading) return <Sk h={155} />;
    if (!data?.length) return <EmptyState />;

    const cells: React.ReactElement[] = [];
    cells.push(<div key="corner" />);
    for (let h = 0; h < 24; h++) {
        cells.push(<div key={`h-${h}`} className="text-center text-[9px] text-muted-foreground pb-1 leading-none">{h}</div>);
    }
    for (const dow of [0, 1, 2, 3, 4, 5, 6]) {
        cells.push(
            <div key={`lbl-${dow}`} className="text-[10px] text-muted-foreground flex items-center justify-end pr-1.5 leading-none">
                {DOW_LABELS[dow]}
            </div>,
        );
        for (let hour = 0; hour < 24; hour++) {
            const count = grid[`${dow}_${hour}`] ?? 0;
            const opacity = 0.07 + (count / maxCount) * 0.88;
            cells.push(
                <div
                    key={`${dow}-${hour}`}
                    title={`${DOW_LABELS[dow]} ${hour}:00 — ${fmtNum(count)} событий`}
                    className="rounded-sm"
                    style={{ aspectRatio: '1', backgroundColor: `rgba(99,102,241,${opacity.toFixed(2)})` }}
                />,
            );
        }
    }

    return (
        <div className="overflow-x-auto pb-1">
            <div
                style={{ display: 'grid', gridTemplateColumns: 'auto repeat(24, minmax(0, 1fr))', gap: '3px' }}
                className="min-w-[540px]"
            >
                {cells}
            </div>
        </div>
    );
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function TabOverview({ days }: { days: number }) {
    const overview = trpc.gameAnalytics.overview.useQuery({ days }, { refetchInterval: 30_000 });
    const timeline = trpc.gameAnalytics.timeline.useQuery({ days });
    const sessions = trpc.gameAnalytics.sessionStats.useQuery({ days });
    const dau = trpc.gameAnalytics.dau.useQuery({ days });
    const punchCard = trpc.gameAnalytics.activityPunchCard.useQuery({ days });

    const timelineData = useMemo(
        () => timeline.data?.map((d) => ({ ...d, date: shortDate(d.date) })) ?? [],
        [timeline.data],
    );

    const eventVolumeData = useMemo(() => {
        if (!overview.data?.byType) return [];
        return Object.entries(overview.data.byType)
            .map(([eventType, count]) => ({
                eventType,
                label: EVENT_TYPE_META[eventType]?.label ?? eventType,
                count,
                color: EVENT_TYPE_META[eventType]?.color ?? '#94a3b8',
            }))
            .sort((a, b) => b.count - a.count);
    }, [overview.data]);

    return (
        <div className="space-y-4">
            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                <KpiCard icon={Activity} label="Всего событий" value={overview.data?.totalEvents ?? 0} isLoading={overview.isLoading} />
                <KpiCard icon={Clock} label="Сессий" value={overview.data?.sessions ?? 0} isLoading={overview.isLoading} bgColor="bg-emerald-500/10" iconColor="text-emerald-500" />
                <KpiCard icon={Skull} label="Смертей" value={overview.data?.deaths ?? 0} isLoading={overview.isLoading} bgColor="bg-destructive/10" iconColor="text-destructive" />
                <KpiCard icon={Swords} label="Мобов убито" value={overview.data?.mobKills ?? 0} isLoading={overview.isLoading} bgColor="bg-amber-500/10" iconColor="text-amber-500" />
                <KpiCard icon={Trophy} label="Левел апов" value={overview.data?.levelUps ?? 0} isLoading={overview.isLoading} bgColor="bg-violet-500/10" iconColor="text-violet-500" />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KpiCard icon={Scroll} label="Квестов взято" value={overview.data?.questAccepts ?? 0} isLoading={overview.isLoading} />
                <KpiCard icon={Scroll} label="Квестов сдано" value={overview.data?.questCompletes ?? 0} isLoading={overview.isLoading} bgColor="bg-emerald-500/10" iconColor="text-emerald-500" />
                <KpiCard icon={Package} label="Предметов получено" value={overview.data?.itemsAcquired ?? 0} isLoading={overview.isLoading} bgColor="bg-violet-500/10" iconColor="text-violet-500" />
                <KpiCard icon={Coins} label="Золотых транзакций" value={overview.data?.goldChanges ?? 0} isLoading={overview.isLoading} bgColor="bg-yellow-500/10" iconColor="text-yellow-500" />
            </div>

            {/* Session stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KpiCard icon={Clock} label="Ср. сессия" value={formatDuration(sessions.data?.avgSec ?? 0)} isLoading={sessions.isLoading} />
                <KpiCard icon={Clock} label="Медиана" value={formatDuration(sessions.data?.medianSec ?? 0)} isLoading={sessions.isLoading} />
                <KpiCard icon={Clock} label="P90 сессия" value={formatDuration(sessions.data?.p90Sec ?? 0)} isLoading={sessions.isLoading} />
                <KpiCard icon={Clock} label="Макс. сессия" value={formatDuration(sessions.data?.maxSec ?? 0)} isLoading={sessions.isLoading} />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                {/* Timeline */}
                <Card className="lg:col-span-8">
                    <CardHeader className="pb-0">
                        <CardTitle className="text-sm font-semibold">События по дням</CardTitle>
                        <CardDescription>Общий поток событий за выбранный период</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                        {timeline.isLoading ? <Sk h={200} /> : !timelineData.length ? <EmptyState /> : (
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={timelineData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Line type="monotone" dataKey="count" name="События" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Event volume by type */}
                <Card className="lg:col-span-4">
                    <CardHeader className="pb-0">
                        <CardTitle className="text-sm font-semibold">По типам</CardTitle>
                        <CardDescription>Объём каждого типа событий</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-3">
                        {overview.isLoading ? <Sk h={200} /> : !eventVolumeData.length ? <EmptyState /> : (
                            <div className="space-y-2">
                                {eventVolumeData.map((d) => {
                                    const max = eventVolumeData[0]?.count ?? 1;
                                    const pct = Math.round((d.count / max) * 100);
                                    return (
                                        <div key={d.eventType}>
                                            <div className="flex justify-between text-xs mb-0.5">
                                                <span className="truncate">{d.label}</span>
                                                <span className="ml-2 tabular-nums text-muted-foreground">{fmtNum(d.count)}</span>
                                            </div>
                                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: d.color }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ── Daily Active Users ──────────────────────────────────────── */}
            <Card>
                <CardHeader className="pb-0">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <Users className="h-4 w-4 text-primary" />
                        Ежедневные активные игроки (DAU)
                    </CardTitle>
                    <CardDescription>Уникальные персонажи с активной сессией в день</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                    {dau.isLoading ? <Sk h={150} /> : !dau.data?.length ? <EmptyState /> : (
                        <ResponsiveContainer width="100%" height={150}>
                            <LineChart data={dau.data.map((d) => ({ ...d, date: shortDate(d.date) }))} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} allowDecimals={false} />
                                <Tooltip content={<ChartTooltip />} />
                                <Line type="monotone" dataKey="dau" name="DAU" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            {/* ── Activity Punch Card ─────────────────────────────────────── */}
            <Card>
                <CardHeader className="pb-0">
                    <CardTitle className="text-sm font-semibold">Тепловая карта активности</CardTitle>
                    <CardDescription>Количество событий по часу дня и дню недели (UTC)</CardDescription>
                </CardHeader>
                <CardContent className="pt-3">
                    <PunchCardGrid data={punchCard.data} isLoading={punchCard.isLoading} />
                </CardContent>
            </Card>
        </div>
    );
}

// ─── Tab: Players (deaths + level-ups) ───────────────────────────────────────

function TabPlayers({ days }: { days: number }) {
    const deathsByZone = trpc.gameAnalytics.deathsByZone.useQuery({ days });
    const deathsByLevel = trpc.gameAnalytics.deathsByLevel.useQuery({ days });
    const levelUpDist = trpc.gameAnalytics.levelUpDistribution.useQuery({ days });
    const histogram = trpc.gameAnalytics.sessionHistogram.useQuery({ days });
    const progression = trpc.gameAnalytics.progressionBottleneck.useQuery({ days });

    const progressionData = useMemo(
        () =>
            progression.data?.map((d) => ({
                level: d.level,
                medianMin: +(d.medianSec / 60).toFixed(1),
                avgMin: +(d.avgSec / 60).toFixed(1),
                medianSec: d.medianSec,
                avgSec: d.avgSec,
                samples: d.sampleCount,
            })) ?? [],
        [progression.data],
    );

    return (
        <div className="space-y-4">
            {/* Session histogram + Progression bottleneck */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card>
                    <CardHeader className="pb-0">
                        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                            <Clock className="h-4 w-4 text-primary" />
                            Распределение длин сессий
                        </CardTitle>
                        <CardDescription>Сколько сессий попадает в каждый временной бакет</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                        {histogram.isLoading ? <Sk h={180} /> : !histogram.data?.length ? <EmptyState /> : (
                            <ResponsiveContainer width="100%" height={180}>
                                <BarChart data={histogram.data} margin={{ top: 0, right: 4, left: -20, bottom: 0 }} barSize={22}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                    <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Bar dataKey="count" name="Сессий" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-0">
                        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                            <TrendingUp className="h-4 w-4 text-violet-500" />
                            Кривая прокачки (узкие места)
                        </CardTitle>
                        <CardDescription>Медианное время между левел апами</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                        {progression.isLoading ? <Sk h={180} /> : !progressionData.length ? <EmptyState /> : (
                            <ResponsiveContainer width="100%" height={180}>
                                <LineChart data={progressionData} margin={{ top: 4, right: 4, left: -14, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                    <XAxis dataKey="level" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                                    <YAxis
                                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(v: number) => v >= 60 ? `${(v / 60).toFixed(0)}ч` : `${v}м`}
                                    />
                                    <Tooltip
                                        content={({ active, payload }) => {
                                            if (!active || !payload?.[0]) return null;
                                            const d = payload[0].payload as typeof progressionData[0];
                                            return (
                                                <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-lg">
                                                    <p className="mb-1 font-medium">Уровень {d.level}</p>
                                                    <p className="text-muted-foreground">Медиана: <span className="text-foreground font-medium">{formatDuration(d.medianSec)}</span></p>
                                                    <p className="text-muted-foreground">Среднее: <span className="text-foreground">{formatDuration(d.avgSec)}</span></p>
                                                    <p className="text-muted-foreground">Выборка: <span className="text-foreground">{fmtNum(d.samples)}</span></p>
                                                </div>
                                            );
                                        }}
                                    />
                                    <Line type="monotone" dataKey="medianMin" name="Медиана (мин)" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 2, fill: '#8b5cf6' }} activeDot={{ r: 5 }} />
                                    <Line type="monotone" dataKey="avgMin" name="Среднее (мин)" stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Deaths by zone */}
            <Card>
                <CardHeader className="pb-0">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <Skull className="h-4 w-4 text-destructive" />
                        Смерти по зонам
                    </CardTitle>
                    <CardDescription>Где игроки умирают чаще всего</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                    {deathsByZone.isLoading ? <Sk h={180} /> : !deathsByZone.data?.length ? <EmptyState /> : (
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart
                                data={deathsByZone.data.map((d) => ({ ...d, name: d.zoneName ?? `Zone ${d.zoneId}` }))}
                                layout="vertical"
                                margin={{ top: 0, right: 20, left: 100, bottom: 0 }}
                                barSize={14}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                                <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} allowDecimals={false} />
                                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={95} />
                                <Tooltip content={<ChartTooltip />} />
                                <Bar dataKey="count" name="Смерти" fill="#ef4444" radius={[0, 3, 3, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Deaths by level */}
                <Card>
                    <CardHeader className="pb-0">
                        <CardTitle className="text-sm font-semibold">Смерти по уровням</CardTitle>
                        <CardDescription>На каком уровне умирают чаще</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                        {deathsByLevel.isLoading ? <Sk h={180} /> : !deathsByLevel.data?.length ? <EmptyState /> : (
                            <ResponsiveContainer width="100%" height={180}>
                                <BarChart data={deathsByLevel.data} margin={{ top: 0, right: 4, left: -20, bottom: 0 }} barSize={10}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                    <XAxis dataKey="level" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Bar dataKey="count" name="Смерти" fill="#ef4444" radius={[3, 3, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Level-up distribution */}
                <Card>
                    <CardHeader className="pb-0">
                        <CardTitle className="text-sm font-semibold">Достигнутые уровни</CardTitle>
                        <CardDescription>Сколько раз достигался каждый уровень</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                        {levelUpDist.isLoading ? <Sk h={180} /> : !levelUpDist.data?.length ? <EmptyState /> : (
                            <ResponsiveContainer width="100%" height={180}>
                                <BarChart data={levelUpDist.data} margin={{ top: 0, right: 4, left: -20, bottom: 0 }} barSize={10}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                    <XAxis dataKey="level" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Bar dataKey="count" name="Левел апов" fill="#6366f1" radius={[3, 3, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// ─── Tab: Quests ──────────────────────────────────────────────────────────────

function TabQuests({ days }: { days: number }) {
    const { data, isLoading } = trpc.gameAnalytics.questFunnel.useQuery({ days });

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Scroll className="h-4 w-4 text-primary" />
                    Воронка квестов
                </CardTitle>
                <CardDescription>Взято → выполнено → брошено по слагу квеста</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                {isLoading ? (
                    <div className="space-y-2 px-6 pb-4">
                        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                    </div>
                ) : !data?.length ? (
                    <div className="px-6 pb-4"><EmptyState /></div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Квест (slug)</TableHead>
                                <TableHead className="text-center w-28">Взято</TableHead>
                                <TableHead className="text-center w-28">Выполнено</TableHead>
                                <TableHead className="text-center w-28">Брошено</TableHead>
                                <TableHead className="text-right w-24">% сдачи</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((q) => {
                                const completionPct = q.accept > 0 ? Math.round((q.complete / q.accept) * 100) : 0;
                                const abandonPct = q.accept > 0 ? Math.round((q.abandon / q.accept) * 100) : 0;
                                return (
                                    <TableRow key={q.questSlug}>
                                        <TableCell className="font-mono text-xs">{q.questSlug}</TableCell>
                                        <TableCell className="text-center tabular-nums">{fmtNum(q.accept)}</TableCell>
                                        <TableCell className="text-center">
                                            <span className="tabular-nums text-emerald-500 font-medium">{fmtNum(q.complete)}</span>
                                            <span className="ml-1 text-xs text-muted-foreground">({completionPct}%)</span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {q.abandon > 0 ? (
                                                <>
                                                    <span className="tabular-nums text-orange-500 font-medium">{fmtNum(q.abandon)}</span>
                                                    <span className="ml-1 text-xs text-muted-foreground">({abandonPct}%)</span>
                                                </>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                                                    <div
                                                        className="h-full rounded-full bg-emerald-500"
                                                        style={{ width: `${completionPct}%` }}
                                                    />
                                                </div>
                                                <span className="w-8 text-xs text-muted-foreground tabular-nums">{completionPct}%</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}

// ─── Tab: Combat ──────────────────────────────────────────────────────────────

function TabCombat({ days }: { days: number }) {
    const { data, isLoading } = trpc.gameAnalytics.topMobsKilled.useQuery({ days });

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Swords className="h-4 w-4 text-amber-500" />
                    Топ убитых мобов
                </CardTitle>
                <CardDescription>Самые часто убиваемые мобы</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                {isLoading ? (
                    <div className="space-y-2 px-6 pb-4">
                        {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                    </div>
                ) : !data?.length ? (
                    <div className="px-6 pb-4"><EmptyState /></div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-8">#</TableHead>
                                <TableHead>Моб (slug)</TableHead>
                                <TableHead className="text-center w-20">Уровень</TableHead>
                                <TableHead className="text-right">Убийств</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((m, i) => (
                                <TableRow key={m.mobSlug}>
                                    <TableCell className="font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                                    <TableCell className="font-mono text-sm">{m.mobSlug}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="outline">{m.mobLevel}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-bold tabular-nums">{fmtNum(m.count)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}

// ─── Tab: Economy ─────────────────────────────────────────────────────────────

function TabEconomy({ days }: { days: number }) {
    const items = trpc.gameAnalytics.topItemsAcquired.useQuery({ days });
    const sources = trpc.gameAnalytics.itemsBySource.useQuery({ days });
    const gold = trpc.gameAnalytics.goldBySource.useQuery({ days });

    const sourcePieData = useMemo(
        () =>
            sources.data?.map((d, i) => ({
                name: SOURCE_LABELS[d.source] ?? d.source,
                value: d.totalQty,
                color: CHART_COLORS[i % CHART_COLORS.length],
            })) ?? [],
        [sources.data],
    );

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                {/* Top items */}
                <Card className="lg:col-span-7">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                            <Package className="h-4 w-4 text-violet-500" />
                            Топ предметов
                        </CardTitle>
                        <CardDescription>По суммарному кол-ву полученных штук</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {items.isLoading ? (
                            <div className="space-y-2 px-6 pb-4">
                                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-7 w-full" />)}
                            </div>
                        ) : !items.data?.length ? (
                            <div className="px-6 pb-4"><EmptyState /></div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-8">#</TableHead>
                                        <TableHead>Предмет (slug)</TableHead>
                                        <TableHead className="text-right w-24">Кол-во</TableHead>
                                        <TableHead className="text-right w-20">Событий</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.data.slice(0, 15).map((d, i) => (
                                        <TableRow key={d.itemSlug}>
                                            <TableCell className="font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                                            <TableCell className="font-mono text-sm">{d.itemSlug}</TableCell>
                                            <TableCell className="text-right font-bold tabular-nums">{fmtNum(d.totalQty)}</TableCell>
                                            <TableCell className="text-right text-muted-foreground tabular-nums text-xs">{fmtNum(d.eventCount)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Items by source + Gold */}
                <div className="flex flex-col gap-4 lg:col-span-5">
                    {/* acquisition sources donut */}
                    <Card>
                        <CardHeader className="pb-0">
                            <CardTitle className="text-sm font-semibold">Источники предметов</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-2">
                            {sources.isLoading ? <Sk h={140} /> : !sourcePieData.length ? <EmptyState /> : (
                                <>
                                    <ResponsiveContainer width="100%" height={130}>
                                        <PieChart>
                                            <Pie data={sourcePieData} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={58} paddingAngle={2}>
                                                {sourcePieData.map((e) => <Cell key={e.name} fill={e.color} />)}
                                            </Pie>
                                            <Tooltip
                                                content={({ active, payload }) => {
                                                    if (!active || !payload?.length) return null;
                                                    return (
                                                        <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-lg">
                                                            <p className="font-medium">{payload[0]?.name}</p>
                                                            <p className="text-muted-foreground">{fmtNum(Number(payload[0]?.value))} шт.</p>
                                                        </div>
                                                    );
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 justify-center">
                                        {sourcePieData.map((d) => (
                                            <span key={d.name} className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                                                {d.name}
                                            </span>
                                        ))}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Gold by source */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                <Coins className="h-4 w-4 text-yellow-500" />
                                Золото по источникам
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {gold.isLoading ? <Sk h={80} /> : !gold.data?.length ? <EmptyState /> : (
                                <div className="space-y-2">
                                    {gold.data.map((d) => (
                                        <div key={d.source} className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">{SOURCE_LABELS[d.source] ?? d.source}</span>
                                            <div className="flex gap-3 tabular-nums">
                                                {d.spending > 0 && <span className="text-destructive">−{fmtNum(d.spending)}</span>}
                                                {d.income > 0 && <span className="text-emerald-500">+{fmtNum(d.income)}</span>}
                                                <span className={`font-medium ${d.netDelta >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                                                    {d.netDelta >= 0 ? '+' : ''}{fmtNum(d.netDelta)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

// ─── Tab: Raw Event Log ───────────────────────────────────────────────────────

const EVENT_TYPE_OPTIONS = [
    'session_start', 'session_end', 'level_up', 'player_death', 'mob_killed',
    'quest_accept', 'quest_complete', 'quest_abandon', 'item_acquired', 'gold_change',
];

function TabEventLog() {
    const [page, setPage] = useState(1);
    const [filterType, setFilterType] = useState<string>('');

    const { data, isLoading } = trpc.gameAnalytics.recentEvents.useQuery({
        page,
        pageSize: 50,
        eventType: filterType || undefined,
    });

    function handleTypeChange(v: string) {
        setFilterType(v === 'all' ? '' : v);
        setPage(1);
    }

    return (
        <div className="space-y-3">
            {/* Filters */}
            <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <Select value={filterType || 'all'} onValueChange={handleTypeChange}>
                    <SelectTrigger className="h-8 w-44 text-xs">
                        <SelectValue placeholder="Все типы" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all" className="text-xs">Все типы</SelectItem>
                        {EVENT_TYPE_OPTIONS.map((t) => (
                            <SelectItem key={t} value={t} className="text-xs">
                                {EVENT_TYPE_META[t]?.label ?? t}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {data && (
                    <span className="text-xs text-muted-foreground">
                        {fmtNum(data.pagination.total)} событий
                    </span>
                )}
            </div>

            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="space-y-2 px-6 py-4">
                            {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                        </div>
                    ) : !data?.data.length ? (
                        <div className="px-6 py-4"><EmptyState /></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10">#</TableHead>
                                    <TableHead className="w-36">Тип</TableHead>
                                    <TableHead>Персонаж</TableHead>
                                    <TableHead className="w-12">Lv.</TableHead>
                                    <TableHead>Зона</TableHead>
                                    <TableHead>Payload</TableHead>
                                    <TableHead className="text-right w-36">Время</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.data.map((e) => {
                                    const meta = EVENT_TYPE_META[e.eventType];
                                    return (
                                        <TableRow key={String(e.id)}>
                                            <TableCell className="font-mono text-[10px] text-muted-foreground">{String(e.id)}</TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className="text-[10px] px-1.5 h-5 font-normal"
                                                    style={meta ? { borderColor: meta.color, color: meta.color } : undefined}
                                                >
                                                    {meta?.label ?? e.eventType}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                {e.characterName ?? (e.characterId ? `#${e.characterId}` : '—')}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className="text-[10px] px-1 h-4">{e.level}</Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {e.zoneName ?? (e.zoneId ? `#${e.zoneId}` : '—')}
                                            </TableCell>
                                            <TableCell className="font-mono text-[10px] text-muted-foreground max-w-xs truncate">
                                                {JSON.stringify(e.payload)}
                                            </TableCell>
                                            <TableCell className="text-right text-[10px] text-muted-foreground tabular-nums">
                                                {e.createdAt ? new Date(e.createdAt).toLocaleString('ru-RU') : '—'}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Pagination */}
            {data && data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                        Стр. {data.pagination.page} / {data.pagination.totalPages}
                    </span>
                    <div className="flex gap-1">
                        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= data.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Tab: Retention Cohort ─────────────────────────────────────────────────────────

function TabRetention() {
    const [weeks, setWeeks] = useState(8);
    const { data, isLoading } = trpc.gameAnalytics.retentionCohort.useQuery({ weeks });

    function retentionColor(pct: number): string {
        if (pct >= 50) return 'text-emerald-400';
        if (pct >= 25) return 'text-yellow-400';
        if (pct >= 10) return 'text-orange-400';
        return 'text-muted-foreground';
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <Select value={String(weeks)} onValueChange={(v) => setWeeks(Number(v))}>
                    <SelectTrigger className="h-8 w-28 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {[4, 8, 12].map((w) => (
                            <SelectItem key={w} value={String(w)} className="text-xs">{w} недель</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <Users className="h-4 w-4 text-primary" />
                        Когортный анализ удержания
                    </CardTitle>
                    <CardDescription>
                        % пользователей из когорты, вернувшихся через N дней после недели регистрации.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="space-y-2 px-6 pb-4">
                            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                        </div>
                    ) : !data?.length ? (
                        <div className="px-6 pb-4"><EmptyState /></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Неделя (регистрация)</TableHead>
                                    <TableHead className="text-right w-20">Игроков</TableHead>
                                    <TableHead className="text-center w-24">D+1</TableHead>
                                    <TableHead className="text-center w-24">D+3</TableHead>
                                    <TableHead className="text-center w-24">D+7</TableHead>
                                    <TableHead className="text-center w-24">D+30</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map((row) => {
                                    const pct = (n: number) =>
                                        row.cohortSize > 0 ? Math.round((n / row.cohortSize) * 100) : 0;
                                    const d1p = pct(row.d1);
                                    const d3p = pct(row.d3);
                                    const d7p = pct(row.d7);
                                    const d30p = pct(row.d30);
                                    return (
                                        <TableRow key={row.cohortWeek}>
                                            <TableCell className="font-mono text-xs">{row.cohortWeek}</TableCell>
                                            <TableCell className="text-right tabular-nums">{fmtNum(row.cohortSize)}</TableCell>
                                            {([
                                                [row.d1, d1p],
                                                [row.d3, d3p],
                                                [row.d7, d7p],
                                                [row.d30, d30p],
                                            ] as [number, number][]).map(([n, p], ci) => (
                                                <TableCell key={ci} className="text-center">
                                                    <span className={`font-medium tabular-nums ${retentionColor(p)}`}>{p}%</span>
                                                    <span className="ml-1 text-[10px] text-muted-foreground">({fmtNum(n)})</span>
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GameAnalyticsPage() {
    const [daysStr, setDaysStr] = useState('30');
    const days = Number(daysStr);

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Game Analytics</h1>
                    <p className="text-sm text-muted-foreground">
                        Игровые события сервера · таблица <code className="font-mono text-xs bg-muted px-1 rounded">game_analytics</code>
                    </p>
                </div>
                <DaysFilter value={daysStr} onChange={setDaysStr} />
            </div>

            <Tabs defaultValue="overview">
                <TabsList>
                    <TabsTrigger value="overview" className="gap-1.5">
                        <BarChart2 className="h-3.5 w-3.5" />Обзор
                    </TabsTrigger>
                    <TabsTrigger value="players" className="gap-1.5">
                        <Skull className="h-3.5 w-3.5" />Игроки
                    </TabsTrigger>
                    <TabsTrigger value="quests" className="gap-1.5">
                        <Scroll className="h-3.5 w-3.5" />Квесты
                    </TabsTrigger>
                    <TabsTrigger value="combat" className="gap-1.5">
                        <Swords className="h-3.5 w-3.5" />Бой
                    </TabsTrigger>
                    <TabsTrigger value="economy" className="gap-1.5">
                        <Coins className="h-3.5 w-3.5" />Экономика
                    </TabsTrigger>
                    <TabsTrigger value="log" className="gap-1.5">
                        <Activity className="h-3.5 w-3.5" />Лог событий
                    </TabsTrigger>
                    <TabsTrigger value="retention" className="gap-1.5">
                        <Users className="h-3.5 w-3.5" />Удержание
                    </TabsTrigger>
                </TabsList>

                <div className="mt-4">
                    <TabsContent value="overview" className="m-0">
                        <TabOverview days={days} />
                    </TabsContent>
                    <TabsContent value="players" className="m-0">
                        <TabPlayers days={days} />
                    </TabsContent>
                    <TabsContent value="quests" className="m-0">
                        <TabQuests days={days} />
                    </TabsContent>
                    <TabsContent value="combat" className="m-0">
                        <TabCombat days={days} />
                    </TabsContent>
                    <TabsContent value="economy" className="m-0">
                        <TabEconomy days={days} />
                    </TabsContent>
                    <TabsContent value="log" className="m-0">
                        <TabEventLog />
                    </TabsContent>
                    <TabsContent value="retention" className="m-0">
                        <TabRetention />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
