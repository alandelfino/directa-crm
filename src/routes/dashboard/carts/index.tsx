
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { privateInstance } from '@/lib/auth'
import { Topbar } from '../-components/topbar'
import { Button } from '@/components/ui/button'
import { DataTable, type ColumnDef } from '@/components/data-table'
import { Checkbox } from '@/components/ui/checkbox'
import { RefreshCw, ShoppingCart, Package, Trash, Store } from 'lucide-react'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'
import { NewCartSheet } from './-components/new-cart'
import { EditCartSheet } from './-components/edit-cart'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from 'sonner'

export const Route = createFileRoute('/dashboard/carts/')({
  component: RouteComponent,
})

import { Badge } from '@/components/ui/badge'
import { dataTime } from '@/lib/format'

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
  store?: { id: number, name: string, color: string }
}

type CartsResponse = {
  items: Cart[]
  total: number
}

function RouteComponent() {
  const queryClient = useQueryClient()
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [selectedCarts, setSelectedCarts] = useState<number[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)
  const isEditSheetDirtyRef = useRef(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [cartToDelete, setCartToDelete] = useState<number | null>(null)

  const { data, isLoading, isRefetching, refetch } = useQuery<CartsResponse>({
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    queryKey: ['carts', currentPage, perPage],
    queryFn: async () => {
      const params = {
        page: currentPage,
        limit: perPage,
      }
      const response = await privateInstance.get<CartsResponse>('/tenant/carts', { params })
      return response.data
    }
  })

  const [carts, setCarts] = useState<Cart[]>([])

  const { mutateAsync: deleteCart, isPending: isDeleting } = useMutation({
    mutationFn: async (id: number) => {
      await privateInstance.delete(`/tenant/carts/${id}`)
    },
    onSuccess: () => {
      toast.success('Carrinho excluído com sucesso')
      refetch()
      setSelectedCarts([])
      setIsDeleteDialogOpen(false)
      setCartToDelete(null)
    },
    onError: () => {
      toast.error('Erro ao excluir carrinho')
    }
  })

  const handleDelete = async () => {
    if (cartToDelete) {
      await deleteCart(cartToDelete)
    }
  }

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
        <div className='flex items-center justify-center text-xs text-neutral-500'>Sel.</div>
      ),
      cell: (cart) => (
        <div className='flex items-center justify-center'>
          <Checkbox
            checked={selectedCarts.includes(cart.id)}
            onCheckedChange={() => toggleSelect(cart.id)}
          />
        </div>
      ),
      headerClassName: 'w-[60px] min-w-[60px] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[60px] min-w-[60px] border-r border-neutral-200 !px-4 py-3'
    },
    {
      id: 'id',
      header: 'ID',
      width: '40px',
      cell: (c) => <span className="font-mono text-xs">{c.id}</span>,
      headerClassName: 'w-[40px] min-w-[40px] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[40px] min-w-[40px] border-r border-neutral-200 !px-4 py-3 font-mono'
    },
    {
      id: 'customer',
      header: 'Cliente',
      width: '200px',
      cell: (c) => {
        const name = c.customer?.name || `Cliente #${c.customerId}`
        return <span className="block min-w-0 font-semibold text-foreground truncate" title={name}>{name}</span>
      },
      headerClassName: 'w-[200px] min-w-[200px] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[200px] min-w-[200px] border-r border-neutral-200 !px-4 py-3'
    },
    {
      id: 'store',
      header: 'Loja',
      width: 'fit-content',
      cell: (c) => {
        const name = c.store?.name || `Loja #${c.storeId}`
        return <span className="flex gap-1 items-center truncate min-w-0 whitespace-nowrap" title={name}>
          <div className='w-6 h-6 rounded-md flex items-center justify-center'>
            <Store className="rounded-full w-4 h-4" style={{ stroke: c.store?.color || 'transparent' }} />
          </div>
          {name}
        </span>
      },
      headerClassName: 'border-r border-neutral-200 px-4 py-2.5',
      className: 'border-r border-neutral-200 !px-4 py-3'
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
      headerClassName: 'w-[120px] min-w-[120px] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[120px] min-w-[120px] border-r border-neutral-200 !px-4 py-3 text-center'
    },
    {
      id: 'totalItems',
      header: 'Itens',
      cell: (c) => c.totalItems ?? 0,
      headerClassName: 'w-[90px] min-w-[90px] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[90px] min-w-[90px] border-r border-neutral-200 !px-4 py-3 text-center'
    },
    {
      id: 'totalValue',
      header: 'Total',
      cell: (c) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((c.totalValue ?? 0) / 100),
      headerClassName: 'w-[160px] min-w-[160px] border-r border-neutral-200 px-4 py-2.5 text-right',
      className: 'w-[160px] min-w-[160px] border-r border-neutral-200 !px-4 py-3 text-right font-medium'
    },
    {
      id: 'createdAt',
      header: 'Criado em',
      cell: (c) => (
        <span className="whitespace-nowrap text-sm">
          {dataTime(c.createdAt)}
        </span>
      ),
      headerClassName: 'w-[190px] min-w-[190px] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[190px] min-w-[190px] border-r border-neutral-200 !px-4 py-3'
    },
    {
      id: 'updatedAt',
      header: 'Atualizado em',
      cell: (c) => (
        <span className="whitespace-nowrap text-sm">
          {dataTime(c.updatedAt)}
        </span>
      ),
      headerClassName: 'w-[190px] min-w-[190px] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[190px] min-w-[190px] border-r border-neutral-200 !px-4 py-3'
    }
  ]

  useEffect(() => {
    if (!data) return
    setCarts(Array.isArray(data.items) ? data.items : [])
    setTotalItems(typeof data.total === 'number' ? data.total : 0)
    queryClient.invalidateQueries({ queryKey: ['carts-mini'] })
  }, [data, queryClient])

  return (
    <div className='flex flex-col w-full h-full'>
      <Topbar title="Carrinhos" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard', isLast: false }, { label: 'Carrinhos', href: '/dashboard/carts', isLast: true }]} />
      <div className='flex flex-col w-full h-full p-6 space-y-6 flex-1 overflow-hidden'>
        <div className='flex items-center justify-between'>
          <div className='flex flex-col space-y-1'>
            <h2 className='text-2xl font-bold tracking-tight text-foreground'>Carrinhos</h2>
            <p className='text-sm text-muted-foreground'>Gerencie os carrinhos de compras ativos, finalizados e abandonados da sua operação.</p>
          </div>
          <div className='flex items-center gap-2'>
            <Button variant='ghost' size='sm' onClick={() => refetch()} disabled={isLoading || isRefetching}>
              <RefreshCw className={`size-[0.85rem] ${isRefetching ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={() => {
                isEditSheetDirtyRef.current = false
                setIsEditSheetOpen(true)
              }}
              disabled={selectedCarts.length !== 1}
            >
              <Package className="size-[0.85rem]" /> Editar
            </Button>
            <Button
              variant='outline'
              size='sm'
              className={`text-destructive hover:text-destructive ${selectedCarts.length !== 1 ? 'opacity-50 pointer-events-none' : ''}`}
              onClick={() => {
                setCartToDelete(selectedCarts[0])
                setIsDeleteDialogOpen(true)
              }}
              disabled={selectedCarts.length !== 1}
            >
              <Trash className="size-[0.85rem]" /> Excluir
            </Button>
            <NewCartSheet
              onCreated={() => {
                refetch()
                setIsEditSheetOpen(false)
              }}
              onOpenChange={(open) => {
                if (!open) refetch()
              }}
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={carts}
          loading={isLoading || isRefetching}
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
                  isEditSheetDirtyRef.current = false
                  setIsEditSheetOpen(true)
                }} />
              </EmptyContent>
            </Empty>
          }
        />
      </div>

      {selectedCarts.length === 1 && isEditSheetOpen && (
        <EditCartSheet
          cartId={selectedCarts[0]}
          onCartChanged={() => {
            isEditSheetDirtyRef.current = true
          }}
          onOpenChange={(open) => {
            setIsEditSheetOpen(open)
            if (!open) {
              if (isEditSheetDirtyRef.current) refetch()
              isEditSheetDirtyRef.current = false
            }
          }}
        />
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Carrinho</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este carrinho? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
