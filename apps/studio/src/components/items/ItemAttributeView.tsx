'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Edit, Trash2, ArrowLeft } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { ItemAttributeForm } from './ItemAttributeForm';

interface ItemAttributeViewProps {
    id: number;
}

export function ItemAttributeView({ id }: ItemAttributeViewProps) {
    const t = useTranslations('itemAttributes');
    const { toast } = useToast();
    const router = useRouter();

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const utils = trpc.useUtils();

    const { data: attribute, isLoading, error } = trpc.itemAttributes.getById.useQuery({ id });

    const deleteMutation = trpc.itemAttributes.delete.useMutation({
        onSuccess: () => {
            toast({
                title: t('success'),
                description: t('deleteSuccess'),
            });
            router.push('/item-attributes');
        },
        onError: (error) => {
            toast({
                title: t('error'),
                description: error.message || t('deleteError'),
            });
        },
    });

    const handleDelete = async () => {
        if (!attribute) return;

        await deleteMutation.mutateAsync({ id: attribute.id });
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 border border-red-200 bg-red-50 rounded-md">
                <h3 className="font-medium text-red-800">{t('error')}</h3>
                <p className="text-red-700">{error.message}</p>
            </div>
        );
    }

    if (!attribute) {
        return (
            <div className="text-center py-8">
                <h2 className="text-lg font-medium">{t('notFound')}</h2>
                <p className="text-muted-foreground">{t('notFoundDescription')}</p>
                <Button
                    onClick={() => router.push('/item-attributes')}
                    className="mt-4"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t('backToList')}
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button
                        variant="outline"
                        onClick={() => router.push('/item-attributes')}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        {t('backToList')}
                    </Button>
                    <h1 className="text-2xl font-bold">{attribute.name}</h1>
                </div>
                <div className="flex space-x-2">
                    <Button
                        variant="outline"
                        onClick={() => setIsEditDialogOpen(true)}
                    >
                        <Edit className="h-4 w-4 mr-2" />
                        {t('edit')}
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={() => setIsDeleteDialogOpen(true)}
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('delete')}
                    </Button>
                </div>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('basicInfo')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">
                                {t('name')}
                            </label>
                            <p className="text-lg">{attribute.name}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">
                                {t('slug')}
                            </label>
                            <div className="flex items-center space-x-2">
                                <Badge variant="secondary">{attribute.slug}</Badge>
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">
                                {t('id')}
                            </label>
                            <p className="text-sm text-muted-foreground">#{attribute.id}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{t('edit')}</DialogTitle>
                        <DialogDescription>
                            {t('editDescription')}
                        </DialogDescription>
                    </DialogHeader>
                    <ItemAttributeForm
                        initialData={attribute}
                        onSuccess={() => {
                            setIsEditDialogOpen(false);
                            utils.itemAttributes.getById.invalidate({ id });
                        }}
                    />
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('deleteTitle')}</DialogTitle>
                        <DialogDescription>
                            {t('deleteConfirmation', { name: attribute.name })}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                            {t('cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? t('deleting') : t('delete')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}