'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { ArrowLeft, ShoppingBag, Plus, Trash2, Pencil, Check, X } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

function InventoryRow({ row, onUpdate, onRemove }: {
    row: { id: bigint | number; itemId: bigint | number; itemName: string | null; stockCount: number | null; priceOverride: bigint | number | null }
    onUpdate: (id: number, data: { stockCount?: number; priceOverride?: number | null }) => void
    onRemove: (id: number) => void
}) {
    const t = useTranslations('vendors')
    const [editing, setEditing] = useState(false)
    const [stock, setStock] = useState(row.stockCount === -1 ? '' : String(row.stockCount ?? ''))
    const [price, setPrice] = useState(row.priceOverride != null ? String(row.priceOverride) : '')

    function save() {
        onUpdate(Number(row.id), {
            stockCount: stock === '' ? -1 : Number(stock),
            priceOverride: price === '' ? null : Number(price),
        })
        setEditing(false)
    }
    function cancel() {
        setStock(row.stockCount === -1 ? '' : String(row.stockCount ?? ''))
        setPrice(row.priceOverride != null ? String(row.priceOverride) : '')
        setEditing(false)
    }

    return (
        <TableRow>
            <TableCell className="font-medium">{row.itemName ?? `Item #${row.itemId}`}</TableCell>
            <TableCell>
                {editing ? (
                    <Input type="number" className="h-7 w-24 text-sm" value={stock} onChange={e => setStock(e.target.value)} placeholder="∞" />
                ) : (
                    <span className="text-sm">{row.stockCount === -1 ? <span className="text-muted-foreground text-xs">{t('unlimited')}</span> : row.stockCount}</span>
                )}
            </TableCell>
            <TableCell>
                {editing ? (
                    <Input type="number" className="h-7 w-36 text-sm" value={price} onChange={e => setPrice(e.target.value)} placeholder={t('defaultPrice')} />
                ) : (
                    <span className="text-sm">{row.priceOverride != null ? String(row.priceOverride) : <span className="text-muted-foreground text-xs">{t('defaultPrice')}</span>}</span>
                )}
            </TableCell>
            <TableCell className="text-right">
                {editing ? (
                    <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700" onClick={save}><Check className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancel}><X className="h-4 w-4" /></Button>
                    </div>
                ) : (
                    <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onRemove(Number(row.id))}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                )}
            </TableCell>
        </TableRow>
    )
}

export default function VendorDetailPage() {
    const { id } = useParams<{ id: string }>()
    const locale = useLocale()
    const t = useTranslations('vendors')
    const tc = useTranslations('common')
    const vendorId = Number(id)

    const [editMarkup, setEditMarkup] = useState(false)
    const [markupVal, setMarkupVal] = useState('')
    const [addItemId, setAddItemId] = useState('')
    const [addStock, setAddStock] = useState('')
    const [addPrice, setAddPrice] = useState('')
    const [removeTarget, setRemoveTarget] = useState<{ id: number; itemName: string | null } | null>(null)

    const { data: vendor, isLoading, refetch } = trpc.vendors.getById.useQuery({ id: vendorId })
    const { data: inventory, refetch: refetchInv } = trpc.vendors.listInventory.useQuery({ id: vendorId })
    const { data: allItems } = trpc.vendors.allItems.useQuery()

    const updateVendor = trpc.vendors.update.useMutation({ onSuccess: () => { toast.success(t('markupUpdated')); refetch(); setEditMarkup(false) } })
    const addItem = trpc.vendors.addItem.useMutation({ onSuccess: () => { toast.success(t('itemAdded')); refetchInv(); setAddItemId(''); setAddStock(''); setAddPrice('') } })
    const updateItem = trpc.vendors.updateItem.useMutation({ onSuccess: () => { toast.success(t('itemUpdated')); refetchInv() } })
    const removeItem = trpc.vendors.removeItem.useMutation({ onSuccess: () => { toast.success(t('itemRemoved')); refetchInv(); setRemoveTarget(null) } })

    const existingItemIds = new Set((inventory ?? []).map(i => Number(i.itemId)))
    const availableItems = (allItems ?? []).filter(i => !existingItemIds.has(i.id))

    if (isLoading) return (
        <div className="space-y-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-32 w-full" />
        </div>
    )

    if (!vendor) return <div className="text-center py-24 text-muted-foreground">{t('vendorNotFound')}</div>

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" asChild className="shrink-0">
                    <Link href={`/${locale}/vendors`}><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                        <ShoppingBag className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight truncate">{vendor.npcName ?? `Vendor #${vendor.id}`}</h1>
                        <p className="text-sm text-muted-foreground">{t('npcVendorLabel')} • ID {vendor.id}</p>
                    </div>
                </div>
            </div>

            {/* Info card */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">{t('vendorSettings')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <div>
                            <Label className="text-xs text-muted-foreground">{t('fields.npc')}</Label>
                            <p className="font-medium">{vendor.npcName ?? `NPC #${vendor.npcId}`}</p>
                        </div>
                        <div>
                            <Label className="text-xs text-muted-foreground">{t('fields.markup')}</Label>
                            {editMarkup ? (
                                <div className="flex items-center gap-2 mt-1">
                                    <Input type="number" min={0} max={9999} className="h-7 w-24 text-sm" value={markupVal} onChange={e => setMarkupVal(e.target.value)} />
                                    <Button size="sm" className="h-7 px-2" onClick={() => updateVendor.mutate({ id: vendorId, markupPct: Number(markupVal) })}>{tc('save')}</Button>
                                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditMarkup(false)}>{tc('cancel')}</Button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 mt-0.5">
                                    <p className="font-medium">{vendor.markupPct}%</p>
                                    <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs" onClick={() => { setMarkupVal(String(vendor.markupPct)); setEditMarkup(true) }}>
                                        <Pencil className="h-3 w-3 mr-1" />{tc('edit')}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Inventory */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">{t('inventory')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Add item form */}
                    {availableItems.length > 0 && (
                        <div className="flex flex-wrap items-end gap-3 p-3 bg-muted/40 rounded-md border border-dashed">
                            <div className="space-y-1 min-w-[180px]">
                                <Label className="text-xs">{t('selectItem')}</Label>
                                <Select value={addItemId} onValueChange={setAddItemId}>
                                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder={t('selectItem')} /></SelectTrigger>
                                    <SelectContent>{availableItems.map(i => <SelectItem key={i.id} value={String(i.id)}>{i.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1 w-28">
                                <Label className="text-xs">{t('stockBlankInfinity')}</Label>
                                <Input className="h-8 text-sm" type="number" value={addStock} onChange={e => setAddStock(e.target.value)} placeholder="Unlimited" />
                            </div>
                            <div className="space-y-1 w-36">
                                <Label className="text-xs">{t('priceOverride')}</Label>
                                <Input className="h-8 text-sm" type="number" value={addPrice} onChange={e => setAddPrice(e.target.value)} placeholder="Default" />
                            </div>
                            <Button size="sm" className="h-8 gap-1.5" disabled={!addItemId || addItem.isPending}
                                onClick={() => addItem.mutate({
                                    vendorNpcId: vendorId,
                                    itemId: Number(addItemId),
                                    stockCount: addStock === '' ? -1 : Number(addStock),
                                    priceOverride: addPrice === '' ? null : Number(addPrice),
                                })}>
                                <Plus className="h-3.5 w-3.5" />{tc('add')}
                            </Button>
                        </div>
                    )}

                    {(inventory ?? []).length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">{t('noInventory')}</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('inventoryTable.item')}</TableHead>
                                    <TableHead className="w-28">{t('inventoryTable.stock')}</TableHead>
                                    <TableHead className="w-36">{t('inventoryTable.price')}</TableHead>
                                    <TableHead className="text-right w-24">{t('inventoryTable.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(inventory ?? []).map(row => (
                                    <InventoryRow key={Number(row.id)} row={row}
                                        onUpdate={(rowId, data) => updateItem.mutate({ id: rowId, ...data })}
                                        onRemove={rowId => setRemoveTarget({ id: rowId, itemName: row.itemName })} />
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Remove item dialog */}
            <Dialog open={!!removeTarget} onOpenChange={open => { if (!open) setRemoveTarget(null) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('removeTitle', { name: removeTarget?.itemName ?? '' })}</DialogTitle>
                        <DialogDescription>{t('removeDescription')}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRemoveTarget(null)}>{tc('cancel')}</Button>
                        <Button variant="destructive" disabled={removeItem.isPending}
                            onClick={() => removeTarget && removeItem.mutate({ id: removeTarget.id })}>
                            {removeItem.isPending ? tc('removing') : tc('remove')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
