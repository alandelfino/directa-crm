import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from '@/components/ui/sheet'
import { privateInstance } from '@/lib/auth'
import { GitFork, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { DerivatedProductMassEditSheet } from './derivated-product-mass-edit-sheet'
import { Badge } from '@/components/ui/badge'
import { DataTable, type ColumnDef } from '@/components/data-table'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

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
  const [selectedIds, setSelectedIds] = useState<number[]>([])
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

  // Selection Logic
  const allSelected = useMemo(() => {
    return items.length > 0 && selectedIds.length === items.length
  }, [items.length, selectedIds.length])

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(items.map(i => i.id))
    }
  }

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const selectedItems = useMemo(() => {
    return items.filter(i => selectedIds.includes(i.id))
  }, [items, selectedIds])

  const columns: ColumnDef<DerivatedProduct>[] = [
    {
      id: 'select',
      width: '40px',
      header: (
        <div className='flex items-center justify-center'>
          <Checkbox
            checked={allSelected}
            onCheckedChange={toggleSelectAll}
            aria-label="Select all"
          />
        </div>
      ),
      cell: (i) => (
        <div className='flex items-center justify-center' onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selectedIds.includes(i.id)}
            onCheckedChange={() => toggleSelect(i.id)}
            aria-label={`Select row ${i.id}`}
          />
        </div>
      ),
      headerClassName: 'w-[40px] border-r',
      className: 'font-medium border-r',
    },
    {
      id: 'active',
      header: 'Status',
      cell: (i) => (
        <div className="flex justify-center">
          {i.active ? (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-green-200 text-green-700 bg-green-50">Ativo</Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-neutral-200 text-neutral-500 bg-neutral-100">Inativo</Badge>
          )}
        </div>
      ),
      width: '80px',
      headerClassName: 'w-[80px] min-w-[80px] border-r text-center',
      className: 'w-[80px] min-w-[80px] !px-2 border-r',
    },
    {
      id: 'name',
      header: 'Nome',
      cell: (i) => (
        <span className='block truncate min-w-0 font-medium' title={i.name}>{i.name || 'Sem nome'}</span>
      ),
      width: '200px',
      headerClassName: 'w-[200px] min-w-[200px] border-r',
      className: 'w-[200px] min-w-[200px] !px-4 border-r',
    },
    {
      id: 'dimensions',
      header: 'Dimensões (LxAxC)',
      cell: (i) => {
        const w = i.width ? i.width / 10 : '-'
        const h = i.height ? i.height / 10 : '-'
        const l = i.length ? i.length / 10 : '-'
        return <span className='text-muted-foreground'>{w} x {h} x {l} cm</span>
      },
      width: '140px',
      headerClassName: 'w-[140px] min-w-[140px] border-r',
      className: 'w-[140px] min-w-[140px] !px-4 border-r',
    },
    {
      id: 'weight',
      header: 'Peso',
      cell: (i) => (
        <span className='text-muted-foreground'>{i.weight ? i.weight / 1000 : '-'} kg</span>
      ),
      width: '100px',
      headerClassName: 'w-[100px] min-w-[100px] border-r',
      className: 'w-[100px] min-w-[100px] !px-4 border-r',
    }
  ]
  
  return (
    <Sheet open={open} onOpenChange={(o) => { 
      setOpen(o)
      if (o) { 
        queryClient.invalidateQueries({ queryKey: ['derivated-products', productId] })
        refetch() 
      }
      if (!o) {
        setSelectedIds([])
      }
    }}>
      <SheetTrigger asChild>
        <Button variant={'outline'} size={'sm'}>
          <GitFork className="size-[0.85rem]" /> Derivações
        </Button>
      </SheetTrigger>
      <SheetContent className='w-4xl sm:max-w-[1000px] p-0'>
        <SheetHeader className='px-4 py-4'>
          <SheetTitle>Derivações do produto</SheetTitle>
          <SheetDescription>Gerencie as derivações do produto selecionado.</SheetDescription>
        </SheetHeader>

        <div className='flex flex-col flex-1 overflow-hidden'>
          <div className='flex items-center justify-between px-4 gap-2 mb-2'>
            <div className='flex items-center gap-2'>
              <span className='text-sm text-muted-foreground'>
                {items.length} {items.length === 1 ? 'derivação encontrada' : 'derivações encontradas'}
              </span>
            </div>

            <div className='flex items-center gap-2'>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => refetch()} 
                disabled={isLoading || isRefetching}
              >
                <RefreshCw className={cn("size-[0.85rem]", isRefetching && "animate-spin")} />
              </Button>

              {selectedIds.length > 0 && (
                <DerivatedProductMassEditSheet
                  items={selectedItems}
                  onUpdated={() => {
                    refetch()
                    setSelectedIds([])
                  }}
                />
              )}
            </div>
          </div>

          <div className='flex-1 flex flex-col overflow-hidden border-t'>
            <DataTable<DerivatedProduct>
              columns={columns}
              data={items}
              loading={isLoading || isRefetching}
              hideFooter={true}
              onRowClick={(item) => toggleSelect(item.id)}
              rowIsSelected={(item) => selectedIds.includes(item.id)}
              rowClassName="h-8"
            />
          </div>
        </div>
        
        <SheetFooter className='border-t p-4'>
          <div className='flex w-full items-center justify-between'>
            <span className='text-sm text-muted-foreground'>
              {selectedIds.length > 0 && `${selectedIds.length} selecionado(s)`}
            </span>
            <SheetClose asChild>
              <Button variant='outline' size="sm" className='w-fit'>Fechar</Button>
            </SheetClose>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export default DerivatedProductsSheet
