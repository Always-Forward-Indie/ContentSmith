'use client';

import { useState, useEffect } from 'react';
import {
    Users, LogOut, Search, Plus, Pencil, Trash2, X, SlidersHorizontal,
    ChevronLeft, ChevronRight, ShieldBan, ShieldCheck, Monitor, RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// Вариант badge по id роли (только стилизация, контент идёт из БД)
function roleVariant(id: number): 'outline' | 'default' | 'destructive' {
    if (id >= 2) return 'destructive';
    if (id === 1) return 'default';
    return 'outline';
}

type RoleRow = { id: number; name: string; label: string; isStaff: boolean };

function CreateAccountDialog({ onSuccess }: { onSuccess: () => void }) {
    const [open, setOpen] = useState(false);
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const create = trpc.accounts.create.useMutation({
        onSuccess: () => { setOpen(false); setLogin(''); setPassword(''); onSuccess(); toast.success('Аккаунт создан'); },
        onError: (e) => toast.error(e.message),
    });
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />Создать аккаунт</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader><DialogTitle>Создать аккаунт</DialogTitle><DialogDescription>Новый игровой аккаунт без персонажа.</DialogDescription></DialogHeader>
                <div className="space-y-3 py-2">
                    <div className="space-y-1.5"><Label htmlFor="c-login">Логин</Label><Input id="c-login" value={login} onChange={e => setLogin(e.target.value)} placeholder="player123" /></div>
                    <div className="space-y-1.5"><Label htmlFor="c-pass">Пароль</Label><Input id="c-pass" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" /></div>
                    {create.error && <p className="text-xs text-destructive">{create.error.message}</p>}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function EditAccountDialog({ userId, currentLogin, onSuccess }: { userId: number; currentLogin: string; onSuccess: () => void }) {
    const [open, setOpen] = useState(false);
    const [login, setLogin] = useState(currentLogin);
    const [password, setPassword] = useState('');
    const update = trpc.accounts.update.useMutation({
        onSuccess: () => { setOpen(false); setPassword(''); onSuccess(); toast.success('Аккаунт обновлён'); },
        onError: (e) => toast.error(e.message),
    });
    return (
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (v) { setLogin(currentLogin); setPassword(''); } }}>
            <DialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-3.5 w-3.5" /></Button></DialogTrigger>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader><DialogTitle>Редактировать #{userId}</DialogTitle><DialogDescription>Оставьте поле пустым чтобы не менять.</DialogDescription></DialogHeader>
                <div className="space-y-3 py-2">
                    <div className="space-y-1.5"><Label>Логин</Label><Input value={login} onChange={e => setLogin(e.target.value)} /></div>
                    <div className="space-y-1.5"><Label>Новый пароль</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Оставьте пустым" /></div>
                    {update.error && <p className="text-xs text-destructive">{update.error.message}</p>}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
                    <Button disabled={update.isLoading} onClick={() => update.mutate({ userId, login: login || undefined, password: password || undefined })}>{update.isLoading ? 'Сохраняем...' : 'Сохранить'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function SetRoleDialog({ userId, currentRole, roles, onSuccess }: { userId: number; currentRole: number; roles: RoleRow[]; onSuccess: () => void }) {
    const [open, setOpen] = useState(false);
    const [role, setRole] = useState(String(currentRole));
    const setRoleMut = trpc.accounts.setRole.useMutation({
        onSuccess: () => { setOpen(false); onSuccess(); toast.success('Роль изменена'); },
        onError: (e) => toast.error(e.message),
    });
    const currentLabel = roles.find(r => r.id === currentRole)?.label ?? `Роль ${currentRole}`;
    return (
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (v) setRole(String(currentRole)); }}>
            <DialogTrigger asChild>
                <button className="inline-flex">
                    <Badge variant={roleVariant(currentRole)} className="text-xs cursor-pointer hover:opacity-80">
                        {currentLabel}
                    </Badge>
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xs">
                <DialogHeader><DialogTitle>Роль #{userId}</DialogTitle><DialogDescription>Роль определяет доступ к GM Panel.</DialogDescription></DialogHeader>
                <Select value={role} onValueChange={setRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {roles.map(r => (
                            <SelectItem key={r.id} value={String(r.id)}>{r.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
                    <Button disabled={setRoleMut.isLoading || Number(role) === currentRole} onClick={() => setRoleMut.mutate({ userId, role: Number(role) })}>Сохранить</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function BanDialog({ userId, login, onSuccess }: { userId: number; login: string; onSuccess: () => void }) {
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState('');
    const [expiresAt, setExpiresAt] = useState('');
    const ban = trpc.bans.ban.useMutation({
        onSuccess: () => { setOpen(false); setReason(''); setExpiresAt(''); onSuccess(); toast.success('Аккаунт заблокирован'); },
        onError: (e) => toast.error(e.message),
    });
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" title="Заблокировать">
                    <ShieldBan className="h-3.5 w-3.5" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader><DialogTitle>Заблок. «{login}»</DialogTitle><DialogDescription>Аккаунт будет заблокирован. Все сессии завершены.</DialogDescription></DialogHeader>
                <div className="space-y-3 py-2">
                    <div className="space-y-1.5">
                        <Label>Причина <span className="text-destructive">*</span></Label>
                        <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Нарушение правил..." />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Срок <span className="text-muted-foreground text-xs">(пусто = навсегда)</span></Label>
                        <Input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
                    </div>
                    {ban.error && <p className="text-xs text-destructive">{ban.error.message}</p>}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function SessionsDialog({ userId, login }: { userId: number; login: string }) {
    const [open, setOpen] = useState(false);
    const { data: sessions, isLoading, refetch } = trpc.sessions.listByUser.useQuery({ userId }, { enabled: open });
    const revokeAll = trpc.sessions.revokeAll.useMutation({ onSuccess: () => { refetch(); toast.success('Все сессии отозваны'); }, onError: (e) => toast.error(e.message) });
    const revoke = trpc.sessions.revoke.useMutation({ onSuccess: () => { refetch(); toast.success('Сессия отозвана'); }, onError: (e) => toast.error(e.message) });
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Активные сессии"><Monitor className="h-3.5 w-3.5" /></Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>Сессии «{login}»</DialogTitle><DialogDescription>Активные сессии. Можно отозвать каждую или все сразу.</DialogDescription></DialogHeader>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                    {isLoading ? <Skeleton className="h-16 w-full" />
                        : (sessions ?? []).length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">Активных сессий нет</p>
                            : (sessions ?? []).map(s => (
                                <div key={s.id} className="flex items-start justify-between rounded-md border px-3 py-2 text-sm">
                                    <div className="space-y-0.5 min-w-0">
                                        <p className="font-mono text-xs text-muted-foreground">{s.ip ?? 'IP неизвестен'}</p>
                                        <p className="text-xs text-muted-foreground truncate max-w-xs">{s.userAgent ?? '—'}</p>
                                        <p className="text-xs text-muted-foreground">Создана: {formatDate(s.createdAt)} · Истекает: {formatDate(s.expiresAt)}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                                        onClick={() => revoke.mutate({ sessionId: Number(s.id) })} disabled={revoke.isLoading}>
                                        <X className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            ))}
                </div>
                {(sessions ?? []).length > 0 && (
                    <DialogFooter>
                        <Button variant="destructive" size="sm" className="gap-1.5" disabled={revokeAll.isLoading} onClick={() => revokeAll.mutate({ userId })}>
                            <RotateCcw className="h-3.5 w-3.5" />Отозвать все ({(sessions ?? []).length})
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}

export default function AccountsPage() {
    const [searchInput, setSearchInput] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [showFilters, setShowFilters] = useState(false);
    const [filterHasChar, setFilterHasChar] = useState<'all' | 'yes' | 'no'>('all');

    useEffect(() => {
        const t = setTimeout(() => { setSearchTerm(searchInput); setPage(1); }, 350);
        return () => clearTimeout(t);
    }, [searchInput]);

    const { data, isLoading, refetch } = trpc.accounts.list.useQuery({ page, search: searchTerm || undefined, hasCharacter: filterHasChar });
    const { data: roles } = trpc.accounts.allRoles.useQuery();
    const kick = trpc.accounts.kick.useMutation({ onSuccess: () => { refetch(); toast.success('Игрок кикнут'); }, onError: (e) => toast.error(e.message) });
    const del = trpc.accounts.delete.useMutation({ onSuccess: () => { refetch(); toast.success('Аккаунт удалён'); }, onError: (e) => toast.error(e.message) });
    const unban = trpc.bans.unban.useMutation({ onSuccess: () => { refetch(); toast.success('Блокировка снята'); }, onError: (e) => toast.error(e.message) });

    const rows = data?.data ?? [];
    const pagination = data?.pagination;
    const activeFilterCount = [filterHasChar !== 'all'].filter(Boolean).length;
    const clearFilters = () => { setFilterHasChar('all'); setPage(1); };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary"><Users className="h-5 w-5" /></div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Аккаунты</h1>
                    <p className="text-sm text-muted-foreground">Список игровых аккаунтов</p>
                </div>
                <div className="ml-auto flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">{pagination ? `${pagination.total} аккаунтов` : ''}</span>
                    <CreateAccountDialog onSuccess={() => refetch()} />
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input placeholder="Поиск по логину..." value={searchInput} onChange={e => setSearchInput(e.target.value)} className="pl-8 pr-8" />
                            {searchInput && (
                                <button onClick={() => { setSearchInput(''); setSearchTerm(''); setPage(1); }}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                        <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => setShowFilters(p => !p)}>
                            <SlidersHorizontal className="h-4 w-4" />Фильтры
                            {activeFilterCount > 0 && <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-medium">{activeFilterCount}</span>}
                        </Button>
                        {activeFilterCount > 0 && (
                            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={clearFilters}><X className="h-3.5 w-3.5" />Сбросить</Button>
                        )}
                    </div>
                    {showFilters && (
                        <div className="mt-3 rounded-lg border bg-muted/30 p-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Персонажи</p>
                                    <Select value={filterHasChar} onValueChange={v => { setFilterHasChar(v as 'all' | 'yes' | 'no'); setPage(1); }}>
                                        <SelectTrigger className="h-8 bg-background"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Все аккаунты</SelectItem>
                                            <SelectItem value="yes">Есть персонаж</SelectItem>
                                            <SelectItem value="no">Нет персонажа</SelectItem>
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
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>Логин</TableHead>
                                <TableHead>Роль</TableHead>
                                <TableHead className="text-center">Персонажей</TableHead>
                                <TableHead>Последний вход</TableHead>
                                <TableHead>Зарегистрирован</TableHead>
                                <TableHead className="text-right">Действия</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                                ))
                            ) : rows.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Аккаунты не найдены</TableCell></TableRow>
                            ) : rows.map(row => {
                                const isBanned = !row.isActive;
                                return (
                                    <TableRow key={row.userId} className={isBanned ? 'opacity-60' : ''}>
                                        <TableCell className="font-mono text-xs text-muted-foreground">{row.userId}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{row.login}</span>
                                                {isBanned && <Badge variant="destructive" className="text-[10px] px-1 py-0 gap-0.5"><ShieldBan className="h-2.5 w-2.5" />БАН</Badge>}
                                            </div>
                                        </TableCell>
                                        <TableCell><SetRoleDialog userId={row.userId} currentRole={row.role ?? 0} roles={roles ?? []} onSuccess={() => refetch()} /></TableCell>
                                        <TableCell className="text-center">
                                            {(row.characterCount ?? 0) > 0 ? <span className="font-mono text-sm font-medium">{row.characterCount}</span> : <span className="text-muted-foreground text-xs">0</span>}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(row.lastLogin)}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(row.createdAt)}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-0.5">
                                                <EditAccountDialog userId={row.userId} currentLogin={row.login} onSuccess={() => refetch()} />
                                                <SessionsDialog userId={row.userId} login={row.login} />
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-600 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950" disabled={kick.isLoading} title="Кик">
                                                            <LogOut className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader><AlertDialogTitle>Кикнуть «{row.login}»?</AlertDialogTitle><AlertDialogDescription>Игрок будет принудительно отключён (сессионный ключ сброшен).</AlertDialogDescription></AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => kick.mutate({ userId: row.userId })}>Кикнуть</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                                {isBanned ? (
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950" title="Снять бан">
                                                                <ShieldCheck className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader><AlertDialogTitle>Снять бан с «{row.login}»?</AlertDialogTitle><AlertDialogDescription>Аккаунт будет разблокирован.</AlertDialogDescription></AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Отмена</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => unban.mutate({ userId: row.userId })}>Разблокировать</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                ) : (
                                                    <BanDialog userId={row.userId} login={row.login} onSuccess={() => refetch()} />
                                                )}
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" disabled={del.isLoading}>
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader><AlertDialogTitle>Удалить «{row.login}»?</AlertDialogTitle><AlertDialogDescription>Аккаунт и все его персонажи будут удалены безвозвратно.</AlertDialogDescription></AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => del.mutate({ userId: row.userId })}>Удалить</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
                {pagination && (
                    <div className="flex items-center justify-between px-4 py-3 border-t">
                        <p className="text-sm text-muted-foreground">{(pagination.page - 1) * pagination.pageSize + 1}-{Math.min(pagination.page * pagination.pageSize, pagination.total)} из {pagination.total}</p>
                        {pagination.totalPages > 1 && (
                            <div className="flex items-center gap-1">
                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
                                <span className="text-sm font-medium px-2">{page} / {pagination.totalPages}</span>
                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(p => p + 1)} disabled={page >= pagination.totalPages}><ChevronRight className="h-4 w-4" /></Button>
                            </div>
                        )}
                    </div>
                )}
            </Card>
        </div>
    );
}
