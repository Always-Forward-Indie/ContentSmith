'use client';

import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import {
    Edit, Trash2, Package, Crown, Shield,
    Coins, Weight, Star, Layers, Zap, ScrollText, Sword,
    ShoppingBag, AlertCircle, Box, ChevronRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
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
import { getRarityStyle } from '@/lib/utils';
import { useState } from 'react';

interface ItemViewProps {
    itemId: number;
}

function LoadingSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="flex items-center gap-4">
                <div className="h-9 w-20 bg-muted rounded-md" />
                <div className="h-8 w-56 bg-muted rounded" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <div className="rounded-lg border p-6 space-y-3">
                        <div className="h-5 w-32 bg-muted rounded" />
                        <div className="h-4 w-full bg-muted rounded" />
                        <div className="h-4 w-3/4 bg-muted rounded" />
                    </div>
                    <div className="rounded-lg border p-6 space-y-3">
                        <div className="h-5 w-24 bg-muted rounded" />
                        <div className="grid grid-cols-3 gap-4">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="h-16 bg-muted rounded" />
                            ))}
                        </div>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="rounded-lg border p-6 space-y-3">
                        <div className="h-5 w-20 bg-muted rounded" />
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-6 w-24 bg-muted rounded-full" />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatBlock({ icon: Icon, label, value, colorClass }: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    colorClass?: string;
}) {
    return (
        <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted/40 border border-transparent hover:border-border transition-colors">
            <div className={`flex items-center gap-1 text-xl font-bold tabular-nums ${colorClass || ''}`}>
                <Icon className="h-4 w-4 shrink-0" />
                {value}
            </div>
            <p className="text-xs text-muted-foreground text-center">{label}</p>
        </div>
    );
}

export function ItemView({ itemId }: ItemViewProps) {
    const t = useTranslations('items');
    const locale = useLocale();
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

    const { data: item, isLoading } = trpc.items.getById.useQuery({ id: itemId });
    const { data: equipSlots } = trpc.equipSlots.all.useQuery();

    const deleteItemMutation = trpc.items.delete.useMutation({
        onSuccess: () => {
            window.location.href = `/${locale}/items`;
        },
    });

    const equipSlotName = item?.equipSlot != null
        ? (equipSlots?.find(s => s.id === item.equipSlot)?.name ?? null)
        : null;

    const handleDelete = () => {
        deleteItemMutation.mutate({ id: itemId });
        setDeleteConfirmOpen(false);
    };

    if (isLoading) return <LoadingSkeleton />;

    if (!item) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
                <AlertCircle className="h-10 w-10 text-muted-foreground/50" />
                <p className="text-muted-foreground font-medium">Item not found</p>
                <Link href={`/${locale}/items`}>
                    <Button variant="outline" size="sm">{t('back')}</Button>
                </Link>
            </div>
        );
    }

    const rarityStyle = getRarityStyle(item.rarityColorHex);

    const flags = [
        { key: 'isQuestItem', label: t('questItem'), icon: ScrollText, color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-500/10' },
        { key: 'isEquippable', label: t('equippable'), icon: Sword, color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-500/10' },
        { key: 'isTradable', label: t('tradable'), icon: ShoppingBag, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
        { key: 'isContainer', label: t('container'), icon: Box, color: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-500/10' },
        { key: 'isDurable', label: t('durable'), icon: Shield, color: 'text-slate-700 dark:text-slate-400', bg: 'bg-slate-500/10' },
        { key: 'isHarvest', label: t('harvest'), icon: Layers, color: 'text-teal-700 dark:text-teal-400', bg: 'bg-teal-500/10' },
    ] as const;

    const activeFlags = flags.filter(f => item[f.key as keyof typeof item]);

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Link href={`/${locale}/items`} className="hover:text-foreground transition-colors">
                    {t('title')}
                </Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-foreground font-medium">{item.name}</span>
            </nav>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight">{item.name}</h1>
                        {item.rarityName && (
                            <Badge
                                variant="outline"
                                className="border font-medium text-xs"
                                style={{ borderColor: rarityStyle.borderColor, color: rarityStyle.textColor, backgroundColor: rarityStyle.bgColor }}
                            >
                                <Crown className="mr-1 h-3 w-3" />
                                {item.rarityName}
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-xs text-muted-foreground">{item.slug}</span>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-xs text-muted-foreground">#{item.id}</span>
                        {item.typeName && (
                            <>
                                <span className="text-muted-foreground/40">·</span>
                                <Badge variant="outline" className="text-xs font-normal h-4 px-1.5">
                                    {item.typeName}
                                </Badge>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <Link href={`/${locale}/items/${itemId}/edit`}>
                        <Button variant="outline" size="sm" className="gap-1.5">
                            <Edit className="h-4 w-4" />
                            {t('edit')}
                        </Button>
                    </Link>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                        onClick={() => setDeleteConfirmOpen(true)}
                    >
                        <Trash2 className="h-4 w-4" />
                        {t('delete')}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Main content */}
                <div className="lg:col-span-2 space-y-5">
                    {/* Description */}
                    {item.description && (
                        <div className="rounded-lg border bg-card p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <Package className="h-4 w-4 text-muted-foreground" />
                                <h2 className="font-semibold text-sm">{t('basicInformation')}</h2>
                            </div>
                            <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                        </div>
                    )}

                    {/* Stats */}
                    <div className="rounded-lg border bg-card p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Coins className="h-4 w-4 text-muted-foreground" />
                            <h2 className="font-semibold text-sm">{t('properties')}</h2>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            <StatBlock
                                icon={Coins}
                                label={t('buyPrice')}
                                value={item.vendorPriceBuy.toLocaleString()}
                                colorClass="text-green-600 dark:text-green-400"
                            />
                            <StatBlock
                                icon={Coins}
                                label={t('sellPrice')}
                                value={item.vendorPriceSell.toLocaleString()}
                                colorClass="text-orange-600 dark:text-orange-400"
                            />
                            <StatBlock
                                icon={Weight}
                                label={t('weight')}
                                value={`${item.weight} кг`}
                                colorClass="text-foreground"
                            />
                            <StatBlock
                                icon={Star}
                                label={t('levelRequirement')}
                                value={item.levelRequirement}
                                colorClass="text-foreground"
                            />
                            <StatBlock
                                icon={Package}
                                label={t('stackMax')}
                                value={item.stackMax}
                                colorClass="text-foreground"
                            />
                            {item.isDurable && (
                                <StatBlock
                                    icon={Shield}
                                    label={t('durabilityMax')}
                                    value={item.durabilityMax}
                                    colorClass="text-foreground"
                                />
                            )}
                            {item.isEquippable && equipSlotName && (
                                <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted/40 col-span-2">
                                    <span className="font-semibold text-sm">{equipSlotName}</span>
                                    <p className="text-xs text-muted-foreground">{t('equipSlot')}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Attributes */}
                    {item.attributes && item.attributes.length > 0 && (
                        <div className="rounded-lg border bg-card p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Zap className="h-4 w-4 text-muted-foreground" />
                                <h2 className="font-semibold text-sm">{t('attributes')}</h2>
                                <Badge variant="secondary" className="text-xs font-normal ml-auto">
                                    {item.attributes.length}
                                </Badge>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {item.attributes.map((attribute: any) => (
                                    <div
                                        key={attribute.attributeId}
                                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-transparent hover:border-border transition-colors"
                                    >
                                        <div>
                                            <div className="font-medium text-sm">{attribute.attributeName}</div>
                                            <div className="text-xs text-muted-foreground font-mono">{attribute.attributeSlug}</div>
                                        </div>
                                        <div className="text-lg font-bold text-primary tabular-nums">
                                            +{attribute.value}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Sidebar */}
                <div className="space-y-5">
                    {/* Flags */}
                    <div className="rounded-lg border bg-card p-5">
                        <h2 className="font-semibold text-sm mb-3">{t('flags')}</h2>
                        {activeFlags.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {activeFlags.map(({ key, label, icon: Icon, color, bg }) => (
                                    <span
                                        key={key}
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${bg} ${color}`}
                                    >
                                        <Icon className="h-3 w-3" />
                                        {label}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">Нет специальных свойств</p>
                        )}
                    </div>

                    {/* Info */}
                    <div className="rounded-lg border bg-card p-5">
                        <h2 className="font-semibold text-sm mb-3">Информация</h2>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">ID</span>
                                <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">#{item.id}</code>
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Slug</span>
                                <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{item.slug}</code>
                            </div>
                            {item.typeName && (
                                <>
                                    <Separator />
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">{t('itemType')}</span>
                                        <span className="font-medium text-xs">{item.typeName}</span>
                                    </div>
                                </>
                            )}
                            {item.rarityName && (
                                <>
                                    <Separator />
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">{t('rarity')}</span>
                                        <span
                                            className="font-semibold text-xs"
                                            style={{ color: rarityStyle.textColor }}
                                        >
                                            {item.rarityName}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10 text-destructive shrink-0">
                                <Trash2 className="h-5 w-5" />
                            </div>
                            <DialogTitle className="text-lg">{t('deleteConfirmTitle')}</DialogTitle>
                        </div>
                        <DialogDescription className="pt-1">
                            {t('deleteConfirmDescription', { name: item.name })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
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
