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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { MediaSelectorDialog } from '@/routes/dashboard/media/-components/media-selector-dialog'
import type { MediaItem } from '@/routes/dashboard/media'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { ChevronLeft, GripVertical, Loader, Plus, Save, Trash2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { parseUnitValue, ThemeFieldBooleanToggle, ThemeFieldLongText, ThemeFieldNumberInput, ThemeFieldTextInput, ThemeFieldUnitInput, type UnitOption } from '@/components/theme-field-inputs'

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
  fields?: Array<{ id: number; name: string; type: string; order: number; value: string }>
  pageBlock?: PageBlock
}

type PageBlockFieldType =
  | 'text'
  | 'short_text'
  | 'long_text'
  | 'image'
  | 'image_list'
  | 'video'
  | 'video_list'
  | 'number'
  | 'unit'
  | 'boolean'
  | 'banner'
  | 'banner_list'

type PageBlockField = {
  id: number
  name: string
  type: PageBlockFieldType
  pageBlockId: number
  order: number
  createdAt: string
  updatedAt: string
}

type RenderField = { id: number; name: string; type: PageBlockFieldType; rawType: string; order: number; initialValue: string }

function safeArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : []
}

type BannerValue = { image_url: string; link_url: string | null }

function safeJsonParse(v: unknown): unknown {
  if (typeof v !== 'string') return v
  const raw = v.trim()
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function coerceBannerValue(v: unknown): BannerValue {
  const parsed = safeJsonParse(v)
  const obj = (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? (parsed as any) : null
  const image_url = typeof obj?.image_url === 'string' ? obj.image_url : ''
  const link_url = obj?.link_url == null ? null : (typeof obj.link_url === 'string' ? obj.link_url : null)
  return { image_url, link_url }
}

function coerceBannerListValue(v: unknown): BannerValue[] {
  const parsed = safeJsonParse(v)
  const arr = Array.isArray(parsed) ? parsed : []
  return arr.map((it) => coerceBannerValue(it))
}

function parseFieldValueByType(raw: unknown, rawType: string): unknown {
  if (rawType === 'banner') return coerceBannerValue(raw)
  if (rawType === 'banner_list') return coerceBannerListValue(raw)
  return typeof raw === 'string' ? raw : String(raw ?? '')
}

type DraftBlockKey = `e:${number}` | `n:${string}`

type DraftBlock =
  | {
      kind: 'existing'
      key: DraftBlockKey
      blockXPageId: number
      pageBlockId: number
      order: number
      fields?: Array<{ id: number; name: string; type: string; order: number; value: string }>
      pageBlock?: PageBlock
    }
  | {
      kind: 'new'
      key: DraftBlockKey
      tempId: string
      pageBlockId: number
      order: number
      fields?: Array<{ id: number; name: string; type: string; order: number; value: string }>
      pageBlock?: PageBlock
    }

function normalizePageBlockFieldType(type: string): PageBlockFieldType {
  if (
    type === 'text' ||
    type === 'short_text' ||
    type === 'long_text' ||
    type === 'image' ||
    type === 'image_list' ||
    type === 'video' ||
    type === 'video_list' ||
    type === 'number' ||
    type === 'unit' ||
    type === 'boolean' ||
    type === 'banner' ||
    type === 'banner_list'
  ) {
    return type
  }
  return 'text'
}

function makeExistingKey(id: number): DraftBlockKey {
  return `e:${id}`
}

function makeNewKey(tempId: string): DraftBlockKey {
  return `n:${tempId}`
}

function createTempId(): string {
  const anyCrypto = globalThis.crypto as { randomUUID?: () => string } | undefined
  if (anyCrypto?.randomUUID) return anyCrypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
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
  const [selectedBlockKey, setSelectedBlockKey] = useState<DraftBlockKey | null>(null)
  const [draftBlocks, setDraftBlocks] = useState<DraftBlock[]>([])
  const [draftFieldValues, setDraftFieldValues] = useState<Record<DraftBlockKey, Record<number, unknown>>>({})
  const [dirty, setDirty] = useState(false)
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false)

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

  const { data: allPageBlocksData, isLoading: isLoadingAllPageBlocks } = useQuery({
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
    if (dirty) return

    const mapped = blocksOnPage.map<DraftBlock>((b) => ({
      kind: 'existing',
      key: makeExistingKey(b.id),
      blockXPageId: b.id,
      pageBlockId: b.pageBlockId,
      order: Number(b.order ?? 0),
      fields: safeArray<{ id: number; name: string; type: string; order: number; value: string }>(b.fields),
      pageBlock: b.pageBlock,
    }))
    setDraftBlocks(mapped)
    const nextValues: Record<DraftBlockKey, Record<number, unknown>> = {}

    for (const b of blocksOnPage) {
      const key = makeExistingKey(b.id)
      const inlineFields = safeArray<{ id: number; type: string; value: string }>(b.fields)
      if (inlineFields.length > 0) {
        nextValues[key] = inlineFields.reduce<Record<number, unknown>>((acc, it) => {
          acc[it.id] = parseFieldValueByType(it.value, String(it.type ?? 'text'))
          return acc
        }, {})
        continue
      }

      const selectedFields = safeArray<{ pageBlockFieldId: number; value: string }>(b.selectedFields)
      nextValues[key] = selectedFields.reduce<Record<number, unknown>>((acc, it) => {
        acc[it.pageBlockFieldId] = String(it.value ?? '')
        return acc
      }, {})
    }

    setDraftFieldValues(nextValues)
    setSelectedBlockKey((cur) => {
      if (cur && mapped.some((b) => b.key === cur)) return cur
      return mapped[0]?.key ?? null
    })
  }, [open, blocksOnPage, dirty])

  const availableBlocks = useMemo(() => {
    return allPageBlocksData ?? []
  }, [allPageBlocksData])

  const selectedBlock = useMemo(() => {
    if (selectedBlockKey == null) return null
    return draftBlocks.find((b) => b.key === selectedBlockKey) ?? null
  }, [draftBlocks, selectedBlockKey])

  const selectedPageBlockId = selectedBlock?.pageBlockId ?? 0
  const selectedInlineFields = useMemo(() => safeArray<{ id: number; name: string; type: string; order: number; value: string }>(selectedBlock?.fields), [selectedBlock])
  const hasInlineFields = selectedInlineFields.length > 0

  const { data: fieldsData, isLoading: isLoadingFields } = useQuery({
    queryKey: ['page-block-fields', selectedPageBlockId],
    enabled: open && selectedPageBlockId > 0 && !hasInlineFields,
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

  const fields = useMemo<RenderField[]>(() => {
    if (hasInlineFields) {
      return [...selectedInlineFields]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((f) => ({
          id: Number(f.id),
          name: String(f.name ?? ''),
          type: normalizePageBlockFieldType(String(f.type ?? 'short_text')),
          rawType: String(f.type ?? 'short_text'),
          order: Number(f.order ?? 0),
          initialValue: String(f.value ?? ''),
        }))
    }

    const list = fieldsData ?? []
    return [...list]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((f) => ({
        id: Number(f.id),
        name: String(f.name ?? ''),
        type: f.type,
        rawType: f.type,
        order: Number(f.order ?? 0),
        initialValue: '',
      }))
  }, [fieldsData, hasInlineFields, selectedInlineFields])

  // Não inicializa defaults no draft para blocos novos.

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return
    const from = draftBlocks.findIndex((b) => b.key === String(active.id))
    const to = draftBlocks.findIndex((b) => b.key === String(over.id))
    if (from < 0 || to < 0 || from === to) return
    setDirty(true)
    setDraftBlocks((prev) => {
      const moved = arrayMove(prev, from, to)
      return moved.map((b, idx) => ({ ...b, order: idx }))
    })
  }

  const addDraftBlock = (pageBlock: PageBlock) => {
    const tempId = createTempId()
    const key = makeNewKey(tempId)
    setDirty(true)
    setDraftBlocks((prev) => {
      const next: DraftBlock[] = [
        ...prev,
        {
          kind: 'new',
          key,
          tempId,
          pageBlockId: pageBlock.id,
          order: prev.length,
          pageBlock,
        },
      ]
      return next.map((b, idx) => ({ ...b, order: idx }))
    })
    setDraftFieldValues((prev) => (prev[key] ? prev : { ...prev, [key]: {} }))
    setSelectedBlockKey(key)
  }

  const removeDraftBlock = (key: DraftBlockKey) => {
    setDirty(true)
    let nextSelected: DraftBlockKey | null = null
    setDraftBlocks((prev) => {
      const next = prev.filter((b) => b.key !== key).map((b, idx) => ({ ...b, order: idx }))
      if (selectedBlockKey === key) nextSelected = next[0]?.key ?? null
      return next
    })
    setDraftFieldValues((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setSelectedBlockKey((cur) => {
      if (cur !== key) return cur
      return nextSelected
    })
  }

  const { isPending: isSaving, mutateAsync: save } = useMutation({
    mutationFn: async () => {
      if (!pageId) throw new Error('Página inválida')

      const blocks = draftBlocks.map((b) => {
        const values = draftFieldValues[b.key] ?? {}
        const fieldIds = Object.keys(values)
          .map((k) => Number(k))
          .filter((n) => Number.isFinite(n))
          .sort((a, b) => a - b)
        const fields = fieldIds.map((id) => ({ pageBlockFieldId: id, value: values[id] }))
        if (fields.length === 0) return { pageBlockId: b.pageBlockId }
        return { pageBlockId: b.pageBlockId, fields }
      })

      const res = await privateInstance.put(`/tenant/pages/${pageId}/blocks`, { blocks })
      if (res.status !== 200) throw new Error('Erro ao salvar')
      return true
    },
    onSuccess: async () => {
      await refetchBlocksOnPage()
      setDirty(false)
      toast.success('Conteúdo atualizado')
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao salvar', {
        description: errorData?.detail || 'Não foi possível salvar as alterações.',
      })
    },
  })

  const setFieldValue = (key: DraftBlockKey, fieldId: number, value: unknown) => {
    setDirty(true)
    setDraftFieldValues((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] ?? {}),
        [fieldId]: value,
      },
    }))
  }

  const renderFieldInput = (field: RenderField, value: unknown) => {
    if (!selectedBlockKey) return null
    const str = typeof value === 'string' ? value : String(value ?? '')
    switch (field.type) {
      case 'long_text':
        return (
          <ThemeFieldLongText
            rows={4}
            value={str}
            onChange={(next) => setFieldValue(selectedBlockKey, field.id, next)}
            disabled={isSaving}
            placeholder="Digite aqui..."
          />
        )
      case 'image_list':
        return (
          <ThemeFieldLongText
            rows={4}
            value={str}
            onChange={(next) => setFieldValue(selectedBlockKey, field.id, next)}
            disabled={isSaving}
            placeholder="1 URL por linha"
          />
        )
      case 'video_list':
        return (
          <ThemeFieldLongText
            rows={4}
            value={str}
            onChange={(next) => setFieldValue(selectedBlockKey, field.id, next)}
            disabled={isSaving}
            placeholder="1 URL por linha"
          />
        )
      case 'image':
        return (
          <ThemeFieldTextInput
            type="url"
            value={str}
            onChange={(next) => setFieldValue(selectedBlockKey, field.id, next)}
            disabled={isSaving}
            placeholder="URL da imagem"
          />
        )
      case 'video':
        return (
          <ThemeFieldTextInput
            type="url"
            value={str}
            onChange={(next) => setFieldValue(selectedBlockKey, field.id, next)}
            disabled={isSaving}
            placeholder="URL do vídeo"
          />
        )
      case 'number':
        return (
          <ThemeFieldNumberInput
            value={str}
            onChange={(next) => setFieldValue(selectedBlockKey, field.id, next)}
            disabled={isSaving}
            placeholder="0"
          />
        )
      case 'boolean':
        return (
          <ThemeFieldBooleanToggle
            value={str === 'true' || str === '1'}
            onChange={(v) => setFieldValue(selectedBlockKey, field.id, v ? 'true' : 'false')}
            disabled={isSaving}
          />
        )
      case 'unit':
        {
          const parsed = parseUnitValue(str)
          return (
            <ThemeFieldUnitInput
              value={parsed}
              onChange={(next) => {
                const unit: UnitOption = next.unit === 'px' || next.unit === 'rem' || next.unit === 'em' || next.unit === '%' ? next.unit : 'px'
                const amount = String(next.amount ?? '').trim().replace(',', '.')
                setFieldValue(selectedBlockKey, field.id, amount ? `${amount}${unit}` : '')
              }}
              disabled={isSaving}
            />
          )
        }
      case 'banner':
        {
          const banner = coerceBannerValue(value)
          return (
            <div className="flex flex-col gap-2">
              <div className="rounded-md border bg-muted/10 p-2 flex items-center gap-3">
                <div className="h-12 w-20 rounded overflow-hidden bg-muted flex items-center justify-center shrink-0">
                  {banner.image_url ? (
                    <img src={banner.image_url} alt="Banner" className="h-full w-full object-cover" />
                  ) : (
                    <div className="text-xs text-muted-foreground">Sem imagem</div>
                  )}
                </div>
                <MediaSelectorDialog
                  toFilter="banner"
                  onSelect={(medias: MediaItem[]) => {
                    const m = medias[0]
                    if (!m?.url) return
                    setFieldValue(selectedBlockKey, field.id, { ...banner, image_url: m.url })
                  }}
                  trigger={
                    <Button type="button" size="sm" variant="outline" disabled={isSaving}>
                      Selecionar imagem
                    </Button>
                  }
                />
              </div>
              <ThemeFieldTextInput
                type="url"
                value={banner.link_url ?? ''}
                onChange={(next) => setFieldValue(selectedBlockKey, field.id, { ...banner, link_url: next ? next : null })}
                disabled={isSaving}
                placeholder="Link (opcional)"
              />
            </div>
          )
        }
      case 'banner_list':
        {
          const list = coerceBannerListValue(value)
          return (
            <div className="flex flex-col gap-2">
              {list.length === 0 ? (
                <div className="text-xs text-muted-foreground">Nenhum banner</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {list.map((banner, index) => (
                    <div key={index} className="rounded-md border p-2 flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-20 rounded overflow-hidden bg-muted flex items-center justify-center shrink-0">
                          {banner.image_url ? (
                            <img src={banner.image_url} alt={`Banner ${index + 1}`} className="h-full w-full object-cover" />
                          ) : (
                            <div className="text-xs text-muted-foreground">Sem imagem</div>
                          )}
                        </div>
                        <MediaSelectorDialog
                          toFilter="banner"
                          onSelect={(medias: MediaItem[]) => {
                            const m = medias[0]
                            if (!m?.url) return
                            const next = list.map((it, i) => (i === index ? { ...it, image_url: m.url } : it))
                            setFieldValue(selectedBlockKey, field.id, next)
                          }}
                          trigger={
                            <Button type="button" size="sm" variant="outline" disabled={isSaving}>
                              {banner.image_url ? 'Trocar imagem' : 'Selecionar imagem'}
                            </Button>
                          }
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="ml-auto text-destructive hover:text-destructive"
                          disabled={isSaving}
                          onClick={() => {
                            const next = list.filter((_, i) => i !== index)
                            setFieldValue(selectedBlockKey, field.id, next)
                          }}
                        >
                          Remover
                        </Button>
                      </div>
                      <ThemeFieldTextInput
                        type="url"
                        value={banner.link_url ?? ''}
                        onChange={(next) => {
                          const nextList = list.map((it, i) => (i === index ? { ...it, link_url: next ? next : null } : it))
                          setFieldValue(selectedBlockKey, field.id, nextList)
                        }}
                        disabled={isSaving}
                        placeholder="Link (opcional)"
                      />
                    </div>
                  ))}
                </div>
              )}

              <MediaSelectorDialog
                toFilter="banner"
                onSelect={(medias: MediaItem[]) => {
                  const m = medias[0]
                  if (!m?.url) return
                  setFieldValue(selectedBlockKey, field.id, [...list, { image_url: m.url, link_url: null }])
                }}
                trigger={
                  <Button type="button" size="sm" variant="outline" disabled={isSaving}>
                    Adicionar banner
                  </Button>
                }
              />
            </div>
          )
        }
      case 'short_text':
      case 'text':
      default:
        return (
          <ThemeFieldTextInput
            value={str}
            onChange={(next) => setFieldValue(selectedBlockKey, field.id, next)}
            disabled={isSaving}
            placeholder="Digite aqui..."
          />
        )
    }
  }

  const previewJson = useMemo(() => {
    const payload = draftBlocks.map((b, idx) => ({
      key: b.key,
      kind: b.kind,
      blockXPageId: b.kind === 'existing' ? b.blockXPageId : null,
      pageBlockId: b.pageBlockId,
      order: idx,
      fields: Object.keys(draftFieldValues[b.key] ?? {})
        .map((k) => Number(k))
        .filter((n) => Number.isFinite(n))
        .sort((a, b) => a - b)
        .map((fieldId) => ({
          pageBlockFieldId: fieldId,
          value: String((draftFieldValues[b.key] ?? {})[fieldId] ?? ''),
        })),
    }))
    return JSON.stringify(payload, null, 2)
  }, [draftBlocks, draftFieldValues])

  const SortableBlockRow = ({ item }: { item: DraftBlock }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.key })
    const style: CSSProperties = { transform: CSS.Transform.toString(transform), transition }

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'w-full max-w-full rounded-md border transition-colors',
          selectedBlockKey === item.key ? 'bg-muted/30 border-primary/40' : 'bg-background hover:bg-muted/20',
          isDragging ? 'opacity-60' : ''
        )}
      >
        <button
          type="button"
          className="w-full flex items-start gap-2 px-3 py-2 text-left"
          onClick={() => setSelectedBlockKey((cur) => (cur === item.key ? null : item.key))}
        >
          <span
            className="h-7 w-7 inline-flex items-center justify-center rounded-sm text-muted-foreground hover:text-foreground shrink-0"
            aria-label="Reordenar"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="size-4" />
          </span>

          <span className="flex-1 min-w-0">
            <span className="text-sm font-medium truncate block">
              {item.pageBlock?.name ?? `#${item.pageBlockId}`}
            </span>
          </span>
        </button>
      </div>
    )
  }

  const closeSheet = () => {
    setOpen(false)
    setSelectedBlockKey(null)
    setDraftBlocks([])
    setDraftFieldValues({})
    setDirty(false)
    setConfirmCloseOpen(false)
  }

  const requestClose = () => {
    if (dirty) {
      setConfirmCloseOpen(true)
      return
    }
    closeSheet()
  }

  return (
    <>
      <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fechar sem salvar?</AlertDialogTitle>
            <AlertDialogDescription>
              Existem alterações pendentes. Ao fechar, você perderá as alterações não salvas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={closeSheet}>
              Fechar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmRemoveOpen} onOpenChange={setConfirmRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover bloco?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação remove o bloco da página. As alterações só serão aplicadas após salvar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!selectedBlockKey) return
                removeDraftBlock(selectedBlockKey)
                setConfirmRemoveOpen(false)
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet
        open={open}
        onOpenChange={(o) => {
          if (!o) {
            requestClose()
            return
          }
          setOpen(true)
        }}
      >
      <SheetTrigger asChild>
        {trigger ? trigger : (
          <Button variant="outline" size="sm" disabled={!pageId}>
            Conteúdo
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="min-w-full w-full p-0" hideClose>
        <div className="h-full flex flex-col">
          <SheetHeader className="p-4 border-b">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-2 min-w-0">
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0" disabled={isSaving} onClick={requestClose}>
                  <ChevronLeft className="size-4" />
                </Button>
                <div className="min-w-0">
                  <SheetTitle className="truncate">Conteúdo • {page?.title ?? `#${pageId}`}</SheetTitle>
                  {page?.path ? <div className="text-xs text-muted-foreground truncate">{page.path}</div> : null}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="h-8 gap-2"
                  disabled={!pageId || isSaving || isLoadingBlocksOnPage || !dirty}
                  onClick={() => save()}
                >
                  {isSaving ? <Loader className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Salvar
                </Button>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 min-h-0 flex min-w-0">
            <aside className="w-[260px] border-r bg-background">
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
                        <SortableContext items={draftBlocks.map((b) => b.key)} strategy={verticalListSortingStrategy}>
                          {draftBlocks.map((b) => (
                            <SortableBlockRow key={b.key} item={b} />
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
                        disabled={!open || !pageId || isLoadingAllPageBlocks || isSaving || availableBlocks.length === 0}
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
                              onSelect={() => addDraftBlock(b)}
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
                              const value = selectedBlockKey ? (draftFieldValues[selectedBlockKey] ?? {})[f.id] : undefined
                              return (
                                <div key={f.id} className="rounded-md border px-3 py-2">
                                  <div className="min-w-0">
                                    <Label className="text-sm">{f.name}</Label>
                                    <div className="text-xs text-muted-foreground">{f.rawType}</div>
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
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full justify-center gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                    disabled={!selectedBlockKey || isSaving}
                    onClick={() => setConfirmRemoveOpen(true)}
                  >
                    <Trash2 className="size-4" />
                    Remover bloco
                  </Button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </SheetContent>
      </Sheet>
    </>
  )
}
