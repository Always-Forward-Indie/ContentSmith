'use client'

import { useState } from 'react'
import { Plus, Trash2, Edit3 } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { trpc } from '@/lib/trpc'
import { useToast } from '@/hooks/use-toast'

interface NpcSkill {
    id: number
    skillId: number
    currentLevel: number
    skillName: string | null
    skillSlug: string | null
}

interface NpcSkillsManagerProps {
    npcId: number
    skills: NpcSkill[]
    onUpdate: () => void
}

export function NpcSkillsManager({ npcId, skills, onUpdate }: NpcSkillsManagerProps) {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [editingSkill, setEditingSkill] = useState<NpcSkill | null>(null)
    const [deleteConfirmSkill, setDeleteConfirmSkill] = useState<NpcSkill | null>(null)
    const [selectedSkillId, setSelectedSkillId] = useState<string>('')
    const [skillLevel, setSkillLevel] = useState<number>(1)

    const t = useTranslations('npcs')
    const commonT = useTranslations('common')
    const { toast } = useToast()

    // Fetch available skills
    const { data: availableSkills } = trpc.npc.getAvailableSkills.useQuery()

    // Mutations
    const setSkillMutation = trpc.npc.setNpcSkill.useMutation({
        onSuccess: () => {
            toast({
                title: commonT('success'),
                description: t('skillUpdated'),
            })
            onUpdate()
            setIsAddDialogOpen(false)
            setEditingSkill(null)
            resetForm()
        },
        onError: (error) => {
            toast({
                title: commonT('error'),
                description: error.message,
                variant: 'error',
            })
        },
    })

    const removeSkillMutation = trpc.npc.removeNpcSkill.useMutation({
        onSuccess: () => {
            toast({
                title: commonT('success'),
                description: t('skillRemoved'),
            })
            onUpdate()
        },
        onError: (error) => {
            toast({
                title: commonT('error'),
                description: error.message,
                variant: 'error',
            })
        },
    })

    const resetForm = () => {
        setSelectedSkillId('')
        setSkillLevel(1)
    }

    const handleAddSkill = () => {
        if (!selectedSkillId || skillLevel < 1) return

        setSkillMutation.mutate({
            npcId,
            skillId: parseInt(selectedSkillId),
            currentLevel: skillLevel,
        })
    }

    const handleEditSkill = (skill: NpcSkill) => {
        setEditingSkill(skill)
        setSelectedSkillId(skill.skillId.toString())
        setSkillLevel(skill.currentLevel)
    }

    const handleUpdateSkill = () => {
        if (!editingSkill || skillLevel < 1) return

        setSkillMutation.mutate({
            npcId,
            skillId: editingSkill.skillId,
            currentLevel: skillLevel,
        })
    }

    const handleRemoveSkill = (skillId: number) => {
        removeSkillMutation.mutate({
            npcId,
            skillId,
        })
        setDeleteConfirmSkill(null)
    }

    const handleEditClick = (e: React.MouseEvent, skill: NpcSkill) => {
        e.stopPropagation()
        handleEditSkill(skill)
    }

    const handleDeleteClick = (e: React.MouseEvent, skill: NpcSkill) => {
        e.stopPropagation()
        setDeleteConfirmSkill(skill)
    }

    // Filter out already assigned skills for the add dialog
    const unassignedSkills = availableSkills?.filter(
        skill => !skills.some(npcSkill => npcSkill.skillId === skill.id)
    ) || []

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>{t('skills')}</CardTitle>
                        <CardDescription>
                            {t('skillsDescription')}
                        </CardDescription>
                    </div>
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" disabled={unassignedSkills.length === 0}>
                                <Plus className="h-4 w-4 mr-2" />
                                {t('addSkill')}
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{t('addSkill')}</DialogTitle>
                                <DialogDescription>
                                    Select a skill and set its level for this NPC.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="skill">{t('skill')}</Label>
                                    <Select value={selectedSkillId} onValueChange={setSelectedSkillId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a skill..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {unassignedSkills.map((skill) => (
                                                <SelectItem key={skill.id} value={skill.id.toString()}>
                                                    {skill.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="level">{t('level')}</Label>
                                    <Input
                                        id="level"
                                        type="number"
                                        min="1"
                                        value={skillLevel}
                                        onChange={(e) => setSkillLevel(parseInt(e.target.value) || 1)}
                                    />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setIsAddDialogOpen(false)
                                        resetForm()
                                    }}
                                >
                                    {commonT('cancel')}
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleAddSkill}
                                    disabled={!selectedSkillId || setSkillMutation.isPending}
                                >
                                    {setSkillMutation.isPending ? commonT('adding') : commonT('add')}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>

            <CardContent>
                {skills.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <p>{t('noSkills')}</p>
                        <p className="text-sm">{t('addFirstSkill')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {skills.map((skill) => (
                            <div key={skill.id} className="flex justify-between items-center p-3 border rounded">
                                <div>
                                    <span className="font-medium">{skill.skillName || `Skill ${skill.skillId}`}</span>
                                    <Badge variant="outline" className="ml-2">Level {skill.currentLevel}</Badge>
                                </div>
                                <div className="flex gap-1">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={(e) => handleEditClick(e, skill)}
                                    >
                                        <Edit3 className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={(e) => handleDeleteClick(e, skill)}
                                        disabled={removeSkillMutation.isPending}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>

            {/* Edit skill dialog */}
            <Dialog open={!!editingSkill} onOpenChange={() => setEditingSkill(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('editSkill')}</DialogTitle>
                        <DialogDescription>
                            Update the level for {editingSkill?.skillName || `Skill ${editingSkill?.skillId}`}.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-level">{t('level')}</Label>
                            <Input
                                id="edit-level"
                                type="number"
                                min="1"
                                value={skillLevel}
                                onChange={(e) => setSkillLevel(parseInt(e.target.value) || 1)}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setEditingSkill(null)
                                resetForm()
                            }}
                        >
                            {commonT('cancel')}
                        </Button>
                        <Button
                            type="button"
                            onClick={handleUpdateSkill}
                            disabled={setSkillMutation.isPending}
                        >
                            {setSkillMutation.isPending ? commonT('updating') : commonT('update')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete confirmation dialog */}
            <Dialog open={!!deleteConfirmSkill} onOpenChange={() => setDeleteConfirmSkill(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('removeSkill')}</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to remove {deleteConfirmSkill?.skillName || `Skill ${deleteConfirmSkill?.skillId}`}? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDeleteConfirmSkill(null)}
                        >
                            {commonT('cancel')}
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => deleteConfirmSkill && handleRemoveSkill(deleteConfirmSkill.skillId)}
                            disabled={removeSkillMutation.isPending}
                        >
                            {removeSkillMutation.isPending ? 'Removing...' : 'Remove'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    )
}