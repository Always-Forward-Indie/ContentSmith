'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { ChevronRight, Swords, Plus, Trash2, Save, Pencil, X } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'

// ─── Stat formula row with inline edit ───────────────────────────────────────
function StatFormulaRow({ row, classId, level, onRefetch }: {
    row: { attributeId: number; attributeName: string | null; baseValue: number; multiplier: number; exponent: number };
    classId: number;
    level: number;
    onRefetch: () => void;
}) {
    const t = useTranslations('classes')
    const [base, setBase] = useState(String(row.baseValue))
    const [mult, setMult] = useState(String(row.multiplier))
    const [exp, setExp] = useState(String(row.exponent))

    const dirty = base !== String(row.baseValue) || mult !== String(row.multiplier) || exp !== String(row.exponent)
    const calc = Math.round(Number(base) + Number(mult) * Math.pow(level, Number(exp)))

    const upsert = trpc.classes.upsertStatFormula.useMutation({ onSuccess: () => { toast.success(t('saved')); onRefetch() } })
    const del = trpc.classes.deleteStatFormula.useMutation({ onSuccess: () => { toast.success(t('removed')); onRefetch() } })

    return (
        <TableRow>
            <TableCell className="font-medium">{row.attributeName}</TableCell>
            <TableCell><Input type="number" value={base} onChange={e => setBase(e.target.value)} className="h-7 w-24 text-sm font-mono" /></TableCell>
            <TableCell><Input type="number" value={mult} onChange={e => setMult(e.target.value)} className="h-7 w-24 text-sm font-mono" /></TableCell>
            <TableCell><Input type="number" value={exp} onChange={e => setExp(e.target.value)} className="h-7 w-20 text-sm font-mono" /></TableCell>
            <TableCell className="font-mono font-semibold text-right">{calc}</TableCell>
            <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                    <Button size="icon" variant={dirty ? 'default' : 'outline'} className="h-8 w-8" disabled={!dirty || upsert.isPending}
                        onClick={() => upsert.mutate({ classId, attributeId: row.attributeId, baseValue: Number(base), multiplier: Number(mult), exponent: Number(exp) })}>
                        <Save className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" disabled={del.isPending}
                        onClick={() => del.mutate({ classId, attributeId: row.attributeId })}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    )
}

// ─── Skill tree row with inline edit ─────────────────────────────────────────
function SkillTreeRow({ row, classId, onRefetch }: {
    row: { id: number; skillId: number; skillName: string | null; skillSlug: string | null; requiredLevel: number | null; isDefault: boolean | null };
    classId: number;
    onRefetch: () => void;
}) {
    const t = useTranslations('classes')
    const [editing, setEditing] = useState(false)
    const [level, setLevel] = useState(String(row.requiredLevel ?? 1))
    const [isDefault, setIsDefault] = useState(row.isDefault ?? false)

    const dirty = level !== String(row.requiredLevel ?? 1) || isDefault !== (row.isDefault ?? false)

    const update = trpc.classes.updateClassSkill.useMutation({ onSuccess: () => { toast.success(t('saved')); onRefetch(); setEditing(false) } })
    const del = trpc.classes.removeSkillFromClass.useMutation({ onSuccess: () => { toast.success(t('removed')); onRefetch() } })

    function save() { update.mutate({ id: row.id, requiredLevel: Number(level), isDefault }) }
    function cancel() { setLevel(String(row.requiredLevel ?? 1)); setIsDefault(row.isDefault ?? false); setEditing(false) }

    return (
        <TableRow>
            <TableCell className="font-medium">{row.skillName}</TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">{row.skillSlug}</TableCell>
            <TableCell className="text-center w-32">
                {editing ? (
                    <Input type="number" min={1} value={level} onChange={e => setLevel(e.target.value)}
                        className="h-7 w-20 text-sm mx-auto"
                        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel() }} />
                ) : (
                    <span>{row.requiredLevel ?? 1}</span>
                )}
            </TableCell>
            <TableCell className="text-center w-24">
                {editing ? (
                    <Switch checked={isDefault} onCheckedChange={setIsDefault} />
                ) : (
                    row.isDefault ? <Badge variant="secondary">Default</Badge> : '—'
                )}
            </TableCell>
            <TableCell className="text-right w-28">
                {editing ? (
                    <div className="flex justify-end gap-1">
                        <Button size="icon" variant={dirty ? 'default' : 'outline'} className="h-8 w-8" disabled={!dirty || update.isPending} onClick={save}>
                            <Save className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancel}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                ) : (
                    <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(true)}>
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" disabled={del.isPending}
                            onClick={() => del.mutate({ id: row.id })}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </TableCell>
        </TableRow>
    )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ClassDetailPage() {
    const { id } = useParams<{ id: string }>()
    const classId = Number(id)
    const locale = useLocale()
    const t = useTranslations('classes')
    const tc = useTranslations('common')

    // Queries
    const { data: cls, isLoading, refetch: refetchClass } = trpc.classes.getById.useQuery({ id: classId })
    const { data: formulas, refetch: refetchFormulas } = trpc.classes.listStatFormulas.useQuery({ classId })
    const { data: skillTree, refetch: refetchTree } = trpc.classes.listSkillTree.useQuery({ classId })
    const { data: allAttrs } = trpc.entityAttributes.list.useQuery({ page: 1, pageSize: 100 })
    const { data: allSkills } = trpc.skills.list.useQuery({ page: 1, limit: 200 })

    // Mutations
    const updateClass = trpc.classes.update.useMutation({ onSuccess: () => { toast.success(t('classUpdated')); refetchClass() } })
    const addSkill = trpc.classes.addSkillToClass.useMutation({ onSuccess: () => { toast.success(t('skillAdded')); refetchTree() } })
    const addFormula = trpc.classes.upsertStatFormula.useMutation({ onSuccess: () => { toast.success(t('formulaAdded')); refetchFormulas() } })

    // Edit form state
    const [editName, setEditName] = useState('')
    const [editSlug, setEditSlug] = useState('')
    const [editDesc, setEditDesc] = useState('')
    const [editMode, setEditMode] = useState(false)

    // Add formula form
    const [addAttrId, setAddAttrId] = useState('')
    const [addBase, setAddBase] = useState('0')
    const [addMult, setAddMult] = useState('1')
    const [addExp, setAddExp] = useState('1')

    // Add skill form
    const [addSkillId, setAddSkillId] = useState('')
    const [addLevel, setAddLevel] = useState('1')
    const [addDefault, setAddDefault] = useState(false)

    // Preview level for calc
    const [previewLevel, setPreviewLevel] = useState(30)

    const existingAttrIds = new Set((formulas ?? []).map(f => f.attributeId))
    const unusedAttrs = (allAttrs?.data ?? []).filter(a => !existingAttrIds.has(a.id))

    const existingSkillIds = new Set((skillTree ?? []).map(s => s.skillId))
    const unusedSkills = (allSkills?.data ?? []).filter(s => !existingSkillIds.has(s.id))

    if (isLoading) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
    if (!cls) return <p className="text-muted-foreground">{t('classNotFound')}</p>

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Link href={`/${locale}/classes`} className="hover:text-foreground transition-colors">{t('breadcrumb')}</Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-foreground font-medium">{cls.name}</span>
            </nav>

            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                    <Swords className="h-5 w-5" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight">{cls.name}</h1>
                        {cls.slug && <Badge variant="outline" className="font-mono text-xs">{cls.slug}</Badge>}
                    </div>
                    {cls.description && <p className="text-sm text-muted-foreground mt-0.5">{cls.description}</p>}
                </div>
                <Button variant="outline" size="sm" onClick={() => { setEditMode(true); setEditName(cls.name); setEditSlug(cls.slug ?? ''); setEditDesc(cls.description ?? '') }}>
                    {tc('edit')}
                </Button>
            </div>

            {/* Inline edit form */}
            {editMode && (
                <Card>
                    <CardHeader><CardTitle className="text-base">{t('editClass')}</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>{t('fields.name')}</Label>
                                <Input value={editName} onChange={e => setEditName(e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>{t('fields.slug')}</Label>
                                <Input value={editSlug} onChange={e => setEditSlug(e.target.value)} className="font-mono" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t('fields.description')}</Label>
                            <Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={2} />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setEditMode(false)}>{tc('cancel')}</Button>
                            <Button size="sm" disabled={updateClass.isPending}
                                onClick={() => updateClass.mutate({ id: classId, name: editName, slug: editSlug, description: editDesc }, { onSuccess: () => setEditMode(false) })}>
                                {updateClass.isPending ? tc('saving') : tc('save')}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Tabs defaultValue="formulas">
                <TabsList>
                    <TabsTrigger value="formulas">{t('tabs.formulas')} {(formulas ?? []).length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{formulas!.length}</Badge>}</TabsTrigger>
                    <TabsTrigger value="skills">{t('tabs.skills')} {(skillTree ?? []).length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{skillTree!.length}</Badge>}</TabsTrigger>
                </TabsList>

                {/* ── Stat Formulas ── */}
                <TabsContent value="formulas">
                    <Card>
                        <div className="px-4 pt-4 pb-3 border-b space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-muted-foreground">{t('statFormulas.previewAt')}</span>
                                <Input type="number" min={1} max={100} value={previewLevel} onChange={e => setPreviewLevel(Number(e.target.value))} className="w-16 h-7 text-sm" />
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <Select value={addAttrId} onValueChange={setAddAttrId} disabled={unusedAttrs.length === 0}>
                                    <SelectTrigger className="w-48 h-8 text-sm"><SelectValue placeholder={unusedAttrs.length === 0 ? t('statFormulas.noMore') : t('statFormulas.addPlaceholder')} /></SelectTrigger>
                                    <SelectContent>{unusedAttrs.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}</SelectContent>
                                </Select>
                                <Input type="number" placeholder="base" value={addBase} onChange={e => setAddBase(e.target.value)} className="w-20 h-8 text-sm" disabled={unusedAttrs.length === 0} />
                                <Input type="number" placeholder="mult" value={addMult} onChange={e => setAddMult(e.target.value)} className="w-20 h-8 text-sm" disabled={unusedAttrs.length === 0} />
                                <Input type="number" placeholder="exp" value={addExp} onChange={e => setAddExp(e.target.value)} className="w-20 h-8 text-sm" disabled={unusedAttrs.length === 0} />
                                <Button size="sm" className="h-8 gap-1" disabled={!addAttrId || addFormula.isPending || unusedAttrs.length === 0}
                                    onClick={() => { addFormula.mutate({ classId, attributeId: Number(addAttrId), baseValue: Number(addBase), multiplier: Number(addMult), exponent: Number(addExp) }); setAddAttrId('') }}>
                                    <Plus className="h-3.5 w-3.5" />{tc('add')}
                                </Button>
                            </div>
                        </div>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('statFormulas.table.attribute')}</TableHead>
                                        <TableHead className="w-28">{t('statFormulas.table.base')}</TableHead>
                                        <TableHead className="w-28">{t('statFormulas.table.mult')}</TableHead>
                                        <TableHead className="w-24">{t('statFormulas.table.exp')}</TableHead>
                                        <TableHead className="text-right w-28">{t('statFormulas.atLevel', { level: previewLevel })}</TableHead>
                                        <TableHead className="text-right w-24">{t('statFormulas.table.actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(formulas ?? []).length === 0 ? (
                                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">{t('statFormulas.noFormulas')}</TableCell></TableRow>
                                    ) : (formulas ?? []).map(row => (
                                        <StatFormulaRow key={row.attributeId} row={row} classId={classId} level={previewLevel} onRefetch={refetchFormulas} />
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── Skill Tree ── */}
                <TabsContent value="skills">
                    <Card>
                        <div className="px-4 pt-4 pb-3 border-b">
                            <div className="flex items-center gap-2 flex-wrap">
                                <Select value={addSkillId} onValueChange={setAddSkillId} disabled={unusedSkills.length === 0}>
                                    <SelectTrigger className="w-48 h-8 text-sm"><SelectValue placeholder={unusedSkills.length === 0 ? t('skillTree.noMore') : t('skillTree.addPlaceholder')} /></SelectTrigger>
                                    <SelectContent>{unusedSkills.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                                </Select>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <span>{t('skillTree.requiredLvl')}</span>
                                    <Input type="number" min={1} value={addLevel} onChange={e => setAddLevel(e.target.value)} className="w-16 h-8 text-sm" disabled={unusedSkills.length === 0} />
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <span>{t('skillTree.default')}</span>
                                    <Switch checked={addDefault} onCheckedChange={setAddDefault} disabled={unusedSkills.length === 0} />
                                </div>
                                <Button size="sm" className="h-8 gap-1" disabled={!addSkillId || addSkill.isPending || unusedSkills.length === 0}
                                    onClick={() => { addSkill.mutate({ classId, skillId: Number(addSkillId), requiredLevel: Number(addLevel), isDefault: addDefault }); setAddSkillId('') }}>
                                    <Plus className="h-3.5 w-3.5" />{tc('add')}
                                </Button>
                            </div>
                        </div>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('skillTree.table.skill')}</TableHead>
                                        <TableHead>{t('skillTree.table.slug')}</TableHead>
                                        <TableHead className="w-32 text-center">{t('skillTree.table.requiredLevel')}</TableHead>
                                        <TableHead className="w-24 text-center">{t('skillTree.table.default')}</TableHead>
                                        <TableHead className="text-right w-28">{t('skillTree.table.actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(skillTree ?? []).length === 0 ? (
                                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">{t('skillTree.noSkills')}</TableCell></TableRow>
                                    ) : (skillTree ?? []).map(s => (
                                        <SkillTreeRow key={s.id} row={s} classId={classId} onRefetch={refetchTree} />
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
