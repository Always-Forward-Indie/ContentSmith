'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Save, Plus, X, ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';

interface ItemAttribute {
    attributeId: number;
    value: number;
    attributeName?: string;
    attributeSlug?: string;
}

interface ItemFormProps {
    itemId?: number;
    onSave?: () => void;
    onCancel?: () => void;
}

export function ItemForm({ itemId, onSave, onCancel }: ItemFormProps) {
    const t = useTranslations('items');
    const { toast } = useToast();
    const router = useRouter();

    const isEditing = !!itemId;

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        description: '',
        isQuestItem: false,
        itemType: isEditing ? 0 : 1, // Для нового предмета ставим первый тип
        weight: 0.0,
        rarityId: isEditing ? 0 : 1, // Для нового предмета ставим первую редкость
        stackMax: 64,
        isContainer: false,
        isDurable: false,
        isTradable: true,
        durabilityMax: 100,
        vendorPriceBuy: 1,
        vendorPriceSell: 1,
        equipSlot: 0,
        levelRequirement: 0,
        isEquippable: false,
        isHarvest: false,
    });

    const [attributes, setAttributes] = useState<ItemAttribute[]>([]);
    const [newAttribute, setNewAttribute] = useState({ attributeId: '', value: 0 });

    // Queries
    const { data: itemData, isLoading: isLoadingItem } = trpc.items.getById.useQuery(
        { id: itemId! },
        { enabled: isEditing }
    );

    const { data: itemTypes, isLoading: isLoadingTypes } = trpc.items.types.list.useQuery();
    const { data: rarities, isLoading: isLoadingRarities } = trpc.items.rarities.list.useQuery();
    const { data: availableAttributes, isLoading: isLoadingAttributes } = trpc.items.attributes.list.useQuery();

    // Mutations
    const createMutation = trpc.items.create.useMutation({
        onSuccess: () => {
            toast({
                title: t('createSuccess'),
                description: t('createSuccessDescription'),
            });
            onSave?.();
            router.push('/items');
        },
        onError: (error) => {
            toast({
                title: t('createError'),
                description: error.message,
                variant: 'error',
            });
        },
    });

    const updateMutation = trpc.items.update.useMutation({
        onSuccess: () => {
            toast({
                title: t('updateSuccess'),
                description: t('updateSuccessDescription'),
            });
            onSave?.();
        },
        onError: (error) => {
            toast({
                title: t('updateError'),
                description: error.message,
                variant: 'error',
            });
        },
    });

    // Load item data for editing
    useEffect(() => {
        if (itemData && itemTypes && rarities) {
            setFormData({
                name: itemData.name,
                slug: itemData.slug,
                description: itemData.description || '',
                isQuestItem: itemData.isQuestItem,
                itemType: itemData.itemType,
                weight: itemData.weight,
                rarityId: itemData.rarityId,
                stackMax: itemData.stackMax,
                isContainer: itemData.isContainer,
                isDurable: itemData.isDurable,
                isTradable: itemData.isTradable,
                durabilityMax: itemData.durabilityMax,
                vendorPriceBuy: itemData.vendorPriceBuy,
                vendorPriceSell: itemData.vendorPriceSell,
                equipSlot: itemData.equipSlot || 0,
                levelRequirement: itemData.levelRequirement,
                isEquippable: itemData.isEquippable,
                isHarvest: itemData.isHarvest,
            });

            setAttributes(itemData.attributes?.map((attr: any) => ({
                attributeId: attr.attributeId,
                value: attr.value,
                attributeName: attr.attributeName,
                attributeSlug: attr.attributeSlug,
            })) || []);
        }
    }, [itemData, itemTypes, rarities]);

    // Auto-generate slug from name
    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    };

    const handleNameChange = (name: string) => {
        setFormData(prev => ({
            ...prev,
            name,
            slug: generateSlug(name),
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Проверяем что выбраны типы
        if (formData.itemType === 0) {
            toast({
                title: t('createError'),
                description: 'Пожалуйста, выберите тип предмета',
                variant: 'error',
            });
            return;
        }

        if (formData.rarityId === 0) {
            toast({
                title: t('createError'),
                description: 'Пожалуйста, выберите редкость предмета',
                variant: 'error',
            });
            return;
        }

        const submitData = {
            ...formData,
            attributes: attributes.map(attr => ({
                attributeId: attr.attributeId,
                value: attr.value,
            })),
        };

        if (isEditing) {
            updateMutation.mutate({
                id: itemId,
                data: submitData,
            });
        } else {
            createMutation.mutate(submitData);
        }
    };

    const addAttribute = () => {
        if (!newAttribute.attributeId) return;

        const attributeId = parseInt(newAttribute.attributeId);
        const existingAttribute = attributes.find(attr => attr.attributeId === attributeId);

        if (existingAttribute) {
            toast({
                title: t('attributeExists'),
                description: t('attributeExistsDescription'),
                variant: 'error',
            });
            return;
        }

        const attributeData = availableAttributes?.find(attr => attr.id === attributeId);

        setAttributes(prev => [...prev, {
            attributeId,
            value: newAttribute.value,
            attributeName: attributeData?.name,
            attributeSlug: attributeData?.slug,
        }]);

        setNewAttribute({ attributeId: '', value: 0 });
    };

    const removeAttribute = (attributeId: number) => {
        setAttributes(prev => prev.filter(attr => attr.attributeId !== attributeId));
    };

    const updateAttributeValue = (attributeId: number, value: number) => {
        setAttributes(prev => prev.map(attr =>
            attr.attributeId === attributeId
                ? { ...attr, value }
                : attr
        ));
    };

    const getRarityColor = (rarity: any) => {
        return rarity?.colorHex || '#6b7280';
    };

    if (isEditing && isLoadingItem) {
        return (
            <div className="flex items-center justify-center h-48">
                <div className="text-muted-foreground">{t('loading')}</div>
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
                        <h1 className="text-3xl font-bold tracking-tight">
                            {isEditing ? t('editItem') : t('createItem')}
                        </h1>
                        <p className="text-muted-foreground">
                            {isEditing ? t('editItemDescription') : t('createItemDescription')}
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('basicInformation')}</CardTitle>
                        <CardDescription>{t('basicInformationDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">{t('name')} *</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => handleNameChange(e.target.value)}
                                    placeholder={t('namePlaceholder')}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="slug">{t('slug')} *</Label>
                                <Input
                                    id="slug"
                                    value={formData.slug}
                                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                                    placeholder={t('slugPlaceholder')}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">{t('description')}</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder={t('descriptionPlaceholder')}
                                rows={3}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('itemType')} *</Label>
                                <Select
                                    key={`itemType-${formData.itemType}-${itemData?.itemType || 'new'}`}
                                    value={formData.itemType > 0 ? formData.itemType.toString() : ""}
                                    onValueChange={(value) => {
                                        console.log('Changing item type to:', value);
                                        setFormData(prev => ({ ...prev, itemType: parseInt(value) }));
                                    }}
                                    disabled={isLoadingTypes}
                                >
                                    <SelectTrigger>
                                        <SelectValue
                                            placeholder={isLoadingTypes ? t('loading') : t('selectItemType')}
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {itemTypes?.map((type) => (
                                            <SelectItem key={type.id} value={type.id.toString()}>
                                                {type.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>{t('rarity')} *</Label>
                                <Select
                                    key={`rarity-${formData.rarityId}-${itemData?.rarityId || 'new'}`}
                                    value={formData.rarityId > 0 ? formData.rarityId.toString() : ""}
                                    onValueChange={(value) => {
                                        console.log('Changing rarity to:', value);
                                        setFormData(prev => ({ ...prev, rarityId: parseInt(value) }));
                                    }}
                                    disabled={isLoadingRarities}
                                >
                                    <SelectTrigger>
                                        <SelectValue
                                            placeholder={isLoadingRarities ? t('loading') : t('selectRarity')}
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {rarities?.map((rarity) => (
                                            <SelectItem key={rarity.id} value={rarity.id.toString()}>
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-3 h-3 rounded-full"
                                                        style={{ backgroundColor: getRarityColor(rarity) }}
                                                    />
                                                    {rarity.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Properties */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('properties')}</CardTitle>
                        <CardDescription>{t('propertiesDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="weight">{t('weight')}</Label>
                                <Input
                                    id="weight"
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={formData.weight}
                                    onChange={(e) => setFormData(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="stackMax">{t('stackMax')}</Label>
                                <Input
                                    id="stackMax"
                                    type="number"
                                    min="1"
                                    value={formData.stackMax}
                                    onChange={(e) => setFormData(prev => ({ ...prev, stackMax: parseInt(e.target.value) || 1 }))}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="levelRequirement">{t('levelRequirement')}</Label>
                                <Input
                                    id="levelRequirement"
                                    type="number"
                                    min="0"
                                    value={formData.levelRequirement}
                                    onChange={(e) => setFormData(prev => ({ ...prev, levelRequirement: parseInt(e.target.value) || 0 }))}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="vendorPriceBuy">{t('buyPrice')}</Label>
                                <Input
                                    id="vendorPriceBuy"
                                    type="number"
                                    min="0"
                                    value={formData.vendorPriceBuy}
                                    onChange={(e) => setFormData(prev => ({ ...prev, vendorPriceBuy: parseInt(e.target.value) || 0 }))}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="vendorPriceSell">{t('sellPrice')}</Label>
                                <Input
                                    id="vendorPriceSell"
                                    type="number"
                                    min="0"
                                    value={formData.vendorPriceSell}
                                    onChange={(e) => setFormData(prev => ({ ...prev, vendorPriceSell: parseInt(e.target.value) || 0 }))}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="durabilityMax">{t('durabilityMax')}</Label>
                                <Input
                                    id="durabilityMax"
                                    type="number"
                                    min="1"
                                    value={formData.durabilityMax}
                                    onChange={(e) => setFormData(prev => ({ ...prev, durabilityMax: parseInt(e.target.value) || 1 }))}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="equipSlot">{t('equipSlot')}</Label>
                            <Input
                                id="equipSlot"
                                type="number"
                                min="0"
                                value={formData.equipSlot}
                                onChange={(e) => setFormData(prev => ({ ...prev, equipSlot: parseInt(e.target.value) || 0 }))}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Flags */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('flags')}</CardTitle>
                        <CardDescription>{t('flagsDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>{t('questItem')}</Label>
                                    <div className="text-sm text-muted-foreground">{t('questItemDescription')}</div>
                                </div>
                                <Switch
                                    checked={formData.isQuestItem}
                                    onCheckedChange={(checked: boolean) => setFormData(prev => ({ ...prev, isQuestItem: checked }))}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>{t('equippable')}</Label>
                                    <div className="text-sm text-muted-foreground">{t('equippableDescription')}</div>
                                </div>
                                <Switch
                                    checked={formData.isEquippable}
                                    onCheckedChange={(checked: boolean) => setFormData(prev => ({ ...prev, isEquippable: checked }))}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>{t('tradable')}</Label>
                                    <div className="text-sm text-muted-foreground">{t('tradableDescription')}</div>
                                </div>
                                <Switch
                                    checked={formData.isTradable}
                                    onCheckedChange={(checked: boolean) => setFormData(prev => ({ ...prev, isTradable: checked }))}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>{t('container')}</Label>
                                    <div className="text-sm text-muted-foreground">{t('containerDescription')}</div>
                                </div>
                                <Switch
                                    checked={formData.isContainer}
                                    onCheckedChange={(checked: boolean) => setFormData(prev => ({ ...prev, isContainer: checked }))}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>{t('durable')}</Label>
                                    <div className="text-sm text-muted-foreground">{t('durableDescription')}</div>
                                </div>
                                <Switch
                                    checked={formData.isDurable}
                                    onCheckedChange={(checked: boolean) => setFormData(prev => ({ ...prev, isDurable: checked }))}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>{t('harvest')}</Label>
                                    <div className="text-sm text-muted-foreground">{t('harvestDescription')}</div>
                                </div>
                                <Switch
                                    checked={formData.isHarvest}
                                    onCheckedChange={(checked: boolean) => setFormData(prev => ({ ...prev, isHarvest: checked }))}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Attributes */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('attributes')}</CardTitle>
                        <CardDescription>{t('attributesDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Current Attributes */}
                        {attributes.length > 0 && (
                            <div className="space-y-2">
                                {attributes.map((attribute) => (
                                    <div key={attribute.attributeId} className="flex items-center gap-4 p-3 border rounded-lg">
                                        <div className="flex-1">
                                            <div className="font-medium">{attribute.attributeName}</div>
                                            <div className="text-sm text-muted-foreground">{attribute.attributeSlug}</div>
                                        </div>
                                        <Input
                                            type="number"
                                            value={attribute.value}
                                            onChange={(e) => updateAttributeValue(attribute.attributeId, parseInt(e.target.value) || 0)}
                                            className="w-24"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => removeAttribute(attribute.attributeId)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Add New Attribute */}
                        <div className="flex items-end gap-4 p-3 border rounded-lg bg-muted/50">
                            <div className="flex-1 space-y-2">
                                <Label>{t('addAttribute')}</Label>
                                <Select
                                    value={newAttribute.attributeId}
                                    onValueChange={(value) => setNewAttribute(prev => ({ ...prev, attributeId: value }))}
                                    disabled={isLoadingAttributes}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={isLoadingAttributes ? t('loading') : t('selectAttribute')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableAttributes?.filter(attr =>
                                            !attributes.some(existing => existing.attributeId === attr.id)
                                        ).map((attribute) => (
                                            <SelectItem key={attribute.id} value={attribute.id.toString()}>
                                                {attribute.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>{t('value')}</Label>
                                <Input
                                    type="number"
                                    value={newAttribute.value}
                                    onChange={(e) => setNewAttribute(prev => ({ ...prev, value: parseInt(e.target.value) || 0 }))}
                                    className="w-24"
                                />
                            </div>
                            <Button
                                type="button"
                                onClick={addAttribute}
                                disabled={!newAttribute.attributeId}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex items-center gap-4">
                    <Button
                        type="submit"
                        disabled={createMutation.isLoading || updateMutation.isLoading}
                    >
                        <Save className="mr-2 h-4 w-4" />
                        {createMutation.isLoading || updateMutation.isLoading
                            ? t('saving')
                            : isEditing ? t('updateItem') : t('createItem')
                        }
                    </Button>

                    <Button type="button" variant="outline" onClick={onCancel || (() => router.back())}>
                        {t('cancel')}
                    </Button>
                </div>
            </form>
        </div>
    );
}