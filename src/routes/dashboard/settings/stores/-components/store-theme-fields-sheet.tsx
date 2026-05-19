import { useEffect, useMemo, useRef, useState } from 'react'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { privateInstance } from '@/lib/auth'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GripVertical, Loader, Palette, Plus, RefreshCw, Trash, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MediaSelectorDialog } from '@/routes/dashboard/media/-components/media-selector-dialog'
import type { MediaItem } from '@/routes/dashboard/media'
import { Skeleton } from '@/components/ui/skeleton'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { parseUnitValue, ThemeFieldBooleanToggle, ThemeFieldLongText, ThemeFieldNumberInput, ThemeFieldTextInput, ThemeFieldUnitInput, type UnitOption } from '@/components/theme-field-inputs'
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
  | 'long_text'
  | 'number'
  | 'unit'
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

function ThemeFieldSelectInput({
  value,
  onChange,
  disabled,
  placeholder,
}: {
  value: string
  onChange: (next: string) => void
  disabled: boolean
  placeholder?: string
}) {
  return <Input type="text" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} placeholder={placeholder ?? '—'} />
}

function ThemeFieldStoreMenuSelect({
  value,
  onChange,
  disabled,
  storeMenus,
}: {
  value: string
  onChange: (next: string) => void
  disabled: boolean
  storeMenus: StoreMenuItem[]
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
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
  )
}

function ThemeFieldDateInput({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (next: string) => void
  disabled: boolean
}) {
  return <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
}

function ThemeFieldDateTimeInput({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (next: string) => void
  disabled: boolean
}) {
  return <Input type="datetime-local" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
}

function ThemeFieldMediaSinglePicker({
  kind,
  value,
  onChange,
  disabled,
  selectedMedia,
}: {
  kind: 'image' | 'video'
  value: string
  onChange: (next: string) => void
  disabled: boolean
  selectedMedia: MediaItem | undefined
}) {
  const allow = kind === 'image' ? isImageMime : isVideoMime
  const selectedId = Number(value)
  const displayName = selectedMedia?.name ?? (selectedId > 0 ? `Mídia #${selectedId}` : 'Nenhuma mídia selecionada')

  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded border bg-muted overflow-hidden flex items-center justify-center shrink-0">
        {selectedMedia?.url && allow(selectedMedia.mime) ? (
          <img src={selectedMedia.url} alt={selectedMedia.name ?? 'media'} className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm truncate">{displayName}</div>
        <div className="text-xs text-muted-foreground truncate">{selectedMedia?.mime ?? ''}</div>
      </div>
      <div className="flex gap-2">
        <MediaSelectorDialog
          multiple={false}
          onSelect={(medias) => {
            const m = medias[0]
            if (!m) return
            if (!allow(m.mime)) {
              toast.error(`Selecione um ${kind === 'image' ? 'arquivo de imagem' : 'arquivo de vídeo'}.`)
              return
            }
            onChange(String(m.id))
          }}
          trigger={<Button type="button" variant="outline" size="sm" disabled={disabled}>Selecionar</Button>}
        />
        <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => onChange('')}>
          Remover
        </Button>
      </div>
    </div>
  )
}

function ThemeFieldMediaListPicker({
  kind,
  value,
  onChange,
  disabled,
  mediaById,
}: {
  kind: 'image_list' | 'video_list'
  value: number[]
  onChange: (next: number[]) => void
  disabled: boolean
  mediaById: Map<number, MediaItem>
}) {
  const allow = kind === 'image_list' ? isImageMime : isVideoMime
  const ids = (Array.isArray(value) ? value : []).map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0)
  const medias = ids.map((id) => mediaById.get(id)).filter(Boolean) as MediaItem[]
  const missing = ids.filter((id) => !mediaById.has(id))

  return (
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
              disabled={disabled}
              onClick={() => onChange(ids.filter((id) => id !== m.id))}
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
              disabled={disabled}
              onClick={() => onChange(ids.filter((x) => x !== id))}
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
            onChange(next)
          }}
          trigger={<Button type="button" variant="outline" size="sm" disabled={disabled}><Plus className="size-4 mr-2" />Adicionar</Button>}
        />
        <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => onChange([])}>
          Limpar
        </Button>
      </div>
    </div>
  )
}

function ThemeFieldLinkEditor({
  value,
  onChange,
  disabled,
}: {
  value: { label?: string; path?: string }
  onChange: (next: { label: string; path: string }) => void
  disabled: boolean
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Input
        placeholder="Label"
        value={value.label ?? ''}
        onChange={(e) => onChange({ label: e.target.value, path: String(value.path ?? '').replace(/\s+/g, '') })}
        disabled={disabled}
      />
      <Input
        placeholder="/caminho"
        value={value.path ?? ''}
        onChange={(e) => onChange({ label: String(value.label ?? ''), path: e.target.value.replace(/\s+/g, '') })}
        disabled={disabled}
      />
    </div>
  )
}

function ThemeFieldLinkListEditor({
  value,
  onChange,
  disabled,
}: {
  value: Array<{ label?: string; path?: string }>
  onChange: (next: Array<{ label: string; path: string }>) => void
  disabled: boolean
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {value.map((row, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2">
            <div className="col-span-5">
              <Input
                placeholder="Label"
                value={row.label ?? ''}
                onChange={(e) => {
                  const next = [...value]
                  next[idx] = { ...next[idx], label: e.target.value }
                  onChange(next.map((o) => ({ label: String(o.label ?? ''), path: String(o.path ?? '') })))
                }}
                disabled={disabled}
              />
            </div>
            <div className="col-span-6">
              <Input
                placeholder="/caminho"
                value={row.path ?? ''}
                onChange={(e) => {
                  const next = [...value]
                  next[idx] = { ...next[idx], path: e.target.value.replace(/\s+/g, '') }
                  onChange(next.map((o) => ({ label: String(o.label ?? ''), path: String(o.path ?? '') })))
                }}
                disabled={disabled}
              />
            </div>
            <div className="col-span-1 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled}
                onClick={() => onChange(value.filter((_, i) => i !== idx).map((o) => ({ label: String(o.label ?? ''), path: String(o.path ?? '') })))}
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
        disabled={disabled}
        onClick={() => onChange([...value, { label: '', path: '' }].map((o) => ({ label: String(o.label ?? ''), path: String(o.path ?? '') })))}
        className="w-fit"
      >
        <Plus className="size-4 mr-2" />
        Adicionar link
      </Button>
    </div>
  )
}

function ThemeFieldValuesList({
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
  return <TagListEditor value={value} onChange={onChange} disabled={disabled} placeholder={placeholder} mode={mode} />
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
  actions?: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-12 gap-4 rounded-lg border p-4 bg-background">
      <div className="col-span-12 md:col-span-4">
        <div className="text-sm font-medium">{title}</div>
        {description ? (
          <div className="mt-1 text-xs text-muted-foreground leading-snug">{description}</div>
        ) : null}
      </div>
      <div className={actions ? 'col-span-12 md:col-span-6 flex items-center min-w-0' : 'col-span-12 md:col-span-8 flex items-center min-w-0'}>
        <div className="w-full">{children}</div>
      </div>
      {actions ? (
        <div className="col-span-12 md:col-span-2 flex items-center justify-end gap-2">
          {actions}
        </div>
      ) : null}
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

function parseThemeFieldLocal(field: StoreThemeField): any {
  const v = field.value
  switch (field.type) {
    case 'boolean':
      if (v == null) return false
      if (v === 'true') return true
      if (v === 'false') return false
      return Boolean(v)
    case 'number':
      return v ?? ''
    case 'unit':
      return parseUnitValue(v)
    case 'multiselect':
    case 'text_list':
      return parseJson<any[]>(v, []).map((x) => String(x ?? '')).filter(Boolean)
    case 'number_list':
      return parseJson<any[]>(v, []).map((x) => String(x ?? '')).filter(Boolean)
    case 'image_list':
    case 'video_list':
      return parseJson<any[]>(v, [])
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n) && n > 0)
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
}

function themeFieldLocalToPayload(type: StoreThemeFieldType, local: any): any {
  if (type === 'number') return String(local ?? '').trim()

  if (type === 'unit') {
    const obj = (local ?? {}) as any
    const amount = String(obj.amount ?? '').trim().replace(',', '.')
    const unit = String(obj.unit ?? 'px') as UnitOption
    const safeUnit: UnitOption = unit === 'px' || unit === 'rem' || unit === 'em' || unit === '%' ? unit : 'px'
    return amount ? `${amount}${safeUnit}` : ''
  }

  if (type === 'multiselect' || type === 'text_list') {
    return (Array.isArray(local) ? local : []).map((v) => String(v ?? '').trim()).filter(Boolean)
  }

  if (type === 'number_list') {
    return (Array.isArray(local) ? local : [])
      .map((n) => String(n ?? '').trim().replace(',', '.'))
      .map((n) => Number(n))
      .filter((n) => Number.isFinite(n))
  }

  if (type === 'image' || type === 'video' || type === 'store_menu') {
    const n = Number(local)
    return Number.isFinite(n) && n > 0 ? n : null
  }

  if (type === 'image_list' || type === 'video_list') {
    return (Array.isArray(local) ? local : []).map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0)
  }

  if (type === 'link') {
    const obj = (local ?? {}) as any
    return { label: String(obj.label ?? ''), path: String(obj.path ?? '') }
  }

  if (type === 'link_list') {
    return (Array.isArray(local) ? local : []).map((o) => ({
      label: String((o as any)?.label ?? ''),
      path: String((o as any)?.path ?? ''),
    }))
  }

  return local ?? ''
}

function ThemeFieldEditor({
  field,
  storeMenus,
  mediaById,
  value,
  onChange,
  disabled,
}: {
  field: StoreThemeField
  storeMenus: StoreMenuItem[]
  mediaById: Map<number, MediaItem>
  value: any
  onChange: (next: any) => void
  disabled: boolean
}) {
  if (field.type === 'boolean') {
    return (
      <FieldRowShell title={field.name} description={field.description}>
        <ThemeFieldBooleanToggle value={Boolean(value)} onChange={(v) => onChange(Boolean(v))} disabled={disabled} />
      </FieldRowShell>
    )
  }

  if (field.type === 'store_menu') {
    return (
      <FieldRowShell title={field.name} description={field.description}>
        <ThemeFieldStoreMenuSelect value={value ? String(value) : ''} onChange={onChange} disabled={disabled} storeMenus={storeMenus} />
      </FieldRowShell>
    )
  }

  if (field.type === 'date') {
    return (
      <FieldRowShell title={field.name} description={field.description}>
        <ThemeFieldDateInput value={String(value ?? '')} onChange={onChange} disabled={disabled} />
      </FieldRowShell>
    )
  }

  if (field.type === 'datetime') {
    return (
      <FieldRowShell title={field.name} description={field.description}>
        <ThemeFieldDateTimeInput value={String(value ?? '')} onChange={onChange} disabled={disabled} />
      </FieldRowShell>
    )
  }

  if (field.type === 'image' || field.type === 'video') {
    const selectedId = Number(value)
    const selectedMedia = Number.isFinite(selectedId) && selectedId > 0 ? mediaById.get(selectedId) : undefined
    return (
      <FieldRowShell title={field.name} description={field.description}>
        <ThemeFieldMediaSinglePicker
          kind={field.type}
          value={String(value ?? '')}
          onChange={onChange}
          disabled={disabled}
          selectedMedia={selectedMedia}
        />
      </FieldRowShell>
    )
  }

  if (field.type === 'image_list' || field.type === 'video_list') {
    return (
      <FieldRowShell title={field.name} description={field.description}>
        <ThemeFieldMediaListPicker
          kind={field.type}
          value={(Array.isArray(value) ? value : []).map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0)}
          onChange={onChange}
          disabled={disabled}
          mediaById={mediaById}
        />
      </FieldRowShell>
    )
  }

  if (field.type === 'link') {
    const v = (value ?? {}) as { label?: string; path?: string }
    return (
      <FieldRowShell title={field.name} description={field.description}>
        <ThemeFieldLinkEditor
          value={v}
          onChange={onChange}
          disabled={disabled}
        />
      </FieldRowShell>
    )
  }

  if (field.type === 'link_list') {
    const list = (Array.isArray(value) ? value : []) as Array<{ label?: string; path?: string }>
    return (
      <FieldRowShell title={field.name} description={field.description}>
        <ThemeFieldLinkListEditor
          value={list}
          onChange={onChange}
          disabled={disabled}
        />
      </FieldRowShell>
    )
  }

  if (field.type === 'multiselect' || field.type === 'text_list' || field.type === 'number_list') {
    const values = (Array.isArray(value) ? value : []).map((x) => String(x ?? '').trim()).filter(Boolean)

    return (
      <FieldRowShell title={field.name} description={field.description}>
        <ThemeFieldValuesList
          value={values}
          onChange={onChange}
          disabled={disabled}
          placeholder={field.type === 'number_list' ? 'Digite um número e pressione Enter' : 'Digite um item e pressione Enter'}
          mode={field.type === 'number_list' ? 'number' : 'text'}
        />
      </FieldRowShell>
    )
  }

  if (field.type === 'unit') {
    const v = (value ?? { amount: '', unit: 'px' }) as { amount?: string; unit?: UnitOption }
    const safeUnit: UnitOption = v.unit === 'px' || v.unit === 'rem' || v.unit === 'em' || v.unit === '%' ? v.unit : 'px'
    return (
      <FieldRowShell title={field.name} description={field.description}>
        <ThemeFieldUnitInput value={{ amount: String(v.amount ?? ''), unit: safeUnit }} onChange={onChange} disabled={disabled} />
      </FieldRowShell>
    )
  }

  if (field.type === 'long_text') {
    return (
      <FieldRowShell title={field.name} description={field.description}>
        <ThemeFieldLongText value={String(value ?? '')} onChange={onChange} disabled={disabled} />
      </FieldRowShell>
    )
  }

  if (field.type === 'select') {
    return (
      <FieldRowShell title={field.name} description={field.description}>
        <ThemeFieldSelectInput value={String(value ?? '')} onChange={onChange} disabled={disabled} />
      </FieldRowShell>
    )
  }

  if (field.type === 'number') {
    return (
      <FieldRowShell title={field.name} description={field.description}>
        <ThemeFieldNumberInput value={String(value ?? '')} onChange={onChange} disabled={disabled} />
      </FieldRowShell>
    )
  }

  if (field.type === 'text') {
    return (
      <FieldRowShell title={field.name} description={field.description}>
        <ThemeFieldTextInput value={String(value ?? '')} onChange={onChange} disabled={disabled} />
      </FieldRowShell>
    )
  }

  return (
    <FieldRowShell title={field.name} description={field.description}>
      <ThemeFieldTextInput value={String(value ?? '')} onChange={onChange} disabled={disabled} />
    </FieldRowShell>
  )
}

export function StoreThemeFieldsSheet({
  storeId,
  storeName,
  trigger,
}: {
  storeId: number
  storeName?: string
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const [localById, setLocalById] = useState<Record<number, any>>({})

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
  const allFields = useMemo(() => groups.flatMap((g) => g.storeFields ?? []), [groups])

  useEffect(() => {
    if (!open) return
    if (!data) return
    setLocalById((prev) => {
      const allowed = new Set(allFields.map((f) => f.id))
      const next: Record<number, any> = {}

      for (const [k, v] of Object.entries(prev)) {
        const id = Number(k)
        if (!Number.isFinite(id)) continue
        if (!allowed.has(id)) continue
        next[id] = v
      }

      for (const f of allFields) {
        if (!Object.prototype.hasOwnProperty.call(next, f.id)) {
          next[f.id] = parseThemeFieldLocal(f)
        }
      }

      return next
    })
  }, [open, data, allFields])

  const initialPayloadKeyById = useMemo(() => {
    const next: Record<number, string> = {}
    for (const f of allFields) {
      const payload = themeFieldLocalToPayload(f.type, parseThemeFieldLocal(f))
      next[f.id] = JSON.stringify(payload)
    }
    return next
  }, [allFields])

  const dirtyFieldIds = useMemo(() => {
    const ids: number[] = []
    for (const f of allFields) {
      const local = Object.prototype.hasOwnProperty.call(localById, f.id) ? localById[f.id] : parseThemeFieldLocal(f)
      const payload = themeFieldLocalToPayload(f.type, local)
      const currentKey = JSON.stringify(payload)
      if (currentKey !== initialPayloadKeyById[f.id]) ids.push(f.id)
    }
    return ids
  }, [allFields, initialPayloadKeyById, localById])

  const hasChanges = dirtyFieldIds.length > 0

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

  const { isPending: savingChanges, mutateAsync: saveChanged } = useMutation({
    mutationFn: async () => {
      const changed = allFields.filter((f) => dirtyFieldIds.includes(f.id))
      if (changed.length === 0) return { total: 0, savedCount: 0, failed: [] as Array<{ id: number; name: string; title?: string; detail?: string }> }

      const results = await Promise.allSettled(
        changed.map(async (f) => {
          const local = Object.prototype.hasOwnProperty.call(localById, f.id) ? localById[f.id] : parseThemeFieldLocal(f)
          const value = themeFieldLocalToPayload(f.type, local)
          const res = await privateInstance.put(`/tenant/store-theme-fields/${f.id}`, { storeId, value })
          if (res.status !== 200 && res.status !== 204) throw new Error('Erro ao salvar alterações')
          return { id: f.id, name: f.name }
        })
      )

      const failed: Array<{ id: number; name: string; title?: string; detail?: string }> = []
      let savedCount = 0

      for (let i = 0; i < results.length; i++) {
        const r = results[i]!
        const field = changed[i]!

        if (r.status === 'fulfilled') {
          savedCount++
          continue
        }

        const reason: any = r.reason
        const errorData = reason?.response?.data
        const title = String(errorData?.title ?? reason?.message ?? 'Erro ao salvar')
        const detailRaw = errorData?.detail
        const detail = detailRaw != null ? String(detailRaw) : undefined

        failed.push({ id: field.id, name: field.name, title, detail })
      }

      return { total: changed.length, savedCount, failed }
    },
    onSuccess: async (result) => {
      const total = Number((result as any)?.total ?? 0)
      const savedCount = Number((result as any)?.savedCount ?? 0)
      const failed = ((result as any)?.failed ?? []) as Array<{ id: number; name: string; title?: string; detail?: string }>

      if (!total) {
        toast('Nenhuma alteração para salvar.')
        return
      }

      if (failed.length > 0) {
        const details = failed
          .slice(0, 4)
          .map((f) => `${f.name}: ${f.detail ?? f.title ?? 'Erro ao salvar'}`)
          .join('\n')
        const extra = failed.length > 4 ? `\n+${failed.length - 4} erro(s)` : ''

        toast.error(`Falha ao salvar ${failed.length} campo(s)`, {
          description: `${savedCount}/${total} salvo(s)\n${details}${extra}`,
        })
      } else {
        toast.success('Alterações salvas')
      }

      await queryClient.invalidateQueries({ queryKey: ['store-theme-fields', storeId] })
      await refetch()
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao salvar alterações', {
        description: errorData?.detail || 'Não foi possível salvar as alterações.',
      })
    },
  })

  const uiDisabled = isLoading || isRefetching || savingAll || savingChanges

  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (o) refetch() }}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Palette className="size-[0.85rem] mr-2" /> Ajustes do tema
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="flex flex-col overflow-hidden w-full sm:max-w-[770px]">
        <SheetHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <SheetTitle>Ajustes do tema</SheetTitle>
            {storeName ? (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {storeName}
              </span>
            ) : (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                Loja #{storeId}
              </span>
            )}
          </div>
          <SheetDescription>
            Personalize a aparência, cores, fontes e configurações gerais do tema para esta loja.
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center px-4 py-3 border-b">
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refresh()}
              disabled={uiDisabled}
            >
              {uiDisabled ? <Loader className="size-4 animate-spin mr-2" /> : <RefreshCw className="size-4 mr-2" />}
              Atualizar
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          <div className="flex flex-col gap-6 pb-8">
            {isLoading ? (
              <GroupSkeleton />
            ) : (
              <Accordion
                type="multiple"
                defaultValue={groups.map((g) => String(g.id))}
                className="space-y-4"
              >
                {groups.map((g) => (
                  <AccordionItem
                    key={g.id}
                    value={String(g.id)}
                    className="border rounded-xl overflow-hidden bg-card transition-all duration-300 last:border-b"
                  >
                    <AccordionTrigger className="px-4 py-3 bg-muted/20 hover:bg-muted/30 hover:no-underline text-left">
                      <div className="flex flex-col gap-0.5 pr-4">
                        <div className="text-sm font-semibold text-foreground">{g.name}</div>
                        {g.description ? (
                          <div className="text-xs text-muted-foreground font-normal leading-normal">{g.description}</div>
                        ) : null}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-4 pt-0">
                      <div className="flex flex-col gap-4 pt-4">
                        {(g.storeFields ?? []).map((f) => (
                          <ThemeFieldEditor
                            key={f.id}
                            field={f}
                            storeMenus={storeMenus ?? []}
                            mediaById={mediaById}
                            value={Object.prototype.hasOwnProperty.call(localById, f.id) ? localById[f.id] : parseThemeFieldLocal(f)}
                            onChange={(next) => setLocalById((prev) => ({ ...prev, [f.id]: next }))}
                            disabled={uiDisabled}
                          />
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        </div>

        <SheetFooter className="border-t p-4 flex-row justify-end gap-2">
          <SheetClose asChild>
            <Button variant="outline" size="sm" disabled={uiDisabled}>Cancelar</Button>
          </SheetClose>
          <Button size="sm" onClick={() => saveChanged()} disabled={!hasChanges || uiDisabled}>
            {savingChanges ? <Loader className="size-4 animate-spin mr-2" /> : null}
            Salvar alterações
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
