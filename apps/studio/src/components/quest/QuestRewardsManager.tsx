'use client'

import { useState } from 'react'
import { Plus, Trash2, Edit3, Gift, Coins, Star, Package } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { trpc } from '@/lib/trpc'
import { useToast } from '@/hooks/use-toast'

const REWARD_TYPES = ['item', 'gold', 'exp', 'currency'] as const
type RewardType = typeof REWARD_TYPES[number]

interface QuestReward {
    id: number
    questId: number
    rewardType: string
    itemId: number | null
    quantity: number
    amount: number
    isHidden: boolean
    itemName: string | null
    itemSlug: string | null
}

interface QuestRewardsManagerProps {
    questId: number
    rewards: QuestReward[]
    onUpdate: () => void
}

interface RewardFormState {
    rewardType: RewardType
    itemId: string
    quantity: number
    amount: number
    isHidden: boolean
}

const defaultForm = (): RewardFormState => ({
    rewardType: 'item',
    itemId: '',
    quantity: 1,
    amount: 0,
    isHidden: false,
})

export function QuestRewardsManager({ questId, rewards, onUpdate }: QuestRewardsManagerProps) {
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [editingReward, setEditingReward] = useState<QuestReward | null>(null)
    const [deleteConfirm, setDeleteConfirm] = useState<QuestReward | null>(null)
    const [form, setForm] = useState<RewardFormState>(defaultForm())
    const [itemSearch, setItemSearch] = useState('')

    const t = useTranslations('quests.rewards')
    const commonT = useTranslations('common')
    const { toast } = useToast()

    const { data: itemsData } = trpc.items.list.useQuery(
        { search: itemSearch || undefined, page: 1, limit: 30 },
        { enabled: form.rewardType === 'item' }
    )

    const createMutation = trpc.quest.createReward.useMutation({
        onSuccess: () => {
            toast({ title: commonT('success'), description: t('created') })
            onUpdate()
            setIsAddOpen(false)
            setForm(defaultForm())
        },
        onError: (e) => toast({ title: commonT('error'), description: e.message, variant: 'error' }),
    })

    const updateMutation = trpc.quest.updateReward.useMutation({
        onSuccess: () => {
            toast({ title: commonT('success'), description: t('updated') })
            onUpdate()
            setEditingReward(null)
            setForm(defaultForm())
        },
        onError: (e) => toast({ title: commonT('error'), description: e.message, variant: 'error' }),
    })

    const deleteMutation = trpc.quest.deleteReward.useMutation({
        onSuccess: () => {
            toast({ title: commonT('success'), description: t('deleted') })
            onUpdate()
            setDeleteConfirm(null)
        },
        onError: (e) => toast({ title: commonT('error'), description: e.message, variant: 'error' }),
    })

    const handleAdd = () => {
        createMutation.mutate({
            questId,
            rewardType: form.rewardType,
            itemId: form.rewardType === 'item' && form.itemId ? parseInt(form.itemId) : null,
            quantity: form.quantity,
            amount: form.amount,
            isHidden: form.isHidden,
        })
    }

    const handleUpdate = () => {
        if (!editingReward) return
        updateMutation.mutate({
            id: editingReward.id,
            rewardType: form.rewardType,
            itemId: form.rewardType === 'item' && form.itemId ? parseInt(form.itemId) : null,
            quantity: form.quantity,
            amount: form.amount,
            isHidden: form.isHidden,
        })
    }

    const openEdit = (reward: QuestReward) => {
        setForm({
            rewardType: reward.rewardType as RewardType,
            itemId: reward.itemId?.toString() ?? '',
            quantity: reward.quantity,
            amount: Number(reward.amount),
            isHidden: reward.isHidden,
        })
        setEditingReward(reward)
    }

    const rewardTypeBadgeClass = (type: string) => {
        switch (type) {
            case 'item': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            case 'gold': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
            case 'exp': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
            case 'currency': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
            default: return ''
        }
    }

    const rewardTypeIcon = (type: string) => {
        switch (type) {
            case 'item': return <Package className="h-3 w-3" />
            case 'gold': return <Coins className="h-3 w-3" />
            case 'exp': return <Star className="h-3 w-3" />
            case 'currency': return <Coins className="h-3 w-3" />
            default: return null
        }
    }

    const rewardLabel = (reward: QuestReward) => {
        switch (reward.rewardType) {
            case 'item':
                return `${reward.itemName || `Item #${reward.itemId}`} ×${reward.quantity}`
            case 'gold':
                return `${Number(reward.amount).toLocaleString()} ${t('gold')}`
            case 'exp':
                return `${Number(reward.amount).toLocaleString()} ${t('exp')}`
            case 'currency':
                return `${Number(reward.amount).toLocaleString()} ${t('currency')}`
            default:
                return reward.rewardType
        }
    }

    const RewardForm = ({ onSubmit, isPending }: { onSubmit: () => void; isPending: boolean }) => (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label>{t('fields.rewardType')}</Label>
                <Select
                    value={form.rewardType}
                    onValueChange={(v) => setForm(prev => ({ ...prev, rewardType: v as RewardType, itemId: '', amount: 0, quantity: 1 }))}
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {REWARD_TYPES.map(type => (
                            <SelectItem key={type} value={type}>
                                {t(`types.${type}`)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {form.rewardType === 'item' && (
                <>
                    <div className="space-y-2">
                        <Label>{t('fields.itemSearch')}</Label>
                        <Input
                            placeholder={t('fields.itemSearchPlaceholder')}
                            value={itemSearch}
                            onChange={(e) => setItemSearch(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('fields.item')}</Label>
                        <Select
                            value={form.itemId}
                            onValueChange={(v) => setForm(prev => ({ ...prev, itemId: v }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={t('fields.selectItem')} />
                            </SelectTrigger>
                            <SelectContent>
                                {itemsData?.items.map(item => (
                                    <SelectItem key={item.id} value={item.id.toString()}>
                                        {item.name} ({item.slug})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>{t('fields.quantity')}</Label>
                        <Input
                            type="number"
                            min={1}
                            value={form.quantity}
                            onChange={(e) => setForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                        />
                    </div>
                </>
            )}

            {form.rewardType !== 'item' && (
                <div className="space-y-2">
                    <Label>{t('fields.amount')}</Label>
                    <Input
                        type="number"
                        min={0}
                        value={form.amount}
                        onChange={(e) => setForm(prev => ({ ...prev, amount: parseInt(e.target.value) || 0 }))}
                    />
                </div>
            )}

            <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                <div>
                    <p className="text-sm font-medium">{t('fields.isHidden')}</p>
                    <p className="text-xs text-muted-foreground">{t('fields.isHiddenDescription')}</p>
                </div>
                <input
                    type="checkbox"
                    checked={form.isHidden}
                    onChange={(e) => setForm(prev => ({ ...prev, isHidden: e.target.checked }))}
                    className="h-4 w-4 rounded border-input"
                />
            </div>

            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setIsAddOpen(false); setEditingReward(null); setForm(defaultForm()) }}>
                    {commonT('cancel')}
                </Button>
                <Button type="button" onClick={onSubmit} disabled={isPending}>
                    {isPending ? commonT('saving') : commonT('save')}
                </Button>
            </DialogFooter>
        </div>
    )

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Gift className="h-4 w-4" />
                            {t('title')}
                        </CardTitle>
                        <CardDescription className="mt-1">{t('description')}</CardDescription>
                    </div>
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm">
                                <Plus className="h-4 w-4 mr-2" />
                                {t('add')}
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{t('add')}</DialogTitle>
                                <DialogDescription>{t('addDescription')}</DialogDescription>
                            </DialogHeader>
                            <RewardForm onSubmit={handleAdd} isPending={createMutation.isPending} />
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>

            <CardContent>
                {rewards.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <Gift className="h-10 w-10 text-muted-foreground/30 mb-3" />
                        <p className="text-sm font-medium text-muted-foreground">{t('noRewards')}</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">{t('addFirst')}</p>
                    </div>
                ) : (
                    <div className="space-y-1.5">
                        {rewards.map(reward => (
                            <div
                                key={reward.id}
                                className="group flex justify-between items-center px-3 py-2.5 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${rewardTypeBadgeClass(reward.rewardType)}`}>
                                        {rewardTypeIcon(reward.rewardType)}
                                        {t(`types.${reward.rewardType}`)}
                                    </span>
                                    <span className="text-sm font-medium">{rewardLabel(reward)}</span>
                                    {reward.isHidden && (
                                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                                            {t('fields.isHidden')}
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <TooltipProvider delayDuration={300}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7"
                                                    onClick={() => openEdit(reward)}
                                                >
                                                    <Edit3 className="h-3.5 w-3.5" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>{commonT('edit')}</TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                                    onClick={() => setDeleteConfirm(reward)}
                                                    disabled={deleteMutation.isPending}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>{commonT('delete')}</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>

            {/* Edit dialog */}
            <Dialog open={!!editingReward} onOpenChange={(o) => { if (!o) { setEditingReward(null); setForm(defaultForm()) } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('edit')}</DialogTitle>
                        <DialogDescription>{t('editDescription')}</DialogDescription>
                    </DialogHeader>
                    <RewardForm onSubmit={handleUpdate} isPending={updateMutation.isPending} />
                </DialogContent>
            </Dialog>

            {/* Delete confirm dialog */}
            <Dialog open={!!deleteConfirm} onOpenChange={(o) => { if (!o) setDeleteConfirm(null) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('deleteTitle')}</DialogTitle>
                        <DialogDescription>
                            {deleteConfirm && t('deleteDescription', { reward: rewardLabel(deleteConfirm) })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                            {commonT('cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => deleteConfirm && deleteMutation.mutate({ id: deleteConfirm.id })}
                            disabled={deleteMutation.isPending}
                        >
                            {commonT('delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    )
}
