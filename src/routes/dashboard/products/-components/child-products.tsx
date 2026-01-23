import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet'
 
import { DataTable, type ColumnDef } from '@/components/data-table'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { privateInstance } from '@/lib/auth'
import { GitFork, Power } from 'lucide-react'
import { toast } from 'sonner'
import React from 'react'

type ChildProduct = {
  id: number
  product_id: number
  sku?: string
  name?: string
  active?: boolean
}

type ChildsResponse = {
  itemsReceived?: number
  curPage?: number
  nextPage?: number | null
  prevPage?: number | null
  offset?: number
  perPage?: number
  itemsTotal?: number
  pageTotal?: number
  items?: ChildProduct[]
} | ChildProduct[]

function normalizeChilds(data: ChildsResponse) {
  if (Array.isArray(data)) return { items: data, itemsTotal: data.length, pageTotal: 1 }
  const items = Array.isArray(data.items) ? data.items : []
  const itemsTotal = typeof data.itemsTotal === 'number' ? data.itemsTotal : items.length
  const pageTotal = typeof data.pageTotal === 'number' ? data.pageTotal : 1
  return { items, itemsTotal, pageTotal }
}


export function ChildProductsSheet({ productId }: { productId: number }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<ChildProduct[]>([])
  const queryClient = useQueryClient()
  const bottomScrollerRef = React.useRef<HTMLDivElement | null>(null)
  const [mainScroller, setMainScroller] = useState<HTMLDivElement | null>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  const { data, isLoading, isRefetching, refetch, isError, error } = useQuery({
    queryKey: ['product-derivations', productId],
    enabled: open,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 0,
    queryFn: async () => {
      const response = await privateInstance.get(`/api:d9ly3uzj/derivated_products?product_id=${productId}`)
      if (response.status !== 200) throw new Error('Erro ao carregar derivações do produto')
      return response.data as ChildsResponse
    }
  })

  useEffect(() => {
    if (isError) {
      const errorData = (error as any)?.response?.data
      toast.error(errorData?.title || 'Erro ao carregar derivações', {
        description: errorData?.detail || 'Não foi possível carregar as derivações do produto.'
      })
    }
  }, [isError, error])

  useEffect(() => {
    if (!data) return
    const normalized = normalizeChilds(data)
    const arr = Array.isArray(normalized.items) ? normalized.items : []
    setItems(arr)
  }, [data])

  
  useEffect(() => {
    const el = document.querySelector('[data-slot="datatable-scroller"]') as HTMLDivElement | null
    setMainScroller(el)
    // no-op
  }, [open, items])
  useEffect(() => {
    const el = mainScroller
    const mirror = bottomScrollerRef.current
    if (!el || !mirror) return
    const handleMain = () => { if (mirror) mirror.scrollLeft = el.scrollLeft }
    const handleMirror = () => { el.scrollLeft = mirror.scrollLeft }
    el.addEventListener('scroll', handleMain)
    mirror.addEventListener('scroll', handleMirror)
    return () => {
      el.removeEventListener('scroll', handleMain)
      mirror.removeEventListener('scroll', handleMirror)
    }
  }, [mainScroller, bottomScrollerRef.current])
  

  const { mutateAsync: toggleActiveReq } = useMutation<{ id: number; nextActive: boolean }, any, { id: number; nextActive: boolean }>({
    mutationFn: async ({ id, nextActive }) => {
      const response = await privateInstance.put(`/api:d9ly3uzj/derivated_products/${id}/status`, { active: nextActive })
      if (response.status !== 200) throw new Error('Erro ao atualizar status')
      return { id, nextActive }
    }
  })

  const columns: ColumnDef<ChildProduct>[] = useMemo(() => [
    { id: 'sku', header: 'SKU', width: '160px', cell: (p) => p.sku ?? '—', headerClassName: 'border-r px-4', className: 'px-4' },
    { id: 'name', header: 'Nome', width: '280px', cell: (p) => p.name ?? '—', headerClassName: 'border-r px-4', className: 'px-4' },
    { id: 'status', header: 'Status', width: '70px', cell: (p) => (typeof p.active === 'boolean' ? (p.active ? 'Ativo' : 'Inativo') : '—'), headerClassName: 'border-r px-4', className: 'px-4' },
    {
      id: 'actions',
      header: 'Ações',
      width: '80px',
      headerClassName: 'border-r px-4 text-center',
      className: 'px-4 text-center',
      cell: (p) => (
        <Button
          variant={'outline'}
          size={'icon'}
          disabled={updatingId === p.id}
          onClick={async () => {
            try {
              const nextActive = !(p.active === true)
              setUpdatingId(p.id)
              await toggleActiveReq({ id: p.id, nextActive })
              setItems((prev) => prev.map((it) => it.id === p.id ? { ...it, active: nextActive } : it))
              toast.success(nextActive ? 'Derivação ativada' : 'Derivação desativada')
            } catch (err: any) {
              const errorData = err?.response?.data
              toast.error(errorData?.title || 'Erro ao atualizar status', {
                description: errorData?.detail || 'Não foi possível alterar o status da derivação.'
              })
            } finally {
              setUpdatingId(null)
            }
          }}
        >
          <Power className={p.active ? 'text-emerald-600' : 'text-neutral-500'} />
        </Button>
      )
    }
  ], [items, updatingId, toggleActiveReq])

  

  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (o) { queryClient.invalidateQueries({ queryKey: ['product-derivations', productId] }); refetch() } }}>
      <SheetTrigger asChild>
        <Button variant={'outline'} size={'sm'}>
          <GitFork className="size-[0.85rem]" /> Derivações
        </Button>
      </SheetTrigger>
      <SheetContent className='sm:max-w-[920px] h-full gap-2'>
        <SheetHeader className='p-3'>
          <SheetTitle>Derivações do produto</SheetTitle>
          <SheetDescription>Gerencie as derivações do produto selecionado.</SheetDescription>
        </SheetHeader>

        

        <div className='flex-1 min-h-0 overflow-hidden border-t'>
          
          <DataTable
            columns={columns}
            data={items}
            loading={isLoading || isRefetching}
            hideFooter
            emptyMessage='Nenhuma derivação encontrada'
            emptySlot={(
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <GitFork className='h-6 w-6' />
                  </EmptyMedia>
                  <EmptyTitle>Nenhuma derivação</EmptyTitle>
                  <EmptyDescription>Sem registros para o produto selecionado.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
            
          />
        </div>
        <SheetFooter className='sticky bottom-0 bg-neutral-50 border-t px-4 h-[50px] flex justify-center'>
          <div className='flex items-center gap-3'>
            <span className='text-sm'>Mostrando um total de {items.length} registros</span>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
 

export default ChildProductsSheet