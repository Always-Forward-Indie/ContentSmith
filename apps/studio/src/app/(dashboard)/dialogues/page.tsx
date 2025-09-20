'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react'

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
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'

import { trpc } from '@/lib/trpc'

export default function DialoguesPage() {
    const [searchTerm, setSearchTerm] = useState('')
    const [page, setPage] = useState(1)

    // Fetch dialogues with tRPC
    const { data: dialoguesData, isLoading, error } = trpc.dialogue.list.useQuery({
        page,
        limit: 10,
        search: searchTerm || undefined,
    })

    const deleteDialogue = trpc.dialogue.delete.useMutation({
        onSuccess: () => {
            // Refresh the list
            window.location.reload()
        },
    })

    const handleDelete = async (id: number) => {
        if (confirm('Are you sure you want to delete this dialogue?')) {
            await deleteDialogue.mutateAsync({ id })
        }
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-destructive">Error loading dialogues: {error.message}</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dialogues</h1>
                    <p className="text-muted-foreground">
                        Manage NPC dialogues and conversation trees
                    </p>
                </div>
                <Link href="/dialogues/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        New Dialogue
                    </Button>
                </Link>
            </div>

            {/* Search and Filters */}
            <Card>
                <CardHeader>
                    <CardTitle>Search & Filters</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search dialogues by slug..."
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Dialogues List */}
            <Card>
                <CardHeader>
                    <CardTitle>All Dialogues</CardTitle>
                    <CardDescription>
                        {dialoguesData?.data.length || 0} dialogue(s) found
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8">
                            <p>Loading dialogues...</p>
                        </div>
                    ) : dialoguesData?.data.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-muted-foreground">No dialogues found</p>
                            <Link href="/dialogues/new">
                                <Button className="mt-4">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create your first dialogue
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>Slug</TableHead>
                                    <TableHead>Version</TableHead>
                                    <TableHead>Start Node</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {dialoguesData?.data.map((dialogue) => (
                                    <TableRow key={dialogue.id}>
                                        <TableCell className="font-mono">{dialogue.id}</TableCell>
                                        <TableCell className="font-medium">{dialogue.slug}</TableCell>
                                        <TableCell>{dialogue.version}</TableCell>
                                        <TableCell>
                                            {dialogue.startNodeId ? (
                                                <span className="font-mono">#{dialogue.startNodeId}</span>
                                            ) : (
                                                <span className="text-muted-foreground">Not set</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Link href={`/dialogues/${dialogue.id}`}>
                                                    <Button variant="outline" size="sm">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Link href={`/dialogues/${dialogue.id}/edit`}>
                                                    <Button variant="outline" size="sm">
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Link href={`/dialogues/${dialogue.id}/graph`}>
                                                    <Button variant="outline" size="sm">
                                                        Graph
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDelete(dialogue.id!)}
                                                    disabled={deleteDialogue.isLoading}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Pagination */}
            {dialoguesData && dialoguesData.data.length > 0 && (
                <div className="flex justify-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setPage(p => p + 1)}
                        disabled={dialoguesData.data.length < 10}
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    )
}