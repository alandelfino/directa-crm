import { createFileRoute } from '@tanstack/react-router'
import { Topbar } from '../-components/topbar'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Funnel, RefreshCw, Package } from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { privateInstance } from '@/lib/auth'
import { DataTable } from '@/components/data-table'
import type { ColumnDef } from '@/components/data-table'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'


export const Route = createFileRoute('/dashboard/stock/')({
  component: RouteComponent,
})

type StockMovement = {
  id: number
  created_at: number
  updated_at: number
  amount: number
  product_id: number
  distribution_center_id: number
  company_id: number
  type: 'inflow' | 'outflow' | string
  product_sku: string
  product_name: string
  distribution_center_name?: string
}

type StockMovementsResponse = {
  itemsReceived: number
  curPage: number
  nextPage: number | null
  prevPage: number | null
  offset: number
  perPage: number
  itemsTotal: number
  pageTotal: number
  items: StockMovement[]
}

function RouteComponent() {
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const { data, isLoading, isRefetching, isError, refetch } = useQuery({
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryKey: ['stock-movements', currentPage, perPage],
    queryFn: async () => {
      const response = await privateInstance.get(`/api:u5l6DcFV/stock-moviments?page=${currentPage}&per_page=${Math.min(50, perPage)}`)
      if (response.status !== 200) {
        throw new Error('Erro ao carregar movimentos de estoque')
      }
      return await response.data as StockMovementsResponse
    }
  })

  const [movements, setMovements] = useState<StockMovement[]>([])

  const normalizeEpoch = (v?: number): number | undefined => {
    if (typeof v !== 'number' || !Number.isFinite(v)) return undefined
    const abs = Math.abs(v)
    if (abs < 1e11) return Math.round(v * 1000)
    if (abs > 1e14) return Math.round(v / 1000)
    return v
  }

  const fmtDateTime = (v?: number) => {
    const ms = normalizeEpoch(v)
    if (!ms) return '-'
    try {
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(ms))
    } catch {
      return new Date(ms).toLocaleDateString('pt-BR')
    }
  }

  const columns: ColumnDef<StockMovement>[] = useMemo(() => [
    {
      id: 'select',
      width: '60px',
      header: () => (<div className='flex justify-center items-center text-xs text-neutral-500'>Sel.</div>),
      cell: (item) => (
        <div className='flex justify-center items-center'>
          <Checkbox 
            checked={selectedId === item.id} 
            onCheckedChange={() => setSelectedId(selectedId === item.id ? null : item.id)} 
          />
        </div>
      ),
      headerClassName: 'w-[60px] min-w-[60px] border-r',
      className: 'w-[60px] min-w-[60px] p-2!'
    },
    {
      id: 'type',
      header: 'Tipo',
      cell: (item) => {
        const isInflow = item.type === 'inflow'
        const isInflowOrOutflow = item.type === 'inflow' || item.type === 'outflow'
        
        if (!isInflowOrOutflow) {
          return <span className='capitalize'>{item.type}</span>
        }

        return (
          <span
            className={
              isInflow
                ? 'inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-green-50 text-green-600 text-xs font-medium'
                : 'inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-medium'
            }
          >
            <span className={isInflow ? 'h-1.5 w-1.5 rounded-full bg-green-600' : 'h-1.5 w-1.5 rounded-full bg-red-600'} />
            {isInflow ? 'Entrada' : 'Saída'}
          </span>
        )
      },
      width: '100px',
      headerClassName: 'w-[100px] min-w-[100px] border-r',
      className: 'w-[100px] min-w-[100px] p-2!'
    },
    {
      id: 'product_sku',
      header: 'SKU',
      cell: (item) => <span className='block truncate min-w-0' title={item.product_sku}>{item.product_sku}</span>,
      width: '120px',
      headerClassName: 'w-[120px] min-w-[120px] border-r',
      className: 'w-[120px] min-w-[120px] p-2!'
    },
    {
      id: 'product_name',
      header: 'Produto',
      cell: (item) => <span className='block truncate min-w-0' title={item.product_name}>{item.product_name}</span>,
      width: '280px',
      headerClassName: 'w-[280px] min-w-[280px] border-r',
      className: 'w-[280px] min-w-[280px] p-2!'
    },
    {
      id: 'distribution_center_name',
      header: 'Centro de Distribuição',
      cell: (item) => <span className='block truncate min-w-0' title={item.distribution_center_name}>{item.distribution_center_name ?? '—'}</span>,
      width: '200px',
      headerClassName: 'w-[200px] min-w-[200px] border-r',
      className: 'w-[200px] min-w-[200px] p-2!'
    },
    {
      id: 'created_at',
      header: 'Data de lançamento',
      cell: (item) => (
        <span className='text-sm'>{fmtDateTime(item.created_at)}</span>
      ),
      width: '180px',
      headerClassName: 'w-[180px] min-w-[180px] border-r',
      className: 'w-[180px] min-w-[180px] p-2!'
    },
    {
      id: 'amount',
      header: 'Quantidade',
      cell: (item) => (
        <span className='font-medium'>{item.amount}</span>
      ),
      width: '100px',
      headerClassName: 'w-[100px] min-w-[100px] border-r',
      className: 'w-[100px] min-w-[100px] p-2!'
    },
  ], [selectedId])

  useEffect(() => {
    if (!data) return

    const items = Array.isArray(data.items) ? data.items : []
    setMovements(items)

    const itemsTotal = typeof data.itemsTotal === 'number' ? data.itemsTotal : items.length
    setTotalItems(itemsTotal)

    const pageTotal = typeof data.pageTotal === 'number' ? data.pageTotal : Math.max(1, Math.ceil(itemsTotal / perPage))
    setTotalPages(pageTotal)
  }, [data, perPage])

  useEffect(() => {
    if (isError) {
      toast.error('Erro ao carregar movimentos de estoque')
    }
  }, [isError])

  // Garantir que a página atual está dentro dos limites
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])

  // Resetar seleção quando mudar de página
  useEffect(() => {
    setSelectedId(null)
  }, [currentPage, perPage, isRefetching])

  return (
    <div className='flex flex-col w-full h-full'>

      <Topbar title="Movimento de estoque" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard', isLast: false }, { label: 'Movimento de estoque', href: '/dashboard/stock', isLast: true }]} />

      {/* Content */}
      <div className='flex flex-col w-full h-full flex-1 overflow-hidden'>

        {/* Actions */}
        <div className='border-b flex w-full items-center p-2 gap-4'>

          {/* Filters */}
          <div className='flex items-center gap-2 flex-1'>
            <Button variant={'outline'} size="sm">
              <Funnel className="size-[0.85rem]" /> Filtros
            </Button>
          </div>

          <div className='flex items-center gap-2'>
            <Button variant={'ghost'} size="sm" disabled={isLoading || isRefetching} onClick={() => refetch()}>
              {
                (isLoading || isRefetching)
                  ? <RefreshCw className='animate-spin size-[0.85rem]' />
                  : <RefreshCw className="size-[0.85rem]" />
              }
            </Button>
          </div>

        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={movements}
          loading={isLoading || isRefetching}
          page={currentPage}
          perPage={perPage}
          totalItems={totalItems}
          emptyMessage='Nenhum movimento encontrado'
          emptySlot={(
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Package className='h-6 w-6' />
                </EmptyMedia>
                <EmptyTitle>Nenhum movimento ainda</EmptyTitle>
                <EmptyDescription>
                  Você ainda não possui registros de movimentação de estoque.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <div className='flex gap-2'>
                  <Button variant={'ghost'} size="sm" disabled={isLoading || isRefetching} onClick={() => refetch()}>
                    {(isLoading || isRefetching) ? <RefreshCw className='animate-spin size-[0.85rem]' /> : <RefreshCw className="size-[0.85rem]" />}
                  </Button>
                </div>
              </EmptyContent>
            </Empty>
          )}
          onChange={({ page, perPage }) => {
            if (typeof page === 'number') setCurrentPage(page)
            if (typeof perPage === 'number') setPerPage(perPage)
            // Disparar refetch quando houver mudança
            refetch()
          }} />

      </div>
    </div>
  )
}
