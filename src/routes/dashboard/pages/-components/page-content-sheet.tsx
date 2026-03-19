import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Sheet, SheetClose, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { privateInstance } from '@/lib/auth'
import { useMutation, useQuery } from '@tanstack/react-query'
import { MediaSelectorDialog } from '@/routes/dashboard/media/-components/media-selector-dialog'
import { ArrowDown, ArrowUp, GripVertical, Loader, Plus, Smartphone, Tablet, Monitor, Globe, X } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import {
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'

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

type ThemeBlockFieldOption = {
    id: number
    name: string
    value: string
    createdAt: string
    updatedAt: string
}

type ThemeBlockField = {
    id: number
    name: string
    description: string | null
    alias: string
    isRequired: boolean
    schema: Record<string, any> | null
    type: ThemeBlockFieldType
    options?: ThemeBlockFieldOption[]
    createdAt: string
    updatedAt: string
}

type ThemeBlock = {
    id: number
    name: string
    description: string | null
    alias: string
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

type PageDetail = {
    id: number
    title: string
    path: string
    active: boolean
    storeId: number
    type: string
    content: any | null
}

type PageBlockInstance = {
    instanceId: string
    block: ThemeBlock
    data: {
        id: number
        name: string
        alias: string
        devices: {
            mobile: { fields: Record<string, any> }
            tablet: { fields: Record<string, any> }
            desktop: { fields: Record<string, any> }
        }
    }
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
    const [didHydrate, setDidHydrate] = useState(false)
    const [activeDragId, setActiveDragId] = useState<string | null>(null)

    const previewSize = useMemo(() => {
        if (device === 'mobile') return { maxWidth: 390, label: 'Mobile' }
        if (device === 'tablet') return { maxWidth: 820, label: 'Tablet' }
        return { maxWidth: 1280, label: 'Desktop' }
    }, [device])

    const pageId = page?.id ?? null

    const { data: pageDetail, isLoading: isLoadingPageDetail } = useQuery({
        queryKey: ['page-detail-for-editor', pageId],
        enabled: open && !!pageId,
        refetchOnWindowFocus: false,
        refetchOnMount: true,
        staleTime: 0,
        queryFn: async () => {
            const res = await privateInstance.get(`/tenant/pages/${pageId}`)
            if (res.status !== 200) throw new Error('Erro ao carregar página')
            return res.data as PageDetail
        },
    })

    const displayUrl = useMemo(() => {
        const p = pageDetail?.path ? String(pageDetail.path) : (page?.path ? String(page.path) : '/')
        return p.startsWith('/') ? p : `/${p}`
    }, [page, pageDetail])

    const storeId = pageDetail?.storeId ?? null

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

    useEffect(() => {
        if (!open) return
        if (device === 'desktop') return
        setPageBlocks((prev) => {
            let changed = false
            const next = prev.map((b) => {
                const desktopFields = b.data.devices.desktop.fields ?? {}
                const targetFields = (b.data.devices as any)?.[device]?.fields ?? {}
                if (Object.keys(desktopFields).length === 0) return b
                const merged = { ...desktopFields, ...targetFields }
                if (Object.keys(merged).length === Object.keys(targetFields).length) return b
                changed = true
                return {
                    ...b,
                    data: {
                        ...b.data,
                        devices: {
                            ...b.data.devices,
                            [device]: { fields: merged },
                        },
                    },
                }
            })
            return changed ? next : prev
        })
    }, [device, open])

    const hydrateFromPageContent = (content: any | null, blocks: ThemeBlock[]) => {
        const contentBlocks = Array.isArray(content?.blocks) ? content.blocks : []
        const byBlockId = new Map(blocks.map((b) => [b.id, b]))
        const hydrated: PageBlockInstance[] = []

        for (const raw of contentBlocks) {
            const id = Number(raw?.id)
            const name = String(raw?.name ?? '')
            const alias = String(raw?.alias ?? '')
            const def = Number.isFinite(id) ? byBlockId.get(id) : undefined
            if (!def) continue

            const legacyFieldsObj = (raw?.fields && typeof raw.fields === 'object') ? raw.fields : {}
            const devicesRaw = (raw?.devices && typeof raw.devices === 'object') ? raw.devices : null
            const devices = {
                mobile: { fields: {} as Record<string, any> },
                tablet: { fields: {} as Record<string, any> },
                desktop: { fields: {} as Record<string, any> },
            }

            const readDeviceFields = (d: any) => (d?.fields && typeof d.fields === 'object') ? d.fields : null
            const mobileFields = readDeviceFields(devicesRaw?.mobile)
            const tabletFields = readDeviceFields(devicesRaw?.tablet)
            const desktopFields = readDeviceFields(devicesRaw?.desktop)

            if (mobileFields || tabletFields || desktopFields) {
                devices.mobile.fields = { ...(mobileFields ?? {}) }
                devices.tablet.fields = { ...(tabletFields ?? {}) }
                devices.desktop.fields = { ...(desktopFields ?? {}) }
            } else {
                const copy = { ...(legacyFieldsObj as any) }
                devices.mobile.fields = { ...copy }
                devices.tablet.fields = { ...copy }
                devices.desktop.fields = { ...copy }
            }

            hydrated.push({
                instanceId: createInstanceId(),
                block: def,
                data: {
                    id: def.id,
                    name: name || def.name,
                    alias: alias || def.alias,
                    devices,
                },
            })
        }

        return hydrated
    }

    useEffect(() => {
        if (!open) return
        if (didHydrate) return
        if (!pageDetail) return
        if (!themeBlocks?.blocks) return

        const hydrated = hydrateFromPageContent(pageDetail.content, themeBlocks.blocks)
        setPageBlocks(hydrated)
        setSelectedBlockInstanceId(null)
        setDidHydrate(true)
    }, [open, didHydrate, pageDetail, themeBlocks])

    const addBlock = (block: ThemeBlock) => {
        const fieldsMobile: Record<string, any> = {}
        const fieldsTablet: Record<string, any> = {}
        const fieldsDesktop: Record<string, any> = {}
        for (const f of block.fields ?? []) {
            if (f.type !== 'boolean') continue
            if (!f.isRequired) continue
            const key = fieldKey(f)
            fieldsMobile[key] = false
            fieldsTablet[key] = false
            fieldsDesktop[key] = false
        }

        const instance: PageBlockInstance = {
            instanceId: createInstanceId(),
            block,
            data: {
                id: block.id,
                name: block.name,
                alias: block.alias,
                devices: {
                    mobile: { fields: fieldsMobile },
                    tablet: { fields: fieldsTablet },
                    desktop: { fields: fieldsDesktop },
                },
            },
        }
        setPageBlocks((prev) => [...prev, instance])
        setSelectedBlockInstanceId(instance.instanceId)
    }

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    const onDragStart = (event: DragStartEvent) => {
        setActiveDragId(String(event.active.id))
    }

    const onDragEnd = (event: DragEndEvent) => {
        setActiveDragId(null)
        const { active, over } = event
        if (!over) return
        const from = pageBlocks.findIndex((b) => b.instanceId === String(active.id))
        const to = pageBlocks.findIndex((b) => b.instanceId === String(over.id))
        if (from < 0 || to < 0 || from === to) return
        setPageBlocks((prev) => arrayMove(prev, from, to))
    }

    const activeDragItem = useMemo(
        () => (activeDragId ? pageBlocks.find((b) => b.instanceId === activeDragId) ?? null : null),
        [activeDragId, pageBlocks]
    )

    const SortableBlockRow = ({ item, idx }: { item: PageBlockInstance; idx: number }) => {
        const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
            id: item.instanceId,
        })
        const style: CSSProperties = { transform: CSS.Transform.toString(transform), transition }

        return (
            <div
                ref={setNodeRef}
                style={style}
                className={`w-full max-w-full rounded-md border transition-colors ${selectedBlockInstanceId === item.instanceId ? 'bg-muted/30 border-primary/40' : 'bg-background hover:bg-muted/20'
                    } ${isDragging ? 'opacity-60' : ''}`}
            >
                <div className="flex items-start gap-2 px-3 py-2">
                    <button
                        type="button"
                        className="mt-0.5 h-7 w-7 inline-flex items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
                        onClick={(e) => e.stopPropagation()}
                        {...attributes}
                        {...listeners}
                        aria-label="Reordenar bloco"
                    >
                        <GripVertical className="size-4" />
                    </button>

                    <button
                        type="button"
                        className="flex-1 min-w-0 text-left"
                        onClick={() => setSelectedBlockInstanceId((cur) => (cur === item.instanceId ? null : item.instanceId))}
                    >
                        <div className="text-sm font-medium truncate">{idx + 1}. {item.block.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{item.block.fields?.length ?? 0} campos</div>
                    </button>

                    <button
                        type="button"
                        className="h-7 w-7 inline-flex items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
                        onClick={(e) => { e.stopPropagation(); removeBlock(item.instanceId) }}
                        aria-label="Remover bloco"
                    >
                        <X className="size-4" />
                    </button>
                </div>
            </div>
        )
    }

    const removeBlock = (instanceId: string) => {
        setPageBlocks((prev) => prev.filter((b) => b.instanceId !== instanceId))
        setSelectedBlockInstanceId((cur) => (cur === instanceId ? null : cur))
    }

    const setFieldValue = (instanceId: string, field: ThemeBlockField, value: any) => {
        const key = fieldKey(field)
        setPageBlocks((prev) =>
            prev.map((b) => {
                if (b.instanceId !== instanceId) return b
                const deviceFields = b.data.devices?.[device]?.fields ?? {}
                return {
                    ...b,
                    data: {
                        ...b.data,
                        devices: {
                            ...b.data.devices,
                            [device]: { fields: { ...deviceFields, [key]: value } },
                        },
                    },
                }
            })
        )
    }

    const setSelectedFieldValue = (field: ThemeBlockField, value: any) => {
        if (!selectedInstance) return
        setFieldValue(selectedInstance.instanceId, field, value)
    }

    const isFilled = (type: ThemeBlockFieldType, value: any) => {
        if (type === 'boolean') return typeof value === 'boolean'
        if (type === 'number') {
            if (value === null || value === undefined) return false
            if (typeof value === 'number') return Number.isFinite(value)
            const s = String(value).trim().replace(',', '.')
            if (!s) return false
            return Number.isFinite(Number(s))
        }

        if (type === 'multiselect' || type === 'text_list') return Array.isArray(value) && value.length > 0
        if (type === 'number_list') return Array.isArray(value) && value.length > 0 && value.every((n) => Number.isFinite(Number(n)))
        if (type === 'image_list' || type === 'video_list') return Array.isArray(value) && value.length > 0
        if (type === 'link') {
            if (!value || typeof value !== 'object') return false
            const label = String((value as any).label ?? '').trim()
            const path = String((value as any).path ?? '').trim()
            return label.length > 0 && path.length > 0
        }
        if (type === 'link_list') return Array.isArray(value) && value.length > 0
        if (type === 'image_link') {
            if (!value || typeof value !== 'object') return false
            const mediaUrl = String((value as any).mediaUrl ?? (value as any).imageUrl ?? '').trim()
            const label = String((value as any).label ?? '').trim()
            const path = String((value as any).path ?? '').trim()
            return mediaUrl.length > 0 && path.length > 0 && label.length > 0
        }
        if (type === 'image_link_list') {
            if (!Array.isArray(value) || value.length === 0) return false
            return value.every((it) => {
                if (!it || typeof it !== 'object') return false
                const mediaUrl = String((it as any).mediaUrl ?? '').trim()
                const path = String((it as any).path ?? '').trim()
                return mediaUrl.length > 0 && path.length > 0
            })
        }

        const s = String(value ?? '').trim()
        return s.length > 0
    }

    const validateBeforeSave = () => {
        const firstInvalid = (() => {
            const deviceOrder: Device[] = ['mobile', 'tablet', 'desktop']
            for (const b of pageBlocks) {
                for (const d of deviceOrder) {
                    const missing: string[] = []
                    const fieldsObj = b.data.devices?.[d]?.fields ?? {}
                    for (const f of b.block.fields ?? []) {
                        if (!f.isRequired) continue
                        const key = fieldKey(f)
                        const v = (fieldsObj as any)?.[key]
                        if (!isFilled(f.type, v)) missing.push(f.name)
                    }
                    if (missing.length > 0) return { instanceId: b.instanceId, blockName: b.block.name, device: d, missing }
                }
            }
            return null
        })()

        if (!firstInvalid) return true
        setSelectedBlockInstanceId(firstInvalid.instanceId)
        setDevice(firstInvalid.device)
        toast.error('Preencha os campos obrigatórios', {
            description: `${firstInvalid.blockName} (${firstInvalid.device}): ${firstInvalid.missing.slice(0, 4).join(', ')}${firstInvalid.missing.length > 4 ? '…' : ''}`,
        })
        return false
    }

  

    const { isPending: isSaving, mutateAsync: saveContent } = useMutation({
        mutationFn: async () => {
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
                    setDidHydrate(false)
                }
            }}
        >
            <SheetTrigger asChild>{trigger}</SheetTrigger>
            <SheetContent className="w-full sm:max-w-full p-0 overflow-x-hidden [&>button.absolute]:hidden" >
                <div className="flex h-full flex-col">
                    <div className="h-11 border-b px-3 flex items-center justify-between bg-background">
                        <div className="flex-1 min-w-0 flex items-center gap-2 rounded-md bg-muted/20 px-2 py-1.5 max-w-[600px]">
                            <Globe className="size-4 text-muted-foreground" />
                            <Input className="h-7 border-0 bg-transparent shadow-none p-0 focus-visible:ring-0 text-sm" value={displayUrl} readOnly />
                        </div>

                        <div className="ml-4 flex items-center gap-2 shrink-0">
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
                                disabled={!pageId || isSaving || isLoadingPageDetail}
                                onClick={() => { if (validateBeforeSave()) saveContent() }}
                            >
                                {isSaving ? <Loader className="size-4 animate-spin" /> : 'Salvar'}
                            </Button>

                            <SheetClose asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <X className="size-4" />
                                </Button>
                            </SheetClose>
                        </div>
                    </div>

                    <div className="flex-1 min-h-0 flex min-w-0">
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
                                        {(isLoadingPageDetail || blocksLoading) ? (
                                            <>
                                                {Array.from({ length: 6 }).map((_, i) => (
                                                    <div key={i} className="rounded-md border px-3 py-2">
                                                        <Skeleton className="h-4 w-3/4" />
                                                        <Skeleton className="mt-2 h-3 w-1/3" />
                                                    </div>
                                                ))}
                                            </>
                                        ) : !hasBlocks ? (
                                            <div className="rounded-md border bg-muted/20 px-3 py-2">
                                                <div className="text-sm font-medium">Nenhum bloco</div>
                                            </div>
                                        ) : (
                                            <DndContext
                                                sensors={sensors}
                                                collisionDetection={closestCenter}
                                                modifiers={[restrictToVerticalAxis]}
                                                onDragStart={onDragStart}
                                                onDragEnd={onDragEnd}
                                            >
                                                <SortableContext items={pageBlocks.map((b) => b.instanceId)} strategy={verticalListSortingStrategy}>
                                                    {pageBlocks.map((b, idx) => (
                                                        <SortableBlockRow key={b.instanceId} item={b} idx={idx} />
                                                    ))}
                                                </SortableContext>
                                                <DragOverlay>
                                                    {activeDragItem ? (
                                                        <div className="w-[270px] rounded-md border bg-background shadow-lg">
                                                            <div className="flex items-start gap-2 px-3 py-2">
                                                                <GripVertical className="mt-0.5 size-4 text-muted-foreground" />
                                                                <div className="min-w-0">
                                                                    <div className="text-sm font-medium truncate">{activeDragItem.block.name}</div>
                                                                    <div className="text-xs text-muted-foreground truncate">{activeDragItem.block.fields?.length ?? 0} campos</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : null}
                                                </DragOverlay>
                                            </DndContext>
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

                        <main className="flex-1 min-h-0 flex flex-col bg-muted/20 min-w-0">
                            <div className="flex-1 min-h-0 flex min-w-0">
                                <div className="flex-1 min-h-0 overflow-auto p-3 min-w-0">
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
                                                <pre className="p-3 text-xs leading-relaxed font-mono whitespace-pre-wrap break-all max-w-full text-foreground">
{pageBlocksJson}
                                                </pre>
                                            </ScrollArea>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    className={`bg-background flex-none min-w-0 overflow-hidden transition-all duration-200 ease-out ${inspectorOpen ? 'w-[360px] max-w-[360px] border-l' : 'w-0 max-w-0 border-l-0'
                                        }`}
                                >
                                    <div
                                        className={`h-full w-[360px] max-w-[360px] min-w-0 overflow-hidden transition-transform duration-200 ease-out ${inspectorOpen ? 'translate-x-0' : 'translate-x-full'    
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
                                                            const v = selectedInstance?.data?.devices?.[device]?.fields?.[fieldKey(f)]
                                                            if (f.type === 'boolean') {
                                                                return (
                                                                    <div key={f.id} className="rounded-md border px-3 py-2">
                                                                        <div className="flex items-center justify-between gap-3">
                                                                            <div className="min-w-0">
                                                                                <Label className="text-sm">
                                                                                    {f.name}{f.isRequired ? <span className="text-destructive"> *</span> : null}
                                                                                </Label>
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
                                                                        <Label className="text-sm">
                                                                            {f.name}{f.isRequired ? <span className="text-destructive"> *</span> : null}
                                                                        </Label>
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
                                                                        <Label className="text-sm">
                                                                            {f.name}{f.isRequired ? <span className="text-destructive"> *</span> : null}
                                                                        </Label>
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
                                                                        <Label className="text-sm">
                                                                            {f.name}{f.isRequired ? <span className="text-destructive"> *</span> : null}
                                                                        </Label>
                                                                        <Input
                                                                            type="datetime-local"
                                                                            className="mt-2 h-9"
                                                                            value={v ?? ''}
                                                                            onChange={(e) => setSelectedFieldValue(f, e.target.value)}
                                                                        />
                                                                    </div>
                                                                )
                                                            }

                                                            if (f.type === 'select') {
                                                                const options = f.options ?? []
                                                                return (
                                                                    <div key={f.id} className="rounded-md border px-3 py-2">
                                                                        <Label className="text-sm">
                                                                            {f.name}{f.isRequired ? <span className="text-destructive"> *</span> : null}
                                                                        </Label>
                                                                        {f.description ? <div className="text-xs text-muted-foreground truncate">{f.description}</div> : null}
                                                                        <Select value={typeof v === 'string' ? v : ''} onValueChange={(nv) => setSelectedFieldValue(f, nv)}>
                                                                            <SelectTrigger className="mt-2 h-9 w-full">
                                                                                <SelectValue placeholder="Selecione..." />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {options.map((o) => (
                                                                                    <SelectItem key={o.id} value={o.value}>
                                                                                        {o.name}
                                                                                    </SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                )
                                                            }

                                                            if (f.type === 'multiselect') {
                                                                const options = f.options ?? []
                                                                const selectedValues = Array.isArray(v) ? v.map((x) => String(x)) : []
                                                                const selectedSet = new Set(selectedValues)
                                                                const selectedLabel = selectedValues.length > 0
                                                                    ? `${selectedValues.length} selecionado${selectedValues.length > 1 ? 's' : ''}`
                                                                    : 'Selecionar...'

                                                                return (
                                                                    <div key={f.id} className="rounded-md border px-3 py-2">
                                                                        <Label className="text-sm">
                                                                            {f.name}{f.isRequired ? <span className="text-destructive"> *</span> : null}
                                                                        </Label>
                                                                        {f.description ? <div className="text-xs text-muted-foreground truncate">{f.description}</div> : null}
                                                                        <DropdownMenu>
                                                                            <DropdownMenuTrigger asChild>
                                                                                <Button type="button" variant="outline" size="sm" className="mt-2 h-9 w-full justify-between">
                                                                                    <span className="truncate">{selectedLabel}</span>
                                                                                    <span className="text-xs text-muted-foreground">{selectedValues.length}</span>
                                                                                </Button>
                                                                            </DropdownMenuTrigger>
                                                                            <DropdownMenuContent className="w-[320px]" align="end">
                                                                                <DropdownMenuLabel>Opções</DropdownMenuLabel>
                                                                                <DropdownMenuSeparator />
                                                                                <ScrollArea className="max-h-[360px]">
                                                                                    <div className="p-1">
                                                                                        {options.map((o) => (
                                                                                            <DropdownMenuCheckboxItem
                                                                                                key={o.id}
                                                                                                checked={selectedSet.has(o.value)}
                                                                                                onCheckedChange={(checked) => {
                                                                                                    const next = checked
                                                                                                        ? Array.from(new Set([...selectedValues, o.value]))
                                                                                                        : selectedValues.filter((x) => x !== o.value)
                                                                                                    setSelectedFieldValue(f, next)
                                                                                                }}
                                                                                            >
                                                                                                {o.name}
                                                                                            </DropdownMenuCheckboxItem>
                                                                                        ))}
                                                                                    </div>
                                                                                </ScrollArea>
                                                                            </DropdownMenuContent>
                                                                        </DropdownMenu>
                                                                    </div>
                                                                )
                                                            }

                                                            if (f.type === 'image_link_list') {
                                                                const listRaw = Array.isArray(v) ? v : []
                                                                const list = listRaw.map((it: any) => ({
                                                                    mediaUrl: String(it?.mediaUrl ?? ''),
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
                                                                                <Label className="text-sm">
                                                                                    {f.name}{f.isRequired ? <span className="text-destructive"> *</span> : null}
                                                                                </Label>
                                                                                {f.description ? <div className="text-xs text-muted-foreground truncate">{f.description}</div> : null}
                                                                            </div>
                                                                            <Button
                                                                                type="button"
                                                                                size="sm"
                                                                                variant="outline"
                                                                                className="h-8 px-2"
                                                                                onClick={() => setSelectedFieldValue(f, [...list, { mediaUrl: '', label: '', path: '' }])}
                                                                            >
                                                                                <Plus className="size-4" />
                                                                            </Button>
                                                                        </div>

                                                                        <div className="mt-3 flex flex-col gap-2">
                                                                            {list.length === 0 ? (
                                                                                <div className="text-xs text-muted-foreground">Nenhum item</div>
                                                                            ) : (
                                                                                list.map((row: any, idx: number) => {
                                                                                    const mediaUrl = String(row.mediaUrl ?? '')
                                                                                    const canPreview = mediaUrl.length > 0

                                                                                    return (
                                                                                        <div key={idx} className="rounded-md border bg-background p-2 min-w-0 max-w-full overflow-hidden">
                                                                                            <div className="flex items-center justify-between gap-2">
                                                                                                <div className="flex items-center gap-2 min-w-0">
                                                                                                    <div className="h-10 w-10 rounded border bg-muted overflow-hidden flex items-center justify-center shrink-0">
                                                                                                        {canPreview ? (
                                                                                                            <img src={mediaUrl} alt="banner" className="h-full w-full object-cover" />
                                                                                                        ) : (
                                                                                                            <span className="text-xs text-muted-foreground">—</span>
                                                                                                        )}
                                                                                                    </div>
                                                                                                    <div className="min-w-0">
                                                                                                        <div className="w-full text-xs font-medium truncate">{canPreview ? 'Banner selecionado' : 'Selecione um banner'}</div>
                                                                                                        <div className="w-full text-[11px] max-w-[150px] text-muted-foreground truncate">{canPreview ? mediaUrl : ''}</div>
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

                                                                                            <div className="mt-2 flex items-center gap-2 min-w-0">
                                                                                                <MediaSelectorDialog
                                                                                                    multiple={false}
                                                                                                    toFilter="banner"
                                                                                                    onSelect={(medias) => {
                                                                                                        const m = medias[0]
                                                                                                        if (!m) return
                                                                                                        if (typeof m.mime !== 'string' || !m.mime.startsWith('image/')) return
                                                                                                        if (!m.url) return
                                                                                                        const next = [...list]
                                                                                                        next[idx] = { ...next[idx], mediaUrl: m.url }
                                                                                                        setSelectedFieldValue(f, next)
                                                                                                    }}
                                                                                                    trigger={<Button type="button" size="sm" variant="outline" className="shrink-0">Selecionar</Button>}
                                                                                                />
                                                                                                <Input
                                                                                                    className="h-9 flex-1 min-w-0"
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
                                                                    <Label className="text-sm">
                                                                        {f.name}{f.isRequired ? <span className="text-destructive"> *</span> : null}
                                                                    </Label>
                                                                    <Input
                                                                        className="mt-2 h-9"
                                                                        value={v ?? ''}
                                                                        onChange={(e) => setSelectedFieldValue(f, e.target.value)}
                                                                        placeholder={f.type}
                                                                    />
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

