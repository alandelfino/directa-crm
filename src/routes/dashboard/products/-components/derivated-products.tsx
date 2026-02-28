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


import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search } from 'lucide-react'

type EditableDimensionCellProps = {
  value: number | undefined
  onChange: (value: number) => void
  isWeight?: boolean
}

function EditableDimensionCell({ value, onChange, isWeight }: EditableDimensionCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [localValue, setLocalValue] = useState<string>('')

  // Convert raw value to display format (e.g., 1000 -> 10,00 for dimensions)
  const displayValue = useMemo(() => {
    if (value === undefined || value === null) return ''
    const divisor = isWeight ? 1000 : 100
    return (value / divisor)
  }, [value, isWeight])

  useEffect(() => {
    if (displayValue !== '') {
      setLocalValue(displayValue.toString())
    }
  }, [displayValue])

  const handleBlur = () => {
    setIsEditing(false)
    if (!localValue) return
    
    const parsed = parseFloat(localValue.replace(',', '.'))
    if (isNaN(parsed)) return

    const multiplier = isWeight ? 1000 : 100
    const finalValue = Math.round(parsed * multiplier)
    
    if (finalValue !== value) {
      onChange(finalValue)
    }
  }

  if (isEditing) {
    return (
      <Input
        value={localValue}
        onChange={(e) => {
          const val = e.target.value.replace(/[^0-9,.]/g, '')
          setLocalValue(val)
        }}
        onBlur={handleBlur}
        autoFocus
        className="h-7 w-full px-2 text-right"
      />
    )
  }

  return (
    <div 
      className="h-full w-full flex items-center justify-end px-4 cursor-pointer hover:bg-muted/50 transition-colors"
      onDoubleClick={() => setIsEditing(true)}
      title="Clique duas vezes para editar"
    >
      <span className={cn('text-sm tabular-nums', !value && 'text-muted-foreground')}>
        {value ? (
           `${displayValue.toLocaleString('pt-BR', { minimumFractionDigits: isWeight ? 3 : 2, maximumFractionDigits: isWeight ? 3 : 2 })}${isWeight ? ' kg' : ' cm'}`
        ) : '-'}
      </span>
    </div>
  )
}

export function DerivatedProductsSheet({ productId }: { productId: number }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<DerivatedProduct[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [searchOperator, setSearchOperator] = useState<'contains' | 'equals'>('contains')
  const queryClient = useQueryClient()

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      setSelectedIds([]) // Clear selection when search term changes
    }, 500)

    return () => {
      clearTimeout(handler)
    }
  }, [searchTerm])

  const { data, isLoading, isRefetching, refetch, isError, error } = useQuery({
    queryKey: ['derivated-products', productId],
    enabled: !!productId && open,
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

  const filteredItems = useMemo(() => {
    return items.filter(i => {
      if (!debouncedSearchTerm) return true
      const name = i.name?.toLowerCase() || ''
      const term = debouncedSearchTerm.toLowerCase()
      
      if (searchOperator === 'equals') {
        return name === term
      }
      return name.includes(term)
    })
  }, [items, debouncedSearchTerm, searchOperator])

  // Selection Logic
  const allSelected = useMemo(() => {
    return filteredItems.length > 0 && filteredItems.every(i => selectedIds.includes(i.id))
  }, [filteredItems, selectedIds])

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredItems.map(i => i.id))
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

  const handleUpdateItem = async (id: number, field: string, value: number) => {
    try {
      await privateInstance.put(`/tenant/derivated-product/${id}`, {
        [field]: value
      })
      toast.success('Atualizado com sucesso')
      queryClient.invalidateQueries({ queryKey: ['derivated-products', productId] })
      refetch()
    } catch (error: any) {
      const errorData = error?.response?.data
      const message = errorData?.title || errorData?.detail || 'Erro ao atualizar'
      toast.error(message)
    }
  }

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
      id: 'width',
      header: 'Largura',
      cell: (i) => <EditableDimensionCell value={i.width} onChange={(val) => handleUpdateItem(i.id, 'width', val)} />,
      width: '100px',
      headerClassName: 'w-[100px] min-w-[100px] border-r text-right',
      className: 'w-[100px] min-w-[100px] !p-0 border-r',
    },
    {
      id: 'height',
      header: 'Altura',
      cell: (i) => <EditableDimensionCell value={i.height} onChange={(val) => handleUpdateItem(i.id, 'height', val)} />,
      width: '100px',
      headerClassName: 'w-[100px] min-w-[100px] border-r text-right',
      className: 'w-[100px] min-w-[100px] !p-0 border-r',
    },
    {
      id: 'length',
      header: 'Comprimento',
      cell: (i) => <EditableDimensionCell value={i.length} onChange={(val) => handleUpdateItem(i.id, 'length', val)} />,
      width: '100px',
      headerClassName: 'w-[100px] min-w-[100px] border-r text-right',
      className: 'w-[100px] min-w-[100px] !p-0 border-r',
    },
    {
      id: 'weight',
      header: 'Peso',
      cell: (i) => <EditableDimensionCell value={i.weight} onChange={(val) => handleUpdateItem(i.id, 'weight', val)} isWeight />,
      width: '100px',
      headerClassName: 'w-[100px] min-w-[100px] border-r text-right',
      className: 'w-[100px] min-w-[100px] !p-0 border-r',
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
        <SheetHeader className='px-4 py-4 space-y-3'>
          <div className="space-y-1">
            <SheetTitle>Derivações do produto</SheetTitle>
            <SheetDescription>Gerencie as derivações do produto selecionado.</SheetDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={searchOperator} onValueChange={(v: 'contains' | 'equals') => setSearchOperator(v)}>
              <SelectTrigger className="w-[110px] h-8 text-xs">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contains">Contém</SelectItem>
                <SelectItem value="equals">Igual a</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input 
                placeholder="Buscar derivação..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>
        </SheetHeader>

        <div className='flex flex-col flex-1 overflow-hidden'>
          <div className='flex items-center justify-between px-4 gap-2 mb-2'>
            <div className='flex items-center gap-2'>
              <span className='text-sm text-muted-foreground'>
                {filteredItems.length} {filteredItems.length === 1 ? 'derivação encontrada' : 'derivações encontradas'}
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

              <DerivatedProductMassEditSheet
                items={selectedItems}
                onUpdated={() => {
                  refetch()
                  setSelectedIds([])
                }}
              />
            </div>
          </div>

          <div className='flex-1 flex flex-col overflow-hidden border-t'>
            <DataTable<DerivatedProduct>
              columns={columns}
              data={filteredItems}
              loading={isLoading || isRefetching}
              hideFooter={true}
              onRowClick={(item) => toggleSelect(item.id)}
              rowIsSelected={(item) => selectedIds.includes(item.id)}
              rowClassName="h-8"
              emptyMessage='Nenhuma derivação encontrada'
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
