import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { privateInstance } from '@/lib/auth'
import { GitFork, Edit2, Box } from 'lucide-react'
import { toast } from 'sonner'
import { DerivatedProductEditSheet } from './derivated-product-edit-sheet'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

type DerivatedProduct = {
  id: number
  productId: number
  name?: string
  active?: boolean
  width?: number
  height?: number
  weight?: number
  length?: number
  createdAt?: string
  updatedAt?: string
}

type DerivatedProductsResponse = {
  page: number
  limit: number
  totalPages: number
  total: number
  items: DerivatedProduct[]
}

function normalizeDerivatedProducts(data: any): { items: DerivatedProduct[], total: number } {
  if (Array.isArray(data)) return { items: data, total: data.length }
  if (data && Array.isArray(data.items)) return { items: data.items, total: data.total || data.items.length }
  return { items: [], total: 0 }
}


export function DerivatedProductsSheet({ productId }: { productId: number }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<DerivatedProduct[]>([])
  const [editingDerivation, setEditingDerivation] = useState<DerivatedProduct | null>(null)
  const queryClient = useQueryClient()

  const { data, isLoading, isRefetching, refetch, isError, error } = useQuery({
    queryKey: ['derivated-products', productId],
    enabled: open,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 0,
    queryFn: async () => {
      const response = await privateInstance.get(`/tenant/derivated-product`, {
        params: {
          productId,
          limit: 100
        }
      })
      if (response.status !== 200) throw new Error('Erro ao carregar derivações do produto')
      return response.data as DerivatedProductsResponse
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
    const normalized = normalizeDerivatedProducts(data)
    setItems(normalized.items)
  }, [data])

  
  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (o) { queryClient.invalidateQueries({ queryKey: ['derivated-products', productId] }); refetch() } }}>
      <SheetTrigger asChild>
        <Button variant={'outline'} size={'sm'}>
          <GitFork className="size-[0.85rem]" /> Derivações
        </Button>
      </SheetTrigger>
      <SheetContent className='sm:max-w-[600px] h-full gap-0 p-0 flex flex-col bg-white'>
        <div className='p-4 border-b bg-background'>
          <SheetHeader className='flex gap-0 p-0'>
            <SheetTitle>Derivações do produto</SheetTitle>
            <SheetDescription>Gerencie as derivações do produto selecionado.</SheetDescription>
          </SheetHeader>
        </div>

        <div className='flex-1 min-h-0 overflow-y-auto p-4'>
          {isLoading || isRefetching ? (
             <div className="space-y-3">
               {[1, 2, 3].map(i => (
                 <div key={i} className="flex items-center justify-between p-4 bg-background border shadow-xs rounded-lg">
                    <div className="space-y-2">
                       <Skeleton className="h-4 w-32" />
                       <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-8 w-8 rounded-md" />
                 </div>
               ))}
             </div>
          ) : items.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <GitFork className='h-6 w-6' />
                  </EmptyMedia>
                  <EmptyTitle>Nenhuma derivação</EmptyTitle>
                  <EmptyDescription>Sem registros para o produto selecionado.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          ) : (
            <div className="space-y-3">
               {items.map(item => (
                 <div key={item.id} className="group flex items-center justify-between p-4 bg-background border rounded-lg shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-start gap-3">
                       <div className="mt-1 p-2 bg-neutral-100 rounded-md text-neutral-500">
                          <Box className="size-4" />
                       </div>
                       <div className="space-y-1">
                          <div className="flex items-center gap-2">
                             <span className="font-medium text-sm">{item.name || 'Sem nome'}</span>
                             {item.active ? (
                               <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-green-200 text-green-700 bg-green-50">Ativo</Badge>
                             ) : (
                               <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-neutral-200 text-neutral-500 bg-neutral-100">Inativo</Badge>
                             )}
                          </div>
                          <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                             <span>L: {item.width ? item.width / 10 : '-'} cm</span>
                             <span>A: {item.height ? item.height / 10 : '-'} cm</span>
                             <span>C: {item.length ? item.length / 10 : '-'} cm</span>
                             <span>Peso: {item.weight ? item.weight / 1000 : '-'} kg</span>
                          </div>
                       </div>
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setEditingDerivation(item)}
                    >
                       <Edit2 className="size-4 text-muted-foreground" />
                    </Button>
                 </div>
               ))}
            </div>
          )}
        </div>
        
        <SheetFooter className='bg-background border-t p-4 flex justify-center'>
          <div className='flex items-center gap-3'>
            <span className='text-xs text-muted-foreground'>Total de {items.length} variações</span>
          </div>
        </SheetFooter>
      </SheetContent>

      {editingDerivation && (
        <DerivatedProductEditSheet
          derivation={editingDerivation}
          open={!!editingDerivation}
          onOpenChange={(open) => !open && setEditingDerivation(null)}
          onSaved={() => {
             refetch()
          }}
        />
      )}
    </Sheet>
  )
}
 

export default DerivatedProductsSheet