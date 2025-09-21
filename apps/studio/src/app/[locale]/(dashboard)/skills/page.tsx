'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Pencil, Trash2, Plus, Search } from 'lucide-react';

interface Skill {
    id: number;
    name: string;
    slug: string;
    scaleStatId: number;
    schoolId: number;
    skillSchool?: {
        id: number;
        name: string;
        slug: string;
    } | null;
    skillScaleType?: {
        id: number;
        name: string;
        slug: string;
    } | null;
}

export default function SkillsPage() {
    const t = useTranslations('skills');
    const commonT = useTranslations('common');
    const router = useRouter();

    const [search, setSearch] = useState('');
    const [skillToDelete, setSkillToDelete] = useState<Skill | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    // Query для получения списка скилов
    const { data: skills, isLoading, refetch } = trpc.skills.list.useQuery({
        search: search || undefined,
    });

    // Query для получения школ скилов
    const { data: schools } = trpc.skills.getSchools.useQuery();

    // Query для получения типов масштабирования
    const { data: scaleTypes } = trpc.skills.getScaleTypes.useQuery();

    // Mutation для удаления скила
    const deleteSkillMutation = trpc.skills.delete.useMutation({
        onSuccess: () => {
            toast.success(t('skillDeleted'));
            refetch();
            closeDeleteDialog();
        },
        onError: (error) => {
            toast.error(commonT('error'), error.message);
        },
    });

    const openDeleteDialog = (skill: Skill) => {
        setSkillToDelete(skill);
        setDeleteDialogOpen(true);
    };

    const closeDeleteDialog = () => {
        setDeleteDialogOpen(false);
        setSkillToDelete(null);
    };

    const handleDeleteSkill = () => {
        if (skillToDelete) {
            deleteSkillMutation.mutate({ id: skillToDelete.id });
        }
    };

    const handleCreateSkill = () => {
        router.push('/skills/create');
    };

    const handleEditSkill = (id: number) => {
        router.push(`/skills/${id}/edit`);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-lg">{commonT('loading')}</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">{t('skillsManagement')}</h1>
                    <p className="text-muted-foreground mt-2">
                        Управление скилами в игре
                    </p>
                </div>
                <Button onClick={handleCreateSkill}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('createSkill')}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('title')}</CardTitle>
                    <CardDescription>
                        Список всех скилов в системе
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center space-x-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                                placeholder={t('searchSkills')}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {!skills || skills.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-muted-foreground">{t('noSkillsFound')}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {skills.map((skill: Skill) => (
                                <Card key={skill.id} className="hover:shadow-md transition-shadow">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1">
                                                <CardTitle className="text-lg">{skill.name}</CardTitle>
                                                <p className="text-sm text-muted-foreground">{skill.slug}</p>
                                            </div>
                                            <div className="flex space-x-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEditSkill(skill.id)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => openDeleteDialog(skill)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>{t('deleteSkillTitle')}</DialogTitle>
                                                            <DialogDescription>
                                                                {t('deleteSkillDescription', { name: skillToDelete?.name || '' })}
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <DialogFooter>
                                                            <Button variant="outline" onClick={closeDeleteDialog}>
                                                                {commonT('cancel')}
                                                            </Button>
                                                            <Button variant="destructive" onClick={handleDeleteSkill}>
                                                                {commonT('delete')}
                                                            </Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-muted-foreground">{t('skillSchool')}:</span>
                                                <Badge variant="secondary">{skill.skillSchool?.name || 'Unknown'}</Badge>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-muted-foreground">{t('skillScaleType')}:</span>
                                                <Badge variant="outline">{skill.skillScaleType?.name || 'Unknown'}</Badge>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}