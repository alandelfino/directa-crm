import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { DataTable, type ColumnDef } from '@/components/data-table'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'
import { RefreshCw, Edit, Store as StoreIcon, ArrowUpRight } from 'lucide-react'
import { privateInstance } from '@/lib/auth'
import { Checkbox } from '@/components/ui/checkbox'
import { EditStoreSheet } from './-components/edit-store'
import { NewStoreSheet } from './-components/new-store'
 

type StoreItem = {
  id: number
  name?: string
  description?: string
  price_table_name?: string
  created_at?: number
  updated_at?: number | null
  company_id?: number
  active?: boolean
}

type StoresResponse = {
  itemsReceived?: number
  curPage?: number
  nextPage?: number | null
  prevPage?: number | null
  offset?: number
  perPage?: number
  itemsTotal?: number
  pageTotal?: number
  items?: StoreItem[]
} | StoreItem[]

function normalizeStores(resp?: StoresResponse) {
  if (!resp) return { items: [], totalItems: 0 }
  if (Array.isArray(resp)) return { items: resp, totalItems: resp.length }
  const items = Array.isArray(resp.items) ? resp.items : []
  const totalItems = typeof resp.itemsTotal === 'number' ? resp.itemsTotal : items.length
  return { items, totalItems }
}

export const Route = createFileRoute('/dashboard/settings/stores/')({
  component: RouteComponent,
})

function RouteComponent() {
  const [selected, setSelected] = useState<number[]>([])
  const [items, setItems] = useState<StoreItem[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['stores', currentPage, perPage],
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryFn: async () => {
      const response = await privateInstance.get(`/api:gI4qBCGQ/stores?page=${currentPage}&per_page=${Math.min(50, perPage)}`)
      if (response.status !== 200) throw new Error('Erro ao carregar lojas')
      return response.data as StoresResponse
    }
  })

  useEffect(() => {
    if (!data) {
      setItems([])
      setTotalItems(0)
      return
    }
    const normalized = normalizeStores(data as StoresResponse)
    setItems(normalized.items)
    setTotalItems(normalized.totalItems)
    const pageTotal = Math.max(1, Math.ceil(normalized.totalItems / Math.max(1, perPage)))
    setTotalPages(pageTotal)
  }, [data])

  useEffect(() => {
    setSelected([])
  }, [currentPage, perPage])

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])

  const normalizeEpoch = (v?: number): number | undefined => {
    if (typeof v !== 'number' || !Number.isFinite(v)) return undefined
    const abs = Math.abs(v)
    if (abs < 1e11) return Math.round(v * 1000)
    if (abs > 1e14) return Math.round(v / 1000)
    return v
  }
  const fmtDateOnly = (v?: number) => {
    const ms = normalizeEpoch(v)
    if (!ms) return '-'
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      const d = new Date(ms)
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(d)
      const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
      const dd = get('day')
      const MM = get('month')
      const yyyy = get('year')
      return `${dd}/${MM}/${yyyy}`
    } catch {
      const d = new Date(ms)
      return d.toLocaleDateString('pt-BR')
    }
  }

  const columns: ColumnDef<StoreItem>[] = useMemo(() => [
    {
      id: 'select',
      width: '60px',
      header: () => (<div className='flex justify-center items-center text-xs text-neutral-500'>Sel.</div>),
      cell: (row) => (
        <div className='flex justify-center items-center'>
          <Checkbox checked={selected.includes(row.id)} onCheckedChange={() => { if (selected.includes(row.id)) setSelected([]); else setSelected([row.id]) }} />
        </div>
      ),
      headerClassName: 'w-[60px] min-w-[60px] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[60px] min-w-[60px] border-r border-neutral-200 !px-4 py-3'
    },
    {
      id: 'name',
      header: 'Nome',
      cell: (s) => s.name ?? '—',
      headerClassName: 'min-w-[15rem] border-r border-neutral-200 px-4 py-2.5',
      className: 'min-w-[15rem] border-r border-neutral-200 !px-4 py-3'
    },
    {
      id: 'created_at',
      header: 'Criado em',
      width: '12.5rem',
      cell: (s) => {
        const d = fmtDateOnly(s.created_at)
        return (
          <span className='text-sm'>{d || '-'}</span>
        )
      },
      headerClassName: 'w-[12.5rem] min-w-[12.5rem] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[12.5rem] min-w-[12.5rem] border-r border-neutral-200 !px-4 py-3'
    },
    {
      id: 'status',
      header: 'Status',
      width: '6.25rem',
      cell: (s) => {
        const active = s.active === true
        return (
          <span
            className={
              active
                ? 'inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-green-50 text-green-600'
                : 'inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 text-gray-700'
            }
          >
            <span className={active ? 'h-1.5 w-1.5 rounded-full bg-green-600' : 'h-1.5 w-1.5 rounded-full bg-gray-500'} />
            {active ? 'Ativo' : 'Inativo'}
          </span>
        )
      },
      headerClassName: 'w-[6.25rem] min-w-[6.25rem] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[6.25rem] min-w-[6.25rem] border-r border-neutral-200 !px-4 py-3'
    },
  ], [selected])

  return (
    <div className='flex flex-col w-full h-full'>
      <div className='flex items-center justify-between p-4'>
        <div className='flex flex-col'>
          <h2 className='text-lg font-semibold'>Lojas</h2>
          <p className='text-sm text-muted-foreground'>Gerencie as lojas da conta.</p>
        </div>
        <div className='flex items-center gap-2'>
          <Button variant={'ghost'} disabled={isLoading || isRefetching} onClick={() => { setSelected([]); refetch() }}>
            {(isLoading || isRefetching) ? (<RefreshCw className='animate-spin' />) : (<RefreshCw />)}
          </Button>
          {selected.length === 1 ? (
            <EditStoreSheet storeId={selected[0]} onSaved={() => { setSelected([]); refetch() }} />
          ) : (
            <Button variant={'outline'} disabled>
              <Edit /> Editar
            </Button>
          )}
          <NewStoreSheet onCreated={() => { setSelected([]); refetch() }} />
        </div>
      </div>

      <div className='flex flex-col w-full h-full flex-1 overflow-hidden pl-4'>
        <div className='border-t border-l border-neutral-200 rounded-tl-lg overflow-hidden h-full flex flex-col flex-1'>
          <DataTable
            columns={columns}
            data={items}
            loading={isLoading || isRefetching}
            skeletonCount={3}
            page={currentPage}
            perPage={perPage}
            totalItems={totalItems}
            rowClassName='h-12'
            emptyMessage='Nenhuma loja encontrada'
            emptySlot={(
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <StoreIcon className='h-6 w-6' />
                  </EmptyMedia>
                  <EmptyTitle>Nenhuma loja ainda</EmptyTitle>
                  <EmptyDescription>
                    Você ainda não criou nenhuma loja. Comece criando sua primeira loja.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <div className='flex gap-2'>
                    <NewStoreSheet onCreated={() => { setSelected([]); refetch() }} />
                    <Button variant={'ghost'} size="sm" disabled={isLoading || isRefetching} onClick={() => { setSelected([]); refetch() }}>
                      {(isLoading || isRefetching) ? <RefreshCw className='animate-spin size-[0.85rem]' /> : <RefreshCw className="size-[0.85rem]" />}
                    </Button>
                  </div>
                </EmptyContent>
                <Button variant='link' asChild className='text-muted-foreground'>
                  <a href='#'>
                    Saiba mais <ArrowUpRight className='inline-block ml-1 h-4 w-4' />
                  </a>
                </Button>
              </Empty>
            )}
            onChange={({ page, perPage }) => {
              if (typeof page === 'number') setCurrentPage(page)
              if (typeof perPage === 'number') setPerPage(perPage)
              refetch()
            }}
          />
        </div>
      </div>
    </div>
  )
}
