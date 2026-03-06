
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { privateInstance } from '@/lib/auth'
import { Topbar } from '../-components/topbar'
import { Button } from '@/components/ui/button'
import { DataTable, type ColumnDef } from '@/components/data-table'
import { Checkbox } from '@/components/ui/checkbox'
import { RefreshCw, ShoppingCart, Package, Trash } from 'lucide-react'
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
  const queryClient = useQueryClient()
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [selectedCarts, setSelectedCarts] = useState<number[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [cartToDelete, setCartToDelete] = useState<number | null>(null)

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
      className: 'w-[180px] border-r'
    }
  ]

  useEffect(() => {
    if (!data) return
    setCarts(data.items || [])
    setTotalItems(data.total || 0)
    queryClient.invalidateQueries({ queryKey: ['carts-mini'] })
  }, [data, queryClient])

  return (
    <div className='flex flex-col w-full h-full'>
      <Topbar title="Carrinhos" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard', isLast: false }, { label: 'Carrinhos', href: '/dashboard/carts', isLast: true }]} />

      <div className='flex flex-col w-full h-full flex-1 overflow-hidden'>
        <div className='flex w-full items-center p-2 gap-4 justify-end'>
          <Button variant='ghost' size='sm' onClick={() => refetch()} disabled={isLoading || isRefetching}>
            <RefreshCw className={`size-[0.85rem] ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>
          <div className='flex items-center gap-2'>
            <Button variant='outline' size='sm' onClick={() => setIsEditSheetOpen(true)} disabled={selectedCarts.length !== 1}>
              <Package className="size-[0.85rem]" /> Produtos
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
          </div>
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

        <div className='flex-1 overflow-hidden'>
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
                    setIsEditSheetOpen(true)
                  }} />
                </EmptyContent>
              </Empty>
            }
          />
        </div>
      </div>

      {selectedCarts.length === 1 && isEditSheetOpen && (
        <EditCartSheet 
          cartId={selectedCarts[0]} 
          onOpenChange={(open) => {
            setIsEditSheetOpen(open)
            if (!open) refetch()
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
