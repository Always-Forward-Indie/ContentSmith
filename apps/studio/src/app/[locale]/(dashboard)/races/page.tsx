'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Trash2, Plus, Search } from 'lucide-react';

interface Race {
    id: number;
    name: string;
    slug: string;
}

export default function RacesPage() {
    const t = useTranslations('races');
    const tCommon = useTranslations('common');
    const router = useRouter();
    const { toast } = useToast();

    const [search, setSearch] = useState('');
    const [raceToDelete, setRaceToDelete] = useState<Race | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    // Query для получения списка рас
    const { data: races, isLoading, refetch } = trpc.race.list.useQuery({
        search: search || undefined,
    });

    // Mutation для удаления расы
    const deleteRaceMutation = trpc.race.delete.useMutation({
        onSuccess: () => {
            toast({
                title: tCommon('success'),
                description: t('raceDeleted'),
            });
            refetch();
            closeDeleteDialog();
        },
        onError: (error) => {
            toast({
                title: tCommon('error'),
                description: error.message,
                variant: 'error',
            });
        },
    });

    const openDeleteDialog = (race: Race) => {
        setRaceToDelete(race);
        setDeleteDialogOpen(true);
    };

    const closeDeleteDialog = () => {
        setDeleteDialogOpen(false);
        setRaceToDelete(null);
    };

    const handleDeleteRace = () => {
        if (raceToDelete) {
            deleteRaceMutation.mutate({ id: raceToDelete.id });
        }
    };

    const handleCreateRace = () => {
        router.push('/races/create');
    };

    const handleEditRace = (id: number) => {
        router.push(`/races/${id}/edit`);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-lg">{tCommon('loading')}</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">{t('racesManagement')}</h1>
                    <p className="text-muted-foreground mt-2">
                        {t('raceDescription')}
                    </p>
                </div>
                <Button onClick={handleCreateRace}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('createRace')}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('races')}</CardTitle>
                    <CardDescription>
                        Список всех рас в системе
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center space-x-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                                placeholder={`${tCommon('search')} ${t('races').toLowerCase()}...`}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {!races || races.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-muted-foreground">{tCommon('noResults')}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {races.map((race: Race) => (
                                <Card key={race.id} className="hover:shadow-md transition-shadow">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1">
                                                <CardTitle className="text-lg">{race.name}</CardTitle>
                                                <p className="text-sm text-muted-foreground">{race.slug}</p>
                                            </div>
                                            <div className="flex space-x-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEditRace(race.id)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openDeleteDialog(race)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('deleteRace')}</DialogTitle>
                        <DialogDescription>
                            {t('confirmDeleteRace')}
                            {raceToDelete && (
                                <span className="font-medium"> "{raceToDelete.name}"</span>
                            )}
                            ?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={closeDeleteDialog}>
                            {tCommon('cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteRace}
                            disabled={deleteRaceMutation.isPending}
                        >
                            {deleteRaceMutation.isPending ? tCommon('loading') : tCommon('delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}