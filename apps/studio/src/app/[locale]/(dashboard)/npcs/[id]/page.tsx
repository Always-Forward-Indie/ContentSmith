'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
    Edit, ArrowLeft, AlertCircle, ChevronRight, Users,
    Heart, Zap, MapPin, Target, Shield, Dna, Tag, HandMetal, RotateCw,
} from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'

import { trpc } from '@/lib/trpc'
import { NpcAttributesManager } from '@/components/npc/NpcAttributesManager'
import { NpcSkillsManager } from '@/components/npc/NpcSkillsManager'
import { NpcDialoguesManager } from '@/components/npc/NpcDialoguesManager'

function DetailSkeleton() {
    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <div className="space-y-2">
                        <Skeleton className="h-7 w-48" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                </div>
                <Skeleton className="h-9 w-28" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
            </div>
        </div>
    )
}

function SectionHeader({ icon: Icon, title, description }: {
    icon: React.ElementType
    title: string
    description?: string
}) {
    return (
        <div className="flex items-start gap-3 pb-1">
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-muted text-muted-foreground mt-0.5 shrink-0">
                <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold">{title}</h2>
                {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
            </div>
            <Separator className="self-center flex-1 max-w-[60%]" />
        </div>
    )
}

export default function NPCDetailPage() {
    const params = useParams()
    const npcId = parseInt(params.id as string)
    const t = useTranslations('npcs')
    const commonT = useTranslations('common')
    const locale = useLocale()

    const utils = trpc.useUtils()
    const { data: npc, isLoading, error } = trpc.npc.getById.useQuery(npcId)

    if (isLoading) return <DetailSkeleton />

    if (error || !npc) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
                <AlertCircle className="h-10 w-10 text-destructive/70" />
                <p className="text-destructive font-medium">
                    {error ? `${commonT('error')}: ${error.message}` : 'NPC not found'}
                </p>
                <Link href={`/${locale}/npcs`}>
                    <Button variant="outline" size="sm">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        {commonT('back')}
                    </Button>
                </Link>
            </div>
        )
    }

    const handleUpdate = () => utils.npc.getById.invalidate(npcId)

    const hasPosition = npc.positionX != null || npc.positionY != null || npc.positionZ != null

    return (
        <div className="space-y-8">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Link href={`/${locale}/npcs`} className="hover:text-foreground transition-colors">
                    {t('title')}
                </Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-foreground font-medium">{npc.name}</span>
            </nav>

            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary shrink-0">
                        <Users className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{npc.name}</h1>
                        {npc.slug
                            ? <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded mt-1 inline-block text-muted-foreground">{npc.slug}</span>
                            : <span className="text-xs text-muted-foreground mt-1 inline-block">ID: {npc.id}</span>
                        }
                    </div>
                </div>
                <Link href={`/${locale}/npcs/${npc.id}/edit`}>
                    <Button size="sm" className="gap-1.5 shrink-0">
                        <Edit className="h-4 w-4" />
                        {t('edit')}
                    </Button>
                </Link>
            </div>

            {/* Identity strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                <div className="rounded-lg border bg-card px-4 py-3 flex items-start gap-3">
                    <Tag className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                    <div>
                        <p className="text-[11px] text-muted-foreground leading-none mb-1.5">{t('npcType')}</p>
                        <span className="text-sm font-semibold">{npc.npcTypeName || `#${npc.npcType}`}</span>
                    </div>
                </div>
                <div className="rounded-lg border bg-card px-4 py-3 flex items-start gap-3">
                    <Dna className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                    <div>
                        <p className="text-[11px] text-muted-foreground leading-none mb-1.5">{t('raceId')}</p>
                        {npc.raceName
                            ? <span className="text-sm font-semibold">{npc.raceName}</span>
                            : <span className="text-sm text-muted-foreground">—</span>
                        }
                    </div>
                </div>
                <div className="rounded-lg border bg-card px-4 py-3 flex items-start gap-3">
                    <Shield className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                    <div>
                        <p className="text-[11px] text-muted-foreground leading-none mb-1.5">{t('levelField')}</p>
                        <span className="text-sm font-semibold">Lv. {npc.level}</span>
                    </div>
                </div>
                <div className="rounded-lg border bg-card px-4 py-3 flex items-start gap-3">
                    <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${npc.isDead ? 'bg-destructive' : 'bg-emerald-500'}`} />
                    <div>
                        <p className="text-[11px] text-muted-foreground leading-none mb-1.5">{t('status')}</p>
                        {npc.isDead
                            ? <span className="text-sm font-semibold text-destructive">{t('dead')}</span>
                            : <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{t('alive')}</span>
                        }
                    </div>
                </div>
                <div className="rounded-lg border bg-card px-4 py-3 flex items-start gap-3">
                    <HandMetal className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                    <div>
                        <p className="text-[11px] text-muted-foreground leading-none mb-1.5">{t('isInteractable')}</p>
                        {npc.isInteractable
                            ? <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{commonT('yes')}</span>
                            : <span className="text-sm font-semibold text-muted-foreground">{commonT('no')}</span>
                        }
                    </div>
                </div>
            </div>

            {/* Vitals */}
            <section className="space-y-4">
                <SectionHeader icon={Heart} title={t('vitals')} description={t('basicInfoDescription')} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card>
                        <CardContent className="pt-5 pb-5">
                            <div className="flex items-center gap-2 mb-2">
                                <Heart className="h-4 w-4 text-rose-500" />
                                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('currentHealth')}</span>
                            </div>
                            <p className="text-3xl font-bold tabular-nums">{npc.currentHealth?.toLocaleString()}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-5 pb-5">
                            <div className="flex items-center gap-2 mb-2">
                                <Zap className="h-4 w-4 text-blue-500" />
                                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('currentMana')}</span>
                            </div>
                            <p className="text-3xl font-bold tabular-nums">{npc.currentMana?.toLocaleString()}</p>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* Location */}
            <section className="space-y-4">
                <SectionHeader icon={MapPin} title={t('position')} />
                <Card>
                    <CardContent className="pt-5 pb-5">
                        <div className="grid grid-cols-5 gap-6">
                            <div>
                                <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                                    <Target className="h-3 w-3" />{t('radius')}
                                </p>
                                <p className="text-xl font-bold tabular-nums">{npc.radius}</p>
                            </div>
                            {(['X', 'Y', 'Z'] as const).map((axis) => {
                                const val = npc[`position${axis}` as 'positionX' | 'positionY' | 'positionZ']
                                return (
                                    <div key={axis}>
                                        <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1.5">{axis}</p>
                                        {hasPosition
                                            ? <p className="text-xl font-bold font-mono tabular-nums">{val != null ? (val as number).toFixed(2) : '—'}</p>
                                            : <p className="text-xl font-bold text-muted-foreground/40">—</p>
                                        }
                                    </div>
                                )
                            })}
                            <div>
                                <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                                    <RotateCw className="h-3 w-3" />Rot Z
                                </p>
                                {hasPosition
                                    ? <p className="text-xl font-bold tabular-nums">{npc.positionRotZ != null ? `${npc.positionRotZ}°` : '—'}</p>
                                    : <p className="text-xl font-bold text-muted-foreground/40">—</p>
                                }
                            </div>
                        </div>
                        {!hasPosition && (
                            <div className="mt-4 pt-4 border-t flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">{t('positionNotSet')}</p>
                                <Link href={`/${locale}/npcs/${npc.id}/edit`}>
                                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                                        <Edit className="h-3 w-3" />
                                        {t('edit')}
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </section>

            {/* Attributes */}
            <NpcAttributesManager
                npcId={npc.id}
                attributes={npc.attributes ?? []}
                onUpdate={handleUpdate}
            />

            {/* Skills */}
            <NpcSkillsManager
                npcId={npc.id}
                skills={npc.skills ?? []}
                onUpdate={handleUpdate}
            />

            {/* Dialogues */}
            <NpcDialoguesManager
                npcId={npc.id}
                dialogues={(npc.dialogues ?? []).map((dialogue) => ({
                    ...dialogue,
                    conditionGroup: dialogue.conditionGroup ?? null,
                }))}
                onUpdate={handleUpdate}
            />
        </div>
    )
}
