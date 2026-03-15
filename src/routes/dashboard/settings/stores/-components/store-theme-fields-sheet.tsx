import { useEffect, useMemo, useRef, useState } from 'react'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { privateInstance } from '@/lib/auth'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GripVertical, Loader, Palette, Plus, Trash, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MediaSelectorDialog } from '@/routes/dashboard/media/-components/media-selector-dialog'
import type { MediaItem } from '@/routes/dashboard/media'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'

type StoreThemeFieldType =
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

type StoreThemeField = {
  id: number
  name: string
  description: string | null
  type: StoreThemeFieldType
  value: string | null
}

type StoreThemeFieldGroup = {
  id: number
  name: string
  description: string | null
  storeFields: StoreThemeField[]
}

type StoreThemeFieldsResponse = {
  groups: StoreThemeFieldGroup[]
}

type StoreMenuItem = {
  id: number
  name: string
  storeId: number
}

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function isImageMime(mime: string | null | undefined) {
  return !!mime && mime.startsWith('image/')
}

function isVideoMime(mime: string | null | undefined) {
  return !!mime && mime.startsWith('video/')
}

function FieldRowShell({
  title,
  description,
  children,
  actions,
}: {
  title: string
  description: string | null
  children: React.ReactNode
  actions: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-12 gap-4 rounded-lg border p-4 bg-background">
      <div className="col-span-12 md:col-span-4">
        <div className="text-sm font-medium">{title}</div>
        {description ? (
          <div className="mt-1 text-xs text-muted-foreground leading-snug">{description}</div>
        ) : null}
      </div>
      <div className="col-span-12 md:col-span-6 flex items-center min-w-0">
        <div className="w-full">{children}</div>
      </div>
      <div className="col-span-12 md:col-span-2 flex items-center justify-end gap-2">
        {actions}
      </div>
    </div>
  )
}

function GroupSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  )
}

function TagListEditor({
  value,
  onChange,
  disabled,
  placeholder,
  mode,
}: {
  value: string[]
  onChange: (next: string[]) => void
  disabled: boolean
  placeholder: string
  mode: 'text' | 'number'
}) {
  const [draft, setDraft] = useState('')
  const idSeq = useRef(1)
  const [items, setItems] = useState<Array<{ id: string; value: string }>>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    const pool = new Map<string, string[]>()
    for (const it of items) {
      const key = it.value
      const list = pool.get(key) ?? []
      list.push(it.id)
      pool.set(key, list)
    }

    const next = value.map((v) => {
      const key = v
      const ids = pool.get(key)
      const id = ids && ids.length > 0 ? ids.shift()! : `tag_${idSeq.current++}`
      return { id, value: v }
    })
    setItems(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.join('\u0000')])

  const normalize = (raw: string) => {
    const cleaned = raw.trim().replace(/\s+/g, ' ')
    if (!cleaned) return null
    if (mode === 'number') {
      const normalized = cleaned.replace(',', '.')
      const n = Number(normalized)
      if (!Number.isFinite(n)) return null
      return String(normalized)
    }
    return cleaned
  }

  const splitMany = (raw: string) => {
    return raw
      .split(/[\n,;|]+/g)
      .map((s) => s.trim())
      .filter(Boolean)
  }

  const addMany = (raw: string) => {
    const next = [...items]
    const existing = new Set(next.map((v) => v.value.trim()))
    for (const part of splitMany(raw)) {
      const n = normalize(part)
      if (!n) continue
      if (existing.has(n)) continue
      existing.add(n)
      next.push({ id: `tag_${idSeq.current++}`, value: n })
    }
    setItems(next)
    onChange(next.map((i) => i.value))
  }

  const removeAt = (idx: number) => {
    const next = items.filter((_, i) => i !== idx)
    setItems(next)
    onChange(next.map((i) => i.value))
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over) return
    const from = items.findIndex((i) => i.id === String(active.id))
    const to = items.findIndex((i) => i.id === String(over.id))
    if (from < 0 || to < 0 || from === to) return
    const next = arrayMove(items, from, to)
    setItems(next)
    onChange(next.map((i) => i.value))
  }

  const activeItem = activeId ? items.find((i) => i.id === activeId) : null

  const hasAny = items.length > 0

  const SortableRow = ({ item, idx }: { item: { id: string; value: string }; idx: number }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled })
    const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition }
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-center gap-2 rounded-md border bg-muted/40 px-2 py-1.5 text-sm ${isDragging ? 'opacity-60' : ''}`}
      >
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground disabled:opacity-50 rounded-sm p-1"
            disabled={disabled}
            {...attributes}
            {...listeners}
            aria-label="Reordenar item"
          >
            <GripVertical className="size-4" />
          </button>
          <span className="text-xs tabular-nums text-muted-foreground w-6 text-right">{idx + 1}.</span>
        </div>
        <span className="flex-1 min-w-0 truncate">{item.value}</span>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground disabled:opacity-50"
          disabled={disabled}
          aria-label="Remover item"
          onClick={() => removeAt(idx)}
        >
          <X className="size-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2">
        {!hasAny ? (
          <span className="text-xs text-muted-foreground">Nenhum item</span>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          >
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              {items.map((it, idx) => (
                <SortableRow key={it.id} item={it} idx={idx} />
              ))}
            </SortableContext>
            <DragOverlay>
              {activeItem ? (
                <div className="flex items-center gap-2 rounded-md border bg-background px-2 py-1.5 text-sm shadow-lg">
                  <GripVertical className="size-4 text-muted-foreground" />
                  <span className="flex-1 min-w-0 truncate">{activeItem.value}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (!draft.trim()) return
              addMany(draft)
              setDraft('')
            }
            if (e.key === 'Backspace' && !draft && items.length > 0) {
              removeAt(items.length - 1)
            }
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData('text')
            if (!text) return
            if (!/[\n,;|]/.test(text)) return
            e.preventDefault()
            addMany(text)
            setDraft('')
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || !draft.trim()}
          onClick={() => {
            addMany(draft)
            setDraft('')
          }}
        >
          <Plus className="size-4 mr-2" />
          Adicionar
        </Button>
      </div>
    </div>
  )
}

function useMediaByIds(open: boolean, ids: number[]) {
  return useQuery({
    queryKey: ['medias-by-ids', ids.join(',')],
    enabled: open && ids.length > 0,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    queryFn: async () => {
      const res = await privateInstance.get('/tenant/medias', {
        params: {
          page: 1,
          limit: Math.min(100, ids.length),
          id: JSON.stringify({ operator: 'in', value: ids }),
        },
      })
      const items = (res.data?.items ?? []) as MediaItem[]
      return items
    },
  })
}

function ThemeFieldEditor({
  storeId,
  field,
  storeMenus,
  mediaById,
  disabled,
  onSaved,
}: {
  storeId: number
  field: StoreThemeField
  storeMenus: StoreMenuItem[]
  mediaById: Map<number, MediaItem>
  disabled: boolean
  onSaved: () => void
}) {
  const queryClient = useQueryClient()

  const initialParsed = useMemo(() => {
    const v = field.value
    switch (field.type) {
      case 'boolean':
        if (v == null) return false
        if (v === 'true') return true
        if (v === 'false') return false
        return Boolean(v)
      case 'number':
        return v ?? ''
      case 'multiselect':
      case 'text_list':
        return parseJson<any[]>(v, []).map((x) => String(x ?? '')).filter(Boolean)
      case 'number_list':
        return parseJson<any[]>(v, []).map((x) => String(x ?? '')).filter(Boolean)
      case 'image_list':
      case 'video_list':
        return parseJson<any[]>(v, [])
      case 'link':
        return parseJson<{ label: string; path: string }>(v, { label: '', path: '' })
      case 'link_list':
        return parseJson<Array<{ label: string; path: string }>>(v, [])
      case 'image':
      case 'video':
      case 'store_menu':
        return v ?? ''
      case 'date':
        return v ? String(v).slice(0, 10) : ''
      case 'datetime':
        return v ? String(v).slice(0, 16) : ''
      default:
        return v ?? ''
    }
  }, [field.type, field.value])

  const [local, setLocal] = useState<any>(initialParsed)

  useEffect(() => {
    setLocal(initialParsed)
  }, [initialParsed])

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async () => {
      let value: any = local

      if (field.type === 'number') {
        value = String(local ?? '').trim()
      }

      if (field.type === 'multiselect' || field.type === 'text_list') {
        value = (Array.isArray(local) ? local : []).map((v) => String(v ?? '').trim()).filter(Boolean)
      }

      if (field.type === 'number_list') {
        value = (Array.isArray(local) ? local : [])
          .map((n) => String(n ?? '').trim().replace(',', '.'))
          .map((n) => Number(n))
          .filter((n) => Number.isFinite(n))
      }

      if (field.type === 'image' || field.type === 'video' || field.type === 'store_menu') {
        const n = Number(local)
        value = Number.isFinite(n) && n > 0 ? n : null
      }

      if (field.type === 'image_list' || field.type === 'video_list') {
        value = (Array.isArray(local) ? local : []).map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0)
      }

      if (field.type === 'link') {
        const obj = (local ?? {}) as any
        value = { label: String(obj.label ?? ''), path: String(obj.path ?? '') }
      }

      if (field.type === 'link_list') {
        value = (Array.isArray(local) ? local : []).map((o) => ({
          label: String((o as any)?.label ?? ''),
          path: String((o as any)?.path ?? ''),
        }))
      }

      const res = await privateInstance.put(`/tenant/store-theme-fields/${field.id}`, {
        storeId,
        value,
      })
      if (res.status !== 200 && res.status !== 204) throw new Error('Erro ao salvar campo')
      return res.data
    },
    onSuccess: () => {
      toast.success('Campo atualizado')
      queryClient.invalidateQueries({ queryKey: ['store-theme-fields', storeId] })
      onSaved()
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao salvar campo', {
        description: errorData?.detail || 'Não foi possível salvar.'
      })
    }
  })

  const actions = (
    <Button size="sm" onClick={() => mutateAsync()} disabled={disabled || isPending}>
      {isPending ? <Loader className="size-4 animate-spin" /> : 'Salvar'}
    </Button>
  )

  if (field.type === 'boolean') {
    return (
      <FieldRowShell
        title={field.name}
        description={field.description}
        actions={actions}
      >
        <div className="flex items-center justify-between gap-3 rounded-md border bg-neutral-50 dark:bg-neutral-900 px-3 py-2.5">
          <div className="flex flex-col gap-0.5 min-w-0">
            <Label className="text-sm">Ativo</Label>
            <div className="text-xs text-muted-foreground truncate">
              {local ? 'Habilitado' : 'Desabilitado'}
            </div>
          </div>
          <Switch checked={Boolean(local)} onCheckedChange={(v) => setLocal(Boolean(v))} disabled={disabled || isPending} />
        </div>
      </FieldRowShell>
    )
  }

  if (field.type === 'store_menu') {
    return (
      <FieldRowShell title={field.name} description={field.description} actions={actions}>
        <Select
          value={local ? String(local) : ''}
          onValueChange={(v) => setLocal(v)}
          disabled={disabled || isPending}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione um menu..." />
          </SelectTrigger>
          <SelectContent>
            {storeMenus.map((m) => (
              <SelectItem key={m.id} value={String(m.id)}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldRowShell>
    )
  }

  if (field.type === 'date') {
    return (
      <FieldRowShell title={field.name} description={field.description} actions={actions}>
        <Input type="date" value={local ?? ''} onChange={(e) => setLocal(e.target.value)} disabled={disabled || isPending} />
      </FieldRowShell>
    )
  }

  if (field.type === 'datetime') {
    return (
      <FieldRowShell title={field.name} description={field.description} actions={actions}>
        <Input type="datetime-local" value={local ?? ''} onChange={(e) => setLocal(e.target.value)} disabled={disabled || isPending} />
      </FieldRowShell>
    )
  }

  if (field.type === 'image' || field.type === 'video') {
    const selectedId = Number(local)
    const selectedMedia = Number.isFinite(selectedId) && selectedId > 0 ? mediaById.get(selectedId) : undefined
    const allow = field.type === 'image' ? isImageMime : isVideoMime

    return (
      <FieldRowShell title={field.name} description={field.description} actions={actions}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded border bg-muted overflow-hidden flex items-center justify-center shrink-0">
            {selectedMedia?.url && allow(selectedMedia.mime) ? (
              <img src={selectedMedia.url} alt={selectedMedia.name ?? 'media'} className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm truncate">{selectedMedia?.name ?? (selectedId > 0 ? `Mídia #${selectedId}` : 'Nenhuma mídia selecionada')}</div>
            <div className="text-xs text-muted-foreground truncate">{selectedMedia?.mime ?? ''}</div>
          </div>
          <div className="flex gap-2">
            <MediaSelectorDialog
              multiple={false}
              onSelect={(medias) => {
                const m = medias[0]
                if (!m) return
                if (!allow(m.mime)) {
                  toast.error(`Selecione um ${field.type === 'image' ? 'arquivo de imagem' : 'arquivo de vídeo'}.`)
                  return
                }
                setLocal(String(m.id))
              }}
              trigger={<Button type="button" variant="outline" size="sm" disabled={disabled || isPending}>Selecionar</Button>}
            />
            <Button type="button" variant="ghost" size="sm" disabled={disabled || isPending} onClick={() => setLocal('')}>
              Remover
            </Button>
          </div>
        </div>
      </FieldRowShell>
    )
  }

  if (field.type === 'image_list' || field.type === 'video_list') {
    const allow = field.type === 'image_list' ? isImageMime : isVideoMime
    const ids = (Array.isArray(local) ? local : []).map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0)
    const medias = ids.map((id) => mediaById.get(id)).filter(Boolean) as MediaItem[]
    const missing = ids.filter((id) => !mediaById.has(id))

    return (
      <FieldRowShell title={field.name} description={field.description} actions={actions}>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {medias.map((m) => (
              <div key={m.id} className="flex items-center gap-2 rounded-md border bg-muted/40 px-2 py-1">
                <div className="h-7 w-7 rounded border bg-muted overflow-hidden flex items-center justify-center">
                  {m.url && allow(m.mime) ? (
                    <img src={m.url} alt={m.name ?? 'media'} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>
                <div className="text-xs max-w-[180px] truncate">{m.name ?? `#${m.id}`}</div>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  disabled={disabled || isPending}
                  onClick={() => setLocal(ids.filter((id) => id !== m.id))}
                >
                  <Trash className="size-4" />
                </button>
              </div>
            ))}
            {missing.map((id) => (
              <div key={id} className="flex items-center gap-2 rounded-md border bg-muted/40 px-2 py-1">
                <div className="h-7 w-7 rounded border bg-muted flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">#</span>
                </div>
                <div className="text-xs">Mídia #{id}</div>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  disabled={disabled || isPending}
                  onClick={() => setLocal(ids.filter((x) => x !== id))}
                >
                  <Trash className="size-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <MediaSelectorDialog
              multiple={true}
              onSelect={(picked) => {
                const next = [...ids]
                for (const m of picked) {
                  if (!allow(m.mime)) continue
                  if (!next.includes(m.id)) next.push(m.id)
                }
                setLocal(next)
              }}
              trigger={<Button type="button" variant="outline" size="sm" disabled={disabled || isPending}><Plus className="size-4 mr-2" />Adicionar</Button>}
            />
            <Button type="button" variant="ghost" size="sm" disabled={disabled || isPending} onClick={() => setLocal([])}>
              Limpar
            </Button>
          </div>
        </div>
      </FieldRowShell>
    )
  }

  if (field.type === 'link') {
    const v = (local ?? {}) as { label?: string; path?: string }
    return (
      <FieldRowShell title={field.name} description={field.description} actions={actions}>
        <div className="grid grid-cols-2 gap-3">
          <Input
            placeholder="Label"
            value={v.label ?? ''}
            onChange={(e) => setLocal({ ...v, label: e.target.value })}
            disabled={disabled || isPending}
          />
          <Input
            placeholder="/caminho"
            value={v.path ?? ''}
            onChange={(e) => setLocal({ ...v, path: e.target.value.replace(/\s+/g, '') })}
            disabled={disabled || isPending}
          />
        </div>
      </FieldRowShell>
    )
  }

  if (field.type === 'link_list') {
    const list = (Array.isArray(local) ? local : []) as Array<{ label?: string; path?: string }>
    return (
      <FieldRowShell title={field.name} description={field.description} actions={actions}>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            {list.map((row, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2">
                <div className="col-span-5">
                  <Input
                    placeholder="Label"
                    value={row.label ?? ''}
                    onChange={(e) => {
                      const next = [...list]
                      next[idx] = { ...next[idx], label: e.target.value }
                      setLocal(next)
                    }}
                    disabled={disabled || isPending}
                  />
                </div>
                <div className="col-span-6">
                  <Input
                    placeholder="/caminho"
                    value={row.path ?? ''}
                    onChange={(e) => {
                      const next = [...list]
                      next[idx] = { ...next[idx], path: e.target.value.replace(/\s+/g, '') }
                      setLocal(next)
                    }}
                    disabled={disabled || isPending}
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={disabled || isPending}
                    onClick={() => setLocal(list.filter((_, i) => i !== idx))}
                  >
                    <Trash className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || isPending}
            onClick={() => setLocal([...list, { label: '', path: '' }])}
            className="w-fit"
          >
            <Plus className="size-4 mr-2" />
            Adicionar link
          </Button>
        </div>
      </FieldRowShell>
    )
  }

  if (field.type === 'multiselect' || field.type === 'text_list' || field.type === 'number_list') {
    const values = (Array.isArray(local) ? local : []).map((x) => String(x ?? '').trim()).filter(Boolean)

    return (
      <FieldRowShell title={field.name} description={field.description} actions={actions}>
        <TagListEditor
          value={values}
          onChange={(next) => setLocal(next)}
          disabled={disabled || isPending}
          placeholder={field.type === 'number_list' ? 'Digite um número e pressione Enter' : 'Digite um item e pressione Enter'}
          mode={field.type === 'number_list' ? 'number' : 'text'}
        />
      </FieldRowShell>
    )
  }

  return (
    <FieldRowShell title={field.name} description={field.description} actions={actions}>
      <Input
        type={field.type === 'number' ? 'number' : 'text'}
        value={local ?? ''}
        onChange={(e) => setLocal(e.target.value)}
        disabled={disabled || isPending}
        placeholder="—"
      />
    </FieldRowShell>
  )
}

export function StoreThemeFieldsSheet({
  storeId,
  storeName,
}: {
  storeId: number
  storeName?: string
}) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['store-theme-fields', storeId],
    enabled: open,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    queryFn: async () => {
      const res = await privateInstance.get('/tenant/store-theme-fields', { params: { storeId } })
      if (res.status !== 200) throw new Error('Erro ao carregar campos do tema')
      return res.data as StoreThemeFieldsResponse
    },
  })

  const groups = useMemo(() => (data?.groups ?? []) as StoreThemeFieldGroup[], [data])

  const { data: storeMenus } = useQuery({
    queryKey: ['store-menus-select', storeId],
    enabled: open,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    queryFn: async () => {
      const res = await privateInstance.get('/tenant/store-menus', {
        params: {
          page: 1,
          limit: 100,
          sortBy: 'name',
          orderBy: 'asc',
          storeId: JSON.stringify({ operator: 'eq', value: storeId }),
        },
      })
      const items = (res.data?.items ?? []) as any[]
      const mapped = items.map((m) => ({
        id: Number(m.id),
        name: String(m.name ?? ''),
        storeId: Number(m.store?.id ?? m.storeId ?? 0),
      })) as StoreMenuItem[]
      return mapped.filter((m) => Number.isFinite(m.storeId) && m.storeId === storeId)
    },
  })

  const mediaIds = useMemo(() => {
    const ids: number[] = []
    for (const g of groups) {
      for (const f of g.storeFields ?? []) {
        if (f.type === 'image' || f.type === 'video') {
          const n = Number(f.value)
          if (Number.isFinite(n) && n > 0) ids.push(n)
        }
        if (f.type === 'image_list' || f.type === 'video_list') {
          const arr = parseJson<any[]>(f.value, [])
          for (const v of arr) {
            const n = Number(v)
            if (Number.isFinite(n) && n > 0) ids.push(n)
          }
        }
      }
    }
    return Array.from(new Set(ids))
  }, [groups])

  const { data: medias } = useMediaByIds(open, mediaIds)
  const mediaById = useMemo(() => new Map((medias ?? []).map((m) => [m.id, m])), [medias])

  const { isPending: savingAll, mutateAsync: refresh } = useMutation({
    mutationFn: async () => {
      await queryClient.invalidateQueries({ queryKey: ['store-theme-fields', storeId] })
      await refetch()
    },
  })

  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (o) refetch() }}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Palette className="size-[0.85rem] mr-2" /> Ajustes do tema
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-[1100px] p-0">
        <SheetHeader className="px-4 py-4">
          <SheetTitle>Ajustes do tema</SheetTitle>
          <SheetDescription>
            {storeName ? `Loja: ${storeName}` : `Loja #${storeId}`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="px-4 pb-3 flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refresh()}
              disabled={isLoading || isRefetching || savingAll}
            >
              {isLoading || isRefetching || savingAll ? <Loader className="size-4 animate-spin mr-2" /> : null}
              Atualizar
            </Button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-6">
            <div className="flex flex-col gap-6">
              {isLoading ? (
                <GroupSkeleton />
              ) : (
                groups.map((g) => (
                  <div key={g.id} className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <div className="text-sm font-semibold">{g.name}</div>
                      {g.description ? <div className="text-xs text-muted-foreground">{g.description}</div> : null}
                    </div>
                    <Separator />
                    <div className="flex flex-col gap-3">
                      {(g.storeFields ?? []).map((f) => (
                        <ThemeFieldEditor
                          key={f.id}
                          storeId={storeId}
                          field={f}
                          storeMenus={storeMenus ?? []}
                          mediaById={mediaById}
                          disabled={isLoading || isRefetching}
                          onSaved={() => void 0}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <SheetFooter className="border-t">
          <div className="flex w-full items-center justify-end px-4 py-3">
            <SheetClose asChild>
              <Button variant="outline" size="sm">Fechar</Button>
            </SheetClose>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
