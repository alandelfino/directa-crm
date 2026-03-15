import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { RefreshCw, ListTree } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { privateInstance } from '@/lib/auth'
import { Badge } from '@/components/ui/badge'
import { StoreMenuItemCreateDialog } from './store-menu-item-create-dialog'
import { StoreMenuItemEditDialog } from './store-menu-item-edit-dialog'
import { StoreMenuItemDeleteDialog } from './store-menu-item-delete-dialog'
import { IconEdit, IconGripVertical, IconTrash } from '@tabler/icons-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragCancelEvent,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToFirstScrollableAncestor, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { toast } from 'sonner'

type StoreMenuItem = {
  id: number
  name: string
  active: boolean
  parentId: number | null
  path: string
  order: number
  storeMenu: { id: number; name: string }
  store: { id: number; name: string }
  createdAt: string
  updatedAt: string
}

type StoreMenuItemsResponse = {
  page: number
  limit: number
  totalPages: number
  total: number
  items: StoreMenuItem[]
}

type FlatMenuItem = {
  id: number
  item: StoreMenuItem
  depth: number
}

function SortableMenuRow({
  row,
  selected,
  onSelect,
  onRowClick,
  childrenCount,
  indent,
  fmtDate,
  disabled,
}: {
  row: FlatMenuItem
  selected: boolean
  onSelect: () => void
  onRowClick: () => void
  childrenCount: number
  indent: number
  fmtDate: (v?: string) => string
  disabled: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
    disabled,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const hasChildren = childrenCount > 0
  const guides = Array.from({ length: row.depth }, (_, i) => {
    const left = (i + 1) * indent - 1
    return (
      <span
        key={i}
        className="absolute inset-y-0 -z-10"
        style={{ left: `${left}px`, width: '1px', background: 'hsl(var(--border))' }}
      />
    )
  })

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={`cursor-pointer ${isDragging ? 'opacity-60' : ''}`}
      onClick={disabled ? undefined : onRowClick}
    >
      <TableCell className="w-[60px] border-r !p-0 !px-2">
        <div className="flex justify-center items-center" onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={selected} onCheckedChange={disabled ? undefined : onSelect} />
        </div>
      </TableCell>

      <TableCell className="w-[38px] border-r !p-0 !px-1">
        <div className="flex justify-center items-center" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground disabled:opacity-50"
            disabled={disabled}
            {...attributes}
            {...listeners}
          >
            <IconGripVertical size={18} />
          </button>
        </div>
      </TableCell>

      <TableCell className="min-w-[22rem] border-r border-neutral-200 !px-4 py-3">
        <div className="relative overflow-hidden">
          {guides}
          <div style={{ paddingLeft: `${row.depth * indent}px` }} className={hasChildren ? 'font-semibold flex items-center gap-2' : 'flex items-center gap-2'}>
            <span className={hasChildren ? '' : 'text-neutral-700'}>{row.item.name ?? 'Item'}</span>
          </div>
        </div>
      </TableCell>

      <TableCell className="w-[110px] min-w-[110px] border-r border-neutral-200 !px-4 py-3">
        <Badge variant={row.item.active ? 'default' : 'secondary'} className="text-xs">
          {row.item.active ? 'Ativo' : 'Inativo'}
        </Badge>
      </TableCell>

      <TableCell className="w-[12.5rem] min-w-[12.5rem] border-r border-neutral-200 !px-4 py-3">
        <span className="text-sm text-muted-foreground">{fmtDate(row.item.createdAt) || '-'}</span>
      </TableCell>

      <TableCell className="w-[12.5rem] min-w-[12.5rem] border-r border-neutral-200 !px-4 py-3">
        <span className="text-sm text-muted-foreground">{fmtDate(row.item.updatedAt) || '-'}</span>
      </TableCell>
    </TableRow>
  )
}

export function StoreMenuItemsSheet({ storeMenuId, storeMenuName }: { storeMenuId: number, storeMenuName?: string }) {
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [ordered, setOrdered] = useState<FlatMenuItem[]>([])
  const [reorderingId, setReorderingId] = useState<number | null>(null)
  const [activeGroup, setActiveGroup] = useState<{ parentKey: number; depth: number } | null>(null)

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['store-menu-items', storeMenuId],
    queryFn: async () => {
      const response = await privateInstance.get(`/tenant/store-menus/${storeMenuId}/items`, {
        params: { page: 1, limit: 100, sortBy: 'createdAt', orderBy: 'desc' },
      })
      if (response.status !== 200) throw new Error('Erro ao carregar itens do menu')
      return response.data as StoreMenuItemsResponse
    },
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 0,
    enabled: open && Number.isFinite(storeMenuId) && storeMenuId > 0,
  })

  const items: StoreMenuItem[] = useMemo(() => {
    const d: any = data
    if (!d) return []
    const raw = Array.isArray(d.items) ? d.items : []
    return raw.map((i: any) => ({
      id: Number(i.id),
      name: String(i.name ?? ''),
      active: Boolean(i.active ?? true),
      parentId: i.parentId == null ? null : Number(i.parentId),
      path: String(i.path ?? ''),
      order: Number(i.order ?? 0),
      storeMenu: {
        id: Number(i.storeMenu?.id ?? storeMenuId),
        name: String(i.storeMenu?.name ?? ''),
      },
      store: {
        id: Number(i.store?.id ?? 0),
        name: String(i.store?.name ?? ''),
      },
      createdAt: String(i.createdAt ?? ''),
      updatedAt: String(i.updatedAt ?? ''),
    }))
  }, [data, storeMenuId])

  const { flattened, childrenCountMap } = useMemo(() => {
    const byId = new Map<number, StoreMenuItem>()
    const childrenMap = new Map<number, number[]>()
    const roots: number[] = []

    const getParent = (i: StoreMenuItem) => {
      const raw = i.parentId
      if (raw == null) return null
      const n = Number(raw)
      return Number.isFinite(n) && n > 0 ? n : null
    }

    for (const i of items) {
      byId.set(i.id, i)
      childrenMap.set(i.id, [])
    }

    for (const i of items) {
      const parentId = getParent(i)
      if (parentId && childrenMap.has(parentId)) {
        childrenMap.get(parentId)!.push(i.id)
      } else {
        roots.push(i.id)
      }
    }

    const compareIds = (a: number, b: number) => {
      const ia = byId.get(a)
      const ib = byId.get(b)
      if (!ia || !ib) return a - b

      const ao = Number.isFinite(ia.order) ? ia.order : Number.MAX_SAFE_INTEGER
      const bo = Number.isFinite(ib.order) ? ib.order : Number.MAX_SAFE_INTEGER
      if (ao !== bo) return ao - bo

      const ap = ia.path ?? ''
      const bp = ib.path ?? ''
      if (ap !== bp) return ap.localeCompare(bp, 'pt-BR', { numeric: true, sensitivity: 'base' })

      const an = ia.name ?? ''
      const bn = ib.name ?? ''
      if (an !== bn) return an.localeCompare(bn, 'pt-BR', { numeric: true, sensitivity: 'base' })

      return ia.id - ib.id
    }

    roots.sort(compareIds)
    for (const [parent, children] of childrenMap.entries()) {
      if (children.length > 1) children.sort(compareIds)
      childrenMap.set(parent, children)
    }

    const countMap = new Map<number, number>()
    for (const [parent, children] of childrenMap.entries()) {
      if (children.length > 0) countMap.set(parent, children.length)
    }

    const res: FlatMenuItem[] = []
    const visit = (id: number, depth: number) => {
      const item = byId.get(id)
      if (!item) return
      res.push({ id: item.id, item, depth })
      for (const childId of childrenMap.get(id) ?? []) {
        visit(childId, depth + 1)
      }
    }

    for (const root of roots) visit(root, 0)

    return { flattened: res, childrenCountMap: countMap }
  }, [items])

  const fmtDate = (v?: string) => {
    if (!v) return '-'
    try {
      const d = new Date(v)
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d)
    } catch {
      return v
    }
  }

  const selectedItem = useMemo(() => items.find((i) => i.id === selectedId) ?? null, [items, selectedId])

  const indent = 22

  const orderedKey = useMemo(() => flattened.map((f) => `${f.id}:${f.item.order}:${f.item.parentId ?? 0}`).join('|'), [flattened])
  useEffect(() => {
    if (!open) return
    setOrdered(flattened)
  }, [open, orderedKey])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const groupById = useMemo(() => {
    const map = new Map<number, { parentKey: number; depth: number }>()
    for (const r of ordered) {
      map.set(r.id, { parentKey: r.item.parentId == null ? 0 : r.item.parentId, depth: r.depth })
    }
    return map
  }, [ordered])

  const collisionDetection: CollisionDetection = useMemo(() => {
    return (args) => {
      if (!activeGroup) return closestCenter(args)
      const filtered = args.droppableContainers.filter((c) => {
        const g = groupById.get(Number(c.id))
        return !!g && g.parentKey === activeGroup.parentKey && g.depth === activeGroup.depth
      })
      return closestCenter({ ...args, droppableContainers: filtered })
    }
  }, [activeGroup, groupById])

  const handleDragStart = (event: DragStartEvent) => {
    const id = Number(event.active.id)
    const g = groupById.get(id) ?? null
    setActiveGroup(g)
  }

  const handleDragCancel = (_event: DragCancelEvent) => {
    setActiveGroup(null)
  }

  const buildBlockMap = (rows: FlatMenuItem[]) => {
    const map = new Map<number, { start: number; end: number; parentKey: number; depth: number }>()
    for (let i = 0; i < rows.length; i++) {
      const cur = rows[i]
      const parentKey = cur.item.parentId == null ? 0 : cur.item.parentId
      let end = i + 1
      for (let j = i + 1; j < rows.length; j++) {
        if (rows[j].depth <= cur.depth) break
        end = j + 1
      }
      map.set(cur.id, { start: i, end, parentKey, depth: cur.depth })
    }
    return map
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveGroup(null)
    const { active, over } = event
    if (!over) return
    const activeId = Number(active.id)
    const overId = Number(over.id)
    if (!Number.isFinite(activeId) || !Number.isFinite(overId) || activeId === overId) return
    if (reorderingId != null) return

    const previous = ordered
    const blocks = buildBlockMap(previous)
    const a = blocks.get(activeId)
    const b = blocks.get(overId)
    if (!a || !b) return

    if (a.parentKey !== b.parentKey || a.depth !== b.depth) {
      toast.error('Só é possível reordenar itens no mesmo nível e com o mesmo pai.')
      return
    }

    const activeBlock = previous.slice(a.start, a.end)
    const remaining = [...previous.slice(0, a.start), ...previous.slice(a.end)]

    const removedSize = a.end - a.start
    const movingDown = a.start < b.start
    const overStartAdjusted = movingDown ? b.start - removedSize : b.start
    const overEndAdjusted = movingDown ? b.end - removedSize : b.end
    const insertBaseIndex = movingDown ? overEndAdjusted : overStartAdjusted
    const insertIndex = Math.max(0, Math.min(insertBaseIndex, remaining.length))
    const next = [...remaining.slice(0, insertIndex), ...activeBlock, ...remaining.slice(insertIndex)]

    setOrdered(next)

    const depth = a.depth
    const parentKey = a.parentKey
    const siblingsAtDepth: number[] = []
    for (const r of next) {
      const rk = r.item.parentId == null ? 0 : r.item.parentId
      if (rk === parentKey && r.depth === depth) siblingsAtDepth.push(r.id)
    }
    const newSiblingIndex = siblingsAtDepth.indexOf(activeId)
    if (newSiblingIndex < 0) return

    try {
      setReorderingId(activeId)
      await privateInstance.put(`/tenant/store-menus/${storeMenuId}/items/${activeId}/order`, {
        order: newSiblingIndex + 1,
      })
      await refetch()
      toast.success('Ordem atualizada com sucesso')
    } catch (error: any) {
      setOrdered(previous)
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao atualizar ordem', {
        description: errorData?.detail || 'Não foi possível atualizar a ordem.'
      })
    } finally {
      setReorderingId(null)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (o) { setSelectedId(null); refetch() } }}>
      <SheetTrigger asChild>
        <Button size={'sm'} variant={'outline'}>
          <ListTree className="size-[0.85rem]" /> Itens
        </Button>
      </SheetTrigger>
      <SheetContent className='w-full sm:max-w-[1100px] p-0'>
        <SheetHeader className='px-4 py-4'>
          <SheetTitle>Itens do menu</SheetTitle>
          <SheetDescription>{storeMenuName ? `Menu: ${storeMenuName}` : `Menu #${storeMenuId}`}</SheetDescription>
        </SheetHeader>

        <div className='flex flex-col flex-1 overflow-hidden'>
          <div className='flex items-center gap-2 px-4 justify-end'>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1"
              onClick={() => { setSelectedId(null); refetch() }}
              disabled={isLoading || isRefetching}
            >
              {isLoading || isRefetching ? (
                <RefreshCw className="size-[0.85rem] animate-spin" />
              ) : (
                <RefreshCw className="size-[0.85rem]" />
              )}
              <span className="hidden sm:inline">Atualizar</span>
            </Button>

            {selectedItem ? (
              <>
                <StoreMenuItemEditDialog storeMenuId={storeMenuId} itemId={selectedItem.id} parentOptions={items} onUpdated={() => { refetch() }} />
                <StoreMenuItemDeleteDialog storeMenuId={storeMenuId} itemId={selectedItem.id} onDeleted={() => { setSelectedId(null); refetch() }} />
              </>
            ) : (
              <>
                <Button size={'sm'} variant={'outline'} disabled><IconEdit className="size-[0.85rem]" /> Editar</Button>
                <Button size={'sm'} variant={'outline'} disabled><IconTrash className="size-[0.85rem]" /> Excluir</Button>
              </>
            )}

            <StoreMenuItemCreateDialog storeMenuId={storeMenuId} parentOptions={items} onCreated={() => { refetch() }} />
          </div>

          <div className='mt-2 mb-0 flex-1 flex flex-col min-h-0 overflow-hidden border-t'>
            <DndContext
              sensors={sensors}
              collisionDetection={collisionDetection}
              modifiers={[restrictToVerticalAxis, restrictToFirstScrollableAncestor]}
              onDragStart={handleDragStart}
              onDragCancel={handleDragCancel}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={ordered.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                <div className="w-full flex-1 min-h-0 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60px] border-r !px-2" />
                        <TableHead className="w-[38px] border-r !px-2" />
                        <TableHead className="min-w-[22rem] border-r border-neutral-200 px-4 py-2.5">Nome</TableHead>
                        <TableHead className="w-[110px] min-w-[110px] border-r border-neutral-200 px-4 py-2.5">Status</TableHead>
                        <TableHead className="w-[12.5rem] min-w-[12.5rem] border-r border-neutral-200 px-4 py-2.5">Criado em</TableHead>
                        <TableHead className="w-[12.5rem] min-w-[12.5rem] border-r border-neutral-200 px-4 py-2.5">Atualizado em</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ordered.map((row) => (
                        <SortableMenuRow
                          key={row.id}
                          row={row}
                          selected={selectedId === row.item.id}
                          onSelect={() => setSelectedId(selectedId === row.item.id ? null : row.item.id)}
                          onRowClick={() => setSelectedId(row.item.id)}
                          childrenCount={childrenCountMap.get(row.item.id) ?? 0}
                          indent={indent}
                          fmtDate={fmtDate}
                          disabled={isLoading || isRefetching || reorderingId != null}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </div>

        <SheetFooter className='border-t'>
          <div className='flex w-full items-center justify-end'>
            <SheetClose asChild>
              <Button variant='outline' size="sm" className='w-fit'>Fechar</Button>
            </SheetClose>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

