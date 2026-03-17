import { useMemo, useState } from 'react'
import { Sheet, SheetClose, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { privateInstance } from '@/lib/auth'
import { useMutation, useQuery } from '@tanstack/react-query'
import { MediaSelectorDialog } from '@/routes/dashboard/media/-components/media-selector-dialog'
import type { MediaItem } from '@/routes/dashboard/media'
import { ArrowDown, ArrowUp, Loader, Plus, Smartphone, Tablet, Monitor, Globe, X } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

type Device = 'mobile' | 'tablet' | 'desktop'

type ThemeBlockFieldType =
    | 'text'
    | 'number'
    | 'boolean'
    | 'select'
    | 'multiselect'
    | 'date'
    | 'datetime'
    | 'image'
    | 'video'
    | 'text_list'
    | 'number_list'
    | 'image_list'
    | 'video_list'
    | 'link'
    | 'link_list'
    | 'store_menu'
    | 'image_link'
    | 'image_link_list'

type ThemeBlockField = {
    id: number
    name: string
    description: string | null
    alias: string | null
    type: ThemeBlockFieldType
    createdAt: string
    updatedAt: string
}

type ThemeBlock = {
    id: number
    name: string
    description: string | null
    createdAt: string
    updatedAt: string
    fields: ThemeBlockField[]
}

type ThemeBlocksResponse = {
    themeId: number
    blocks: ThemeBlock[]
}

type StoreDetail = {
    id: number
    storeTheme?: { id: number; name: string } | null
    storeThemeId?: number | null
}

type PageBlockInstance = {
    instanceId: string
    block: ThemeBlock
    values: Record<number, any>
    data: { id: number; name: string; fields: Record<string, any> }
}

export function PageContentSheet({
    trigger,
    page,
}: {
    trigger: React.ReactNode
    page: { id: number; title: string; path: string; store?: { id: number; name: string } | null } | null
}) {
    const [open, setOpen] = useState(false)
    const [device, setDevice] = useState<Device>('desktop')
    const [pageBlocks, setPageBlocks] = useState<PageBlockInstance[]>([])
    const [selectedBlockInstanceId, setSelectedBlockInstanceId] = useState<string | null>(null)

    const previewSize = useMemo(() => {
        if (device === 'mobile') return { maxWidth: 390, label: 'Mobile' }
        if (device === 'tablet') return { maxWidth: 820, label: 'Tablet' }
        return { maxWidth: 1280, label: 'Desktop' }
    }, [device])

    const displayUrl = useMemo(() => {
        const p = page?.path ? String(page.path) : '/'
        return p.startsWith('/') ? p : `/${p}`
    }, [page])

    const storeId = page?.store?.id ?? null

    const { data: storeDetail } = useQuery({
        queryKey: ['store-detail-for-page-editor', storeId],
        enabled: open && !!storeId,
        refetchOnWindowFocus: false,
        refetchOnMount: true,
        staleTime: 0,
        queryFn: async () => {
            const res = await privateInstance.get(`/tenant/stores/${storeId}`)
            if (res.status !== 200) throw new Error('Erro ao carregar loja')
            return res.data as StoreDetail
        },
    })

    const themeId = Number(storeDetail?.storeTheme?.id ?? storeDetail?.storeThemeId ?? 0) || null

    const { data: themeBlocks, isLoading: isLoadingBlocks, isRefetching: isRefetchingBlocks } = useQuery({
        queryKey: ['theme-blocks', themeId],
        enabled: open && !!themeId,
        refetchOnWindowFocus: false,
        refetchOnMount: true,
        staleTime: 0,
        queryFn: async () => {
            const res = await privateInstance.get(`/tenant/themes/${themeId}/blocks`)
            if (res.status !== 200) throw new Error('Erro ao carregar blocos do tema')
            return res.data as ThemeBlocksResponse
        },
    })

    const selectedInstance = useMemo(
        () => pageBlocks.find((b) => b.instanceId === selectedBlockInstanceId) ?? null,
        [pageBlocks, selectedBlockInstanceId]
    )
    const inspectorOpen = !!selectedInstance

    const hasBlocks = pageBlocks.length > 0

    const availableBlocks = useMemo(() => themeBlocks?.blocks ?? [], [themeBlocks])

    const blocksLoading = isLoadingBlocks || isRefetchingBlocks

    const createInstanceId = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`

    const contentToSave = useMemo(() => {
        return { blocks: pageBlocks.map((b) => b.data) }
    }, [pageBlocks])

    const pageBlocksJson = useMemo(() => {
        return JSON.stringify(contentToSave, null, 2)
    }, [contentToSave])

    const fieldKey = (f: ThemeBlockField) => {
        const a = typeof f.alias === 'string' ? f.alias.trim() : ''
        return a.length > 0 ? a : `field_${f.id}`
    }

    const addBlock = (block: ThemeBlock) => {
        const instance: PageBlockInstance = {
            instanceId: createInstanceId(),
            block,
            values: {},
            data: { id: block.id, name: block.name, fields: {} },
        }
        setPageBlocks((prev) => [...prev, instance])
        setSelectedBlockInstanceId(instance.instanceId)
    }

    const removeBlock = (instanceId: string) => {
        setPageBlocks((prev) => prev.filter((b) => b.instanceId !== instanceId))
        setSelectedBlockInstanceId((cur) => (cur === instanceId ? null : cur))
    }

    const setFieldValue = (instanceId: string, field: ThemeBlockField, value: any) => {
        setPageBlocks((prev) =>
            prev.map((b) => {
                if (b.instanceId !== instanceId) return b
                return {
                    ...b,
                    values: { ...b.values, [field.id]: value },
                    data: { ...b.data, fields: { ...b.data.fields, [fieldKey(field)]: value } },
                }
            })
        )
    }

    const setSelectedFieldValue = (field: ThemeBlockField, value: any) => {
        if (!selectedInstance) return
        setFieldValue(selectedInstance.instanceId, field, value)
    }

    const inspectorImageIds = useMemo(() => {
        if (!selectedInstance) return []
        const ids: number[] = []
        for (const f of selectedInstance.block.fields ?? []) {
            const v = selectedInstance.values[f.id]
            if (f.type === 'image_link') {
                const n = Number((v as any)?.imageId)
                if (Number.isFinite(n) && n > 0) ids.push(n)
            }
            if (f.type === 'image_link_list') {
                const list = Array.isArray(v) ? v : []
                for (const it of list) {
                    const n = Number((it as any)?.imageId)
                    if (Number.isFinite(n) && n > 0) ids.push(n)
                }
            }
        }
        return Array.from(new Set(ids))
    }, [selectedInstance])

    const { data: inspectorMedias } = useQuery({
        queryKey: ['page-editor-medias', inspectorImageIds.join(',')],
        enabled: open && inspectorImageIds.length > 0,
        refetchOnWindowFocus: false,
        refetchOnMount: true,
        staleTime: 0,
        queryFn: async () => {
            const res = await privateInstance.get('/tenant/medias', {
                params: {
                    page: 1,
                    limit: Math.min(100, inspectorImageIds.length),
                    id: JSON.stringify({ operator: 'in', value: inspectorImageIds }),
                },
            })
            return (res.data?.items ?? []) as MediaItem[]
        },
    })

    const mediaById = useMemo(() => new Map((inspectorMedias ?? []).map((m) => [m.id, m])), [inspectorMedias])

    const { isPending: isSaving, mutateAsync: saveContent } = useMutation({
        mutationFn: async () => {
            const pageId = page?.id
            if (!pageId) throw new Error('Página inválida')
            const res = await privateInstance.put(`/tenant/pages/${pageId}/content`, {
                content: contentToSave,
            })
            if (res.status !== 200) throw new Error('Erro ao salvar conteúdo')
            return res.data
        },
        onSuccess: () => {
            toast.success('Conteúdo salvo com sucesso!')
        },
        onError: (error: any) => {
            const errorData = error?.response?.data
            toast.error(errorData?.title || 'Erro ao salvar conteúdo', {
                description: errorData?.detail || 'Não foi possível salvar o conteúdo.',
            })
        },
    })

    return (
        <Sheet
            open={open}
            onOpenChange={(o) => {
                setOpen(o)
                if (!o) {
                    setPageBlocks([])
                    setSelectedBlockInstanceId(null)
                    setDevice('desktop')
                }
            }}
        >
            <SheetTrigger asChild>{trigger}</SheetTrigger>
            <SheetContent className="w-full sm:max-w-[100vw] p-0 [&>button.absolute]:hidden" >
                <div className="flex h-full flex-col">
                    <div className="h-11 border-b px-3 flex items-center gap-2 bg-background">
                        <div className="flex-1 min-w-0 flex items-center gap-2 rounded-md bg-muted/20 px-2 py-1.5 max-w-[600px]">
                            <Globe className="size-4 text-muted-foreground" />
                            <Input className="h-7 border-0 bg-transparent shadow-none p-0 focus-visible:ring-0 text-sm" value={displayUrl} readOnly />
                        </div>

                        <Tabs value={device} onValueChange={(v) => setDevice(v as Device)} className="shrink-0">
                            <TabsList className="h-8">
                                <TabsTrigger value="mobile" className="gap-2 h-7 px-2">
                                    <Smartphone className="size-4" />
                                </TabsTrigger>
                                <TabsTrigger value="tablet" className="gap-2 h-7 px-2">
                                    <Tablet className="size-4" />
                                </TabsTrigger>
                                <TabsTrigger value="desktop" className="gap-2 h-7 px-2">
                                    <Monitor className="size-4" />
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <Button
                            type="button"
                            size="sm"
                            className="h-8"
                            disabled={!page?.id || isSaving}
                            onClick={() => saveContent()}
                        >
                            {isSaving ? <Loader className="size-4 animate-spin" /> : 'Salvar'}
                        </Button>

                        <SheetClose asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <X className="size-4" />
                            </Button>
                        </SheetClose>
                    </div>

                    <div className="flex-1 min-h-0 flex">
                        <aside className="w-[300px] border-r bg-background">
                            <div className="h-full flex flex-col">
                                <div className="px-3 py-2 border-b">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Blocos</div>
                                        {blocksLoading ? <Loader className="size-3.5 animate-spin text-muted-foreground" /> : null}
                                    </div>
                                </div>

                                <ScrollArea className="flex-1 min-h-0">
                                    <div className="p-3 flex flex-col gap-2">
                                        {!hasBlocks ? (
                                            <div className="rounded-md border bg-muted/20 px-3 py-2">
                                                <div className="text-sm font-medium">Nenhum bloco</div>
                                            </div>
                                        ) : (
                                            pageBlocks.map((b, idx) => (
                                                <button
                                                    key={b.instanceId}
                                                    type="button"
                                                    onClick={() => setSelectedBlockInstanceId((cur) => (cur === b.instanceId ? null : b.instanceId))}
                                                    className={`w-full text-left rounded-md border px-3 py-2 transition-colors ${selectedBlockInstanceId === b.instanceId ? 'bg-muted/30 border-primary/40' : 'bg-background hover:bg-muted/20'
                                                        }`}
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <div className="text-sm font-medium truncate">{idx + 1}. {b.block.name}</div>
                                                            <div className="text-xs text-muted-foreground truncate">
                                                                {b.block.fields?.length ?? 0} campos
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="h-7 w-7 inline-flex items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
                                                            onClick={(e) => { e.stopPropagation(); removeBlock(b.instanceId) }}
                                                            aria-label="Remover bloco"
                                                        >
                                                            <X className="size-4" />
                                                        </button>
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </ScrollArea>

                                <div className="p-3 border-t">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className="w-full justify-center gap-2"
                                                disabled={!open || !themeId || blocksLoading || availableBlocks.length === 0}
                                            >
                                                <Plus className="size-4" /> Adicionar bloco
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-[280px]" align="start">
                                            <DropdownMenuLabel>Blocos disponíveis</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <ScrollArea className="max-h-[360px]">
                                                <div className="p-1">
                                                    {availableBlocks.map((b) => (
                                                        <DropdownMenuItem key={b.id} onSelect={() => addBlock(b)} className="flex flex-col items-start gap-0.5">
                                                            <div className="text-sm font-medium">{b.name}</div>
                                                            {b.description ? <div className="text-xs text-muted-foreground">{b.description}</div> : null}
                                                        </DropdownMenuItem>
                                                    ))}
                                                </div>
                                            </ScrollArea>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        </aside>

                        <main className="flex-1 min-h-0 flex flex-col bg-muted/20">
                            <div className="flex-1 min-h-0 flex">
                                <div className="flex-1 min-h-0 overflow-auto p-3">
                                    <div className="mx-auto w-full" style={{ maxWidth: `${previewSize.maxWidth}px` }}>
                                        <div className="rounded-xl border bg-background shadow-sm overflow-hidden">
                                            <div className="h-10 border-b bg-muted/30 flex items-center px-3 gap-2">
                                                <div className="flex items-center gap-1">
                                                    <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                                                    <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                                                    <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                                                </div>
                                                <div className="text-xs text-muted-foreground truncate">{previewSize.label} • JSON</div>
                                            </div>
                                            <ScrollArea className="h-[72vh] bg-muted/10">
                                                <pre className="p-3 text-xs leading-relaxed font-mono whitespace-pre-wrap break-words text-foreground">
{pageBlocksJson}
                                                </pre>
                                            </ScrollArea>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    className={`bg-background overflow-hidden transition-all duration-200 ease-out ${inspectorOpen ? 'w-[360px] border-l' : 'w-0 border-l-0'
                                        }`}
                                >
                                    <div
                                        className={`h-full w-[360px] transition-transform duration-200 ease-out ${inspectorOpen ? 'translate-x-0' : 'translate-x-full'
                                            }`}
                                    >
                                        <div className="h-full flex flex-col">
                                            <div className="px-3 py-2 border-b">
                                                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Propriedades</div>
                                            </div>

                                            <ScrollArea className="flex-1 min-h-0">
                                                <div className="p-3 flex flex-col gap-3">
                                                    <div className="rounded-md border bg-muted/10 px-3 py-2">
                                                        <div className="text-sm font-semibold">{selectedInstance?.block.name ?? ''}</div>
                                                        {selectedInstance?.block.description ? (
                                                            <div className="text-xs text-muted-foreground">{selectedInstance.block.description}</div>
                                                        ) : null}
                                                    </div>

                                                    <div className="flex flex-col gap-3">
                                                        {(selectedInstance?.block.fields ?? []).map((f) => {
                                                            const v = selectedInstance?.values?.[f.id]
                                                            if (f.type === 'boolean') {
                                                                return (
                                                                    <div key={f.id} className="rounded-md border px-3 py-2">
                                                                        <div className="flex items-center justify-between gap-3">
                                                                            <div className="min-w-0">
                                                                                <Label className="text-sm">{f.name}</Label>
                                                                                {f.description ? <div className="text-xs text-muted-foreground truncate">{f.description}</div> : null}
                                                                            </div>
                                                                            <Switch checked={Boolean(v)} onCheckedChange={(nv) => setSelectedFieldValue(f, Boolean(nv))} />
                                                                        </div>
                                                                    </div>
                                                                )
                                                            }

                                                            if (f.type === 'number') {
                                                                return (
                                                                    <div key={f.id} className="rounded-md border px-3 py-2">
                                                                        <Label className="text-sm">{f.name}</Label>
                                                                        <Input
                                                                            type="number"
                                                                            className="mt-2 h-9"
                                                                            value={v ?? ''}
                                                                            onChange={(e) => setSelectedFieldValue(f, e.target.value)}
                                                                        />
                                                                    </div>
                                                                )
                                                            }

                                                            if (f.type === 'date') {
                                                                return (
                                                                    <div key={f.id} className="rounded-md border px-3 py-2">
                                                                        <Label className="text-sm">{f.name}</Label>
                                                                        <Input
                                                                            type="date"
                                                                            className="mt-2 h-9"
                                                                            value={v ?? ''}
                                                                            onChange={(e) => setSelectedFieldValue(f, e.target.value)}
                                                                        />
                                                                    </div>
                                                                )
                                                            }

                                                            if (f.type === 'datetime') {
                                                                return (
                                                                    <div key={f.id} className="rounded-md border px-3 py-2">
                                                                        <Label className="text-sm">{f.name}</Label>
                                                                        <Input
                                                                            type="datetime-local"
                                                                            className="mt-2 h-9"
                                                                            value={v ?? ''}
                                                                            onChange={(e) => setSelectedFieldValue(f, e.target.value)}
                                                                        />
                                                                    </div>
                                                                )
                                                            }

                                                            if (f.type === 'image_link_list') {
                                                                const listRaw = Array.isArray(v) ? v : []
                                                                const list = listRaw.map((it: any) => ({
                                                                    imageId: Number(it?.imageId ?? 0) || 0,
                                                                    label: String(it?.label ?? ''),
                                                                    path: String(it?.path ?? ''),
                                                                }))

                                                                const move = (from: number, to: number) => {
                                                                    if (from === to) return
                                                                    if (from < 0 || to < 0 || from >= list.length || to >= list.length) return
                                                                    const next = [...list]
                                                                    const [removed] = next.splice(from, 1)
                                                                    next.splice(to, 0, removed)
                                                                    setSelectedFieldValue(f, next)
                                                                }

                                                                return (
                                                                    <div key={f.id} className="rounded-md border px-3 py-2">
                                                                        <div className="flex items-start justify-between gap-2">
                                                                            <div className="min-w-0">
                                                                                <Label className="text-sm">{f.name}</Label>
                                                                                {f.description ? <div className="text-xs text-muted-foreground truncate">{f.description}</div> : null}
                                                                                {f.alias ? <div className="text-[11px] text-muted-foreground truncate">{f.alias}</div> : null}
                                                                            </div>
                                                                            <Button
                                                                                type="button"
                                                                                size="sm"
                                                                                variant="outline"
                                                                                className="h-8 px-2"
                                                                                onClick={() => setSelectedFieldValue(f, [...list, { imageId: 0, label: '', path: '' }])}
                                                                            >
                                                                                <Plus className="size-4" />
                                                                            </Button>
                                                                        </div>

                                                                        <div className="mt-3 flex flex-col gap-2">
                                                                            {list.length === 0 ? (
                                                                                <div className="text-xs text-muted-foreground">Nenhum item</div>
                                                                            ) : (
                                                                                list.map((row: any, idx: number) => {
                                                                                    const media = row.imageId > 0 ? mediaById.get(row.imageId) : undefined
                                                                                    const canPreview = !!media?.url && typeof media?.mime === 'string' && media.mime.startsWith('image/')

                                                                                    return (
                                                                                        <div key={idx} className="rounded-md border bg-background p-2">
                                                                                            <div className="flex items-center justify-between gap-2">
                                                                                                <div className="flex items-center gap-2 min-w-0">
                                                                                                    <div className="h-10 w-10 rounded border bg-muted overflow-hidden flex items-center justify-center shrink-0">
                                                                                                        {canPreview ? (
                                                                                                            <img src={media!.url!} alt={media?.name ?? 'banner'} className="h-full w-full object-cover" />
                                                                                                        ) : (
                                                                                                            <span className="text-xs text-muted-foreground">—</span>
                                                                                                        )}
                                                                                                    </div>
                                                                                                    <div className="min-w-0">
                                                                                                        <div className="text-xs font-medium truncate">{row.imageId > 0 ? `Mídia #${row.imageId}` : 'Selecione um banner'}</div>
                                                                                                        <div className="text-[11px] text-muted-foreground truncate">{media?.name ?? ''}</div>
                                                                                                    </div>
                                                                                                </div>

                                                                                                <div className="flex items-center gap-1">
                                                                                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={idx === 0} onClick={() => move(idx, idx - 1)}>
                                                                                                        <ArrowUp className="size-4" />
                                                                                                    </Button>
                                                                                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={idx === list.length - 1} onClick={() => move(idx, idx + 1)}>
                                                                                                        <ArrowDown className="size-4" />
                                                                                                    </Button>
                                                                                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedFieldValue(f, list.filter((_: any, i: number) => i !== idx))}>
                                                                                                        <X className="size-4" />
                                                                                                    </Button>
                                                                                                </div>
                                                                                            </div>

                                                                                            <div className="mt-2 flex items-center gap-2">
                                                                                                <MediaSelectorDialog
                                                                                                    multiple={false}
                                                                                                    toFilter="banner"
                                                                                                    onSelect={(medias) => {
                                                                                                        const m = medias[0]
                                                                                                        if (!m) return
                                                                                                        if (typeof m.mime !== 'string' || !m.mime.startsWith('image/')) return
                                                                                                        const next = [...list]
                                                                                                        next[idx] = { ...next[idx], imageId: m.id }
                                                                                                        setSelectedFieldValue(f, next)
                                                                                                    }}
                                                                                                    trigger={<Button type="button" size="sm" variant="outline">Selecionar</Button>}
                                                                                                />
                                                                                                <Input
                                                                                                    className="h-9"
                                                                                                    placeholder="Label"
                                                                                                    value={row.label}
                                                                                                    onChange={(e) => {
                                                                                                        const next = [...list]
                                                                                                        next[idx] = { ...next[idx], label: e.target.value }
                                                                                                        setSelectedFieldValue(f, next)
                                                                                                    }}
                                                                                                />
                                                                                            </div>

                                                                                            <div className="mt-2">
                                                                                                <Input
                                                                                                    className="h-9"
                                                                                                    placeholder="/caminho"
                                                                                                    value={row.path}
                                                                                                    onChange={(e) => {
                                                                                                        const next = [...list]
                                                                                                        next[idx] = { ...next[idx], path: e.target.value.replace(/\s+/g, '') }
                                                                                                        setSelectedFieldValue(f, next)
                                                                                                    }}
                                                                                                />
                                                                                            </div>
                                                                                        </div>
                                                                                    )
                                                                                })
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )
                                                            }

                                                            return (
                                                                <div key={f.id} className="rounded-md border px-3 py-2">
                                                                    <Label className="text-sm">{f.name}</Label>
                                                                    <Input
                                                                        className="mt-2 h-9"
                                                                        value={v ?? ''}
                                                                        onChange={(e) => setSelectedFieldValue(f, e.target.value)}
                                                                        placeholder={f.type}
                                                                    />
                                                                    {f.alias ? <div className="mt-2 text-[11px] text-muted-foreground truncate">{f.alias}</div> : null}
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            </ScrollArea>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </main>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}

