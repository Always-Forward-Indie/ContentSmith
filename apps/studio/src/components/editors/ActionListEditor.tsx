'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Plus, Trash2, Code2, List, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { trpc } from '@/lib/trpc'
import EntityCombobox from '@/components/editors/EntityCombobox'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActionType =
    | 'set_flag'
    | 'offer_quest'
    | 'turn_in_quest'
    | 'fail_quest'
    | 'advance_quest_step'
    | 'give_item'
    | 'give_exp'
    | 'give_gold'
    | 'open_vendor_shop'
    | 'open_repair_shop'
    | 'open_skill_shop'
    | 'change_reputation'
    | 'learn_skill'
    | 'set_object_state'

interface ActionItem {
    _id: string
    type: ActionType
    [key: string]: unknown
}

interface FieldProps {
    action: ActionItem
    set: (key: string, val: unknown) => void
}

// ---------------------------------------------------------------------------
// Static group structure (labels come from i18n)
// ---------------------------------------------------------------------------

const ACTION_GROUPS: { key: string; types: ActionType[] }[] = [
    { key: 'quests', types: ['offer_quest', 'turn_in_quest', 'fail_quest', 'advance_quest_step'] },
    { key: 'rewards', types: ['give_item', 'give_exp', 'give_gold'] },
    { key: 'tradingTraining', types: ['open_vendor_shop', 'open_repair_shop', 'open_skill_shop', 'learn_skill'] },
    { key: 'progression', types: ['set_flag', 'change_reputation'] },
    { key: 'world', types: ['set_object_state'] },
]

// ---------------------------------------------------------------------------
// Default action per type
// ---------------------------------------------------------------------------

function makeDefaultAction(type: ActionType, id: string): ActionItem {
    switch (type) {
        case 'set_flag':
            return { _id: id, type, key: '', flagMode: 'bool', bool_value: false }
        case 'offer_quest':
        case 'turn_in_quest':
        case 'fail_quest':
        case 'advance_quest_step':
            return { _id: id, type, slug: '' }
        case 'give_item':
            return { _id: id, type, item_id: 0, quantity: 1 }
        case 'give_exp':
        case 'give_gold':
            return { _id: id, type, amount: 0 }
        case 'open_vendor_shop':
            return { _id: id, type, mode: 'shop' }
        case 'open_repair_shop':
        case 'open_skill_shop':
            return { _id: id, type }
        case 'change_reputation':
            return { _id: id, type, faction: '', delta: 0 }
        case 'learn_skill':
            return { _id: id, type, skill_slug: '', sp_cost: 1, gold_cost: 0, requires_book: false, book_item_id: 0 }
        case 'set_object_state':
            return { _id: id, type, object_id: 0, state: 'active' }
    }
}

// ---------------------------------------------------------------------------
// Serialize action (remove editor-only fields)
// ---------------------------------------------------------------------------

function serializeAction(action: ActionItem): Record<string, unknown> {
    const { _id, flagMode, ...rest } = action as ActionItem & { flagMode?: string }
    void _id

    if (action.type === 'set_flag') {
        const out: Record<string, unknown> = { type: rest.type, key: rest.key }
        const mode = flagMode ?? 'bool'
        if (mode === 'bool') {
            out.bool_value = rest.bool_value
        } else if (mode === 'int') {
            out.int_value = rest.int_value
        } else if (mode === 'inc') {
            out.inc = rest.inc
        }
        return out
    }

    // learn_skill: strip book_item_id if not requires_book
    if (action.type === 'learn_skill' && !rest.requires_book) {
        const { book_item_id, ...noBook } = rest
        void book_item_id
        return noBook
    }

    return rest
}

// ---------------------------------------------------------------------------
// Parse from JSON
// ---------------------------------------------------------------------------

function parseToActions(value: unknown): ActionItem[] | null {
    if (!value) return []

    let items: unknown[] = []

    if (Array.isArray(value)) {
        items = value
    } else if (typeof value === 'object' && value !== null) {
        const obj = value as Record<string, unknown>
        if (obj.actions && Array.isArray(obj.actions)) {
            items = obj.actions
        } else if (obj.type) {
            items = [value]
        } else {
            return null
        }
    }

    return items.map((a, idx) => {
        const item = a as Record<string, unknown>
        const id = String(idx) + '_' + Math.random().toString(36).slice(2)

        let flagMode = 'bool'
        if (item.int_value !== undefined) flagMode = 'int'
        else if (item.inc !== undefined) flagMode = 'inc'

        return {
            _id: id,
            type: (item.type as ActionType) ?? 'set_flag',
            flagMode,
            ...(typeof a === 'object' && a !== null ? a : {}),
        } as ActionItem
    })
}

function actionsToJson(actions: ActionItem[]): unknown {
    if (actions.length === 0) return null
    const clean = actions.map(serializeAction)
    if (clean.length === 1) return clean[0]
    return { actions: clean }
}

// ---------------------------------------------------------------------------
// Field sub-components (each may use hooks freely)
// ---------------------------------------------------------------------------

function SetFlagFields({ action, set }: FieldProps) {
    const t = useTranslations('editors.actionListEditor')
    const a = action as Record<string, unknown>
    return (
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <Input
                value={(a.key as string) ?? ''}
                onChange={(e) => set('key', e.target.value)}
                placeholder={t('fields.flagKey')}
                className="h-7 text-xs font-mono w-40 shrink-0"
            />
            <Select value={(a.flagMode as string) ?? 'bool'} onValueChange={(v) => set('flagMode', v)}>
                <SelectTrigger className="h-7 text-xs w-28 shrink-0">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="bool">{t('fields.flagModeBool')}</SelectItem>
                    <SelectItem value="int">{t('fields.flagModeInt')}</SelectItem>
                    <SelectItem value="inc">{t('fields.flagModeInc')}</SelectItem>
                </SelectContent>
            </Select>
            {((a.flagMode as string) ?? 'bool') === 'bool' && (
                <div className="flex items-center gap-1.5">
                    <Switch
                        checked={!!(a.bool_value)}
                        onCheckedChange={(v) => set('bool_value', v)}
                        className="scale-75"
                    />
                    <span className="text-xs font-mono">{a.bool_value ? 'true' : 'false'}</span>
                </div>
            )}
            {(a.flagMode as string) === 'int' && (
                <Input
                    type="number"
                    value={(a.int_value as number) ?? 0}
                    onChange={(e) => set('int_value', parseInt(e.target.value) || 0)}
                    className="h-7 text-xs w-20 shrink-0"
                />
            )}
            {(a.flagMode as string) === 'inc' && (
                <>
                    <span className="text-xs text-muted-foreground">{t('fields.incPrefix')}</span>
                    <Input
                        type="number"
                        value={(a.inc as number) ?? 1}
                        onChange={(e) => set('inc', parseInt(e.target.value) || 0)}
                        className="h-7 text-xs w-20 shrink-0"
                    />
                </>
            )}
        </div>
    )
}

function QuestActionFields({ action, set }: FieldProps) {
    const t = useTranslations('editors.actionListEditor')
    const a = action as Record<string, unknown>
    const [search, setSearch] = useState('')
    const slug = (a.slug as string) ?? ''
    const { data: listData, isLoading } = trpc.quest.list.useQuery({ search, page: 1, limit: 20 })
    const { data: current } = trpc.quest.getBySlug.useQuery({ slug }, { enabled: !!slug })
    const options = (listData?.data ?? []).map((q) => ({
        value: q.slug,
        label: q.clientQuestKey ?? q.slug,
        sublabel: q.clientQuestKey ? q.slug : undefined,
    }))
    return (
        <div className="flex-1 min-w-0">
            <EntityCombobox
                value={slug || null}
                displayName={(current?.clientQuestKey ?? current?.slug ?? slug) || null}
                onChange={(v) => set('slug', v ?? '')}
                options={options}
                isLoading={isLoading}
                onSearch={setSearch}
                placeholder={t('selectQuest')}
            />
        </div>
    )
}

function GiveItemFields({ action, set }: FieldProps) {
    const t = useTranslations('editors.actionListEditor')
    const a = action as Record<string, unknown>
    const [search, setSearch] = useState('')
    const itemId = (a.item_id as number) ?? 0
    const { data: listData, isLoading } = trpc.items.list.useQuery({ search, page: 1, limit: 20 })
    const { data: current } = trpc.items.getById.useQuery({ id: itemId }, { enabled: !!itemId })
    const options = (listData?.items ?? []).map((item) => ({
        value: item.id,
        label: item.name,
        sublabel: item.slug,
    }))
    return (
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <EntityCombobox
                value={itemId || null}
                displayName={current?.name ?? null}
                onChange={(v) => set('item_id', v ?? 0)}
                options={options}
                isLoading={isLoading}
                onSearch={setSearch}
                placeholder={t('selectItem')}
            />
            <span className="text-xs text-muted-foreground shrink-0">{t('fields.quantity')}:</span>
            <Input
                type="number"
                value={(a.quantity as number) ?? 1}
                onChange={(e) => set('quantity', parseInt(e.target.value) || 1)}
                className="h-7 text-xs w-16 shrink-0"
            />
        </div>
    )
}

function GiveAmountFields({ action, set, labelKey }: FieldProps & { labelKey: 'amountXp' | 'amountGold' }) {
    const t = useTranslations('editors.actionListEditor')
    const a = action as Record<string, unknown>
    return (
        <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xs text-muted-foreground shrink-0">{t(`fields.${labelKey}`)}:</span>
            <Input
                type="number"
                value={(a.amount as number) ?? 0}
                onChange={(e) => set('amount', parseInt(e.target.value) || 0)}
                className="h-7 text-xs w-28 shrink-0"
            />
        </div>
    )
}

function OpenVendorShopFields({ action, set }: FieldProps) {
    const t = useTranslations('editors.actionListEditor')
    const a = action as Record<string, unknown>
    return (
        <div className="flex items-center gap-2 flex-1 min-w-0">
            <Select value={(a.mode as string) ?? 'shop'} onValueChange={(v) => set('mode', v)}>
                <SelectTrigger className="h-7 text-xs w-32 shrink-0">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="shop">{t('fields.vendorModeShop')}</SelectItem>
                    <SelectItem value="buy">{t('fields.vendorModeBuy')}</SelectItem>
                    <SelectItem value="sell">{t('fields.vendorModeSell')}</SelectItem>
                </SelectContent>
            </Select>
        </div>
    )
}

function ChangeReputationFields({ action, set }: FieldProps) {
    const t = useTranslations('editors.actionListEditor')
    const a = action as Record<string, unknown>
    const [search, setSearch] = useState('')
    const factionSlug = (a.faction as string) ?? ''
    const { data: listData, isLoading } = trpc.factions.list.useQuery({ search, page: 1, pageSize: 20 })
    const { data: current } = trpc.factions.getBySlug.useQuery({ slug: factionSlug }, { enabled: !!factionSlug })
    const options = (listData?.data ?? []).map((f) => ({
        value: f.slug,
        label: f.name,
        sublabel: f.slug,
    }))
    return (
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <EntityCombobox
                value={factionSlug || null}
                displayName={(current?.name ?? factionSlug) || null}
                onChange={(v) => set('faction', v ?? '')}
                options={options}
                isLoading={isLoading}
                onSearch={setSearch}
                placeholder={t('selectFaction')}
            />
            <span className="text-xs text-muted-foreground shrink-0">{t('fields.factionDelta')}:</span>
            <Input
                type="number"
                value={(a.delta as number) ?? 0}
                onChange={(e) => set('delta', parseInt(e.target.value) || 0)}
                className="h-7 text-xs w-24 shrink-0"
            />
        </div>
    )
}

function BookItemPicker({ action, set }: FieldProps) {
    const t = useTranslations('editors.actionListEditor')
    const a = action as Record<string, unknown>
    const [search, setSearch] = useState('')
    const bookItemId = (a.book_item_id as number) ?? 0
    const { data: listData, isLoading } = trpc.items.list.useQuery({ search, page: 1, limit: 20 })
    const { data: current } = trpc.items.getById.useQuery({ id: bookItemId }, { enabled: !!bookItemId })
    const options = (listData?.items ?? []).map((item) => ({
        value: item.id,
        label: item.name,
        sublabel: item.slug,
    }))
    return (
        <>
            <span className="text-xs text-muted-foreground shrink-0">{t('fields.skillBookItem')}:</span>
            <EntityCombobox
                value={bookItemId || null}
                displayName={current?.name ?? null}
                onChange={(v) => set('book_item_id', v ?? 0)}
                options={options}
                isLoading={isLoading}
                onSearch={setSearch}
                placeholder={t('selectItem')}
            />
        </>
    )
}

function LearnSkillFields({ action, set }: FieldProps) {
    const t = useTranslations('editors.actionListEditor')
    const a = action as Record<string, unknown>
    const [search, setSearch] = useState('')
    const skillSlug = (a.skill_slug as string) ?? ''
    const { data: listData, isLoading } = trpc.skills.list.useQuery({ search, page: 1, limit: 20 })
    const { data: current } = trpc.skills.getBySlug.useQuery({ slug: skillSlug }, { enabled: !!skillSlug })
    const options = (listData?.data ?? []).map((s) => ({
        value: s.slug,
        label: s.name,
        sublabel: s.slug,
    }))
    return (
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <EntityCombobox
                value={skillSlug || null}
                displayName={(current?.name ?? skillSlug) || null}
                onChange={(v) => set('skill_slug', v ?? '')}
                options={options}
                isLoading={isLoading}
                onSearch={setSearch}
                placeholder={t('selectSkill')}
            />
            <span className="text-xs text-muted-foreground shrink-0">{t('fields.skillSP')}:</span>
            <Input
                type="number"
                value={(a.sp_cost as number) ?? 1}
                onChange={(e) => set('sp_cost', parseInt(e.target.value) || 0)}
                className="h-7 text-xs w-14 shrink-0"
            />
            <span className="text-xs text-muted-foreground shrink-0">{t('fields.skillGold')}:</span>
            <Input
                type="number"
                value={(a.gold_cost as number) ?? 0}
                onChange={(e) => set('gold_cost', parseInt(e.target.value) || 0)}
                className="h-7 text-xs w-20 shrink-0"
            />
            <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">{t('fields.skillBook')}:</span>
                <Switch
                    checked={!!(a.requires_book)}
                    onCheckedChange={(v) => set('requires_book', v)}
                    className="scale-75"
                />
            </div>
            {!!(a.requires_book) && <BookItemPicker action={action} set={set} />}
        </div>
    )
}

function SetObjectStateFields({ action, set }: FieldProps) {
    const t = useTranslations('editors.actionListEditor')
    const a = action as Record<string, unknown>
    const [search, setSearch] = useState('')
    const objectId = (a.object_id as number) ?? 0
    const { data: listData, isLoading } = trpc.worldObjects.list.useQuery({ search, page: 1, pageSize: 20 })
    const { data: current } = trpc.worldObjects.getById.useQuery({ id: objectId }, { enabled: !!objectId })
    const options = (listData?.data ?? []).map((o) => ({
        value: o.id,
        label: o.slug,
        sublabel: o.objectType ?? undefined,
    }))
    return (
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <EntityCombobox
                value={objectId || null}
                displayName={current?.slug ?? null}
                onChange={(v) => set('object_id', v ?? 0)}
                options={options}
                isLoading={isLoading}
                onSearch={setSearch}
                placeholder={t('selectObject')}
            />
            <Select value={(a.state as string) ?? 'active'} onValueChange={(v) => set('state', v)}>
                <SelectTrigger className="h-7 text-xs w-28 shrink-0">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {(['active', 'depleted', 'disabled'] as const).map((s) => (
                        <SelectItem key={s} value={s}>{t(`objectStates.${s}`)}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}

// ---------------------------------------------------------------------------
// ActionEditor
// ---------------------------------------------------------------------------

interface ActionEditorProps {
    action: ActionItem
    onChange: (updated: ActionItem) => void
    onDelete: () => void
}

function ActionEditor({ action, onChange, onDelete }: ActionEditorProps) {
    const t = useTranslations('editors.actionListEditor')
    const set = (key: string, val: unknown) => onChange({ ...action, [key]: val })

    const renderFields = () => {
        switch (action.type) {
            case 'set_flag':
                return <SetFlagFields action={action} set={set} />
            case 'offer_quest':
            case 'turn_in_quest':
            case 'fail_quest':
            case 'advance_quest_step':
                return <QuestActionFields action={action} set={set} />
            case 'give_item':
                return <GiveItemFields action={action} set={set} />
            case 'give_exp':
                return <GiveAmountFields action={action} set={set} labelKey="amountXp" />
            case 'give_gold':
                return <GiveAmountFields action={action} set={set} labelKey="amountGold" />
            case 'open_vendor_shop':
                return <OpenVendorShopFields action={action} set={set} />
            case 'open_repair_shop':
            case 'open_skill_shop':
                return <span className="text-xs text-muted-foreground italic flex-1">{t('noParams')}</span>
            case 'change_reputation':
                return <ChangeReputationFields action={action} set={set} />
            case 'learn_skill':
                return <LearnSkillFields action={action} set={set} />
            case 'set_object_state':
                return <SetObjectStateFields action={action} set={set} />
            default:
                return null
        }
    }

    return (
        <div className="flex items-start gap-2 rounded-md border border-border/50 bg-muted/20 px-2.5 py-2">
            <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-1.5" />
            <Select
                value={action.type}
                onValueChange={(v) => onChange(makeDefaultAction(v as ActionType, action._id))}
            >
                <SelectTrigger className="h-7 text-xs w-44 shrink-0">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {ACTION_GROUPS.map((group) => (
                        <React.Fragment key={group.key}>
                            <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                                {t(`groups.${group.key}`)}
                            </div>
                            {group.types.map((type) => (
                                <SelectItem key={type} value={type}>
                                    {t(`types.${type}`)}
                                </SelectItem>
                            ))}
                        </React.Fragment>
                    ))}
                </SelectContent>
            </Select>
            {renderFields()}
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={onDelete}
            >
                <Trash2 className="h-3.5 w-3.5" />
            </Button>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Add action dropdown
// ---------------------------------------------------------------------------

function AddActionDropdown({ onAdd }: { onAdd: (type: ActionType) => void }) {
    const t = useTranslations('editors.actionListEditor')
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState('')

    const filtered = ACTION_GROUPS.map((g) => ({
        ...g,
        types: g.types.filter(
            (type) =>
                !search ||
                type.includes(search.toLowerCase()) ||
                t(`types.${type}`).toLowerCase().includes(search.toLowerCase())
        ),
    })).filter((g) => g.types.length > 0)

    return (
        <div className="relative">
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => setOpen((v) => !v)}
            >
                <Plus className="h-3.5 w-3.5" />
                {t('addAction')}
            </Button>

            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setSearch('') }} />
                    <div className="absolute z-50 mt-1 w-60 rounded-md border border-border bg-popover shadow-lg">
                        <div className="p-1.5 border-b border-border">
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t('searchAction')}
                                className="h-6 text-xs"
                                autoFocus
                            />
                        </div>
                        <div className="max-h-72 overflow-y-auto p-1">
                            {filtered.map((group) => (
                                <div key={group.key}>
                                    <p className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                                        {t(`groups.${group.key}`)}
                                    </p>
                                    {group.types.map((type) => (
                                        <button
                                            key={type}
                                            type="button"
                                            className="flex w-full items-center gap-2 rounded px-2 py-1 text-xs hover:bg-accent transition-colors"
                                            onClick={() => {
                                                onAdd(type)
                                                setOpen(false)
                                                setSearch('')
                                            }}
                                        >
                                            <span className="font-medium">{t(`types.${type}`)}</span>
                                            <span className="ml-auto text-[10px] font-mono text-muted-foreground">{type}</span>
                                        </button>
                                    ))}
                                </div>
                            ))}
                            {filtered.length === 0 && (
                                <p className="px-2 py-2 text-xs text-muted-foreground">{t('nothingFound')}</p>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

// ---------------------------------------------------------------------------
// ActionListEditor — public API
// ---------------------------------------------------------------------------

export interface ActionListEditorProps {
    value: unknown
    onChange: (v: unknown) => void
    label?: string
    className?: string
}

export default function ActionListEditor({
    value,
    onChange,
    label,
    className,
}: ActionListEditorProps) {
    const t = useTranslations('editors.actionListEditor')
    const [mode, setMode] = useState<'visual' | 'json'>('visual')
    const [actions, setActions] = useState<ActionItem[]>([])
    const [jsonRaw, setJsonRaw] = useState('')
    const [jsonError, setJsonError] = useState(false)

    useEffect(() => {
        const parsed = parseToActions(value)
        if (parsed === null) {
            setMode('json')
            setJsonRaw(value !== null && value !== undefined ? JSON.stringify(value, null, 2) : '')
        } else {
            setActions(parsed)
            setJsonRaw(value !== null && value !== undefined ? JSON.stringify(value, null, 2) : '')
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const commit = useCallback(
        (next: ActionItem[]) => {
            setActions(next)
            onChange(actionsToJson(next))
        },
        [onChange]
    )

    const handleAdd = (type: ActionType) => {
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2)
        commit([...actions, makeDefaultAction(type, id)])
    }

    const handleChange = (idx: number, updated: ActionItem) => {
        commit(actions.map((a, i) => (i === idx ? updated : a)))
    }

    const handleDelete = (idx: number) => {
        commit(actions.filter((_, i) => i !== idx))
    }

    const handleJsonChange = (raw: string) => {
        setJsonRaw(raw)
        try {
            const parsed = raw.trim() ? JSON.parse(raw) : null
            setJsonError(false)
            onChange(parsed)
        } catch {
            setJsonError(true)
        }
    }

    const switchToVisual = () => {
        const parsed = parseToActions(value)
        if (parsed === null) return
        setActions(parsed)
        setMode('visual')
    }

    const switchToJson = () => {
        const current = actionsToJson(actions)
        setJsonRaw(current !== null ? JSON.stringify(current, null, 2) : '')
        setMode('json')
    }

    return (
        <div className={cn('space-y-2', className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                {label && <Label className="text-xs">{label}</Label>}
                <div className="flex items-center gap-1 ml-auto">
                    {mode === 'visual' ? (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs gap-1"
                            onClick={switchToJson}
                        >
                            <Code2 className="h-3 w-3" />
                            {t('editJson')}
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs gap-1"
                            onClick={switchToVisual}
                        >
                            <List className="h-3 w-3" />
                            {t('editVisual')}
                        </Button>
                    )}
                </div>
            </div>

            {/* Visual mode */}
            {mode === 'visual' && (
                <div className="space-y-2">
                    {actions.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-1">
                            {t('noActions')}
                        </p>
                    ) : (
                        <div className="space-y-1.5">
                            {actions.map((action, idx) => (
                                <ActionEditor
                                    key={action._id}
                                    action={action}
                                    onChange={(updated) => handleChange(idx, updated)}
                                    onDelete={() => handleDelete(idx)}
                                />
                            ))}
                        </div>
                    )}
                    <AddActionDropdown onAdd={handleAdd} />
                </div>
            )}

            {/* JSON mode */}
            {mode === 'json' && (
                <div>
                    <Textarea
                        value={jsonRaw}
                        onChange={(e) => handleJsonChange(e.target.value)}
                        placeholder='{"actions": [{"type": "offer_quest", "slug": "my_quest"}]}'
                        rows={4}
                        className={cn(
                            'font-mono text-xs',
                            jsonError && 'border-destructive focus-visible:ring-destructive'
                        )}
                    />
                    {jsonError && <p className="text-xs text-destructive mt-1">{t('jsonError')}</p>}
                </div>
            )}
        </div>
    )
}
