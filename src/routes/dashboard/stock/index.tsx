import { createFileRoute } from '@tanstack/react-router'
import { Topbar } from '../-components/topbar'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { RefreshCw, Package } from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { privateInstance } from '@/lib/auth'
import { DataTable } from '@/components/data-table'
import type { ColumnDef } from '@/components/data-table'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'
import { NewStockMovementSheet } from './-components/new-stock-movement-sheet'
import { Badge } from '@/components/ui/badge'
import { formatStockQuantity } from '@/lib/format'


export const Route = createFileRoute('/dashboard/stock/')({
  component: RouteComponent,
})

type StockMovement = {
  id: number
  createdAt: string
  updatedAt: string
  amount: number
  product: { id: number, sku: string | null, name: string }
  warehouse: { id: number, name: string }
  type: string
  stockType: string
  observation?: string
}

type StockMovementsResponse = {
  page: number
  limit: number
  totalPages: number
  total: number
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
    refetchOnMount: true,
    queryKey: ['stock-movements', currentPage, perPage],
    queryFn: async () => {
      const response = await privateInstance.get('/tenant/stock-moviments', {
        params: {
          page: currentPage,
          limit: Math.min(100, perPage),
          sortBy: 'createdAt',
          orderBy: 'desc',
        },
      })
      if (response.status !== 200) {
        throw new Error('Erro ao carregar movimentos de estoque')
      }
      return response.data as StockMovementsResponse
    }
  })

  const [movements, setMovements] = useState<StockMovement[]>([])

  const fmtDateTime = (v?: string) => {
    if (!v) return '-'
    try {
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(v))
    } catch {
      return new Date(v).toLocaleDateString('pt-BR')
    }
  }

  const columns: ColumnDef<StockMovement>[] = useMemo(() => [
    {
      id: 'select',
      width: '60px',
      header: () => (<div className='flex items-center justify-center text-xs text-muted-foreground'>Sel.</div>),
      cell: (item) => (
        <div className='flex items-center justify-center'>
          <Checkbox
            checked={selectedId === item.id}
            onCheckedChange={() => setSelectedId(selectedId === item.id ? null : item.id)}
          />
        </div>
      ),
      headerClassName: 'w-[60px] min-w-[60px] border-r',
      className: 'w-[60px] min-w-[60px] border-r'
    },
    {
      id: 'type',
      header: 'Tipo',
      cell: (item) => {
        const isInflow = item.type === 'in'
        const isInflowOrOutflow = item.type === 'in' || item.type === 'out'

        if (!isInflowOrOutflow) {
          return <span className='capitalize'>{item.type}</span>
        }

        return (
          <Badge variant={isInflow ? 'default' : 'destructive'} className="h-5 text-[10px]">
            {isInflow ? 'Entrada' : 'Saída'}
          </Badge>
        )
      },
      width: '100px',
      headerClassName: 'w-[100px] min-w-[100px] border-r',
      className: 'w-[100px] min-w-[100px] border-r text-center'
    },
    {
      id: 'stockType',
      header: 'Tipo de Estoque',
      cell: (item) => {
        const label = item.stockType === 'reserved' ? 'Reservado' : 'Físico'
        return (
          <Badge variant="outline" className="h-5 text-[10px]">
            {label}
          </Badge>
        )
      },
      width: '140px',
      headerClassName: 'w-[140px] min-w-[140px] border-r',
      className: 'w-[140px] min-w-[140px] border-r text-center'
    },
    {
      id: 'product_sku',
      header: 'SKU',
      cell: (item) => {
        const sku = item.product?.sku
        const t = sku ?? undefined
        return <span className='block truncate min-w-0' title={t}>{sku ?? '—'}</span>
      },
      width: '120px',
      headerClassName: 'w-[120px] min-w-[120px] border-r',
      className: 'w-[120px] min-w-[120px] border-r font-mono'
    },
    {
      id: 'product_name',
      header: 'Produto',
      cell: (item) => {
        const name = item.product?.name
        return <span className='block truncate min-w-0' title={name}>{name ?? '—'}</span>
      },
      width: '280px',
      headerClassName: 'w-[280px] min-w-[280px] border-r',
      className: 'w-[280px] min-w-[280px] border-r'
    },
    {
      id: 'distribution_center_name',
      header: 'Centro de Distribuição',
      cell: (item) => {
        const name = item.warehouse?.name
        return <span className='block truncate min-w-0' title={name}>{name ?? '—'}</span>
      },
      width: '200px',
      headerClassName: 'w-[200px] min-w-[200px] border-r',
      className: 'w-[200px] min-w-[200px] border-r'
    },
    {
      id: 'created_at',
      header: 'Data de lançamento',
      cell: (item) => (
        <span className='text-sm'>{fmtDateTime(item.createdAt)}</span>
      ),
      width: '180px',
      headerClassName: 'w-[180px] min-w-[180px] border-r',
      className: 'w-[180px] min-w-[180px] border-r'
    },
    {
      id: 'amount',
      header: 'Quantidade',
      cell: (item) => {
        const qtyType = item.amount % 100 === 0 ? 'int' : 'decimal'
        return <span className='font-medium tabular-nums'>{formatStockQuantity(qtyType, item.amount)}</span>
      },
      width: '100px',
      headerClassName: 'w-[100px] min-w-[100px] border-r',
      className: 'w-[100px] min-w-[100px] border-r text-center font-medium'
    },
    {
      id: 'observation',
      header: 'Observação',
      cell: (item) => (
        <span className='block truncate min-w-0 text-muted-foreground' title={item.observation}>{item.observation || '—'}</span>
      ),
      width: '200px',
      headerClassName: 'w-[200px] min-w-[200px] border-r',
      className: 'w-[200px] min-w-[200px] border-r text-muted-foreground'
    },
  ], [selectedId])

  useEffect(() => {
    if (!data) return

    const rawItems = Array.isArray(data.items) ? data.items : []
    const items: StockMovement[] = rawItems.map((item: any) => ({
      id: item.id,
      createdAt: item.createdAt ?? item.created_at,
      updatedAt: item.updatedAt ?? item.updated_at,
      amount: item.amount,
      type: item.type,
      stockType: item.stockType ?? item.stock_type ?? '',
      observation: item.observation,
      product: {
        id: item.product?.id ?? item.productId ?? item.product_id,
        sku: item.product?.sku ?? item.productSku ?? item.product_sku ?? null,
        name: item.product?.name ?? item.productName ?? item.product_name ?? ''
      },
      warehouse: {
        id: item.warehouse?.id ?? item.warehouseId ?? item.warehouse_id ?? item.distribution_center_id,
        name: item.warehouse?.name ?? item.warehouseName ?? item.warehouse_name ?? item.distribution_center_name ?? ''
      }
    }))

    setMovements(items)

    const itemsTotal = typeof data.total === 'number' ? data.total : items.length
    setTotalItems(itemsTotal)

    const pageTotal = typeof data.totalPages === 'number' ? data.totalPages : Math.max(1, Math.ceil(itemsTotal / perPage))
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

      <Topbar title="Movimentos de estoque" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard', isLast: false }, { label: 'Movimentos de estoque', href: '/dashboard/stock', isLast: true }]} />

      <div className='flex flex-col w-full h-full flex-1 overflow-hidden'>
        <div className='flex w-full items-center justify-end gap-4 p-2'>
          <div className='flex items-center gap-2'>
            <Button variant='ghost' size='sm' disabled={isLoading || isRefetching} onClick={() => refetch()}>
              <RefreshCw className={`size-[0.85rem] ${isRefetching ? 'animate-spin' : ''}`} />
            </Button>
            <NewStockMovementSheet onCreated={() => refetch()} />
          </div>
        </div>

        <div className='flex-1 overflow-hidden'>
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
                  <EmptyMedia>
                    <Package className='size-10' />
                  </EmptyMedia>
                  <EmptyTitle>Nenhum movimento encontrado</EmptyTitle>
                  <EmptyDescription>Cadastre um novo movimento para começar.</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <NewStockMovementSheet onCreated={() => refetch()} />
                </EmptyContent>
              </Empty>
            )}
            onRowClick={(row) => setSelectedId(selectedId === row.id ? null : row.id)}
            onChange={({ page, perPage }) => {
              if (typeof page === 'number') setCurrentPage(page)
              if (typeof perPage === 'number') setPerPage(perPage)
            }}
          />
        </div>
      </div>
    </div>
  )
}
