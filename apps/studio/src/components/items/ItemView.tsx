'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit3, Trash2, Package, Crown, Shield, Coins, Weight, Star } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface ItemViewProps {
    itemId: number;
}

export function ItemView({ itemId }: ItemViewProps) {
    const t = useTranslations('items');
    const { toast } = useToast();
    const router = useRouter();

    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

    // Queries
    const { data: item, isLoading } = trpc.items.getById.useQuery({ id: itemId });

    // Mutations
    const deleteItemMutation = trpc.items.delete.useMutation({
        onSuccess: () => {
            toast({
                title: t('deleteSuccess'),
                description: t('deleteSuccessDescription'),
            });
            router.push('/items');
        },
        onError: (error) => {
            toast({
                title: t('deleteError'),
                description: error.message,
                variant: 'error',
            });
        },
    });

    const handleDelete = () => {
        deleteItemMutation.mutate({ id: itemId });
        setDeleteConfirmOpen(false);
    };

    const getRarityColor = (colorHex: string | null) => {
        return colorHex || '#6b7280';
    };

    const formatPrice = (price: number) => {
        return price.toLocaleString();
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-48">
                <div className="text-muted-foreground">{t('loading')}</div>
            </div>
        );
    }

    if (!item) {
        return (
            <div className="flex items-center justify-center h-48">
                <div className="text-muted-foreground">Item not found</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {t('back')}
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight">{item.name}</h1>
                            {item.rarityName && (
                                <Badge
                                    variant="outline"
                                    className="border-2"
                                    style={{
                                        borderColor: getRarityColor(item.rarityColorHex),
                                        color: getRarityColor(item.rarityColorHex)
                                    }}
                                >
                                    <Crown className="mr-1 h-3 w-3" />
                                    {item.rarityName}
                                </Badge>
                            )}
                        </div>
                        <p className="text-muted-foreground">{item.slug}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => router.push(`/items/${itemId}/edit`)}
                    >
                        <Edit3 className="mr-2 h-4 w-4" />
                        {t('edit')}
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={() => setDeleteConfirmOpen(true)}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t('delete')}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Information */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Basic Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Package className="h-5 w-5" />
                                {t('basicInformation')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {item.description && (
                                <div>
                                    <h4 className="font-medium text-sm text-muted-foreground mb-2">{t('description')}</h4>
                                    <p className="text-sm leading-relaxed">{item.description}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-medium text-sm text-muted-foreground mb-1">{t('itemType')}</h4>
                                    <p>{item.typeName}</p>
                                </div>

                                <div>
                                    <h4 className="font-medium text-sm text-muted-foreground mb-1">{t('weight')}</h4>
                                    <div className="flex items-center gap-1">
                                        <Weight className="h-4 w-4 text-muted-foreground" />
                                        <span>{item.weight} кг</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Properties */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('properties')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-1 text-2xl font-bold text-green-600">
                                        <Coins className="h-5 w-5" />
                                        {formatPrice(item.vendorPriceBuy)}
                                    </div>
                                    <p className="text-sm text-muted-foreground">{t('buyPrice')}</p>
                                </div>

                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-1 text-2xl font-bold text-orange-600">
                                        <Coins className="h-5 w-5" />
                                        {formatPrice(item.vendorPriceSell)}
                                    </div>
                                    <p className="text-sm text-muted-foreground">{t('sellPrice')}</p>
                                </div>

                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-1 text-2xl font-bold">
                                        <Star className="h-5 w-5" />
                                        {item.levelRequirement}
                                    </div>
                                    <p className="text-sm text-muted-foreground">{t('levelRequirement')}</p>
                                </div>

                                <div className="text-center">
                                    <div className="text-2xl font-bold">{item.stackMax}</div>
                                    <p className="text-sm text-muted-foreground">{t('stackMax')}</p>
                                </div>

                                {item.isDurable && (
                                    <div className="text-center">
                                        <div className="flex items-center justify-center gap-1 text-2xl font-bold">
                                            <Shield className="h-5 w-5" />
                                            {item.durabilityMax}
                                        </div>
                                        <p className="text-sm text-muted-foreground">{t('durabilityMax')}</p>
                                    </div>
                                )}

                                {item.isEquippable && item.equipSlot !== null && (
                                    <div className="text-center">
                                        <div className="text-2xl font-bold">{item.equipSlot}</div>
                                        <p className="text-sm text-muted-foreground">{t('equipSlot')}</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Attributes */}
                    {item.attributes && item.attributes.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('attributes')}</CardTitle>
                                <CardDescription>{t('attributesDescription')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {item.attributes.map((attribute: any) => (
                                        <div
                                            key={attribute.attributeId}
                                            className="flex items-center justify-between p-3 border rounded-lg"
                                        >
                                            <div>
                                                <div className="font-medium">{attribute.attributeName}</div>
                                                <div className="text-sm text-muted-foreground">{attribute.attributeSlug}</div>
                                            </div>
                                            <div className="text-xl font-bold text-primary">
                                                +{attribute.value}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Item Flags */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('flags')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {item.isQuestItem && (
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary">
                                        {t('questItem')}
                                    </Badge>
                                </div>
                            )}

                            {item.isEquippable && (
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary">
                                        {t('equippable')}
                                    </Badge>
                                </div>
                            )}

                            {item.isTradable && (
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary">
                                        {t('tradable')}
                                    </Badge>
                                </div>
                            )}

                            {item.isContainer && (
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary">
                                        {t('container')}
                                    </Badge>
                                </div>
                            )}

                            {item.isDurable && (
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary">
                                        {t('durable')}
                                    </Badge>
                                </div>
                            )}

                            {item.isHarvest && (
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary">
                                        {t('harvest')}
                                    </Badge>
                                </div>
                            )}

                            {!item.isQuestItem && !item.isEquippable && !item.isTradable &&
                                !item.isContainer && !item.isDurable && !item.isHarvest && (
                                    <p className="text-sm text-muted-foreground">
                                        Нет специальных флагов
                                    </p>
                                )}
                        </CardContent>
                    </Card>

                    {/* Quick Stats */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Краткая информация</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Slug:</span>
                                <span className="font-mono text-sm">{item.slug}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('deleteConfirmTitle')}</DialogTitle>
                        <DialogDescription>
                            {t('deleteConfirmDescription', { name: item.name })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                            {t('cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleteItemMutation.isLoading}
                        >
                            {deleteItemMutation.isLoading ? t('deleting') : t('delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}