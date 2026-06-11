'use client';

import { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, Legend, PieChart, Pie, Cell,
} from 'recharts';
import {
    Users, Sword, ShieldBan, Wifi, ScrollText, Clock,
    TrendingUp, MapPin, Trophy, Coins,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// ─── Константы ───────────────────────────────────────────────────────────────

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#ec4899', '#14b8a6'];

const QUEST_STATE_META: Record<string, { label: string; color: string }> = {
    turned_in: { label: 'Сдан', color: '#10b981' },
    completed: { label: 'Выполнен', color: '#6366f1' },
    active: { label: 'Активен', color: '#3b82f6' },
    offered: { label: 'Предложен', color: '#f59e0b' },
    failed: { label: 'Провален', color: '#ef4444' },
};

// ─── Утилиты ─────────────────────────────────────────────────────────────────

function formatPlayTime(sec: number): string {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h === 0) return `${m}м`;
    if (h >= 100) return `${h}ч`;
    return `${h}ч ${m}м`;
}

function shortDate(iso: string): string {
    return iso.slice(5); // "YYYY-MM-DD" → "MM-DD"
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
            {payload.map((entry) => (
                <p key={entry.name} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
                    <span className="text-muted-foreground">{entry.name}:</span>
                    <span className="font-medium">{Number(entry.value).toLocaleString('ru-RU')}</span>
                </p>
            ))}
        </div>
    );
}

// ─── Overview Cards ───────────────────────────────────────────────────────────

type OverviewData = Partial<{
    totalUsers: number;
    totalCharacters: number;
    activeBans: number;
    activeSessions: number;
    totalQuestTracks: number;
    loginLast24h: number;
}>;

function StatCard({
    icon: Icon,
    label,
    value,
    sub,
    iconClass,
    isLoading,
}: {
    icon: React.ElementType;
    label: string;
    value: number | string;
    sub?: string;
    iconClass?: string;
    isLoading?: boolean;
}) {
    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className="text-xs text-muted-foreground truncate">{label}</p>
                        {isLoading ? (
                            <Skeleton className="mt-1 h-7 w-16" />
                        ) : (
                            <p className="mt-0.5 text-2xl font-bold tabular-nums">
                                {typeof value === 'number' ? value.toLocaleString('ru-RU') : value}
                            </p>
                        )}
                        {sub && !isLoading && (
                            <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
                        )}
                    </div>
                    <div className={`rounded-md p-2 ${iconClass ?? 'bg-primary/10'}`}>
                        <Icon className="h-4 w-4 text-primary" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function OverviewCards({ data, isLoading }: { data?: OverviewData; isLoading: boolean }) {
    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard icon={Users} label="Аккаунты" value={data?.totalUsers ?? 0} isLoading={isLoading} />
            <StatCard icon={Sword} label="Персонажи" value={data?.totalCharacters ?? 0} isLoading={isLoading} />
            <StatCard icon={ShieldBan} label="Активных банов" value={data?.activeBans ?? 0} isLoading={isLoading} iconClass="bg-destructive/10" />
            <StatCard icon={Wifi} label="Активных сессий" value={data?.activeSessions ?? 0} isLoading={isLoading} iconClass="bg-emerald-500/10" />
            <StatCard icon={ScrollText} label="Квест-трекеров" value={data?.totalQuestTracks ?? 0} isLoading={isLoading} />
            <StatCard icon={Clock} label="Логинов за 24ч" value={data?.loginLast24h ?? 0} isLoading={isLoading} iconClass="bg-amber-500/10" />
        </div>
    );
}

// ─── Level Distribution ───────────────────────────────────────────────────────

function LevelDistributionChart({ data, isLoading }: {
    data?: { level: number; count: number }[];
    isLoading: boolean;
}) {
    return (
        <Card className="h-full">
            <CardHeader className="pb-0">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Распределение по уровням
                </CardTitle>
                <CardDescription>Количество персонажей на каждом уровне</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
                {isLoading ? (
                    <Skeleton className="h-52 w-full" />
                ) : !data?.length ? (
                    <EmptyState />
                ) : (
                    <ResponsiveContainer width="100%" height={210}>
                        <BarChart data={data} margin={{ top: 0, right: 4, left: -20, bottom: 0 }} barSize={8}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                            <XAxis dataKey="level" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--accent))' }} />
                            <Bar dataKey="count" name="Персонажи" fill="#6366f1" radius={[3, 3, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}

// ─── Class / Race Distribution ────────────────────────────────────────────────

function HorizontalBarChart({
    title,
    description,
    icon: Icon,
    data,
    nameKey,
    isLoading,
}: {
    title: string;
    description: string;
    icon: React.ElementType;
    data?: { name: string; count: number }[];
    nameKey: string;
    isLoading: boolean;
}) {
    const total = data?.reduce((s, d) => s + d.count, 0) ?? 1;

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Icon className="h-4 w-4 text-primary" />
                    {title}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-2">
                        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-7 w-full" />)}
                    </div>
                ) : !data?.length ? (
                    <EmptyState />
                ) : (
                    <div className="space-y-2">
                        {data.map((row, i) => {
                            const pct = Math.round((row.count / total) * 100);
                            return (
                                <div key={row.name ?? 'unknown'}>
                                    <div className="mb-0.5 flex items-center justify-between text-xs">
                                        <span className="truncate font-medium">{row.name ?? '—'}</span>
                                        <span className="ml-2 tabular-nums text-muted-foreground">
                                            {row.count.toLocaleString('ru-RU')} <span className="opacity-60">({pct}%)</span>
                                        </span>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${pct}%`,
                                                backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// ─── Registration Timeline ────────────────────────────────────────────────────

function RegistrationChart({ data, isLoading }: {
    data?: { date: string; count: number }[];
    isLoading: boolean;
}) {
    const chartData = useMemo(
        () => data?.map((d) => ({ ...d, date: shortDate(d.date) })) ?? [],
        [data],
    );

    return (
        <Card className="h-full">
            <CardHeader className="pb-0">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Users className="h-4 w-4 text-primary" />
                    Регистрации (30 дней)
                </CardTitle>
                <CardDescription>Новые аккаунты за последние 30 дней</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
                {isLoading ? (
                    <Skeleton className="h-52 w-full" />
                ) : !chartData.length ? (
                    <EmptyState />
                ) : (
                    <ResponsiveContainer width="100%" height={210}>
                        <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip content={<ChartTooltip />} />
                            <Line
                                type="monotone"
                                dataKey="count"
                                name="Регистрации"
                                stroke="#6366f1"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4, fill: '#6366f1' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}

// ─── Quest State Chart ────────────────────────────────────────────────────────

function QuestStateChart({ data, isLoading }: {
    data?: { state: string; count: number }[];
    isLoading: boolean;
}) {
    const chartData = useMemo(
        () =>
            data?.map((d) => ({
                ...d,
                label: QUEST_STATE_META[d.state]?.label ?? d.state,
                color: QUEST_STATE_META[d.state]?.color ?? '#94a3b8',
            })) ?? [],
        [data],
    );
    const total = chartData.reduce((s, d) => s + d.count, 0) || 1;

    return (
        <Card className="h-full">
            <CardHeader className="pb-0">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <ScrollText className="h-4 w-4 text-primary" />
                    Статусы квестов
                </CardTitle>
                <CardDescription>Распределение квест-трекеров по состоянию</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
                {isLoading ? (
                    <Skeleton className="h-52 w-full" />
                ) : !chartData.length ? (
                    <EmptyState />
                ) : (
                    <div className="flex flex-col items-center gap-4">
                        <ResponsiveContainer width="100%" height={160}>
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    dataKey="count"
                                    nameKey="label"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={45}
                                    outerRadius={72}
                                    paddingAngle={2}
                                >
                                    {chartData.map((entry) => (
                                        <Cell key={entry.state} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (!active || !payload?.length) return null;
                                        const d = payload[0]!;
                                        return (
                                            <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-lg">
                                                <p className="font-medium">{d.name}</p>
                                                <p className="text-muted-foreground">
                                                    {Number(d.value).toLocaleString('ru-RU')} ({Math.round((Number(d.value) / total) * 100)}%)
                                                </p>
                                            </div>
                                        );
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
                            {chartData.map((d) => (
                                <span key={d.state} className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                                    {d.label}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// ─── Zone Population Heatmap ──────────────────────────────────────────────────

type ZoneRow = {
    zoneName: string;
    zoneSlug: string;
    isPvp: boolean;
    isSafeZone: boolean;
    minLevel: number;
    maxLevel: number;
    count: number;
};

function ZoneHeatmap({ data, isLoading }: { data?: ZoneRow[]; isLoading: boolean }) {
    const maxCount = useMemo(() => Math.max(...(data?.map((z) => z.count) ?? [0]), 1), [data]);

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <MapPin className="h-4 w-4 text-primary" />
                    Активность по зонам
                </CardTitle>
                <CardDescription>
                    Интенсивность цвета отражает количество персонажей в зоне (текущие позиции)
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                        {[...Array(12)].map((_, i) => <Skeleton key={i} className="h-24" />)}
                    </div>
                ) : !data?.length ? (
                    <EmptyState />
                ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                        {data.map((zone) => {
                            const intensity = zone.count / maxCount;
                            return (
                                <div
                                    key={zone.zoneSlug}
                                    className="relative overflow-hidden rounded-lg border p-3 transition-shadow hover:shadow-md"
                                    style={{
                                        background: zone.count > 0
                                            ? `linear-gradient(135deg, rgba(99,102,241,${0.08 + intensity * 0.45}) 0%, transparent 100%)`
                                            : undefined,
                                        borderColor: intensity > 0.6 ? 'rgba(99,102,241,0.5)' : undefined,
                                    }}
                                >
                                    {/* intensity bar at bottom */}
                                    {zone.count > 0 && (
                                        <div
                                            className="absolute bottom-0 left-0 h-0.5 rounded-b bg-indigo-500/70 transition-all"
                                            style={{ width: `${intensity * 100}%` }}
                                        />
                                    )}
                                    <div className="truncate text-sm font-medium">{zone.zoneName}</div>
                                    <div className="mt-1 flex items-center gap-1">
                                        <Users className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-xl font-bold tabular-nums">{zone.count}</span>
                                    </div>
                                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                                        {zone.isPvp && (
                                            <Badge variant="destructive" className="h-4 px-1 text-[10px]">PvP</Badge>
                                        )}
                                        {zone.isSafeZone && (
                                            <Badge variant="secondary" className="h-4 px-1 text-[10px]">Safe</Badge>
                                        )}
                                        <span className="text-[10px] text-muted-foreground">
                                            Lv. {zone.minLevel}–{zone.maxLevel >= 999 ? '∞' : zone.maxLevel}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// ─── Top Characters Table ─────────────────────────────────────────────────────

type TopCharRow = {
    id: number;
    name: string;
    level: number;
    className: string | null;
    raceName: string | null;
    playTimeSec: number;
    lastOnlineAt: Date | null;
};

function TopCharactersTable({ data, isLoading }: { data?: TopCharRow[]; isLoading: boolean }) {
    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Trophy className="h-4 w-4 text-primary" />
                    Топ персонажей
                </CardTitle>
                <CardDescription>По суммарному времени в игре</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                {isLoading ? (
                    <div className="space-y-2 px-6 pb-4">
                        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                    </div>
                ) : !data?.length ? (
                    <div className="px-6 pb-4"><EmptyState /></div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-8">#</TableHead>
                                <TableHead>Персонаж</TableHead>
                                <TableHead>Уровень</TableHead>
                                <TableHead>Класс</TableHead>
                                <TableHead>Раса</TableHead>
                                <TableHead className="text-right">Время</TableHead>
                                <TableHead className="text-right">Последний онлайн</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((char, idx) => (
                                <TableRow key={char.id}>
                                    <TableCell className="font-mono text-xs text-muted-foreground">{idx + 1}</TableCell>
                                    <TableCell className="font-medium">{char.name}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="tabular-nums">{char.level}</Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{char.className ?? '—'}</TableCell>
                                    <TableCell className="text-muted-foreground">{char.raceName ?? '—'}</TableCell>
                                    <TableCell className="text-right font-mono text-sm tabular-nums">
                                        {formatPlayTime(char.playTimeSec)}
                                    </TableCell>
                                    <TableCell className="text-right text-xs text-muted-foreground">
                                        {char.lastOnlineAt ? formatDate(char.lastOnlineAt.toISOString()) : '—'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}

// ─── Currency Flow ────────────────────────────────────────────────────────────

function CurrencyFlowChart({ data, isLoading }: {
    data?: { date: string; income: number; spending: number }[];
    isLoading: boolean;
}) {
    const chartData = useMemo(
        () => data?.map((d) => ({ ...d, date: shortDate(d.date) })) ?? [],
        [data],
    );

    return (
        <Card className="h-full">
            <CardHeader className="pb-0">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Coins className="h-4 w-4 text-primary" />
                    Поток валюты (14 дней)
                </CardTitle>
                <CardDescription>Приход и расход золота по дням</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
                {isLoading ? (
                    <Skeleton className="h-52 w-full" />
                ) : !chartData.length ? (
                    <EmptyState />
                ) : (
                    <>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={chartData} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} allowDecimals={false} />
                                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--accent))' }} />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <Bar dataKey="income" name="Приход" fill="#10b981" radius={[3, 3, 0, 0]} />
                                <Bar dataKey="spending" name="Расход" fill="#ef4444" radius={[3, 3, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </>
                )}
            </CardContent>
        </Card>
    );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
    return (
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground">Нет данных</p>
        </div>
    );
}

// ─── Section Divider ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {children}
        </h2>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
    const overview = trpc.analytics.overview.useQuery(undefined, { refetchInterval: 30_000 });
    const levelDist = trpc.analytics.levelDistribution.useQuery();
    const classDist = trpc.analytics.classDistribution.useQuery();
    const raceDist = trpc.analytics.raceDistribution.useQuery();
    const questStats = trpc.analytics.questStateStats.useQuery();
    const topChars = trpc.analytics.topCharacters.useQuery();
    const zonePop = trpc.analytics.zonePopulation.useQuery(undefined, { refetchInterval: 30_000 });
    const registrations = trpc.analytics.registrationsByDay.useQuery();
    const currencyFlow = trpc.analytics.currencyFlowByDay.useQuery();

    const classData = useMemo(
        () => classDist.data?.map((d) => ({ name: d.className ?? '—', count: d.count })) ?? [],
        [classDist.data],
    );
    const raceData = useMemo(
        () => raceDist.data?.map((d) => ({ name: d.raceName ?? '—', count: d.count })) ?? [],
        [raceDist.data],
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Аналитика</h1>
                <p className="text-sm text-muted-foreground">
                    Статистика игрового мира · обновляется раз в 30 сек
                </p>
            </div>

            {/* Overview */}
            <OverviewCards data={overview.data} isLoading={overview.isLoading} />

            {/* Player Distribution */}
            <div className="space-y-2">
                <SectionLabel>Прогрессия и состав</SectionLabel>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                    {/* Level Chart — wide */}
                    <div className="lg:col-span-7">
                        <LevelDistributionChart data={levelDist.data} isLoading={levelDist.isLoading} />
                    </div>
                    {/* Class + Race stacked */}
                    <div className="flex flex-col gap-4 lg:col-span-5">
                        <HorizontalBarChart
                            title="Классы"
                            description="Популярность классов среди персонажей"
                            icon={Sword}
                            data={classData}
                            nameKey="className"
                            isLoading={classDist.isLoading}
                        />
                        <HorizontalBarChart
                            title="Расы"
                            description="Популярность рас среди персонажей"
                            icon={Users}
                            data={raceData}
                            nameKey="raceName"
                            isLoading={raceDist.isLoading}
                        />
                    </div>
                </div>
            </div>

            {/* Registrations + Quest States */}
            <div className="space-y-2">
                <SectionLabel>Активность игроков</SectionLabel>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                    <div className="lg:col-span-8">
                        <RegistrationChart data={registrations.data} isLoading={registrations.isLoading} />
                    </div>
                    <div className="lg:col-span-4">
                        <QuestStateChart data={questStats.data} isLoading={questStats.isLoading} />
                    </div>
                </div>
            </div>

            {/* Zone Heatmap */}
            <div className="space-y-2">
                <SectionLabel>Зоновая активность (хитмап)</SectionLabel>
                <ZoneHeatmap data={zonePop.data} isLoading={zonePop.isLoading} />
            </div>

            {/* Leaderboard + Currency */}
            <div className="space-y-2">
                <SectionLabel>Лидерборд и экономика</SectionLabel>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                    <div className="lg:col-span-8">
                        <TopCharactersTable data={topChars.data as TopCharRow[] | undefined} isLoading={topChars.isLoading} />
                    </div>
                    <div className="lg:col-span-4">
                        <CurrencyFlowChart data={currencyFlow.data as { date: string; income: number; spending: number }[] | undefined} isLoading={currencyFlow.isLoading} />
                    </div>
                </div>
            </div>
        </div>
    );
}
