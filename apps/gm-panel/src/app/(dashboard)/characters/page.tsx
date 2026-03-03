'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sword, Search, Skull, Plus, Trash2, X, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// ── Диалог создания персонажа ─────────────────────────────────────────────────
function CreateCharacterDialog({ onSuccess }: { onSuccess: () => void }) {
    const [open, setOpen] = useState(false);
    const [ownerId, setOwnerId] = useState('');
    const [name, setName] = useState('');
    const [classId, setClassId] = useState('');
    const [raceId, setRaceId] = useState('');
    const [level, setLevel] = useState('1');

    const { data: classes } = trpc.accounts.allClasses.useQuery();
    const { data: races } = trpc.accounts.allRaces.useQuery();
    const create = trpc.characters.create.useMutation({
        onSuccess: () => { setOpen(false); setName(''); setOwnerId(''); setClassId(''); setRaceId(''); setLevel('1'); onSuccess(); toast.success('Персонаж создан'); },
        onError: (e) => toast.error(e.message),
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />Создать персонажа</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Создать персонажа</DialogTitle>
                    <DialogDescription>Новый персонаж для существующего аккаунта.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="cc-owner">ID аккаунта владельца</Label>
                        <Input id="cc-owner" type="number" value={ownerId} onChange={e => setOwnerId(e.target.value)} placeholder="5" />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="cc-name">Имя персонажа</Label>
                        <Input id="cc-name" value={name} onChange={e => setName(e.target.value)} placeholder="Hero" maxLength={20} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label>Класс</Label>
                            <Select value={classId} onValueChange={setClassId}>
                                <SelectTrigger><SelectValue placeholder="Выбрать..." /></SelectTrigger>
                                <SelectContent>
                                    {(classes ?? []).map(c => (
                                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Раса</Label>
                            <Select value={raceId} onValueChange={setRaceId}>
                                <SelectTrigger><SelectValue placeholder="Выбрать..." /></SelectTrigger>
                                <SelectContent>
                                    {(races ?? []).map(r => (
                                        <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="cc-level">Уровень</Label>
                        <Input id="cc-level" type="number" min={1} value={level} onChange={e => setLevel(e.target.value)} />
                    </div>
                    {create.error && <p className="text-xs text-destructive">{create.error.message}</p>}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
                    <Button
                        disabled={!name || !ownerId || !classId || !raceId || create.isLoading}
                        onClick={() => create.mutate({ name, ownerId: Number(ownerId), classId: Number(classId), raceId: Number(raceId), level: Number(level) })}
                    >
                        {create.isLoading ? 'Создаём...' : 'Создать'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ── Страница списка персонажей ─────────────────────────────────────────────────
export default function CharactersPage() {
    const [searchInput, setSearchInput] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [showFilters, setShowFilters] = useState(false);
    const [filterClassId, setFilterClassId] = useState<string>('all');
    const [filterRaceId, setFilterRaceId] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'alive' | 'dead'>('all');

    useEffect(() => {
        const t = setTimeout(() => { setSearchTerm(searchInput); setPage(1); }, 350);
        return () => clearTimeout(t);
    }, [searchInput]);

    const { data, isLoading, refetch } = trpc.accounts.listCharacters.useQuery({
        page,
        search: searchTerm || undefined,
        classId: filterClassId !== 'all' ? Number(filterClassId) : undefined,
        raceId: filterRaceId !== 'all' ? Number(filterRaceId) : undefined,
        status: filterStatus,
    });
    const { data: classes } = trpc.accounts.allClasses.useQuery();
    const { data: races } = trpc.accounts.allRaces.useQuery();
    const del = trpc.characters.delete.useMutation({
        onSuccess: () => { refetch(); toast.success('Персонаж удалён'); },
        onError: (e) => toast.error(e.message),
    });

    const rows = data?.data ?? [];
    const pagination = data?.pagination;
    const activeFilterCount = [filterClassId !== 'all', filterRaceId !== 'all', filterStatus !== 'all'].filter(Boolean).length;

    const clearFilters = () => {
        setFilterClassId('all');
        setFilterRaceId('all');
        setFilterStatus('all');
        setPage(1);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
                    <Sword className="h-5 w-5" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Персонажи</h1>
                    <p className="text-sm text-muted-foreground">Все игровые персонажи</p>
                </div>
                <div className="ml-auto flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                        {pagination ? `${pagination.total} персонажей` : ''}
                    </span>
                    <CreateCharacterDialog onSuccess={() => refetch()} />
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input
                                placeholder="Поиск по имени, логину, классу..."
                                value={searchInput}
                                onChange={e => setSearchInput(e.target.value)}
                                className="pl-8 pr-8"
                            />
                            {searchInput && (
                                <button
                                    onClick={() => { setSearchInput(''); setSearchTerm(''); setPage(1); }}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                        <Button
                            variant={showFilters || activeFilterCount > 0 ? 'secondary' : 'outline'}
                            size="sm"
                            className="gap-1.5 shrink-0"
                            onClick={() => setShowFilters(v => !v)}
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                            Фильтры
                            {activeFilterCount > 0 && (
                                <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-medium">
                                    {activeFilterCount}
                                </span>
                            )}
                        </Button>
                        {activeFilterCount > 0 && (
                            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={clearFilters}>
                                <X className="h-3.5 w-3.5" />
                                Сбросить
                            </Button>
                        )}
                    </div>
                    {showFilters && (
                        <div className="mt-3 rounded-lg border bg-muted/30 p-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Класс</p>
                                    <Select value={filterClassId} onValueChange={v => { setFilterClassId(v); setPage(1); }}>
                                        <SelectTrigger className="h-8 bg-background"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Все классы</SelectItem>
                                            {(classes ?? []).map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Раса</p>
                                    <Select value={filterRaceId} onValueChange={v => { setFilterRaceId(v); setPage(1); }}>
                                        <SelectTrigger className="h-8 bg-background"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Все расы</SelectItem>
                                            {(races ?? []).map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Статус</p>
                                    <Select value={filterStatus} onValueChange={v => { setFilterStatus(v as 'all' | 'alive' | 'dead'); setPage(1); }}>
                                        <SelectTrigger className="h-8 bg-background"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Любой</SelectItem>
                                            <SelectItem value="alive">Живой</SelectItem>
                                            <SelectItem value="dead">Мёртв</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    )}
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">ID</TableHead>
                                <TableHead>Персонаж</TableHead>
                                <TableHead>Аккаунт</TableHead>
                                <TableHead>Класс</TableHead>
                                <TableHead>Раса</TableHead>
                                <TableHead className="text-center">Уровень</TableHead>
                                <TableHead>Статус</TableHead>
                                <TableHead>Создан</TableHead>
                                <TableHead>Активность</TableHead>
                                <TableHead className="w-12 text-right">Удалить</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={i}>
                                        {Array.from({ length: 10 }).map((_, j) => (
                                            <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                                        Персонажи не найдены
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rows.map(row => (
                                    <TableRow key={row.characterId}>
                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            {row.characterId}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <Link href={`/characters/${row.characterId}`} className="text-primary hover:underline">
                                                {row.characterName}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            <Link href="/accounts" className="hover:text-foreground">
                                                {row.login}
                                            </Link>
                                        </TableCell>
                                        <TableCell>{row.className ?? '—'}</TableCell>
                                        <TableCell>{row.raceName ?? '—'}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary">{row.level}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            {row.isDead ? (
                                                <Badge variant="destructive" className="gap-1">
                                                    <Skull className="h-3 w-3" />Мёртв
                                                </Badge>
                                            ) : (
                                                <Badge variant="success">Живой</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                            {formatDate(row.createdAt)}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                            {formatDate(row.lastOnlineAt) ?? <span className="italic">никогда</span>}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        disabled={del.isLoading}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Удалить «{row.characterName}»?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Персонаж будет удалён безвозвратно, вместе со всеми данными.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => del.mutate({ characterId: row.characterId! })}>
                                                            Удалить
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
                {!isLoading && rows.length > 0 && pagination && (
                    <div className="flex items-center justify-between px-4 py-3 border-t">
                        <p className="text-sm text-muted-foreground">
                            {(pagination.page - 1) * pagination.pageSize + 1}–{Math.min(pagination.page * pagination.pageSize, pagination.total)} из {pagination.total}
                        </p>
                        {pagination.totalPages > 1 && (
                            <div className="flex items-center gap-1">
                                <Button variant="outline" size="icon" className="h-8 w-8"
                                    onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-sm font-medium px-2">{page} / {pagination.totalPages}</span>
                                <Button variant="outline" size="icon" className="h-8 w-8"
                                    onClick={() => setPage(p => p + 1)} disabled={page >= pagination.totalPages}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </Card>
        </div>
    );
}
