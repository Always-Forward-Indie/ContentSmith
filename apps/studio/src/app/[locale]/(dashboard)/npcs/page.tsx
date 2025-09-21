'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Search, Edit, Trash2, Eye, Shield, Skull, Users } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'

import { trpc } from '@/lib/trpc'

export default function NPCsPage() {
    const t = useTranslations('npcs')
    const commonT = useTranslations('common')
    const locale = useLocale()
    const [searchTerm, setSearchTerm] = useState('')
    const [npcToDelete, setNpcToDelete] = useState<any | null>(null)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

    // Fetch NPCs with tRPC
    const { data: npcsData, isLoading, error, refetch } = trpc.npc.list.useQuery({
        search: searchTerm || undefined,
        limit: 50,
        offset: 0,
    })

    // Fetch races and npc types for display
    const { data: races } = trpc.npc.getRaces.useQuery()
    const { data: npcTypes } = trpc.npc.getNpcTypes.useQuery()

    const deleteNpcMutation = trpc.npc.delete.useMutation({
        onSuccess: () => {
            refetch()
            setNpcToDelete(null)
            setDeleteDialogOpen(false)
        },
        onError: (error) => {
            console.error('Failed to delete NPC:', error)
        }
    })

    const handleDeleteNpc = () => {
        if (npcToDelete) {
            deleteNpcMutation.mutate(npcToDelete.id)
        }
    }

    const openDeleteDialog = (npc: any) => {
        setNpcToDelete(npc)
        setDeleteDialogOpen(true)
    }

    const closeDeleteDialog = () => {
        setNpcToDelete(null)
        setDeleteDialogOpen(false)
    }

    const getRaceName = (raceId: number) => {
        return races?.find(r => r.id === raceId)?.name || `Race ${raceId}`
    }

    const getNpcTypeName = (typeId: number) => {
        return npcTypes?.find(t => t.id === typeId)?.name || `Type ${typeId}`
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-red-600">{commonT('error')}</CardTitle>
                        <CardDescription>
                            Failed to load NPCs: {error.message}
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                    <p className="text-muted-foreground">
                        {t('description')}
                    </p>
                </div>
                <Button asChild>
                    <Link href={`/${locale}/npcs/new`}>
                        <Plus className="mr-2 h-4 w-4" />
                        {t('createNew')}
                    </Link>
                </Button>
            </div>

            {/* Search and Filters */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="text-lg">{commonT('search')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder={t('searchPlaceholder')}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* NPCs Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        {t('list')}
                    </CardTitle>
                    <CardDescription>
                        {npcsData ? `${npcsData.length} ${t('found')}` : t('loading')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8">
                            {commonT('loading')}...
                        </div>
                    ) : npcsData && npcsData.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('name')}</TableHead>
                                    <TableHead>{t('race')}</TableHead>
                                    <TableHead>{t('type')}</TableHead>
                                    <TableHead>{t('level')}</TableHead>
                                    <TableHead>{t('health')}</TableHead>
                                    <TableHead>{t('status')}</TableHead>
                                    <TableHead>{t('interactable')}</TableHead>
                                    <TableHead className="text-right">{commonT('actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {npcsData.map((npc) => (
                                    <TableRow key={npc.id}>
                                        <TableCell className="font-medium">
                                            <div>
                                                <div>{npc.name}</div>
                                                {npc.slug && (
                                                    <div className="text-sm text-muted-foreground">
                                                        {npc.slug}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {npc.raceName || getRaceName(npc.raceId)}
                                        </TableCell>
                                        <TableCell>
                                            {npc.npcTypeName || getNpcTypeName(npc.npcType)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Shield className="h-3 w-3" />
                                                {npc.level}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                <div>{npc.currentHealth} HP</div>
                                                <div className="text-muted-foreground">{npc.currentMana} MP</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                {npc.isDead ? (
                                                    <>
                                                        <Skull className="h-3 w-3 text-red-500" />
                                                        <span className="text-red-500">{t('dead')}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="h-3 w-3 bg-green-500 rounded-full" />
                                                        <span className="text-green-500">{t('alive')}</span>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {npc.isInteractable ? (
                                                <span className="text-green-600">{commonT('yes')}</span>
                                            ) : (
                                                <span className="text-muted-foreground">{commonT('no')}</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="sm" asChild>
                                                    <Link href={`/${locale}/npcs/${npc.id}`}>
                                                        <Eye className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                <Button variant="ghost" size="sm" asChild>
                                                    <Link href={`/${locale}/npcs/${npc.id}/edit`}>
                                                        <Edit className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => openDeleteDialog(npc)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>{t('deleteConfirmTitle')}</DialogTitle>
                                                            <DialogDescription>
                                                                {t('deleteConfirmDescription', { name: npcToDelete?.name || '' })}
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <DialogFooter>
                                                            <Button variant="outline" onClick={closeDeleteDialog}>
                                                                {commonT('cancel')}
                                                            </Button>
                                                            <Button variant="destructive" onClick={handleDeleteNpc}>
                                                                {commonT('delete')}
                                                            </Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            {t('noNpcs')}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}