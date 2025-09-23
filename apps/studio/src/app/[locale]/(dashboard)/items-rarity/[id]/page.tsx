"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ItemsRarityForm } from "@/components/items/ItemsRarityForm";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface ItemsRarityViewProps {
    params: {
        id: string;
        locale: string;
    };
}

export default function ItemsRarityView({ params }: ItemsRarityViewProps) {
    const t = useTranslations('itemsRarity');
    const router = useRouter();
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const { data: rarity, isLoading, error } = trpc.itemsRarity.getById.useQuery(
        { id: parseInt(params.id) },
        { enabled: !isNaN(parseInt(params.id)) }
    );

    const deleteMutation = trpc.itemsRarity.delete.useMutation({
        onSuccess: () => {
            router.push(`/${params.locale}/items-rarity`);
        },
    });

    const handleDelete = () => {
        if (rarity) {
            deleteMutation.mutate({ id: rarity.id });
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10" />
                    <Skeleton className="h-8 w-48" />
                </div>
                <div className="grid gap-6">
                    <Skeleton className="h-48 w-full" />
                </div>
            </div>
        );
    }

    if (error || !rarity) {
        return (
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                        <Link href={`/${params.locale}/items-rarity`}>
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {t('notFound')}
                    </h1>
                </div>
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-muted-foreground">
                            {t('notFoundDescription')}
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href={`/${params.locale}/items-rarity`}>
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold tracking-tight flex-1">
                    {rarity.name}
                </h1>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setIsEditDialogOpen(true)}
                        className="flex items-center gap-2"
                    >
                        <Edit className="h-4 w-4" />
                        {t('editAction')}
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={() => setIsDeleteDialogOpen(true)}
                        className="flex items-center gap-2"
                    >
                        <Trash2 className="h-4 w-4" />
                        {t('deleteAction')}
                    </Button>
                </div>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('details')}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <div>
                            <label className="text-sm font-medium">
                                {t('name')}
                            </label>
                            <p className="mt-1">{rarity.name}</p>
                        </div>

                        <div>
                            <label className="text-sm font-medium">
                                {t('color')}
                            </label>
                            <div className="mt-1 flex items-center gap-2">
                                <div
                                    className="w-6 h-6 rounded border"
                                    style={{ backgroundColor: rarity.colorHex }}
                                />
                                <Badge variant="outline">{rarity.colorHex}</Badge>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium">
                                {t('slug')}
                            </label>
                            <p className="mt-1">
                                <Badge variant="secondary">{rarity.slug}</Badge>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{t('editTitle')}</DialogTitle>
                        <DialogDescription>
                            {t('editDescription')}
                        </DialogDescription>
                    </DialogHeader>
                    <ItemsRarityForm
                        initialData={rarity}
                        onSuccess={() => setIsEditDialogOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('deleteTitle')}</DialogTitle>
                        <DialogDescription>
                            {t('deleteDescription', { name: rarity.name })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteDialogOpen(false)}
                            disabled={deleteMutation.isLoading}
                        >
                            {t('cancelAction')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleteMutation.isLoading}
                        >
                            {deleteMutation.isLoading ? t('deletingAction') : t('deleteAction')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}