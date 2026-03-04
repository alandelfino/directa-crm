
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { privateInstance } from '@/lib/auth'
import { Topbar } from '../-components/topbar'
import { Button } from '@/components/ui/button'
import { DataTable, type ColumnDef } from '@/components/data-table'
import { Checkbox } from '@/components/ui/checkbox'
import { RefreshCw, ShoppingCart, Package } from 'lucide-react'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'
import { NewCartSheet } from './-components/new-cart'
import { EditCartSheet } from './-components/edit-cart'

export const Route = createFileRoute('/dashboard/carts/')({
  component: RouteComponent,
})

import { Badge } from '@/components/ui/badge'

type Cart = {
  id: number
  customerId: number
  storeId: number
  companyId: number
  totalValue: number
  totalItems: number
  totalAdditions: number
  totalDiscounts: number
  status: 'open' | 'abandoned' | 'finished'
  createdAt: string
  updatedAt: string
  customer?: { id: number, name: string }
  store?: { id: number, name: string }
}

function RouteComponent() {
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [selectedCarts, setSelectedCarts] = useState<number[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)

  const { data, isLoading, isRefetching, refetch } = useQuery({
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    queryKey: ['carts', currentPage, perPage],
    queryFn: async () => {
      const params: any = {
        page: currentPage,
        limit: perPage,
      }
      const response = await privateInstance.get('/tenant/carts', { params })
      return response.data
    }
  })

  const [carts, setCarts] = useState<Cart[]>([])

  const toggleSelect = (id: number) => {
    if (selectedCarts.includes(id)) {
      setSelectedCarts([])
    } else {
      setSelectedCarts([id])
    }
  }

  const columns: ColumnDef<Cart>[] = [
    {
      id: 'select',
      width: '60px',
      header: (
        <div className='flex items-center justify-center text-xs text-muted-foreground'>Sel.</div>
      ),
      cell: (cart) => (
        <div className='flex items-center justify-center'>
            <Checkbox
                checked={selectedCarts.includes(cart.id)}
                onCheckedChange={() => toggleSelect(cart.id)}
            />
        </div>
      ),
      headerClassName: 'w-[60px] border-r',
      className: 'font-medium border-r'
    },
    {
      id: 'id',
      header: 'ID',
      width: '80px',
      cell: (c) => c.id,
      className: 'border-r font-mono'
    },
    {
      id: 'customer',
      header: 'Cliente',
      cell: (c) => c.customer?.name || `Cliente #${c.customerId}`,
      className: 'border-r'
    },
    {
      id: 'store',
      header: 'Loja',
      cell: (c) => c.store?.name || `Loja #${c.storeId}`,
      className: 'border-r'
    },
    {
      id: 'status',
      header: 'Status',
      cell: (c) => {
        const statusMap: Record<string, { label: string, variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
          open: { label: 'Aberto', variant: 'outline' },
          abandoned: { label: 'Abandonado', variant: 'destructive' },
          finished: { label: 'Finalizado', variant: 'default' }
        }
        const status = statusMap[c.status] || { label: c.status, variant: 'secondary' }
        return <Badge variant={status.variant} className="text-[10px] h-5">{status.label}</Badge>
      },
      className: 'w-[100px] border-r text-center'
    },
    {
      id: 'totalItems',
      header: 'Itens',
      cell: (c) => c.totalItems ?? 0,
      className: 'w-[80px] border-r text-center'
    },
    {
      id: 'totalValue',
      header: 'Total',
      cell: (c) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((c.totalValue ?? 0) / 100),
      className: 'w-[140px] border-r text-right font-medium'
    },
    {
      id: 'createdAt',
      header: 'Criado em',
      cell: (c) => new Date(c.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      className: 'w-[180px]'
    },
  ]

  useEffect(() => {
    if (!data) return
    setCarts(data.items || [])
    setTotalItems(data.total || 0)
  }, [data])

  return (
    <div className='flex flex-col w-full h-full'>
      <Topbar title="Carrinhos" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard', isLast: false }, { label: 'Carrinhos', href: '/dashboard/carts', isLast: true }]} />

      <div className='flex flex-col w-full h-full flex-1 overflow-hidden'>
        <div className='border-b flex w-full items-center p-2 gap-4'>
            <div className='flex items-center gap-2 flex-1'>
                {selectedCarts.length === 1 ? (
                    <Button variant='outline' size='sm' onClick={() => setIsEditSheetOpen(true)}>
                        <Package className="size-[0.85rem]" /> Produtos
                    </Button>
                ) : (
                    <Button variant='outline' size='sm' disabled>
                        <Package className="size-[0.85rem]" /> Produtos
                    </Button>
                )}
            </div>
            <Button variant='outline' size='sm' onClick={() => refetch()} disabled={isLoading || isRefetching}>
                <RefreshCw className={`size-[0.85rem] ${isRefetching ? 'animate-spin' : ''}`} />
                Atualizar
            </Button>
            <NewCartSheet onCreated={() => refetch()} />
        </div>

        <div className='flex-1 overflow-hidden'>
             <DataTable
                columns={columns}
                data={carts}
                loading={isLoading}
                page={currentPage}
                totalItems={totalItems}
                perPage={perPage}
                onChange={(vals) => {
                    if (vals.page) setCurrentPage(vals.page)
                    if (vals.perPage) setPerPage(vals.perPage)
                }}
                onRowClick={(row) => toggleSelect(row.id)}
                emptySlot={
                    <Empty>
                        <EmptyHeader>
                            <EmptyMedia><ShoppingCart className="size-10" /></EmptyMedia>
                            <EmptyTitle>Nenhum carrinho encontrado</EmptyTitle>
                            <EmptyDescription>Crie um novo carrinho para começar.</EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            <NewCartSheet onCreated={(id) => {
                                refetch()
                                setSelectedCarts([id])
                                setIsEditSheetOpen(true)
                            }} />
                        </EmptyContent>
                    </Empty>
                }
            />
        </div>
      </div>

      {selectedCarts.length === 1 && isEditSheetOpen && (
          <EditCartSheet cartId={selectedCarts[0]} onOpenChange={(open) => setIsEditSheetOpen(open)} />
      )}
    </div>
  )
}
