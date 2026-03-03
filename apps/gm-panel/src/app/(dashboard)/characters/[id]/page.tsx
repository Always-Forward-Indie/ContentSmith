'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import {
    ChevronRight, Sword, HeartPulse, Zap, Skull, Trash2, Plus, Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

// ─── Вспомогательный компонент для редактирования атрибутов ──────────────────
type AttrRowData = {
    id?: number | null;
    attributeId?: number | null;
    attributeName?: string | null;
    attributeSlug?: string | null;
    value?: string | null;
};

function AttrRow({ attr, onSave, onDelete, isSaving }: {
    attr: AttrRowData;
    onSave: (val: number) => void;
    onDelete: () => void;
    isSaving: boolean;
}) {
    const [val, setVal] = useState(attr.value ?? '0');
    const dirty = val !== (attr.value ?? '0');

    return (
        <TableRow>
            <TableCell className="font-medium">{attr.attributeName}</TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">{attr.attributeSlug}</TableCell>
            <TableCell>
                <Input
                    type="number"
                    value={val}
                    onChange={e => setVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && dirty && !isSaving) onSave(Number(val)); }}
                    className="h-7 w-28 text-sm font-mono"
                />
            </TableCell>
            <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                    <Button
                        size="sm"
                        variant={dirty ? 'default' : 'outline'}
                        className="h-7 text-xs"
                        disabled={!dirty || isSaving}
                        onClick={() => onSave(Number(val))}
                    >
                        Сохранить
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Удалить атрибут «{attr.attributeName}»?</AlertDialogTitle>
                                <AlertDialogDescription>Значение атрибута будет удалено у персонажа.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Отмена</AlertDialogCancel>
                                <AlertDialogAction onClick={onDelete}>Удалить</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </TableCell>
        </TableRow>
    );
}

// ─── Редактировать персонажа ──────────────────────────────────────────────────
function EditCharacterDialog({ char, onSuccess }: {
    char: { id: number; name: string; classId: number | null; raceId: number | null; currentHealth: number | null; currentMana: number | null; isDead: boolean | null; level: number | null; experiencePoints?: number | null; freeSkillPoints?: number | null; gender?: number | null; ownerId: number; ownerLogin?: string | null };
    onSuccess: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState(char.name);
    const [classId, setClassId] = useState(String(char.classId ?? ''));
    const [raceId, setRaceId] = useState(String(char.raceId ?? ''));
    const [hp, setHp] = useState(String(char.currentHealth ?? 0));
    const [mp, setMp] = useState(String(char.currentMana ?? 0));
    const [level, setLevel] = useState(String(char.level ?? 1));
    const [exp, setExp] = useState(String(char.experiencePoints ?? 0));
    const [sp, setSp] = useState(String(char.freeSkillPoints ?? 0));
    const [gender, setGender] = useState(String(char.gender ?? 0));
    const [isDead, setIsDead] = useState(String(char.isDead ? 'true' : 'false'));
    const [ownerId, setOwnerId] = useState(String(char.ownerId));

    const { data: classes } = trpc.accounts.allClasses.useQuery();
    const { data: races } = trpc.accounts.allRaces.useQuery();
    const { data: genders } = trpc.accounts.allGenders.useQuery();
    const update = trpc.characters.update.useMutation({
        onSuccess: () => { setOpen(false); onSuccess(); toast.success('Персонаж обновлён'); },
        onError: (e) => toast.error(e.message),
    });

    const reset = () => {
        setName(char.name);
        setClassId(String(char.classId ?? ''));
        setRaceId(String(char.raceId ?? ''));
        setHp(String(char.currentHealth ?? 0));
        setMp(String(char.currentMana ?? 0));
        setLevel(String(char.level ?? 1));
        setExp(String(char.experiencePoints ?? 0));
        setSp(String(char.freeSkillPoints ?? 0));
        setGender(String(char.gender ?? 0));
        setIsDead(char.isDead ? 'true' : 'false');
        setOwnerId(String(char.ownerId));
    };

    return (
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (v) reset(); }}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5">
                    <Pencil className="h-3.5 w-3.5" />Редактировать
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Редактировать персонажа #{char.id}</DialogTitle>
                    <DialogDescription>Изменить базовые поля.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                    <div className="space-y-1.5">
                        <Label>Имя</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} maxLength={20} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label>Класс</Label>
                            <Select value={classId} onValueChange={setClassId}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {(classes ?? []).map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Раса</Label>
                            <Select value={raceId} onValueChange={setRaceId}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {(races ?? []).map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                        <div className="space-y-1.5">
                            <Label>HP</Label>
                            <Input type="number" min={0} value={hp} onChange={e => setHp(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>MP</Label>
                            <Input type="number" min={0} value={mp} onChange={e => setMp(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Уровень</Label>
                            <Input type="number" min={1} value={level} onChange={e => setLevel(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Статус</Label>
                            <Select value={isDead} onValueChange={setIsDead}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="false">Живой</SelectItem>
                                    <SelectItem value="true">Мёртв</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label>Опыт</Label>
                            <Input type="number" min={0} value={exp} onChange={e => setExp(e.target.value)}
                                placeholder="Оставьте если меняете уровень" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Своб. SP</Label>
                            <Input type="number" min={0} value={sp} onChange={e => setSp(e.target.value)} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label>Пол</Label>
                            <Select value={gender} onValueChange={setGender}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {(genders ?? []).map(g => <SelectItem key={g.id} value={String(g.id)}>{g.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>ID владельца</Label>
                            <Input type="number" min={1} value={ownerId} onChange={e => setOwnerId(e.target.value)}
                                placeholder={String(char.ownerId)} />
                        </div>
                    </div>
                    {update.error && <p className="text-xs text-destructive">{update.error.message}</p>}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
                    <Button
                        disabled={update.isLoading}
                        onClick={() => update.mutate({
                            characterId: char.id,
                            name: name || undefined,
                            classId: classId ? Number(classId) : undefined,
                            raceId: raceId ? Number(raceId) : undefined,
                            currentHealth: hp !== '' ? Number(hp) : undefined,
                            currentMana: mp !== '' ? Number(mp) : undefined,
                            level: level !== '' ? Number(level) : undefined,
                            experiencePoints: exp !== '' ? Number(exp) : undefined,
                            freeSkillPoints: sp !== '' ? Number(sp) : undefined,
                            gender: gender !== '' ? Number(gender) : undefined,
                            isDead: isDead === 'true',
                            ownerId: ownerId !== '' && Number(ownerId) !== char.ownerId ? Number(ownerId) : undefined,
                        })}
                    >
                        {update.isLoading ? 'Сохраняем...' : 'Сохранить'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Главная страница ─────────────────────────────────────────────────────────

function formatPlayTime(sec: number | null | undefined): string {
    if (!sec) return '—';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h >= 1) return `${h} ч ${m} м`;
    return `${m} м`;
}

export default function CharacterPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const characterId = Number(id);

    const { data: char, isLoading: charLoading, refetch: refetchChar } = trpc.characters.byId.useQuery({ characterId });
    const { data: attrs, isLoading: attrsLoading, refetch: refetchAttrs } = trpc.attributes.list.useQuery({ characterId });
    const { data: allAttrs } = trpc.attributes.allAttributes.useQuery();
    const { data: inventory, isLoading: invLoading, refetch: refetchInv } = trpc.inventory.list.useQuery({ characterId });
    const { data: allItems } = trpc.inventory.allItems.useQuery();
    const { data: quests, isLoading: questsLoading, refetch: refetchQuests } = trpc.quests.list.useQuery({ characterId });
    const { data: allQuests } = trpc.quests.allQuests.useQuery();
    const { data: flags, isLoading: flagsLoading, refetch: refetchFlags } = trpc.flags.list.useQuery({ characterId });
    const { data: effects, isLoading: effectsLoading, refetch: refetchEffects } = trpc.effects.list.useQuery({ characterId });
    const { data: allEffects } = trpc.effects.allEffects.useQuery();
    const { data: skills, isLoading: skillsLoading, refetch: refetchSkills } = trpc.skills.list.useQuery({ characterId });
    const { data: allSkills } = trpc.skills.allSkills.useQuery();
    const { data: equipment, isLoading: equipLoading, refetch: refetchEquip } = trpc.equipment.list.useQuery({ characterId });
    const { data: allSlots } = trpc.equipment.allSlots.useQuery();
    const { data: txData, isLoading: txLoading, refetch: refetchTx } = trpc.transactions.list.useQuery({ characterId });
    const { data: balanceData, refetch: refetchBalance } = trpc.transactions.balance.useQuery({ characterId });
    const { data: genders } = trpc.accounts.allGenders.useQuery();

    // ── Mutations ──
    const revive = trpc.characters.revive.useMutation({ onSuccess: () => { refetchChar(); toast.success('Персонаж воскрешён'); }, onError: (e) => toast.error(e.message) });
    const delChar = trpc.characters.delete.useMutation({ onSuccess: () => { toast.success('Персонаж удалён'); router.push('/characters'); }, onError: (e) => toast.error(e.message) });

    const setValue = trpc.attributes.setValue.useMutation({ onSuccess: () => { refetchAttrs(); toast.success('Атрибут сохранён'); }, onError: (e) => toast.error(e.message) });
    const delAttr = trpc.attributes.deleteAttribute.useMutation({ onSuccess: () => { refetchAttrs(); toast.success('Атрибут удалён'); }, onError: (e) => toast.error(e.message) });
    const addAttr = trpc.attributes.addAttribute.useMutation({ onSuccess: () => { refetchAttrs(); toast.success('Атрибут добавлен'); }, onError: (e) => toast.error(e.message) });

    const giveItem = trpc.inventory.giveItem.useMutation({ onSuccess: () => { refetchInv(); toast.success('Предмет выдан'); }, onError: (e) => toast.error(e.message) });
    const removeItem = trpc.inventory.removeItem.useMutation({ onSuccess: () => { refetchInv(); toast.success('Предмет удалён'); }, onError: (e) => toast.error(e.message) });
    const updateQty = trpc.inventory.updateQuantity.useMutation({ onSuccess: () => { refetchInv(); toast.success('Количество обновлено'); }, onError: (e) => toast.error(e.message) });

    const assignQuest = trpc.quests.assignQuest.useMutation({ onSuccess: () => { refetchQuests(); toast.success('Квест назначен'); }, onError: (e) => toast.error(e.message) });
    const resetQuest = trpc.quests.resetQuest.useMutation({ onSuccess: () => { refetchQuests(); toast.success('Квест удалён'); }, onError: (e) => toast.error(e.message) });
    const completeQuest = trpc.quests.completeQuest.useMutation({ onSuccess: () => { refetchQuests(); toast.success('Квест завершён'); }, onError: (e) => toast.error(e.message) });
    const setState = trpc.quests.setState.useMutation({ onSuccess: () => { refetchQuests(); toast.success('Статус изменён'); }, onError: (e) => toast.error(e.message) });
    const setStep = trpc.quests.setStep.useMutation({ onSuccess: () => { refetchQuests(); toast.success('Шаг изменён'); }, onError: (e) => toast.error(e.message) });

    const setFlag = trpc.flags.setFlag.useMutation({ onSuccess: () => { refetchFlags(); toast.success('Флаг сохранён'); }, onError: (e) => toast.error(e.message) });
    const deleteFlag = trpc.flags.deleteFlag.useMutation({ onSuccess: () => { refetchFlags(); toast.success('Флаг удалён'); }, onError: (e) => toast.error(e.message) });

    const addEffect = trpc.effects.addEffect.useMutation({ onSuccess: () => { refetchEffects(); toast.success('Эффект применён'); }, onError: (e) => toast.error(e.message) });
    const removeEffect = trpc.effects.removeEffect.useMutation({ onSuccess: () => { refetchEffects(); toast.success('Эффект снят'); }, onError: (e) => toast.error(e.message) });
    const clearEffects = trpc.effects.clearAll.useMutation({ onSuccess: () => { refetchEffects(); toast.success('Все эффекты сняты'); }, onError: (e) => toast.error(e.message) });

    const addSkill = trpc.skills.addSkill.useMutation({ onSuccess: () => { refetchSkills(); toast.success('Скил добавлен'); }, onError: (e) => toast.error(e.message) });
    const removeSkill = trpc.skills.removeSkill.useMutation({ onSuccess: () => { refetchSkills(); toast.success('Скил удалён'); }, onError: (e) => toast.error(e.message) });
    const setSkillLevel = trpc.skills.setLevel.useMutation({ onSuccess: () => { refetchSkills(); toast.success('Уровень скила обновлён'); }, onError: (e) => toast.error(e.message) });

    const unequip = trpc.equipment.unequip.useMutation({ onSuccess: () => { refetchEquip(); toast.success('Предмет снят'); }, onError: (e) => toast.error(e.message) });
    const unequipAll = trpc.equipment.unequipAll.useMutation({ onSuccess: () => { refetchEquip(); toast.success('Вся экипировка снята'); }, onError: (e) => toast.error(e.message) });
    const equipItem = trpc.equipment.equip.useMutation({ onSuccess: () => { refetchEquip(); setEquipInvId(''); setEquipSlotId(''); toast.success('Предмет надет'); }, onError: (e) => toast.error(e.message) });

    const grantCurrency = trpc.transactions.grant.useMutation({ onSuccess: () => { refetchTx(); refetchBalance(); toast.success('Транзакция добавлена'); }, onError: (e) => toast.error(e.message) });

    // ── Local state ──

    // Equip form
    const [equipInvId, setEquipInvId] = useState('');
    const [equipSlotId, setEquipSlotId] = useState('');

    // Inventory give-item form
    const [giveItemId, setGiveItemId] = useState('');
    const [giveQty, setGiveQty] = useState('1');

    // Quest assign form
    const [assignQuestId, setAssignQuestId] = useState('');
    const [assignQuestState, setAssignQuestState] = useState<'active' | 'offered'>('active');

    // Flag add form
    const [flagKey, setFlagKey] = useState('');
    const [flagInt, setFlagInt] = useState('');
    const [flagBool, setFlagBool] = useState('');

    // Effect add form
    const [addEffectId, setAddEffectId] = useState('');
    const [addEffectVal, setAddEffectVal] = useState('0');
    const [addEffectTtl, setAddEffectTtl] = useState('');

    // Skill add form
    const [addSkillId, setAddSkillId] = useState('');
    const [addSkillLevel, setAddSkillLevel] = useState('1');

    // Currency grant form
    const [grantAmount, setGrantAmount] = useState('0');
    const [grantReason, setGrantReason] = useState('');

    // Attr add form
    const [addAttrId, setAddAttrId] = useState('');
    const [addAttrVal, setAddAttrVal] = useState('0');

    if (charLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-32 w-full" />
            </div>
        );
    }
    if (!char) return <p className="text-muted-foreground">Персонаж не найден.</p>;

    const questStateLabel: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline' }> = {
        active: { label: 'Активен', variant: 'default' },
        offered: { label: 'Предложен', variant: 'outline' },
        completed: { label: 'Завершён', variant: 'success' },
        turned_in: { label: 'Сдан', variant: 'success' },
        failed: { label: 'Провален', variant: 'destructive' },
    };

    const existingAttrIds = new Set((attrs ?? []).map(a => a.attributeId));
    const unassignedAttrs = (allAttrs ?? []).filter(a => !existingAttrIds.has(a.id));

    const existingSkillIds = new Set((skills ?? []).map(s => s.skillId));
    const unassignedSkills = (allSkills ?? []).filter(s => !existingSkillIds.has(s.id));

    const assignedQuestIds = new Set((quests ?? []).map(q => q.questId));
    const unassignedQuests = (allQuests ?? []).filter(q => !assignedQuestIds.has(q.id));

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Link href="/accounts" className="hover:text-foreground">Аккаунты</Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <Link href="/characters" className="hover:text-foreground">Персонажи</Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-foreground font-medium">{char.name}</span>
            </nav>

            {/* Header card */}
            <Card>
                <CardHeader>
                    <div className="flex items-start gap-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary shrink-0">
                            <Sword className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 flex-wrap">
                                <CardTitle className="text-xl">{char.name}</CardTitle>
                                <Badge variant="secondary">Lv {char.level}</Badge>
                                {char.isDead && <Badge variant="destructive"><Skull className="h-3 w-3 mr-1" />Мёртв</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                                {char.className} · {char.raceName} · ID {char.id}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            {char.isDead && (
                                <Button size="sm" variant="outline" className="gap-1.5 text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-950"
                                    disabled={revive.isLoading} onClick={() => revive.mutate({ characterId })}>
                                    <HeartPulse className="h-3.5 w-3.5" />Воскресить
                                </Button>
                            )}
                            <EditCharacterDialog
                                char={{ id: characterId, name: char.name, classId: char.classId ?? null, raceId: char.raceId ?? null, currentHealth: char.currentHealth ?? null, currentMana: char.currentMana ?? null, isDead: char.isDead ?? null, level: char.level ?? null, experiencePoints: char.experiencePoints ?? null, freeSkillPoints: char.freeSkillPoints ?? null, gender: char.gender ?? null, ownerId: char.ownerId, ownerLogin: char.ownerLogin }}
                                onSuccess={() => refetchChar()}
                            />
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="ghost"
                                        className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10">
                                        <Trash2 className="h-3.5 w-3.5" />Удалить
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Удалить «{char.name}»?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Персонаж будет удалён безвозвратно вместе со всеми данными.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => delChar.mutate({ characterId })}>
                                            Удалить
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 text-sm">
                        <div>
                            <p className="text-muted-foreground text-xs mb-0.5"><HeartPulse className="inline h-3 w-3 mr-0.5" />HP</p>
                            <p className="font-semibold">{char.currentHealth}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs mb-0.5"><Zap className="inline h-3 w-3 mr-0.5" />MP</p>
                            <p className="font-semibold">{char.currentMana}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs mb-0.5">Опыт</p>
                            <p className="font-semibold font-mono">{char.experiencePoints?.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs mb-0.5">Владелец</p>
                            <p className="font-semibold">
                                {char.ownerLogin ?? char.ownerId}
                                <span className="ml-1.5 font-normal font-mono text-xs text-muted-foreground">ID: {char.ownerId}</span>
                            </p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs mb-0.5">Пол</p>
                            <p className="font-medium">{genders?.find(g => g.id === (char.gender ?? 0))?.label ?? '—'}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs mb-0.5">Свободные SP</p>
                            <p className="font-semibold font-mono">{char.freeSkillPoints ?? 0}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs mb-0.5">Время игры</p>
                            <p className="font-medium">{formatPlayTime(char.playTimeSec)}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs mb-0.5">Слот аккаунта</p>
                            <p className="font-semibold font-mono">{char.accountSlot ?? '—'}</p>
                        </div>
                        <div className="col-span-2">
                            <p className="text-muted-foreground text-xs mb-0.5">Создан</p>
                            <p className="font-medium text-sm">{formatDate(char.createdAt) ?? '—'}</p>
                        </div>
                        <div className="col-span-2">
                            <p className="text-muted-foreground text-xs mb-0.5">Последняя активность</p>
                            <p className="font-medium text-sm">{formatDate(char.lastOnlineAt) ?? <span className="italic text-muted-foreground">никогда</span>}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="attributes">
                <TabsList>
                    <TabsTrigger value="attributes">Атрибуты {(attrs ?? []).length > 0 && <span className="ml-1 text-xs opacity-60">({(attrs ?? []).length})</span>}</TabsTrigger>
                    <TabsTrigger value="inventory">Инвентарь {(inventory ?? []).length > 0 && <span className="ml-1 text-xs opacity-60">({(inventory ?? []).length})</span>}</TabsTrigger>
                    <TabsTrigger value="quests">Квесты {(quests ?? []).length > 0 && <span className="ml-1 text-xs opacity-60">({(quests ?? []).length})</span>}</TabsTrigger>
                    <TabsTrigger value="flags">Флаги {(flags ?? []).length > 0 && <span className="ml-1 text-xs opacity-60">({(flags ?? []).length})</span>}</TabsTrigger>
                    <TabsTrigger value="effects">Эффекты {(effects ?? []).length > 0 && <span className="ml-1 text-xs opacity-60">({(effects ?? []).length})</span>}</TabsTrigger>
                    <TabsTrigger value="skills">Скилы {(skills ?? []).length > 0 && <span className="ml-1 text-xs opacity-60">({(skills ?? []).length})</span>}</TabsTrigger>
                    <TabsTrigger value="equipment">Экипировка {(equipment ?? []).length > 0 && <span className="ml-1 text-xs opacity-60">({(equipment ?? []).length})</span>}</TabsTrigger>
                    <TabsTrigger value="transactions">Транзакции</TabsTrigger>
                </TabsList>

                {/* ══ Атрибуты ══ */}
                <TabsContent value="attributes">
                    <Card>
                        <div className="px-4 pt-4 pb-3 border-b">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Добавить атрибут</p>
                            {unassignedAttrs.length > 0 ? (
                                <div className="flex items-center gap-2">
                                    <Select value={addAttrId} onValueChange={setAddAttrId}>
                                        <SelectTrigger className="w-52 h-8 text-sm"><SelectValue placeholder="Выбрать атрибут..." /></SelectTrigger>
                                        <SelectContent>
                                            {unassignedAttrs.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Input type="number" placeholder="Значение" className="w-24 h-8 text-sm" value={addAttrVal} onChange={e => setAddAttrVal(e.target.value)} />
                                    <Button size="sm" className="h-8 gap-1.5" disabled={!addAttrId || addAttr.isLoading}
                                        onClick={() => { addAttr.mutate({ characterId, attributeId: Number(addAttrId), value: Number(addAttrVal) }); setAddAttrId(''); setAddAttrVal('0'); }}>
                                        <Plus className="h-3.5 w-3.5" />Добавить
                                    </Button>
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground italic">
                                    {allAttrs === undefined ? 'Загрузка...' : (allAttrs ?? []).length === 0 ? 'Нет атрибутов в справочнике.' : 'Все атрибуты уже назначены персонажу.'}
                                </p>
                            )}
                        </div>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Атрибут</TableHead>
                                        <TableHead>Slug</TableHead>
                                        <TableHead className="w-32">Значение</TableHead>
                                        <TableHead className="text-right w-36">Действия</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {attrsLoading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <TableRow key={i}>{Array.from({ length: 4 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                                        ))
                                    ) : (attrs ?? []).map(attr => (
                                        <AttrRow
                                            key={attr.attributeId}
                                            attr={attr}
                                            onSave={val => setValue.mutate({ characterId, attributeId: attr.attributeId!, value: val })}
                                            onDelete={() => delAttr.mutate({ id: attr.id! })}
                                            isSaving={setValue.isLoading}
                                        />
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ══ Инвентарь ══ */}
                <TabsContent value="inventory">
                    <Card>
                        <div className="px-4 pt-4 pb-3 border-b">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Выдать предмет</p>
                            <div className="flex items-center gap-2">
                                <Select value={giveItemId} onValueChange={setGiveItemId}>
                                    <SelectTrigger className="flex-1 max-w-xs h-8 text-sm"><SelectValue placeholder="Выбрать предмет..." /></SelectTrigger>
                                    <SelectContent>
                                        {(allItems ?? []).map(it => <SelectItem key={it.id} value={String(it.id)}>{it.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Input type="number" min={1} placeholder="Кол-во" className="w-20 h-8 text-sm" value={giveQty} onChange={e => setGiveQty(e.target.value)} />
                                <Button size="sm" className="h-8 gap-1.5" disabled={!giveItemId || giveItem.isLoading}
                                    onClick={() => { giveItem.mutate({ characterId, itemId: Number(giveItemId), quantity: Number(giveQty) || 1 }); setGiveItemId(''); setGiveQty('1'); }}>
                                    <Plus className="h-3.5 w-3.5" />Выдать
                                </Button>
                            </div>
                        </div>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Предмет</TableHead>
                                        <TableHead>Slug</TableHead>
                                        <TableHead className="text-center w-28">Кол-во</TableHead>
                                        <TableHead className="text-right w-24">Удалить</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invLoading ? (
                                        <TableRow><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                                    ) : (inventory ?? []).length === 0 ? (
                                        <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Инвентарь пуст</TableCell></TableRow>
                                    ) : (inventory ?? []).map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.itemName}</TableCell>
                                            <TableCell className="font-mono text-xs text-muted-foreground">{item.itemSlug}</TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Input type="number" min={1} className="w-16 h-7 text-center text-sm"
                                                        defaultValue={item.quantity ?? 1}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') {
                                                                const v = Number((e.target as HTMLInputElement).value);
                                                                if (v !== item.quantity) updateQty.mutate({ inventoryId: item.id!, quantity: v });
                                                                (e.target as HTMLInputElement).blur();
                                                            }
                                                        }}
                                                        onBlur={e => {
                                                            const v = Number(e.target.value);
                                                            if (v !== item.quantity) updateQty.mutate({ inventoryId: item.id!, quantity: v });
                                                        }}
                                                    />
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                                                    onClick={() => removeItem.mutate({ inventoryId: item.id! })} disabled={removeItem.isLoading}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ══ Квесты ══ */}
                <TabsContent value="quests">
                    <Card>
                        {unassignedQuests.length > 0 && (
                            <div className="px-4 pt-4 pb-3 border-b">
                                <p className="text-xs font-medium text-muted-foreground mb-2">Назначить квест</p>
                                <div className="flex items-center gap-2">
                                    <Select value={assignQuestId} onValueChange={setAssignQuestId}>
                                        <SelectTrigger className="flex-1 max-w-xs h-8 text-sm"><SelectValue placeholder="Выбрать квест..." /></SelectTrigger>
                                        <SelectContent>
                                            {unassignedQuests.map(q => <SelectItem key={q.id} value={String(q.id)}>{q.clientQuestKey ?? q.slug}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Select value={assignQuestState} onValueChange={v => setAssignQuestState(v as 'active' | 'offered')}>
                                        <SelectTrigger className="w-32 h-8 text-sm"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">Активен</SelectItem>
                                            <SelectItem value="offered">Предложен</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button size="sm" className="h-8 gap-1.5" disabled={!assignQuestId || assignQuest.isLoading}
                                        onClick={() => { assignQuest.mutate({ characterId, questId: Number(assignQuestId), state: assignQuestState }); setAssignQuestId(''); }}>
                                        <Plus className="h-3.5 w-3.5" />Назначить
                                    </Button>
                                </div>
                            </div>
                        )}
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Квест</TableHead>
                                        <TableHead>Статус</TableHead>
                                        <TableHead className="text-center w-24">Шаг</TableHead>
                                        <TableHead>Обновлён</TableHead>
                                        <TableHead className="text-right">Действия</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {questsLoading ? (
                                        <TableRow><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                                    ) : (quests ?? []).length === 0 ? (
                                        <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Нет активных квестов</TableCell></TableRow>
                                    ) : (quests ?? []).map(q => {
                                        const state = questStateLabel[q.state] ?? { label: q.state, variant: 'outline' as const };
                                        return (
                                            <TableRow key={q.questId}>
                                                <TableCell className="font-mono text-xs">{q.clientQuestKey ?? q.questSlug ?? q.questId}</TableCell>
                                                <TableCell>
                                                    <Select defaultValue={q.state} onValueChange={v => setState.mutate({ characterId, questId: q.questId!, state: v as 'offered' | 'active' | 'completed' | 'turned_in' | 'failed' })}>
                                                        <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            {Object.entries(questStateLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Input type="number" min={0} className="w-16 h-7 text-center text-sm mx-auto"
                                                        defaultValue={q.currentStep ?? 0}
                                                        onBlur={e => {
                                                            const s = Number(e.target.value);
                                                            if (s !== (q.currentStep ?? 0)) {
                                                                setStep.mutate({ characterId, questId: q.questId!, step: s });
                                                            }
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{formatDate(q.updatedAt)}</TableCell>
                                                <TableCell className="text-right">
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                                                                disabled={resetQuest.isLoading}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Удалить квест?</AlertDialogTitle>
                                                                <AlertDialogDescription>Запись квеста будет удалена у персонажа.</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Отмена</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => resetQuest.mutate({ characterId, questId: q.questId! })}>Удалить</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ══ Флаги ══ */}
                <TabsContent value="flags">
                    <Card>
                        <div className="px-4 pt-4 pb-3 border-b">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Создать / обновить флаг</p>
                            <div className="flex items-center gap-2 flex-wrap">
                                <Input placeholder="flag_key" className="w-40 h-8 text-sm" value={flagKey} onChange={e => setFlagKey(e.target.value)} />
                                <Input type="number" placeholder="int (opt)" className="w-24 h-8 text-sm" value={flagInt} onChange={e => setFlagInt(e.target.value)} />
                                <Select value={flagBool} onValueChange={setFlagBool}>
                                    <SelectTrigger className="w-28 h-8 text-sm"><SelectValue placeholder="bool..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">—</SelectItem>
                                        <SelectItem value="true">true</SelectItem>
                                        <SelectItem value="false">false</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button size="sm" className="h-8 gap-1.5" disabled={!flagKey || setFlag.isLoading}
                                    onClick={() => {
                                        setFlag.mutate({
                                            characterId, flagKey,
                                            intValue: flagInt !== '' ? Number(flagInt) : null,
                                            boolValue: flagBool === 'true' ? true : flagBool === 'false' ? false : null,
                                        });
                                        setFlagKey(''); setFlagInt(''); setFlagBool('');
                                    }}>
                                    <Plus className="h-3.5 w-3.5" />Сохранить
                                </Button>
                            </div>
                        </div>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Ключ</TableHead>
                                        <TableHead className="text-center">Int</TableHead>
                                        <TableHead className="text-center">Bool</TableHead>
                                        <TableHead>Обновлён</TableHead>
                                        <TableHead className="text-right">Удалить</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {flagsLoading ? (
                                        <TableRow><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                                    ) : (flags ?? []).length === 0 ? (
                                        <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Флаги отсутствуют</TableCell></TableRow>
                                    ) : (flags ?? []).map(f => (
                                        <TableRow key={f.flagKey}>
                                            <TableCell className="font-mono text-sm">{f.flagKey}</TableCell>
                                            <TableCell className="text-center font-mono">{f.intValue ?? '—'}</TableCell>
                                            <TableCell className="text-center">
                                                {f.boolValue === null ? '—' : <Badge variant={f.boolValue ? 'success' : 'outline'}>{f.boolValue ? 'true' : 'false'}</Badge>}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{formatDate(f.updatedAt)}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                                                    onClick={() => deleteFlag.mutate({ characterId, flagKey: f.flagKey })} disabled={deleteFlag.isLoading}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ══ Эффекты ══ */}
                <TabsContent value="effects">
                    <Card>
                        <div className="px-4 pt-4 pb-3 border-b">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-medium text-muted-foreground">Добавить эффект</p>
                                {(effects ?? []).length > 0 && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                                                disabled={clearEffects.isLoading}>
                                                <Trash2 className="h-3.5 w-3.5" />Очистить все
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Удалить все эффекты?</AlertDialogTitle>
                                                <AlertDialogDescription>Все активные эффекты будут сняты с персонажа.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Отмена</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => clearEffects.mutate({ characterId })}>Удалить</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <Select value={addEffectId} onValueChange={setAddEffectId}>
                                    <SelectTrigger className="w-44 h-8 text-sm"><SelectValue placeholder="Выбрать эффект..." /></SelectTrigger>
                                    <SelectContent>
                                        {(allEffects ?? []).map(e => <SelectItem key={e.id} value={String(e.id)}>{e.slug}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Input type="number" placeholder="Значение" className="w-24 h-8 text-sm" value={addEffectVal} onChange={e => setAddEffectVal(e.target.value)} />
                                <Input type="number" placeholder="TTL (сек)" className="w-24 h-8 text-sm" value={addEffectTtl} onChange={e => setAddEffectTtl(e.target.value)} />
                                <Button size="sm" className="h-8 gap-1.5" disabled={!addEffectId || addEffect.isLoading}
                                    onClick={() => {
                                        addEffect.mutate({ characterId, effectId: Number(addEffectId), value: Number(addEffectVal), expiresInSeconds: addEffectTtl ? Number(addEffectTtl) : null });
                                        setAddEffectId(''); setAddEffectVal('0'); setAddEffectTtl('');
                                    }}>
                                    <Plus className="h-3.5 w-3.5" />Добавить
                                </Button>
                            </div>
                        </div>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Эффект</TableHead>
                                        <TableHead>Источник</TableHead>
                                        <TableHead className="text-center">Значение</TableHead>
                                        <TableHead>Применён</TableHead>
                                        <TableHead>Истекает</TableHead>
                                        <TableHead className="text-right">Снять</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {effectsLoading ? (
                                        <TableRow><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                                    ) : (effects ?? []).length === 0 ? (
                                        <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Активных эффектов нет</TableCell></TableRow>
                                    ) : (effects ?? []).map(e => (
                                        <TableRow key={e.id}>
                                            <TableCell className="font-mono text-xs">{e.effectSlug ?? e.effectId}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{e.sourceType}</TableCell>
                                            <TableCell className="text-center font-mono text-sm">{e.value}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{formatDate(e.appliedAt)}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{e.expiresAt ? formatDate(e.expiresAt) : '∞'}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                                                    onClick={() => removeEffect.mutate({ effectInstanceId: e.id! })} disabled={removeEffect.isLoading}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ══ Скилы ══ */}
                <TabsContent value="skills">
                    <Card>
                        {unassignedSkills.length > 0 && (
                            <div className="px-4 pt-4 pb-3 border-b">
                                <p className="text-xs font-medium text-muted-foreground mb-2">Добавить скил</p>
                                <div className="flex items-center gap-2">
                                    <Select value={addSkillId} onValueChange={setAddSkillId}>
                                        <SelectTrigger className="w-48 h-8 text-sm"><SelectValue placeholder="Выбрать скил..." /></SelectTrigger>
                                        <SelectContent>
                                            {unassignedSkills.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Input type="number" min={1} placeholder="Уровень" className="w-24 h-8 text-sm" value={addSkillLevel} onChange={e => setAddSkillLevel(e.target.value)} />
                                    <Button size="sm" className="h-8 gap-1.5" disabled={!addSkillId || addSkill.isLoading}
                                        onClick={() => { addSkill.mutate({ characterId, skillId: Number(addSkillId), level: Number(addSkillLevel) || 1 }); setAddSkillId(''); setAddSkillLevel('1'); }}>
                                        <Plus className="h-3.5 w-3.5" />Добавить
                                    </Button>
                                </div>
                            </div>
                        )}
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Скил</TableHead>
                                        <TableHead>Slug</TableHead>
                                        <TableHead className="text-center w-36">Уровень</TableHead>
                                        <TableHead className="text-right w-20">Удалить</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {skillsLoading ? (
                                        <TableRow><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                                    ) : (skills ?? []).length === 0 ? (
                                        <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Скилов нет</TableCell></TableRow>
                                    ) : (skills ?? []).map(sk => (
                                        <SkillRow
                                            key={sk.id}
                                            sk={sk}
                                            onSave={lvl => setSkillLevel.mutate({ characterSkillId: sk.id!, level: lvl })}
                                            onDelete={() => removeSkill.mutate({ characterSkillId: sk.id! })}
                                            isSaving={setSkillLevel.isLoading}
                                        />
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ══ Экипировка ══ */}
                <TabsContent value="equipment">
                    <Card>
                        <div className="px-4 pt-4 pb-3 border-b flex flex-wrap items-end gap-3 justify-between">
                            <div className="flex flex-wrap items-end gap-2">
                                {invLoading ? (
                                    <Skeleton className="h-8 w-52" />
                                ) : (inventory ?? []).length === 0 ? (
                                    <p className="text-sm text-muted-foreground py-1">Инвентарь пуст — нечего надевать</p>
                                ) : (
                                    <>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Предмет из инвентаря</Label>
                                            <Select value={equipInvId} onValueChange={setEquipInvId}>
                                                <SelectTrigger className="w-52 h-8 text-sm"><SelectValue placeholder="Выберите предмет" /></SelectTrigger>
                                                <SelectContent>
                                                    {(inventory ?? []).map(inv => (
                                                        <SelectItem key={inv.id} value={String(inv.id)}>
                                                            {inv.itemName ?? inv.itemId} ×{inv.quantity}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Слот</Label>
                                            <Select value={equipSlotId} onValueChange={setEquipSlotId}>
                                                <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="Слот" /></SelectTrigger>
                                                <SelectContent>
                                                    {(allSlots ?? []).map(s => (
                                                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Button size="sm" className="h-8 gap-1.5"
                                            disabled={!equipInvId || !equipSlotId || equipItem.isLoading}
                                            onClick={() => equipItem.mutate({ characterId, inventoryItemId: Number(equipInvId), equipSlotId: Number(equipSlotId) })}>
                                            <Plus className="h-3.5 w-3.5" />Надеть
                                        </Button>
                                    </>
                                )}
                            </div>
                            {(equipment ?? []).length > 0 && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button size="sm" variant="destructive" className="gap-1.5 h-8" disabled={unequipAll.isLoading}>
                                            <Trash2 className="h-3.5 w-3.5" />Снять всё
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Снять всю экипировку?</AlertDialogTitle>
                                            <AlertDialogDescription>Все надетые предметы будут сняты.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => unequipAll.mutate({ characterId })}>Снять всё</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                        </div>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Предмет</TableHead>
                                        <TableHead>Slug</TableHead>
                                        <TableHead className="text-center w-36">Слот</TableHead>
                                        <TableHead className="w-40">Надет</TableHead>
                                        <TableHead className="text-right w-20">Снять</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {equipLoading ? (
                                        <TableRow><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                                    ) : (equipment ?? []).length === 0 ? (
                                        <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Экипировка пустая</TableCell></TableRow>
                                    ) : (equipment ?? []).map(eq => (
                                        <TableRow key={eq.id}>
                                            <TableCell className="font-medium">{eq.itemName ?? '—'}</TableCell>
                                            <TableCell className="font-mono text-xs text-muted-foreground">{eq.itemSlug ?? '—'}</TableCell>
                                            <TableCell className="text-center text-sm">{allSlots?.find(s => s.id === eq.equipSlotId)?.name ?? eq.equipSlotId}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{formatDate(eq.equippedAt)}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                                                    onClick={() => unequip.mutate({ equipmentId: eq.id!, characterId })} disabled={unequip.isLoading}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ══ Транзакции ══ */}
                <TabsContent value="transactions">
                    <div className="space-y-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">Баланс</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
                                    <div className="rounded-lg border p-3">
                                        <p className="text-xs text-muted-foreground mb-1">Баланс (сумма транзакций)</p>
                                        <p className="text-2xl font-bold font-mono">{(balanceData?.balance ?? 0).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="border-t pt-3">
                                    <p className="text-xs font-medium text-muted-foreground mb-2">Выдать / списать</p>
                                    <div className="flex flex-wrap items-end gap-2">
                                        <div className="space-y-1">
                                            <Label className="text-xs">Сумма (отрицательная = списание)</Label>
                                            <Input type="number" className="w-32 h-8 text-sm" value={grantAmount} onChange={e => setGrantAmount(e.target.value)} />
                                        </div>
                                        <div className="space-y-1 flex-1">
                                            <Label className="text-xs">Причина</Label>
                                            <Input className="h-8 text-sm" placeholder="GM корректировка" value={grantReason} onChange={e => setGrantReason(e.target.value)} />
                                        </div>
                                        <Button size="sm" className="h-8 gap-1.5"
                                            disabled={grantCurrency.isLoading || grantAmount === '0' || grantAmount === ''}
                                            onClick={() => {
                                                grantCurrency.mutate({ characterId, amount: Number(grantAmount), reason: grantReason || 'GM' });
                                                setGrantAmount('0'); setGrantReason('');
                                            }}>
                                            <Plus className="h-3.5 w-3.5" />Применить
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-0">
                                <CardTitle className="text-base">История транзакций</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-right w-32">Сумма</TableHead>
                                            <TableHead>Причина</TableHead>
                                            <TableHead className="w-40">Дата</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {txLoading ? (
                                            <TableRow><TableCell colSpan={3}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                                        ) : (txData?.data ?? []).length === 0 ? (
                                            <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground">Транзакций нет</TableCell></TableRow>
                                        ) : (txData?.data ?? []).map(tx => (
                                            <TableRow key={tx.id}>
                                                <TableCell className={`text-right font-mono font-semibold ${Number(tx.amount) >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                                                    {Number(tx.amount) >= 0 ? '+' : ''}{Number(tx.amount).toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">{tx.reasonType ?? '—'}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

// ─── Вспомогательный компонент для уровня скила ───────────────────────────────
type SkillRowData = {
    id?: number | null;
    skillId?: number | null;
    skillName?: string | null;
    skillSlug?: string | null;
    currentLevel?: number | null;
};

function SkillRow({ sk, onSave, onDelete, isSaving }: {
    sk: SkillRowData;
    onSave: (lvl: number) => void;
    onDelete: () => void;
    isSaving: boolean;
}) {
    const [lvl, setLvl] = useState(String(sk.currentLevel ?? 1));
    const dirty = lvl !== String(sk.currentLevel ?? 1);

    return (
        <TableRow>
            <TableCell className="font-medium">{sk.skillName}</TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">{sk.skillSlug}</TableCell>
            <TableCell>
                <div className="flex items-center justify-center gap-2">
                    <Input type="number" min={1} value={lvl} onChange={e => setLvl(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && dirty && !isSaving) onSave(Number(lvl)); }}
                        className="h-7 w-20 text-center text-sm" />
                    <Button size="sm" variant={dirty ? 'default' : 'outline'} className="h-7 text-xs"
                        disabled={!dirty || isSaving} onClick={() => onSave(Number(lvl))}>
                        OK
                    </Button>
                </div>
            </TableCell>
            <TableCell className="text-right">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Удалить скил «{sk.skillName}»?</AlertDialogTitle>
                            <AlertDialogDescription>Скил будет удалён у персонажа.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                            <AlertDialogAction onClick={onDelete}>Удалить</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </TableCell>
        </TableRow>
    );
}
