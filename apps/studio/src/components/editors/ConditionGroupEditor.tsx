'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Plus, Trash2, Code2, List, AlertTriangle } from 'lucide-react'
import { useTranslations } from 'next-intl'
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
import { trpc } from '@/lib/trpc'
import EntityCombobox from './EntityCombobox'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ConditionType =
    | 'flag'
    | 'quest'
    | 'quest_step'
    | 'level'
    | 'item'
    | 'reputation'
    | 'mastery'
    | 'has_skill_points'
    | 'skill_learned'
    | 'skill_not_learned'
    | 'class'
    | 'object_state'

type CompareOp = 'eq' | 'gte' | 'lte' | 'gt' | 'lt'

interface ConditionRule {
    _id: string
    type: ConditionType
    [key: string]: unknown
}

interface EditorState {
    operator: 'all' | 'any'
    conditions: ConditionRule[]
}

// ---------------------------------------------------------------------------
// JSON <-> State helpers
// ---------------------------------------------------------------------------

function parseToState(value: unknown): EditorState | null {
    if (value === null || value === undefined) {
        return { operator: 'all', conditions: [] }
    }
    if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value as object).length === 0) {
        return { operator: 'all', conditions: [] }
    }

    let operator: 'all' | 'any' = 'all'
    let items: unknown[] = []

    if (Array.isArray(value)) {
        items = value
    } else if (typeof value === 'object' && value !== null) {
        const obj = value as Record<string, unknown>
        if (obj.all && Array.isArray(obj.all)) { operator = 'all'; items = obj.all }
        else if (obj.any && Array.isArray(obj.any)) { operator = 'any'; items = obj.any }
        else if (obj.type) { items = [value] }
        else if (obj.not !== undefined) { return null }
    }

    const hasNested = items.some(
        (i) => typeof i === 'object' && i !== null &&
            ((i as Record<string, unknown>).all || (i as Record<string, unknown>).any || (i as Record<string, unknown>).not)
    )
    if (hasNested) return null

    return {
        operator,
        conditions: items.map((c, idx) => ({
            _id: String(idx) + '_' + Math.random().toString(36).slice(2),
            ...(c as object),
        })) as ConditionRule[],
    }
}

function stateToJsonFromSerialized(state: { operator: 'all' | 'any'; conditions: Record<string, unknown>[] }): unknown {
    if (state.conditions.length === 0) return null
    if (state.conditions.length === 1) return state.conditions[0]
    return { [state.operator]: state.conditions }
}

function stateToJsonWithSerialization(state: EditorState): unknown {
    if (state.conditions.length === 0) return null
    const clean = state.conditions.map(serializeRule)
    if (clean.length === 1) return clean[0]
    return { [state.operator]: clean }
}

// ---------------------------------------------------------------------------
// Default rules
// ---------------------------------------------------------------------------

function makeDefaultRule(type: ConditionType, id: string): ConditionRule {
    switch (type) {
        case 'flag': return { _id: id, type, key: '', valueMode: 'bool', eq: false }
        case 'quest': return { _id: id, type, slug: '', state: 'not_started' }
        case 'quest_step': return { _id: id, type, slug: '', op: 'eq', step: 0 }
        case 'level': return { _id: id, type, op: 'gte', value: 1 }
        case 'item': return { _id: id, type, item_id: 0, op: 'gte', value: 1 }
        case 'reputation': return { _id: id, type, faction: '', repMode: 'value', op: 'gte', value: 0 }
        case 'mastery': return { _id: id, type, slug: '', op: 'gte', value: 0 }
        case 'has_skill_points': return { _id: id, type, op: 'gte', value: 1 }
        case 'skill_learned': return { _id: id, type, slug: '' }
        case 'skill_not_learned': return { _id: id, type, slug: '' }
        case 'class': return { _id: id, type, classMode: 'single', class_id: 1 }
        case 'object_state': return { _id: id, type, object_id: 0, state: 'active' }
    }
}

// ---------------------------------------------------------------------------
// Rule serialization
// ---------------------------------------------------------------------------

function serializeRule(rule: ConditionRule): Record<string, unknown> {
    const { _id, valueMode, repMode, classMode, op, value, ...rest } = rule as ConditionRule & {
        valueMode?: string; repMode?: string; classMode?: string; op?: CompareOp; value?: unknown
    }
    void _id
    const out: Record<string, unknown> = { ...rest }

    switch (rule.type) {
        case 'flag': {
            const vMode = (rule as Record<string, unknown>).valueMode as string | undefined
            if (vMode === 'bool') { out.eq = (rule as Record<string, unknown>).eq }
            else { const k = (op as string) ?? 'eq'; out[k] = value }
            delete out.valueMode; break
        }
        case 'quest_step': {
            const k = (op as string) ?? 'eq'
            if (k === 'step') { out.step = value } else { out[k] = value }
            delete out.op; delete out.value; break
        }
        case 'level': case 'item': case 'mastery': case 'has_skill_points': {
            const k = op ?? 'gte'; out[k] = value; delete out.op; delete out.value; break
        }
        case 'reputation': {
            const rMode = (rule as Record<string, unknown>).repMode as string | undefined
            if (rMode !== 'tier') { const k = op ?? 'gte'; out[k] = value }
            delete out.repMode; delete out.op; delete out.value; break
        }
        case 'class': {
            const cMode = (rule as Record<string, unknown>).classMode as string | undefined
            if (cMode !== 'multiple') { delete out.class_ids }
            delete out.classMode; break
        }
    }
    return out
}

// ---------------------------------------------------------------------------
// Field sub-components (can use hooks)
// ---------------------------------------------------------------------------

interface FieldProps { rule: ConditionRule; set: (key: string, val: unknown) => void }

function FlagFields({ rule, set }: FieldProps) {
    const t = useTranslations('editors.conditionGroupEditor')
    const r = rule as Record<string, unknown>
    return (
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <Input value={(r.key as string) ?? ''} onChange={(e) => set('key', e.target.value)}
                placeholder={t('fields.flagKey')} className="h-7 text-xs font-mono w-40 shrink-0" />
            <Select value={(r.valueMode as string) ?? 'bool'} onValueChange={(v) => set('valueMode', v)}>
                <SelectTrigger className="h-7 text-xs w-28 shrink-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="bool">bool</SelectItem>
                    <SelectItem value="int">int</SelectItem>
                </SelectContent>
            </Select>
            {((r.valueMode as string) ?? 'bool') === 'bool' ? (
                <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">{t('fields.eq')}</span>
                    <Switch checked={!!(r.eq)} onCheckedChange={(v) => set('eq', v)} className="scale-75" />
                    <span className="text-xs font-mono">{r.eq ? t('fields.boolTrue') : t('fields.boolFalse')}</span>
                </div>
            ) : (
                <>
                    <CompareOpSelect value={(r.op as string) ?? 'eq'} onChange={(v) => set('op', v)} />
                    <Input type="number" value={(r.value as number) ?? 0}
                        onChange={(e) => set('value', parseInt(e.target.value) || 0)}
                        className="h-7 text-xs w-20 shrink-0" />
                </>
            )}
        </div>
    )
}

function QuestFields({ rule, set }: FieldProps) {
    const t = useTranslations('editors.conditionGroupEditor')
    const r = rule as Record<string, unknown>
    const [search, setSearch] = useState('')
    const slug = (r.slug as string) ?? ''
    const { data: listData, isLoading } = trpc.quest.list.useQuery({ search, page: 1, limit: 20 })
    const { data: current } = trpc.quest.getBySlug.useQuery({ slug }, { enabled: !!slug })
    const options = (listData?.data ?? []).map((q) => ({ value: q.slug, label: q.slug, sublabel: q.clientQuestKey ?? undefined }))
    return (
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <EntityCombobox value={slug || null} displayName={(current?.slug ?? slug) || null}
                onChange={(v) => set('slug', v ?? '')} options={options} isLoading={isLoading}
                onSearch={setSearch} placeholder={t('selectPlaceholder')} />
            <Select value={(r.state as string) ?? 'not_started'} onValueChange={(v) => set('state', v)}>
                <SelectTrigger className="h-7 text-xs w-32 shrink-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                    {(['not_started', 'active', 'completed', 'turned_in', 'failed'] as const).map((s) => (
                        <SelectItem key={s} value={s}>{t(`questStates.${s}`)}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}

function QuestStepFields({ rule, set }: FieldProps) {
    const t = useTranslations('editors.conditionGroupEditor')
    const r = rule as Record<string, unknown>
    const [search, setSearch] = useState('')
    const slug = (r.slug as string) ?? ''
    const { data: listData, isLoading } = trpc.quest.list.useQuery({ search, page: 1, limit: 20 })
    const { data: current } = trpc.quest.getBySlug.useQuery({ slug }, { enabled: !!slug })
    const options = (listData?.data ?? []).map((q) => ({ value: q.slug, label: q.slug, sublabel: q.clientQuestKey ?? undefined }))
    return (
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <EntityCombobox value={slug || null} displayName={(current?.slug ?? slug) || null}
                onChange={(v) => set('slug', v ?? '')} options={options} isLoading={isLoading}
                onSearch={setSearch} placeholder={t('selectPlaceholder')} />
            <Select value={(r.op as string) ?? 'eq'} onValueChange={(v) => set('op', v)}>
                <SelectTrigger className="h-7 text-xs w-24 shrink-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="step">{t('ops.step')}</SelectItem>
                    {(['eq', 'gte', 'lte', 'gt', 'lt'] as const).map((op) => (
                        <SelectItem key={op} value={op}>{t(`ops.${op}`)}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Input type="number" value={(r.value as number) ?? (r.step as number) ?? 0}
                onChange={(e) => set('value', parseInt(e.target.value) || 0)}
                className="h-7 text-xs w-16 shrink-0" />
        </div>
    )
}

function NumericFields({ rule, set }: FieldProps) {
    const r = rule as Record<string, unknown>
    return (
        <div className="flex items-center gap-2 flex-1 min-w-0">
            <CompareOpSelect value={(r.op as string) ?? 'gte'} onChange={(v) => set('op', v)} />
            <Input type="number" value={(r.value as number) ?? 1}
                onChange={(e) => set('value', parseInt(e.target.value) || 0)}
                className="h-7 text-xs w-20 shrink-0" />
        </div>
    )
}

function ItemFields({ rule, set }: FieldProps) {
    const t = useTranslations('editors.conditionGroupEditor')
    const r = rule as Record<string, unknown>
    const [search, setSearch] = useState('')
    const itemId = (r.item_id as number) ?? 0
    const { data: listData, isLoading } = trpc.items.list.useQuery({ search, page: 1, limit: 20 })
    const { data: current } = trpc.items.getById.useQuery({ id: itemId }, { enabled: !!itemId })
    const options = (listData?.items ?? []).map((item) => ({ value: item.id, label: item.name, sublabel: item.slug }))
    return (
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <EntityCombobox value={itemId || null} displayName={current?.name ?? null}
                onChange={(v) => set('item_id', v ?? 0)} options={options} isLoading={isLoading}
                onSearch={setSearch} placeholder={t('selectPlaceholder')} />
            <Select value={(r.op as string) ?? 'gte'} onValueChange={(v) => set('op', v)}>
                <SelectTrigger className="h-7 text-xs w-24 shrink-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="gte">&#8805; {t('fields.quantity')}</SelectItem>
                    <SelectItem value="lte">&#8804; {t('fields.quantity')}</SelectItem>
                    <SelectItem value="eq">= {t('fields.quantity')}</SelectItem>
                </SelectContent>
            </Select>
            <Input type="number" value={(r.value as number) ?? 1}
                onChange={(e) => set('value', parseInt(e.target.value) || 0)}
                className="h-7 text-xs w-16 shrink-0" />
        </div>
    )
}

function ReputationFields({ rule, set }: FieldProps) {
    const t = useTranslations('editors.conditionGroupEditor')
    const r = rule as Record<string, unknown>
    const rMode = (r.repMode as string) ?? 'value'
    const [search, setSearch] = useState('')
    const factionSlug = (r.faction as string) ?? ''
    const { data: listData, isLoading } = trpc.factions.list.useQuery({ search, page: 1, pageSize: 20 })
    const { data: current } = trpc.factions.getBySlug.useQuery({ slug: factionSlug }, { enabled: !!factionSlug })
    const options = (listData?.data ?? []).map((f) => ({ value: f.slug, label: f.name, sublabel: f.slug }))
    return (
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <EntityCombobox value={factionSlug || null} displayName={(current?.name ?? factionSlug) || null}
                onChange={(v) => set('faction', v ?? '')} options={options} isLoading={isLoading}
                onSearch={setSearch} placeholder={t('selectPlaceholder')} />
            <Select value={rMode} onValueChange={(v) => set('repMode', v)}>
                <SelectTrigger className="h-7 text-xs w-24 shrink-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="value">{t('fields.repModeValue')}</SelectItem>
                    <SelectItem value="tier">{t('fields.repModeTier')}</SelectItem>
                </SelectContent>
            </Select>
            {rMode === 'tier' ? (
                <Select value={(r.tier as string) ?? 'neutral'} onValueChange={(v) => set('tier', v)}>
                    <SelectTrigger className="h-7 text-xs w-28 shrink-0"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {(['enemy', 'stranger', 'neutral', 'friendly', 'ally'] as const).map((tier) => (
                            <SelectItem key={tier} value={tier}>{t(`repTiers.${tier}`)}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            ) : (
                <>
                    <CompareOpSelect value={(r.op as string) ?? 'gte'} onChange={(v) => set('op', v)} />
                    <Input type="number" value={(r.value as number) ?? 0}
                        onChange={(e) => set('value', parseInt(e.target.value) || 0)}
                        className="h-7 text-xs w-20 shrink-0" />
                </>
            )}
        </div>
    )
}

function MasteryFields({ rule, set }: FieldProps) {
    const t = useTranslations('editors.conditionGroupEditor')
    const r = rule as Record<string, unknown>
    const [search, setSearch] = useState('')
    const slug = (r.slug as string) ?? ''
    const { data: listData, isLoading } = trpc.masteryDefinitions.list.useQuery({ search, page: 1, pageSize: 20 })
    const { data: current } = trpc.masteryDefinitions.getBySlug.useQuery({ slug }, { enabled: !!slug })
    const options = (listData?.data ?? []).map((m) => ({ value: m.slug, label: m.name, sublabel: m.slug }))
    return (
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <EntityCombobox value={slug || null} displayName={(current?.name ?? slug) || null}
                onChange={(v) => set('slug', v ?? '')} options={options} isLoading={isLoading}
                onSearch={setSearch} placeholder={t('selectPlaceholder')} />
            <CompareOpSelect value={(r.op as string) ?? 'gte'} onChange={(v) => set('op', v)} />
            <Input type="number" step="0.1" value={(r.value as number) ?? 0}
                onChange={(e) => set('value', parseFloat(e.target.value) || 0)}
                className="h-7 text-xs w-20 shrink-0" />
        </div>
    )
}

function SkillFields({ rule, set }: FieldProps) {
    const t = useTranslations('editors.conditionGroupEditor')
    const r = rule as Record<string, unknown>
    const [search, setSearch] = useState('')
    const slug = (r.slug as string) ?? ''
    const { data: listData, isLoading } = trpc.skills.list.useQuery({ search, page: 1, limit: 20 })
    const { data: current } = trpc.skills.getBySlug.useQuery({ slug }, { enabled: !!slug })
    const options = (listData?.data ?? []).map((s) => ({ value: s.slug, label: s.name, sublabel: s.slug }))
    return (
        <EntityCombobox value={slug || null} displayName={(current?.name ?? slug) || null}
            onChange={(v) => set('slug', v ?? '')} options={options} isLoading={isLoading}
            onSearch={setSearch} placeholder={t('selectPlaceholder')} className="flex-1 min-w-0" />
    )
}

function ClassFields({ rule, set }: FieldProps) {
    const t = useTranslations('editors.conditionGroupEditor')
    const r = rule as Record<string, unknown>
    const cMode = (r.classMode as string) ?? 'single'
    const [search, setSearch] = useState('')
    const classId = (r.class_id as number) ?? 0
    const { data: listData, isLoading } = trpc.classes.list.useQuery({ search, page: 1, pageSize: 20 })
    const { data: current } = trpc.classes.getById.useQuery({ id: classId }, { enabled: !!classId })
    const options = (listData?.data ?? []).map((c) => ({ value: c.id, label: c.name, sublabel: c.slug ?? undefined }))
    return (
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <Select value={cMode} onValueChange={(v) => set('classMode', v)}>
                <SelectTrigger className="h-7 text-xs w-28 shrink-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="single">{t('fields.classModeSingle')}</SelectItem>
                    <SelectItem value="multiple">{t('fields.classModeMultiple')}</SelectItem>
                </SelectContent>
            </Select>
            {cMode === 'single' ? (
                <EntityCombobox value={classId || null} displayName={current?.name ?? null}
                    onChange={(v) => set('class_id', v ?? 0)} options={options} isLoading={isLoading}
                    onSearch={setSearch} placeholder={t('selectPlaceholder')} />
            ) : (
                <Input
                    value={Array.isArray(r.class_ids) ? (r.class_ids as number[]).join(',') : ''}
                    onChange={(e) => set('class_ids', e.target.value.split(',').map((s) => parseInt(s.trim())).filter((n) => !isNaN(n)))}
                    placeholder={t('fields.classIdsPlaceholder')}
                    className="h-7 text-xs font-mono w-32 shrink-0" />
            )}
        </div>
    )
}

function ObjectStateFields({ rule, set }: FieldProps) {
    const t = useTranslations('editors.conditionGroupEditor')
    const r = rule as Record<string, unknown>
    const [search, setSearch] = useState('')
    const objectId = (r.object_id as number) ?? 0
    const { data: listData, isLoading } = trpc.worldObjects.list.useQuery({ search, page: 1, pageSize: 20 })
    const { data: current } = trpc.worldObjects.getById.useQuery({ id: objectId }, { enabled: !!objectId })
    const options = (listData?.data ?? []).map((o) => ({ value: o.id, label: o.slug, sublabel: o.objectType ?? undefined }))
    return (
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <EntityCombobox value={objectId || null} displayName={current?.slug ?? null}
                onChange={(v) => set('object_id', v ?? 0)} options={options} isLoading={isLoading}
                onSearch={setSearch} placeholder={t('selectPlaceholder')} />
            <Select value={(r.state as string) ?? 'active'} onValueChange={(v) => set('state', v)}>
                <SelectTrigger className="h-7 text-xs w-28 shrink-0"><SelectValue /></SelectTrigger>
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
// Shared CompareOpSelect
// ---------------------------------------------------------------------------

function CompareOpSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const t = useTranslations('editors.conditionGroupEditor')
    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="h-7 text-xs w-28 shrink-0"><SelectValue /></SelectTrigger>
            <SelectContent>
                {(['eq', 'gte', 'lte', 'gt', 'lt'] as const).map((op) => (
                    <SelectItem key={op} value={op}>{t(`ops.${op}`)}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}

// ---------------------------------------------------------------------------
// RuleEditor
// ---------------------------------------------------------------------------

interface RuleEditorProps {
    rule: ConditionRule
    onChange: (updated: ConditionRule) => void
    onDelete: () => void
}

const CONDITION_TYPES: ConditionType[] = [
    'flag', 'quest', 'quest_step', 'level', 'item', 'reputation',
    'mastery', 'has_skill_points', 'skill_learned', 'skill_not_learned',
    'class', 'object_state',
]

function RuleEditor({ rule, onChange, onDelete }: RuleEditorProps) {
    const t = useTranslations('editors.conditionGroupEditor')
    const set = useCallback((key: string, val: unknown) => onChange({ ...rule, [key]: val }), [rule, onChange])
    const fp: FieldProps = { rule, set }

    const renderFields = () => {
        switch (rule.type) {
            case 'flag': return <FlagFields {...fp} />
            case 'quest': return <QuestFields {...fp} />
            case 'quest_step': return <QuestStepFields {...fp} />
            case 'level':
            case 'has_skill_points': return <NumericFields {...fp} />
            case 'item': return <ItemFields {...fp} />
            case 'reputation': return <ReputationFields {...fp} />
            case 'mastery': return <MasteryFields {...fp} />
            case 'skill_learned':
            case 'skill_not_learned': return <SkillFields {...fp} />
            case 'class': return <ClassFields {...fp} />
            case 'object_state': return <ObjectStateFields {...fp} />
            default: return null
        }
    }

    return (
        <div className="flex items-start gap-2 rounded-md border border-border/50 bg-muted/20 px-2.5 py-2">
            <Select
                value={rule.type}
                onValueChange={(v) => {
                    const id = Date.now().toString(36) + Math.random().toString(36).slice(2)
                    onChange(makeDefaultRule(v as ConditionType, id))
                }}
            >
                <SelectTrigger className="h-7 text-xs w-44 shrink-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                    {CONDITION_TYPES.map((ct) => (
                        <SelectItem key={ct} value={ct}>{t(`types.${ct}`)}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {renderFields()}
            <Button type="button" variant="ghost" size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5" />
            </Button>
        </div>
    )
}

// ---------------------------------------------------------------------------
// ConditionGroupEditor — public API
// ---------------------------------------------------------------------------

export interface ConditionGroupEditorProps {
    value: unknown
    onChange: (v: unknown) => void
    label?: string
    className?: string
}

export default function ConditionGroupEditor({ value, onChange, label, className }: ConditionGroupEditorProps) {
    const t = useTranslations('editors.conditionGroupEditor')
    const [mode, setMode] = useState<'visual' | 'json'>('visual')
    const [state, setState] = useState<EditorState>({ operator: 'all', conditions: [] })
    const [jsonRaw, setJsonRaw] = useState('')
    const [jsonError, setJsonError] = useState(false)
    const [forcedJson, setForcedJson] = useState(false)

    useEffect(() => {
        const parsed = parseToState(value)
        if (parsed === null) {
            setForcedJson(true); setMode('json')
            setJsonRaw(value !== null && value !== undefined ? JSON.stringify(value, null, 2) : '')
        } else {
            setState(parsed)
            setJsonRaw(value !== null && value !== undefined ? JSON.stringify(value, null, 2) : '')
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleConditionChange = useCallback((idx: number, updated: ConditionRule) => {
        const next = { ...state, conditions: state.conditions.map((c, i) => (i === idx ? updated : c)) }
        setState(next)
        const serialized = next.conditions.map(serializeRule)
        onChange(stateToJsonFromSerialized({ ...next, conditions: serialized }))
    }, [state, onChange])

    const handleConditionDelete = useCallback((idx: number) => {
        const next = { ...state, conditions: state.conditions.filter((_, i) => i !== idx) }
        setState(next); onChange(stateToJsonWithSerialization(next))
    }, [state, onChange])

    const handleAddCondition = useCallback((type: ConditionType) => {
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2)
        const next = { ...state, conditions: [...state.conditions, makeDefaultRule(type, id)] }
        setState(next); onChange(stateToJsonWithSerialization(next))
    }, [state, onChange])

    const handleOperatorChange = useCallback((op: 'all' | 'any') => {
        const next = { ...state, operator: op }
        setState(next); onChange(stateToJsonWithSerialization(next))
    }, [state, onChange])

    const handleJsonChange = (raw: string) => {
        setJsonRaw(raw)
        try { const parsed = raw.trim() ? JSON.parse(raw) : null; setJsonError(false); onChange(parsed) }
        catch { setJsonError(true) }
    }

    const switchToVisual = () => {
        const parsed = parseToState(value); if (parsed === null) return
        setState(parsed); setForcedJson(false); setMode('visual')
    }
    const switchToJson = () => {
        setJsonRaw(stateToJsonWithSerialization(state) !== null ? JSON.stringify(stateToJsonWithSerialization(state), null, 2) : '')
        setMode('json')
    }

    return (
        <div className={cn('space-y-2', className)}>
            <div className="flex items-center justify-between">
                {label && <Label className="text-xs">{label}</Label>}
                <div className="flex items-center gap-1 ml-auto">
                    {forcedJson && (
                        <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="h-3 w-3" />{t('complexStructure')}
                        </span>
                    )}
                    {mode === 'visual' ? (
                        <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={switchToJson}>
                            <Code2 className="h-3 w-3" />{t('switchToJson')}
                        </Button>
                    ) : (
                        <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1"
                            onClick={switchToVisual} disabled={!(!forcedJson) && parseToState(value) === null}>
                            <List className="h-3 w-3" />{t('switchToVisual')}
                        </Button>
                    )}
                </div>
            </div>

            {mode === 'visual' && (
                <div className="space-y-2">
                    {state.conditions.length >= 2 && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{t('operator')}:</span>
                            <Select value={state.operator} onValueChange={handleOperatorChange as (v: string) => void}>
                                <SelectTrigger className="h-7 text-xs w-36"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('operatorAll')}</SelectItem>
                                    <SelectItem value="any">{t('operatorAny')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    {state.conditions.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-1">{t('noConditions')}</p>
                    ) : (
                        <div className="space-y-1.5">
                            {state.conditions.map((cond, idx) => (
                                <RuleEditor key={cond._id} rule={cond}
                                    onChange={(u) => handleConditionChange(idx, u)}
                                    onDelete={() => handleConditionDelete(idx)} />
                            ))}
                        </div>
                    )}
                    <AddConditionDropdown onAdd={handleAddCondition} />
                </div>
            )}

            {mode === 'json' && (
                <div>
                    <Textarea value={jsonRaw} onChange={(e) => handleJsonChange(e.target.value)}
                        placeholder='{"all": [{"type": "quest", "slug": "my_quest", "state": "not_started"}]}'
                        rows={4} className={cn('font-mono text-xs', jsonError && 'border-destructive focus-visible:ring-destructive')} />
                    {jsonError && <p className="text-xs text-destructive mt-1">{t('invalidJson')}</p>}
                </div>
            )}
        </div>
    )
}

// ---------------------------------------------------------------------------
// AddConditionDropdown
// ---------------------------------------------------------------------------

const CONDITION_GROUP_KEYS = [
    { key: 'quests' as const, types: ['quest', 'quest_step'] as ConditionType[] },
    { key: 'character' as const, types: ['level', 'class', 'has_skill_points'] as ConditionType[] },
    { key: 'skills' as const, types: ['skill_learned', 'skill_not_learned', 'mastery'] as ConditionType[] },
    { key: 'world' as const, types: ['flag', 'item', 'reputation', 'object_state'] as ConditionType[] },
]

function AddConditionDropdown({ onAdd }: { onAdd: (type: ConditionType) => void }) {
    const t = useTranslations('editors.conditionGroupEditor')
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState('')

    const filteredGroups = CONDITION_GROUP_KEYS.map((g) => ({
        ...g,
        types: g.types.filter(
            (type) => !search || type.includes(search.toLowerCase()) ||
                t(`types.${type}`).toLowerCase().includes(search.toLowerCase())
        ),
    })).filter((g) => g.types.length > 0)

    return (
        <div className="relative">
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1.5"
                onClick={() => setOpen((v) => !v)}>
                <Plus className="h-3.5 w-3.5" />{t('addCondition')}
            </Button>
            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setSearch('') }} />
                    <div className="absolute z-50 mt-1 w-56 rounded-md border border-border bg-popover shadow-lg">
                        <div className="p-1.5 border-b border-border">
                            <Input value={search} onChange={(e) => setSearch(e.target.value)}
                                placeholder={t('searchPlaceholder')} className="h-6 text-xs" autoFocus />
                        </div>
                        <div className="max-h-64 overflow-y-auto p-1">
                            {filteredGroups.map((group) => (
                                <div key={group.key}>
                                    <p className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                                        {t(`groups.${group.key}`)}
                                    </p>
                                    {group.types.map((type) => (
                                        <button key={type} type="button"
                                            className="flex w-full items-center gap-2 rounded px-2 py-1 text-xs hover:bg-accent transition-colors"
                                            onClick={() => { onAdd(type); setOpen(false); setSearch('') }}>
                                            <span className="font-medium">{t(`types.${type}`)}</span>
                                            <span className="ml-auto text-[10px] font-mono text-muted-foreground">{type}</span>
                                        </button>
                                    ))}
                                </div>
                            ))}
                            {filteredGroups.length === 0 && (
                                <p className="px-2 py-2 text-xs text-muted-foreground">{t('notFound')}</p>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
