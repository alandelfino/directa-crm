import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { privateInstance } from '@/lib/auth'
import { toast } from 'sonner'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { GripVertical, Loader, Plus, Save, Trash2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type PageRef = {
  id: number
  title?: string
  path?: string
}

type PageBlock = {
  id: number
  name: string
  description: string | null
  order: number
  createdAt: string
  updatedAt: string
}

type PageBlockXPage = {
  id: number
  pageId: number
  pageBlockId: number
  order: number
  selectedFieldIds: number[]
  selectedFields?: Array<{ pageBlockFieldId: number; value: string }>
  pageBlock?: PageBlock
}

type PageBlockFieldType = 'short_text' | 'long_text' | 'image' | 'image_list' | 'video' | 'video_list' | 'number' | 'unit' | 'boolean'

type PageBlockField = {
  id: number
  name: string
  type: PageBlockFieldType
  pageBlockId: number
  order: number
  createdAt: string
  updatedAt: string
}

function safeArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : []
}

export function PageContentSheet({
  page,
  trigger,
}: {
  page: PageRef | null
  trigger?: React.ReactNode
}) {
  const pageId = page?.id ?? 0
  const [open, setOpen] = useState(false)
  const [selectedBlockXPageId, setSelectedBlockXPageId] = useState<number | null>(null)
  const [draftBlocks, setDraftBlocks] = useState<PageBlockXPage[]>([])
  const [draftFieldValues, setDraftFieldValues] = useState<Record<number, Record<number, string>>>({})
  const [initialBlockOrderById, setInitialBlockOrderById] = useState<Record<number, number>>({})

  const { data: blocksOnPageData, isLoading: isLoadingBlocksOnPage, refetch: refetchBlocksOnPage } = useQuery({
    queryKey: ['page-blocks-on-page', pageId],
    enabled: open && pageId > 0,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 0,
    queryFn: async () => {
      const res = await privateInstance.get(`/tenant/pages/${pageId}/blocks`)
      const items = safeArray<PageBlockXPage>(res.data?.items ?? res.data)
      return { pageId, items } as { pageId: number; items: PageBlockXPage[] }
    },
  })

  const { data: allPageBlocksData, isLoading: isLoadingAllPageBlocks, refetch: refetchAllPageBlocks } = useQuery({
    queryKey: ['page-blocks-all'],
    enabled: open,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 0,
    queryFn: async () => {
      const res = await privateInstance.get('/tenant/page-blocks', {
        params: { page: 1, limit: 100, sortBy: 'order', orderBy: 'asc' },
      })
      return safeArray<PageBlock>(res.data?.items ?? res.data)
    },
  })

  const blocksOnPage = useMemo(() => {
    const items = blocksOnPageData?.items ?? []
    return [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }, [blocksOnPageData])

  useEffect(() => {
    if (!open) return
    setDraftBlocks(blocksOnPage)
    setInitialBlockOrderById(
      blocksOnPage.reduce<Record<number, number>>((acc, b) => {
        acc[b.id] = Number(b.order ?? 0)
        return acc
      }, {})
    )
    const nextValues: Record<number, Record<number, string>> = {}

    for (const b of blocksOnPage) {
      const pbId = b.pageBlockId
      const selectedFields = safeArray<{ pageBlockFieldId: number; value: string }>(b.selectedFields)
      nextValues[pbId] = selectedFields.reduce<Record<number, string>>((acc, it) => {
        acc[it.pageBlockFieldId] = String(it.value ?? '')
        return acc
      }, {})
    }

    setDraftFieldValues(nextValues)
    setSelectedBlockXPageId((cur) => {
      if (cur && blocksOnPage.some((b) => b.id === cur)) return cur
      return blocksOnPage[0]?.id ?? null
    })
  }, [open, blocksOnPage])

  const existingPageBlockIds = useMemo(() => new Set(draftBlocks.map((b) => b.pageBlockId)), [draftBlocks])

  const availableBlocks = useMemo(() => {
    const all = allPageBlocksData ?? []
    return all.filter((b) => !existingPageBlockIds.has(b.id))
  }, [allPageBlocksData, existingPageBlockIds])

  const selectedBlock = useMemo(() => {
    if (selectedBlockXPageId == null) return null
    return draftBlocks.find((b) => b.id === selectedBlockXPageId) ?? null
  }, [draftBlocks, selectedBlockXPageId])

  const selectedPageBlockId = selectedBlock?.pageBlockId ?? 0

  const { data: fieldsData, isLoading: isLoadingFields } = useQuery({
    queryKey: ['page-block-fields', selectedPageBlockId],
    enabled: open && selectedPageBlockId > 0,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 0,
    queryFn: async () => {
      const res = await privateInstance.get(`/tenant/page-blocks/${selectedPageBlockId}/fields`, {
        params: { page: 1, limit: 100, sortBy: 'order', orderBy: 'asc' },
      })
      return safeArray<PageBlockField>(res.data?.items ?? res.data)
    },
  })

  const fields = useMemo(() => {
    const list = fieldsData ?? []
    return [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }, [fieldsData])

  useEffect(() => {
    if (!selectedPageBlockId) return
    if (fields.length === 0) return
    setDraftFieldValues((prev) => {
      const current = { ...(prev[selectedPageBlockId] ?? {}) }
      let changed = false
      for (const f of fields) {
        if (current[f.id] == null) {
          current[f.id] = f.type === 'boolean' ? 'false' : ''
          changed = true
        }
      }
      if (!changed) return prev
      return { ...prev, [selectedPageBlockId]: current }
    })
  }, [fields, selectedPageBlockId])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return
    const from = draftBlocks.findIndex((b) => b.id === Number(active.id))
    const to = draftBlocks.findIndex((b) => b.id === Number(over.id))
    if (from < 0 || to < 0 || from === to) return
    setDraftBlocks((prev) => {
      const moved = arrayMove(prev, from, to)
      return moved.map((b, idx) => ({ ...b, order: idx }))
    })
  }

  const { isPending: isAddingBlock, mutateAsync: addBlockToPage } = useMutation({
    mutationFn: async (pageBlockIdToAdd: number) => {
      if (!pageId) throw new Error('Página inválida')
      const res = await privateInstance.post(`/tenant/pages/${pageId}/blocks`, {
        pageBlockId: pageBlockIdToAdd,
      })
      if (res.status !== 200 && res.status !== 201) throw new Error('Erro ao adicionar bloco')
      return res.data
    },
    onSuccess: async () => {
      await Promise.all([refetchBlocksOnPage(), refetchAllPageBlocks()])
      toast.success('Bloco adicionado')
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao adicionar bloco', {
        description: errorData?.detail || 'Não foi possível adicionar o bloco.',
      })
    },
  })

  const { isPending: isRemovingBlock, mutateAsync: removeBlockFromPage } = useMutation({
    mutationFn: async (pageBlockXPageId: number) => {
      if (!pageId) throw new Error('Página inválida')
      const res = await privateInstance.delete(`/tenant/pages/${pageId}/blocks/${pageBlockXPageId}`)
      if (res.status !== 204) throw new Error('Erro ao remover bloco')
      return true
    },
    onSuccess: async () => {
      await Promise.all([refetchBlocksOnPage(), refetchAllPageBlocks()])
      toast.success('Bloco removido')
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao remover bloco', {
        description: errorData?.detail || 'Não foi possível remover o bloco.',
      })
    },
  })

  const { isPending: isSaving, mutateAsync: save } = useMutation({
    mutationFn: async () => {
      if (!pageId) throw new Error('Página inválida')

      const reorderUpdates = draftBlocks
        .map((b, idx) => ({ id: b.id, nextOrder: idx, prevOrder: initialBlockOrderById[b.id] }))
        .filter((x) => x.prevOrder !== x.nextOrder)
        .map((x) =>
          privateInstance.put(`/tenant/pages/${pageId}/blocks/${x.id}/reorder`, {
            order: x.nextOrder,
          })
        )
      await Promise.all(reorderUpdates)

      const uniquePageBlockIds = Array.from(new Set(draftBlocks.map((b) => b.pageBlockId)))
      const fieldUpdates = uniquePageBlockIds.map((pbId) =>
        privateInstance.put(`/tenant/pages/${pageId}/blocks/${pbId}/fields`, (() => {
          const values = draftFieldValues[pbId] ?? {}
          const fieldIds = Object.keys(values).map((k) => Number(k)).filter((n) => Number.isFinite(n)).sort((a, b) => a - b)
          const fields = fieldIds.map((id) => ({ pageBlockFieldId: id, value: String(values[id] ?? '') }))
          return { fieldIds, fields }
        })())
      )
      await Promise.all(fieldUpdates)
      return true
    },
    onSuccess: async () => {
      await refetchBlocksOnPage()
      toast.success('Conteúdo atualizado')
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao salvar', {
        description: errorData?.detail || 'Não foi possível salvar as alterações.',
      })
    },
  })

  const setFieldValue = (pageBlockId: number, fieldId: number, value: string) => {
    setDraftFieldValues((prev) => ({
      ...prev,
      [pageBlockId]: {
        ...(prev[pageBlockId] ?? {}),
        [fieldId]: value,
      },
    }))
  }

  const renderFieldInput = (field: PageBlockField, value: string) => {
    switch (field.type) {
      case 'long_text':
        return (
          <Textarea
            rows={4}
            value={value}
            onChange={(e) => setFieldValue(selectedPageBlockId, field.id, e.target.value)}
            placeholder="Digite aqui..."
          />
        )
      case 'image_list':
        return (
          <Textarea
            rows={4}
            value={value}
            onChange={(e) => setFieldValue(selectedPageBlockId, field.id, e.target.value)}
            placeholder="1 URL por linha"
          />
        )
      case 'video_list':
        return (
          <Textarea
            rows={4}
            value={value}
            onChange={(e) => setFieldValue(selectedPageBlockId, field.id, e.target.value)}
            placeholder="1 URL por linha"
          />
        )
      case 'image':
        return (
          <Input
            type="url"
            value={value}
            onChange={(e) => setFieldValue(selectedPageBlockId, field.id, e.target.value)}
            placeholder="URL da imagem"
          />
        )
      case 'video':
        return (
          <Input
            type="url"
            value={value}
            onChange={(e) => setFieldValue(selectedPageBlockId, field.id, e.target.value)}
            placeholder="URL do vídeo"
          />
        )
      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => setFieldValue(selectedPageBlockId, field.id, e.target.value)}
            placeholder="0"
          />
        )
      case 'boolean':
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              checked={value === 'true' || value === '1'}
              onCheckedChange={(v) => setFieldValue(selectedPageBlockId, field.id, v === true ? 'true' : 'false')}
            />
            <div className="text-sm text-muted-foreground select-none">
              {value === 'true' || value === '1' ? 'Ativo' : 'Inativo'}
            </div>
          </div>
        )
      case 'unit':
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => setFieldValue(selectedPageBlockId, field.id, e.target.value)}
            placeholder="Ex: kg"
          />
        )
      case 'short_text':
      default:
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => setFieldValue(selectedPageBlockId, field.id, e.target.value)}
            placeholder="Digite aqui..."
          />
        )
    }
  }

  const previewJson = useMemo(() => {
    const payload = draftBlocks.map((b, idx) => ({
      id: b.id,
      pageId: b.pageId,
      pageBlockId: b.pageBlockId,
      order: idx,
      fields: Object.keys(draftFieldValues[b.pageBlockId] ?? {})
        .map((k) => Number(k))
        .filter((n) => Number.isFinite(n))
        .sort((a, b) => a - b)
        .map((fieldId) => ({
          pageBlockFieldId: fieldId,
          value: String((draftFieldValues[b.pageBlockId] ?? {})[fieldId] ?? ''),
        })),
    }))
    return JSON.stringify(payload, null, 2)
  }, [draftBlocks, draftFieldValues])

  const SortableBlockRow = ({ item, idx }: { item: PageBlockXPage; idx: number }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
    const style: CSSProperties = { transform: CSS.Transform.toString(transform), transition }

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'w-full max-w-full rounded-md border transition-colors',
          selectedBlockXPageId === item.id ? 'bg-muted/30 border-primary/40' : 'bg-background hover:bg-muted/20',
          isDragging ? 'opacity-60' : ''
        )}
      >
        <div className="flex items-start gap-2 px-3 py-2">
          <button
            type="button"
            className="h-7 w-7 inline-flex items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
            aria-label="Reordenar"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>

          <button
            type="button"
            className="flex-1 min-w-0 text-left"
            onClick={() => setSelectedBlockXPageId((cur) => (cur === item.id ? null : item.id))}
          >
            <div className="text-sm font-medium truncate">
              {idx + 1}. {item.pageBlock?.name ?? `#${item.pageBlockId}`}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {Object.keys(draftFieldValues[item.pageBlockId] ?? {}).length} campos
            </div>
          </button>

          <button
            type="button"
            className="h-7 w-7 inline-flex items-center justify-center rounded-sm text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:hover:text-muted-foreground"
            disabled={isRemovingBlock}
            onClick={(e) => {
              e.stopPropagation()
              removeBlockFromPage(item.id)
            }}
            aria-label="Remover bloco"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) {
          setSelectedBlockXPageId(null)
          setDraftBlocks([])
          setDraftFieldValues({})
          setInitialBlockOrderById({})
        }
      }}
    >
      <SheetTrigger asChild>
        {trigger ? trigger : (
          <Button variant="outline" size="sm" disabled={!pageId}>
            Conteúdo
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="min-w-full w-full p-0">
        <div className="h-full flex flex-col">
          <SheetHeader className="p-4 border-b">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <SheetTitle className="truncate">Conteúdo • {page?.title ?? `#${pageId}`}</SheetTitle>
                {page?.path ? <div className="text-xs text-muted-foreground truncate">{page.path}</div> : null}
              </div>
              <Button type="button" size="sm" className="h-8 gap-2" disabled={!pageId || isSaving || isLoadingBlocksOnPage} onClick={() => save()}>
                {isSaving ? <Loader className="size-4 animate-spin" /> : <Save className="size-4" />}
                Salvar
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 min-h-0 flex min-w-0">
            <aside className="w-[320px] border-r bg-background">
              <div className="h-full flex flex-col">
                <div className="px-3 py-2 border-b">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Blocos</div>
                    {(isLoadingBlocksOnPage || isLoadingAllPageBlocks) ? <Loader className="size-3.5 animate-spin text-muted-foreground" /> : null}
                  </div>
                </div>

                <ScrollArea className="flex-1 min-h-0">
                  <div className="p-3 flex flex-col gap-2">
                    {isLoadingBlocksOnPage ? (
                      <>
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="rounded-md border px-3 py-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="mt-2 h-3 w-1/3" />
                          </div>
                        ))}
                      </>
                    ) : draftBlocks.length === 0 ? (
                      <div className="rounded-md border bg-muted/20 px-3 py-2">
                        <div className="text-sm font-medium">Nenhum bloco</div>
                      </div>
                    ) : (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        modifiers={[restrictToVerticalAxis]}
                        onDragEnd={onDragEnd}
                      >
                        <SortableContext items={draftBlocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                          {draftBlocks.map((b, idx) => (
                            <SortableBlockRow key={b.id} item={b} idx={idx} />
                          ))}
                        </SortableContext>
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
                        disabled={!open || !pageId || isLoadingAllPageBlocks || isAddingBlock || availableBlocks.length === 0}
                      >
                        <Plus className="size-4" /> Adicionar bloco
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[300px]" align="start">
                      <DropdownMenuLabel>Blocos disponíveis</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <ScrollArea className="max-h-[360px]">
                        <div className="p-1">
                          {availableBlocks.map((b) => (
                            <DropdownMenuItem
                              key={b.id}
                              onSelect={() => addBlockToPage(b.id)}
                              className="flex flex-col items-start gap-0.5"
                            >
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
              <div className="flex-1 min-h-0 overflow-auto p-3 min-w-0">
                <div className="mx-auto w-full max-w-[960px]">
                  <div className="rounded-xl border bg-background shadow-sm overflow-hidden">
                    <div className="h-10 border-b bg-muted/30 flex items-center px-3 gap-2">
                      <div className="flex items-center gap-1">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                        <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                        <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                      </div>
                      <div className="text-xs text-muted-foreground truncate">JSON</div>
                    </div>
                    <ScrollArea className="h-[72vh] bg-muted/10">
                      <pre className="p-3 text-xs leading-relaxed font-mono whitespace-pre-wrap break-all max-w-full text-foreground">
{previewJson}
                      </pre>
                    </ScrollArea>
                  </div>
                </div>
              </div>
            </main>

            <aside className="w-[380px] border-l bg-background min-w-0">
              <div className="h-full flex flex-col">
                <div className="px-3 py-2 border-b">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Campos</div>
                </div>

                <ScrollArea className="flex-1 min-h-0">
                  <div className="p-3">
                    {!selectedBlock ? (
                      <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm">Selecione um bloco</div>
                    ) : (
                      <>
                        <div className="rounded-md border bg-muted/10 px-3 py-2">
                          <div className="text-sm font-semibold">{selectedBlock.pageBlock?.name ?? `#${selectedBlock.pageBlockId}`}</div>
                          {selectedBlock.pageBlock?.description ? (
                            <div className="text-xs text-muted-foreground">{selectedBlock.pageBlock.description}</div>
                          ) : null}
                        </div>

                        <Separator className="my-3" />

                        {isLoadingFields ? (
                          <div className="flex flex-col gap-2">
                            {Array.from({ length: 6 }).map((_, i) => (
                              <div key={i} className="rounded-md border px-3 py-2">
                                <Skeleton className="h-4 w-3/4" />
                              </div>
                            ))}
                          </div>
                        ) : fields.length === 0 ? (
                          <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm">Nenhum campo</div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {fields.map((f) => {
                              const value = String((draftFieldValues[selectedPageBlockId] ?? {})[f.id] ?? '')
                              return (
                                <div key={f.id} className="rounded-md border px-3 py-2">
                                  <div className="min-w-0">
                                    <Label className="text-sm">{f.name}</Label>
                                    <div className="text-xs text-muted-foreground">{f.type}</div>
                                  </div>

                                  <div className="mt-2">
                                    {renderFieldInput(f, value)}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </ScrollArea>

                <div className="p-3 border-t">
                  <div className="text-xs text-muted-foreground">
                    Preencha os valores dos campos desse bloco.
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
