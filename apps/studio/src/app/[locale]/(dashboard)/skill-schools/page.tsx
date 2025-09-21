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

interface SkillSchool {
    id: number;
    name: string;
    slug: string;
}

export default function SkillSchoolsPage() {
    const t = useTranslations('skillSchools');
    const commonT = useTranslations('common');
    const router = useRouter();

    const [search, setSearch] = useState('');
    const [skillSchoolToDelete, setSkillSchoolToDelete] = useState<SkillSchool | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    // Query для получения списка школ скилов
    const { data: skillSchools, isLoading, refetch } = trpc.skillSchools.list.useQuery({
        search: search || undefined,
    });

    // Mutation для удаления школы скилов
    const deleteSkillSchoolMutation = trpc.skillSchools.delete.useMutation({
        onSuccess: () => {
            toast.success(t('skillSchoolDeleted'));
            refetch();
            closeDeleteDialog();
        },
        onError: (error) => {
            toast.error(commonT('error'), error.message);
        },
    });

    const openDeleteDialog = (skillSchool: SkillSchool) => {
        setSkillSchoolToDelete(skillSchool);
        setDeleteDialogOpen(true);
    };

    const closeDeleteDialog = () => {
        setDeleteDialogOpen(false);
        setSkillSchoolToDelete(null);
    };

    const handleDeleteSkillSchool = () => {
        if (skillSchoolToDelete) {
            deleteSkillSchoolMutation.mutate({ id: skillSchoolToDelete.id });
        }
    };

    const handleCreateSkillSchool = () => {
        router.push('/skill-schools/create');
    };

    const handleEditSkillSchool = (id: number) => {
        router.push(`/skill-schools/${id}/edit`);
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
                    <h1 className="text-3xl font-bold">{t('skillSchoolsManagement')}</h1>
                    <p className="text-muted-foreground mt-2">
                        Управление школами скилов в игре
                    </p>
                </div>
                <Button onClick={handleCreateSkillSchool}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('createSkillSchool')}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('title')}</CardTitle>
                    <CardDescription>
                        Список всех школ скилов в системе
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center space-x-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                                placeholder={t('searchSkillSchools')}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {!skillSchools || skillSchools.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-muted-foreground">{t('noSkillSchoolsFound')}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {skillSchools.map((skillSchool: SkillSchool) => (
                                <Card key={skillSchool.id} className="hover:shadow-md transition-shadow">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1">
                                                <CardTitle className="text-lg">{skillSchool.name}</CardTitle>
                                                <p className="text-sm text-muted-foreground">{skillSchool.slug}</p>
                                            </div>
                                            <div className="flex space-x-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEditSkillSchool(skillSchool.id)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => openDeleteDialog(skillSchool)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>{t('deleteSkillSchoolTitle')}</DialogTitle>
                                                            <DialogDescription>
                                                                {t('deleteSkillSchoolDescription', { name: skillSchoolToDelete?.name || '' })}
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <DialogFooter>
                                                            <Button variant="outline" onClick={closeDeleteDialog}>
                                                                {commonT('cancel')}
                                                            </Button>
                                                            <Button variant="destructive" onClick={handleDeleteSkillSchool}>
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
                                                <span className="text-muted-foreground">ID:</span>
                                                <Badge variant="outline">{skillSchool.id}</Badge>
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