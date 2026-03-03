'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
    Edit, Plus, Trash2, ChevronRight, ScrollText, AlertCircle,
    RefreshCw, Clock, User, UserCheck, KeyRound, Swords, PackageSearch, MessageCircle, MapPin, Wrench
} from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
} from '@/components/ui/dialog'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'

import { trpc } from '@/lib/trpc'
import { QuestRewardsManager } from '@/components/quest/QuestRewardsManager'

// ─── Step type styling ───────────────────────────────────────────────────────
const STEP_TYPE_CONFIG: Record<string, { icon: React.ElementType; className: string }> = {
    collect: { icon: PackageSearch, className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
    kill: { icon: Swords, className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
    talk: { icon: MessageCircle, className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
    reach: { icon: MapPin, className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
    custom: { icon: Wrench, className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
}

function StepTypeBadge({ type }: { type: string }) {
    const cfg = STEP_TYPE_CONFIG[type] ?? { icon: Wrench, className: 'bg-muted text-muted-foreground' }
    const Icon = cfg.icon
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
            <Icon className="h-3 w-3" />
            {type}
        </span>
    )
}

// ─── Loading skeleton ────────────────────────────────────────────────────────
function DetailSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="h-5 bg-muted rounded w-48" />
            <div className="h-9 bg-muted rounded w-72" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-muted rounded-lg" />)}
            </div>
            <div className="h-64 bg-muted rounded-lg" />
        </div>
    )
}

export default function QuestDetailPage() {
    const t = useTranslations()
    const locale = useLocale()
    const params = useParams()
    const questId = parseInt(params.id as string, 10)
    const [stepToDelete, setStepToDelete] = useState<{ id: number; stepIndex: number } | null>(null)

    const utils = trpc.useUtils()

    const { data: questData, isLoading, error } = trpc.quest.getWithSteps.useQuery({ id: questId })

    const deleteStep = trpc.quest.deleteStep.useMutation({
        onSuccess: () => {
            utils.quest.getWithSteps.invalidate({ id: questId })
            setStepToDelete(null)
        },
    })

    const formatNpcInfo = (npcData: any, npcId: number | null) => {
        if (!npcId) return null
        if (!npcData) return `ID: ${npcId}`
        return `${npcData.name} (ID: ${npcData.id})`
    }

    if (isLoading) return <DetailSkeleton />

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
                <AlertCircle className="h-10 w-10 text-destructive/70" />
                <p className="text-destructive font-medium">{t('quests.detail.errorLoading')}: {error.message}</p>
                <Link href={`/${locale}/quests`}>
                    <Button variant="outline" size="sm">{t('common.back')}</Button>
                </Link>
            </div>
        )
    }

    const { quest, steps, rewards, giverNpc, turninNpc } = questData!

    return (
        <TooltipProvider delayDuration={300}>
            <div className="space-y-6">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Link href={`/${locale}/quests`} className="hover:text-foreground transition-colors">
                        {t('quests.title')}
                    </Link>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span className="text-foreground font-mono font-medium">{quest.slug}</span>
                </nav>

                {/* Page header */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                            <ScrollText className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold tracking-tight font-mono">{quest.slug}</h1>
                                <Badge variant="outline" className="text-xs font-normal">#{quest.id}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">{t('quests.detail.title')}</p>
                        </div>
                    </div>
                    <Link href={`/${locale}/quests/${quest.id}/edit`}>
                        <Button size="sm" className="gap-1.5">
                            <Edit className="h-4 w-4" />
                            {t('common.edit')}
                        </Button>
                    </Link>
                </div>

                {/* Quest info stat grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-4">
                            <p className="text-xs text-muted-foreground mb-1">{t('quests.detail.minLevel')}</p>
                            <p className="text-2xl font-bold">{quest.minLevel}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4">
                            <p className="text-xs text-muted-foreground mb-1">{t('quests.detail.repeatable')}</p>
                            {quest.repeatable ? (
                                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                    <RefreshCw className="h-4 w-4" />
                                    <span className="font-semibold">{t('common.yes')}</span>
                                </div>
                            ) : (
                                <span className="text-muted-foreground text-sm">{t('common.no')}</span>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4">
                            <p className="text-xs text-muted-foreground mb-1">{t('quests.detail.cooldown')}</p>
                            {quest.repeatable && quest.cooldownSec ? (
                                <div className="flex items-center gap-1.5">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-semibold">{quest.cooldownSec}s</span>
                                </div>
                            ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4">
                            <p className="text-xs text-muted-foreground mb-1">{t('quests.detail.clientKey')}</p>
                            {quest.clientQuestKey ? (
                                <div className="flex items-center gap-1.5">
                                    <KeyRound className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    <span className="font-mono text-xs truncate">{quest.clientQuestKey}</span>
                                </div>
                            ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* NPC info */}
                {(quest.giverNpcId || quest.turninNpcId) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {quest.giverNpcId && (
                            <Card>
                                <CardContent className="pt-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <p className="text-xs text-muted-foreground">{t('quests.detail.questGiver')}</p>
                                    </div>
                                    <p className="font-medium text-sm">{formatNpcInfo(giverNpc, quest.giverNpcId) ?? '—'}</p>
                                </CardContent>
                            </Card>
                        )}
                        {quest.turninNpcId && (
                            <Card>
                                <CardContent className="pt-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                                        <p className="text-xs text-muted-foreground">{t('quests.detail.questReceiver')}</p>
                                    </div>
                                    <p className="font-medium text-sm">{formatNpcInfo(turninNpc, quest.turninNpcId) ?? '—'}</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                {/* Quest Steps */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-semibold">{t('quests.detail.steps')}</h2>
                            <p className="text-sm text-muted-foreground">{t('quests.detail.stepsDescription')}</p>
                        </div>
                        <Link href={`/${locale}/quests/${quest.id}/steps/new`}>
                            <Button size="sm" className="gap-1.5">
                                <Plus className="h-4 w-4" />
                                {t('quests.detail.addStep')}
                            </Button>
                        </Link>
                    </div>
                    <div className="rounded-lg border bg-card">
                        {steps.length === 0 ? (
                            <div className="flex flex-col items-center py-16 gap-3 text-muted-foreground">
                                <ScrollText className="h-10 w-10 opacity-30" />
                                <p className="text-sm font-medium">{t('quests.detail.noStepsDescription')}</p>
                                <Link href={`/${locale}/quests/${quest.id}/steps/new`}>
                                    <Button variant="outline" size="sm" className="mt-1 gap-1.5">
                                        <Plus className="h-3.5 w-3.5" />
                                        {t('quests.detail.addStep')}
                                    </Button>
                                </Link>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="pl-4 w-16">#</TableHead>
                                        <TableHead>{t('quests.detail.stepType')}</TableHead>
                                        <TableHead>{t('quests.detail.stepParams')}</TableHead>
                                        <TableHead>{t('quests.detail.clientKey')}</TableHead>
                                        <TableHead className="text-right pr-4">{t('common.actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {steps.map((step) => (
                                        <TableRow key={step.id} className="group">
                                            <TableCell className="pl-4 font-mono text-sm text-muted-foreground">
                                                {step.stepIndex}
                                            </TableCell>
                                            <TableCell>
                                                <StepTypeBadge type={step.stepType} />
                                            </TableCell>
                                            <TableCell>
                                                <pre className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded max-w-xs overflow-auto">
                                                    {JSON.stringify(step.params, null, 2)}
                                                </pre>
                                            </TableCell>
                                            <TableCell>
                                                {step.clientStepKey ? (
                                                    <span className="font-mono text-xs">{step.clientStepKey}</span>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="pr-4">
                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Link href={`/${locale}/quests/${quest.id}/steps/${step.id}/edit`}>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                            </Link>
                                                        </TooltipTrigger>
                                                        <TooltipContent>{t('common.edit')}</TooltipContent>
                                                    </Tooltip>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                onClick={() => setStepToDelete({ id: step.id, stepIndex: step.stepIndex })}
                                                                disabled={deleteStep.isPending}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>{t('common.delete')}</TooltipContent>
                                                    </Tooltip>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </div>

                {/* Quest Rewards */}
                <QuestRewardsManager
                    questId={quest.id}
                    rewards={rewards}
                    onUpdate={() => utils.quest.getWithSteps.invalidate({ id: questId })}
                />
            </div>

            {/* Delete step dialog */}
            <Dialog open={!!stepToDelete} onOpenChange={(open) => !open && setStepToDelete(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10 text-destructive shrink-0">
                                <Trash2 className="h-5 w-5" />
                            </div>
                            <DialogTitle className="text-lg">{t('quests.detail.deleteStepTitle')}</DialogTitle>
                        </div>
                        <DialogDescription className="pt-1">
                            {t('quests.detail.deleteStepDescription', { stepIndex: stepToDelete?.stepIndex ?? 0 })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setStepToDelete(null)} disabled={deleteStep.isPending}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => stepToDelete && deleteStep.mutate({ id: stepToDelete.id })}
                            disabled={deleteStep.isPending}
                        >
                            {deleteStep.isPending ? t('common.loading') : t('common.delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    )
}