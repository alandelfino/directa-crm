import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Edit, RefreshCw, Trash, ClipboardList, ArrowUpRight } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { privateInstance } from '@/lib/auth'
import { DataTable, type ColumnDef } from '@/components/data-table'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'
import { NewOrderStatusSheet } from './-components/new-order-status'
import { EditOrderStatusSheet } from './-components/edit-order-status'
import { DeleteOrderStatus } from './-components/delete-order-status'
import { dataTime } from '@/lib/format'

export const Route = createFileRoute('/dashboard/settings/order-status/')({
  component: RouteComponent,
})

type OrderStatus = {
  id: number
  name: string
  createdAt: string
  updatedAt: string
}

type OrderStatusResponse = {
  page: number
  limit: number
  totalPages: number
  total: number
  items: OrderStatus[]
}

function RouteComponent() {
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [selectedItems, setSelectedItems] = useState<number[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const { data, isLoading, isRefetching, isError, error, refetch } = useQuery({
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    queryKey: ['order-status', currentPage, perPage],
    queryFn: async () => {
      const response = await privateInstance.get(`/tenant/order-status`, {
        params: {
          page: currentPage,
          limit: Math.min(100, perPage),
          sortBy: 'createdAt',
          orderBy: 'desc'
        }
      })
      if (response.status !== 200) {
        throw new Error('Erro ao carregar status de pedidos')
      }
      return response.data as OrderStatusResponse
    }
  })

  const [items, setItems] = useState<OrderStatus[]>([])

  const columns: ColumnDef<OrderStatus>[] = [
    {
      id: 'select',
      width: '60px',
      header: (
        <div className='flex justify-center items-center text-xs text-neutral-500'>Sel.</div>
      ),
      cell: (item) => (
        <div className='flex justify-center items-center'>
          <Checkbox
            checked={selectedItems.includes(item.id)}
            onCheckedChange={() => toggleSelectItem(item.id)}
          />
        </div>
      ),
      headerClassName: 'w-[60px] min-w-[60px] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[60px] min-w-[60px] border-r border-neutral-200 !px-4 py-3'
    },
    {
      id: 'id',
      header: 'ID',
      cell: (item) => <span className="font-mono text-xs">{item.id}</span>,
      width: '40px',
      headerClassName: 'w-[40px] min-w-[40px] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[40px] min-w-[40px] border-r border-neutral-200 !px-4 py-3'
    },
    {
      id: 'name',
      header: 'Nome',
      cell: (item) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">{item.name}</span>
        </div>
      ),
      headerClassName: 'border-r border-neutral-200 px-4 py-2.5',
      className: 'border-r border-neutral-200 !px-4 py-3'
    },
    {
      id: 'createdAt',
      header: 'Criado em',
      cell: (item) => <div>{dataTime(item.createdAt)}</div>,
      width: '12.5rem',
      headerClassName: 'w-[12.5rem] min-w-[12.5rem] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[12.5rem] min-w-[12.5rem] border-r border-neutral-200 !px-4 py-3'
    },
    {
      id: 'updatedAt',
      header: 'Atualizado em',
      cell: (item) => <div>{dataTime(item.updatedAt)}</div>,
      width: '12.5rem',
      headerClassName: 'w-[12.5rem] min-w-[12.5rem] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[12.5rem] min-w-[12.5rem] border-r border-neutral-200 !px-4 py-3'
    },
  ]

  useEffect(() => {
    if (!data) return

    const items = Array.isArray(data.items) ? data.items : []
    setItems(items)

    const itemsTotal = typeof data.total === 'number' ? data.total : items.length
    setTotalItems(itemsTotal)

    const pageTotal = typeof data.totalPages === 'number' ? data.totalPages : Math.max(1, Math.ceil(itemsTotal / perPage))
    setTotalPages(pageTotal)
  }, [data, perPage])

  useEffect(() => {
    if (isError) {
      const errorData = (error as any)?.response?.data
      toast.error(errorData?.title || 'Erro ao carregar status de pedidos', {
        description: errorData?.detail || 'Não foi possível carregar a lista de status de pedidos.'
      })
    }
  }, [isError, error])

  useEffect(() => {
    setSelectedItems([])
  }, [currentPage, perPage])

  useEffect(() => {
    if (isRefetching) {
      setSelectedItems([])
    }
  }, [isRefetching])

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])

  const toggleSelectItem = (itemId: number) => {
    if (selectedItems.includes(itemId)) {
      setSelectedItems([])
    } else {
      setSelectedItems([itemId])
    }
  }

  return (
    <div className='flex flex-col w-full h-full p-6 space-y-6'>
      <div className='flex items-center justify-between'>
        <div className='flex flex-col space-y-1'>
          <h2 className='text-2xl font-bold tracking-tight text-foreground'>Status de Pedidos</h2>
          <p className='text-sm text-muted-foreground'>Configure os diferentes status de pedidos.</p>
        </div>
        <div className='flex items-center gap-2'>
          <Button variant={'ghost'} size="sm" disabled={isLoading || isRefetching} onClick={() => { setSelectedItems([]); refetch() }}>
            {(isLoading || isRefetching) ? (<RefreshCw className='animate-spin size-[0.85rem]' />) : (<RefreshCw className='size-[0.85rem]' />)}
          </Button>

          {selectedItems.length === 1 ? (
            <EditOrderStatusSheet orderStatusId={selectedItems[0]} />
          ) : (
            <Button variant={'outline'} disabled size="sm">
              <Edit className="size-[0.85rem]" /> Editar
            </Button>
          )}

          {selectedItems.length === 1 ? (
            <DeleteOrderStatus orderStatusId={selectedItems[0]} />
          ) : (
            <Button variant={'outline'} disabled size="sm">
              <Trash className="size-[0.85rem]" /> Excluir
            </Button>
          )}

          <NewOrderStatusSheet />
        </div>
      </div>

      <div className='flex flex-col w-full h-full flex-1 overflow-hidden'>
        <div className='overflow-hidden h-full flex flex-col flex-1'>
          <DataTable
            columns={columns}
            data={items}
            loading={isLoading || isRefetching}
            skeletonCount={5}
            page={currentPage}
            perPage={perPage}
            totalItems={totalItems}
            rowClassName='h-12 hover:bg-muted/30 transition-colors'
            emptyMessage='Nenhum status de pedido encontrado'
            emptySlot={(
              <Empty className="py-12 border-dashed">
                <EmptyHeader>
                  <EmptyMedia variant="icon" className="bg-primary/5 text-primary">
                    <ClipboardList className='h-8 w-8' />
                  </EmptyMedia>
                  <EmptyTitle className="text-lg font-bold tracking-tight">Nenhum status de pedido</EmptyTitle>
                  <EmptyDescription className="text-sm max-w-sm text-muted-foreground">
                    Você ainda não cadastrou nenhum status. Crie o primeiro status para começar a usá-los nos seus pedidos.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent className="mt-4">
                  <div className='flex gap-2 items-center justify-center'>
                    <NewOrderStatusSheet />
                    <Button variant={'ghost'} size='sm' disabled={isLoading || isRefetching} onClick={() => { setSelectedItems([]); refetch() }} className="h-8">
                      {(isLoading || isRefetching) ? <RefreshCw className='animate-spin size-[0.85rem]' /> : <RefreshCw className='size-[0.85rem]' />}
                    </Button>
                  </div>
                </EmptyContent>
                <Button variant='link' asChild className='text-muted-foreground mt-2 text-xs font-semibold'>
                  <a href='#'>
                    Saiba mais <ArrowUpRight className='inline-block ml-1 h-3 w-3' />
                  </a>
                </Button>
              </Empty>
            )}
            onChange={({ page, perPage }) => {
              if (typeof page === 'number') setCurrentPage(page)
              if (typeof perPage === 'number') setPerPage(perPage)
              refetch()
            }} />
        </div>
      </div>
    </div>
  )
}
