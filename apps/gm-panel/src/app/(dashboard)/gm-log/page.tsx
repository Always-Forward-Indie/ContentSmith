'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ScrollText } from 'lucide-react';

const TARGET_TYPE_LABELS: Record<string, string> = {
    user: 'Пользователь',
    character: 'Персонаж',
    item: 'Предмет',
};

function formatValue(val: unknown): string {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'object') return JSON.stringify(val, null, 2);
    return String(val);
}

function ValueCell({ label, value }: { label: string; value: unknown }) {
    const [expanded, setExpanded] = useState(false);
    if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>;
    const str = formatValue(value);
    const isLong = str.length > 40;
    if (!isLong) return <span className="font-mono text-xs">{str}</span>;
    return (
        <div>
            <button
                className="text-xs text-primary underline underline-offset-2 hover:no-underline"
                onClick={() => setExpanded(p => !p)}
            >
                {expanded ? 'Скрыть' : 'Показать'}
            </button>
            {expanded && (
                <pre className="mt-1 text-xs font-mono whitespace-pre-wrap bg-muted rounded p-2 max-w-xs overflow-auto">
                    {str}
                </pre>
            )}
        </div>
    );
}

export default function GmLogPage() {
    const [page, setPage] = useState(1);
    const [filterAction, setFilterAction] = useState('');
    const [filterTarget, setFilterTarget] = useState('');
    const limit = 50;

    const { data: logs, isLoading } = trpc.gmLog.list.useQuery({
        page,
        actionType: filterAction || undefined,
        targetType: filterTarget || undefined,
    });

    const { data: actionTypes } = trpc.gmLog.actionTypes.useQuery();

    const hasMore = (logs?.data?.length ?? 0) === limit;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                    <ScrollText className="h-5 w-5" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold">Журнал действий GM</h1>
                    <p className="text-sm text-muted-foreground">Аудит всех административных операций</p>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-4 pb-4">
                    <div className="flex flex-wrap gap-3 items-end">
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Тип действия</p>
                            <Select
                                value={filterAction}
                                onValueChange={(v) => { setFilterAction(v === '__all__' ? '' : v); setPage(1); }}
                            >
                                <SelectTrigger className="w-52 h-8 text-sm">
                                    <SelectValue placeholder="Все действия" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__all__">Все действия</SelectItem>
                                    {(actionTypes ?? []).map(at => (
                                        <SelectItem key={at} value={at}>{at}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Тип цели</p>
                            <Select
                                value={filterTarget}
                                onValueChange={(v) => { setFilterTarget(v === '__all__' ? '' : v); setPage(1); }}
                            >
                                <SelectTrigger className="w-36 h-8 text-sm">
                                    <SelectValue placeholder="Все" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__all__">Все</SelectItem>
                                    <SelectItem value="user">Пользователь</SelectItem>
                                    <SelectItem value="character">Персонаж</SelectItem>
                                    <SelectItem value="item">Предмет</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1 flex-1 min-w-0">
                            <p className="text-xs font-medium text-muted-foreground">Фильтр по тексту действия</p>
                            <Input
                                className="h-8 text-sm"
                                placeholder="ban_user, kick_user..."
                                value={filterAction}
                                onChange={e => { setFilterAction(e.target.value); setPage(1); }}
                            />
                        </div>
                        {(filterAction || filterTarget) && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8"
                                onClick={() => { setFilterAction(''); setFilterTarget(''); setPage(1); }}
                            >
                                Сбросить
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardHeader className="pb-0">
                    <CardTitle className="text-base">
                        Записи{' '}
                        {!isLoading && (
                            <span className="text-sm font-normal text-muted-foreground">
                                стр. {page}
                            </span>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-16">ID</TableHead>
                                <TableHead className="w-28">GM</TableHead>
                                <TableHead>Действие</TableHead>
                                <TableHead className="w-28">Тип цели</TableHead>
                                <TableHead className="w-20">ID цели</TableHead>
                                <TableHead className="w-36">Было</TableHead>
                                <TableHead className="w-36">Стало</TableHead>
                                <TableHead className="w-40">Дата</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 10 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={8}><Skeleton className="h-7 w-full" /></TableCell>
                                    </TableRow>
                                ))
                            ) : (logs?.data ?? []).length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                                        Записей не найдено
                                    </TableCell>
                                </TableRow>
                            ) : (logs?.data ?? []).map(log => (
                                <TableRow key={log.id}>
                                    <TableCell className="font-mono text-xs text-muted-foreground">{log.id}</TableCell>
                                    <TableCell className="text-sm">
                                        {log.gmLogin ? (
                                            <span className="font-medium">{log.gmLogin}</span>
                                        ) : (
                                            <span className="text-muted-foreground italic text-xs">система</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="font-mono text-xs">
                                            {log.actionType}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {log.targetType ? (TARGET_TYPE_LABELS[log.targetType] ?? log.targetType) : '—'}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                        {log.targetId ?? '—'}
                                    </TableCell>
                                    <TableCell>
                                        <ValueCell label="было" value={log.oldValue} />
                                    </TableCell>
                                    <TableCell>
                                        <ValueCell label="стало" value={log.newValue} />
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {formatDate(log.createdAt)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Pagination */}
            <div className="flex items-center justify-between">
                <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                >
                    <ChevronLeft className="h-4 w-4" />Назад
                </Button>
                <span className="text-sm text-muted-foreground">Страница {page}</span>
                <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={!hasMore}
                    onClick={() => setPage(p => p + 1)}
                >
                    Вперёд<ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
