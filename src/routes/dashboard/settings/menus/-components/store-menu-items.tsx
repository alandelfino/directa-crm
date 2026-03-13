import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { RefreshCw, ListTree } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTable, type ColumnDef } from '@/components/data-table'
import { privateInstance } from '@/lib/auth'
import { Badge } from '@/components/ui/badge'
import { StoreMenuItemCreateDialog } from './store-menu-item-create-dialog'
import { StoreMenuItemEditDialog } from './store-menu-item-edit-dialog'
import { StoreMenuItemDeleteDialog } from './store-menu-item-delete-dialog'
import { IconEdit, IconTrash } from '@tabler/icons-react'

type StoreMenuItem = {
  id: number
  name: string
  active: boolean
  parentId: number | null
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

export function StoreMenuItemsSheet({ storeMenuId, storeMenuName }: { storeMenuId: number, storeMenuName?: string }) {
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)

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

  const columns: ColumnDef<FlatMenuItem>[] = [
    {
      id: 'select',
      width: '60px',
      header: () => (<div className="flex justify-center items-center" />),
      cell: (row) => (
        <div className="flex justify-center items-center" onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={selectedId === row.item.id} onCheckedChange={() => setSelectedId(selectedId === row.item.id ? null : row.item.id)} />
        </div>
      ),
      headerClassName: 'w-[60px] border-r !px-2',
      className: 'font-medium border-r !p-0 !px-2'
    },
    {
      id: 'name',
      header: 'Nome',
      cell: (row) => {
        const hasChildren = (childrenCountMap.get(row.item.id) ?? 0) > 0
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
          <div className="relative overflow-hidden">
            {guides}
            <div style={{ paddingLeft: `${row.depth * indent}px` }} className={hasChildren ? 'font-semibold flex items-center gap-2' : 'flex items-center gap-2'}>
              <span className={hasChildren ? '' : 'text-neutral-700'}>{row.item.name ?? 'Item'}</span>
            </div>
          </div>
        )
      },
      headerClassName: 'min-w-[22rem] border-r border-neutral-200 px-4 py-2.5',
      className: 'min-w-[22rem] border-r border-neutral-200 !px-4 py-3'
    },
    {
      id: 'active',
      header: 'Status',
      width: '110px',
      cell: (row) => (
        <Badge variant={row.item.active ? 'default' : 'secondary'} className="text-xs">
          {row.item.active ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
      headerClassName: 'w-[110px] min-w-[110px] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[110px] min-w-[110px] border-r border-neutral-200 !px-4 py-3'
    },
    {
      id: 'createdAt',
      header: 'Criado em',
      width: '12.5rem',
      cell: (row) => <span className='text-sm text-muted-foreground'>{fmtDate(row.item.createdAt) || '-'}</span>,
      headerClassName: 'w-[12.5rem] min-w-[12.5rem] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[12.5rem] min-w-[12.5rem] border-r border-neutral-200 !px-4 py-3'
    },
    {
      id: 'updatedAt',
      header: 'Atualizado em',
      width: '12.5rem',
      cell: (row) => <span className='text-sm text-muted-foreground'>{fmtDate(row.item.updatedAt) || '-'}</span>,
      headerClassName: 'w-[12.5rem] min-w-[12.5rem] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[12.5rem] min-w-[12.5rem] border-r border-neutral-200 !px-4 py-3'
    },
  ]

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

          <div className='mt-2 mb-0 flex-1 flex flex-col overflow-hidden border-t'>
            <DataTable<FlatMenuItem>
              columns={columns}
              data={flattened}
              loading={isLoading || isRefetching}
              hideFooter={true}
              onRowClick={(row) => setSelectedId(row.item.id)}
              rowClassName="cursor-pointer"
            />
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

