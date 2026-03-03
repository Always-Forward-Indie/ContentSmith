'use client'

import { useState } from 'react'
import { Plus, Trash2, Edit3, Zap } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { trpc } from '@/lib/trpc'
import { useToast } from '@/hooks/use-toast'

interface MobSkill {
    id: number
    skillId: number
    currentLevel: number
    skillName: string | null
    skillSlug: string | null
}

interface MobSkillsManagerProps {
    mobId: number
    skills: MobSkill[]
    onUpdate: () => void
}

export function MobSkillsManager({ mobId, skills, onUpdate }: MobSkillsManagerProps) {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [editingSkill, setEditingSkill] = useState<MobSkill | null>(null)
    const [deleteConfirmSkill, setDeleteConfirmSkill] = useState<MobSkill | null>(null)
    const [selectedSkillId, setSelectedSkillId] = useState<string>('')
    const [skillLevel, setSkillLevel] = useState<number>(1)

    const t = useTranslations('mobs')
    const commonT = useTranslations('common')
    const { toast } = useToast()

    const { data: availableSkills } = trpc.mobs.getAvailableSkills.useQuery()

    const setSkillMutation = trpc.mobs.setMobSkill.useMutation({
        onSuccess: () => {
            toast({ title: commonT('success'), description: t('skillUpdated') })
            onUpdate()
            setIsAddDialogOpen(false)
            setEditingSkill(null)
            resetForm()
        },
        onError: (error) => {
            toast({ title: commonT('error'), description: error.message, variant: 'error' })
        },
    })

    const removeSkillMutation = trpc.mobs.removeMobSkill.useMutation({
        onSuccess: () => {
            toast({ title: commonT('success'), description: t('skillRemoved') })
            onUpdate()
        },
        onError: (error) => {
            toast({ title: commonT('error'), description: error.message, variant: 'error' })
        },
    })

    const resetForm = () => { setSelectedSkillId(''); setSkillLevel(1) }

    const handleAddSkill = () => {
        if (!selectedSkillId) return
        setSkillMutation.mutate({ mobId, skillId: parseInt(selectedSkillId), currentLevel: skillLevel })
    }

    const handleEditSkill = (skill: MobSkill) => {
        setEditingSkill(skill)
        setSelectedSkillId(skill.skillId.toString())
        setSkillLevel(skill.currentLevel)
    }

    const handleUpdateSkill = () => {
        if (!editingSkill) return
        setSkillMutation.mutate({ mobId, skillId: editingSkill.skillId, currentLevel: skillLevel })
    }

    const handleRemoveSkill = (skillId: number) => {
        removeSkillMutation.mutate({ mobId, skillId })
        setDeleteConfirmSkill(null)
    }

    const assignedIds = new Set(skills.map(s => s.skillId))
    const unassignedSkills = availableSkills?.filter(s => !assignedIds.has(s.id)) ?? []

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between pb-3">
                <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" />
                        {t('skills')}
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">{t('skillsDescription')}</CardDescription>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8">
                            <Plus className="h-3.5 w-3.5" />
                            {t('addSkill')}
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('addSkill')}</DialogTitle>
                            <DialogDescription>{t('skillsDescription')}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label>{t('skill')}</Label>
                                <Select value={selectedSkillId} onValueChange={setSelectedSkillId}>
                                    <SelectTrigger><SelectValue placeholder="Select skill..." /></SelectTrigger>
                                    <SelectContent>
                                        {unassignedSkills.map(s => (
                                            <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>{t('skillLevel')}</Label>
                                <Input type="number" min={1} value={skillLevel} onChange={e => setSkillLevel(parseInt(e.target.value) || 1)} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm() }}>{commonT('cancel')}</Button>
                            <Button onClick={handleAddSkill} disabled={!selectedSkillId || setSkillMutation.isPending}>
                                {setSkillMutation.isPending ? commonT('saving') : commonT('save')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {skills.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">{t('noSkills')}</p>
                        <p className="text-xs mt-1">{t('addFirstSkill')}</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {skills.map(skill => (
                            <div key={skill.id} className="flex items-center justify-between rounded-lg border px-3 py-2 gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-sm font-medium truncate">{skill.skillName}</span>
                                    {skill.skillSlug && (
                                        <Badge variant="outline" className="text-[10px] font-mono hidden sm:flex">{skill.skillSlug}</Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Badge variant="secondary" className="font-mono">Lv. {skill.currentLevel}</Badge>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); handleEditSkill(skill) }}>
                                                    <Edit3 className="h-3.5 w-3.5" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>{t('editSkill')}</TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={e => { e.stopPropagation(); setDeleteConfirmSkill(skill) }}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>{t('removeSkill')}</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>

            {/* Edit dialog */}
            <Dialog open={!!editingSkill} onOpenChange={(o) => { if (!o) setEditingSkill(null) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('editSkill')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>{t('skill')}</Label>
                            <p className="text-sm font-medium">{editingSkill?.skillName}</p>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('skillLevel')}</Label>
                            <Input type="number" min={1} value={skillLevel} onChange={e => setSkillLevel(parseInt(e.target.value) || 1)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingSkill(null)}>{commonT('cancel')}</Button>
                        <Button onClick={handleUpdateSkill} disabled={setSkillMutation.isPending}>
                            {setSkillMutation.isPending ? commonT('saving') : commonT('save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete confirm dialog */}
            <Dialog open={!!deleteConfirmSkill} onOpenChange={(o) => { if (!o) setDeleteConfirmSkill(null) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('removeSkill')}</DialogTitle>
                        <DialogDescription>Remove &quot;{deleteConfirmSkill?.skillName}&quot; from this mob?</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirmSkill(null)}>{commonT('cancel')}</Button>
                        <Button variant="destructive" onClick={() => deleteConfirmSkill && handleRemoveSkill(deleteConfirmSkill.skillId)}
                            disabled={removeSkillMutation.isPending}>
                            {removeSkillMutation.isPending ? commonT('deleting') : commonT('delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    )
}
