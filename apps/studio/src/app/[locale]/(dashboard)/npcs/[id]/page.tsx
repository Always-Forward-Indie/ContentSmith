'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Edit, Shield, Skull, Users, ArrowLeft } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { trpc } from '@/lib/trpc'

export default function NPCDetailPage() {
    const params = useParams()
    const npcId = parseInt(params.id as string)
    const t = useTranslations('npcs')
    const commonT = useTranslations('common')
    const locale = useLocale()

    const { data: npc, isLoading, error } = trpc.npc.getById.useQuery(npcId)

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center">{commonT('loading')}...</div>
            </div>
        )
    }

    if (error || !npc) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-red-600">{commonT('error')}</CardTitle>
                        <CardDescription>
                            NPC not found or failed to load
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href={`/${locale}/npcs`}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            {commonT('back')}
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{npc.name}</h1>
                        {npc.slug && (
                            <p className="text-muted-foreground">
                                {npc.slug}
                            </p>
                        )}
                    </div>
                </div>
                <Button asChild>
                    <Link href={`/${locale}/npcs/${npc.id}/edit`}>
                        <Edit className="mr-2 h-4 w-4" />
                        {t('edit')}
                    </Link>
                </Button>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            {t('basicInfo')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">{t('level')}:</span>
                            <div className="flex items-center gap-1">
                                <Shield className="h-3 w-3" />
                                <span>{npc.level}</span>
                            </div>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">{t('race')}:</span>
                            <span>{npc.raceName || `Race ${npc.raceId}`}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">{t('type')}:</span>
                            <span>{npc.npcTypeName || `Type ${npc.npcType}`}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">{t('radius')}:</span>
                            <span>{npc.radius}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('health')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">HP:</span>
                            <span>{npc.currentHealth}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">MP:</span>
                            <span>{npc.currentMana}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">{t('status')}:</span>
                            <div className="flex items-center gap-1">
                                {npc.isDead ? (
                                    <>
                                        <Skull className="h-3 w-3 text-red-500" />
                                        <Badge variant="destructive">{t('dead')}</Badge>
                                    </>
                                ) : (
                                    <>
                                        <div className="h-3 w-3 bg-green-500 rounded-full" />
                                        <Badge variant="default">{t('alive')}</Badge>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">{t('interactable')}:</span>
                            <Badge variant={npc.isInteractable ? "default" : "secondary"}>
                                {npc.isInteractable ? commonT('yes') : commonT('no')}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {(npc.positionX !== null || npc.positionY !== null || npc.positionZ !== null) && (
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('position')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">X:</span>
                                <span>{npc.positionX ?? '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Y:</span>
                                <span>{npc.positionY ?? '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Z:</span>
                                <span>{npc.positionZ ?? '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Rotation Z:</span>
                                <span>{npc.positionRotZ ?? 0}°</span>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Attributes */}
            {npc.attributes && npc.attributes.length > 0 && (
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>{t('attributes')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {npc.attributes.map((attr) => (
                                <div key={attr.id} className="flex justify-between items-center p-3 border rounded">
                                    <span className="font-medium">{attr.attributeName}</span>
                                    <Badge variant="outline">{attr.value}</Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Skills */}
            {npc.skills && npc.skills.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>{t('skills')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {npc.skills.map((skill) => (
                                <div key={skill.id} className="flex justify-between items-center p-3 border rounded">
                                    <span className="font-medium">{skill.skillName}</span>
                                    <Badge variant="outline">Level {skill.currentLevel}</Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}