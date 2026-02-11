import { useMemo, useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from '@/components/ui/sheet'
import { BadgeDollarSign, RefreshCw, Check, Edit } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTable, type ColumnDef } from '@/components/data-table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { SimpleProductPriceCreateSheet } from './simple-product-price-create-sheet'
import { SimpleProductPriceEditSheet } from './simple-product-price-edit-sheet'
import { SimpleProductPriceMassEditSheet } from './simple-product-price-mass-edit-sheet'
import { privateInstance } from '@/lib/auth'
import { formatMoneyFromCents, cn, maskMoneyInput } from '@/lib/utils'
import { toast } from 'sonner'

type SimpleProductPriceItem = {
  id: number
  productId: number
  productName: string
  sku: string
  price: number
  salePrice: number
  updatedAt: string
  // Helper fields for UI/Mutation
  priceTableId: number 
}

function EditablePriceCell({ 
  row, 
  field,
  onSaved,
  className
}: { 
  row: SimpleProductPriceItem, 
  field: 'price' | 'salePrice',
  onSaved: (value: number) => void,
  className?: string
}) {
  const initialPrice = row[field]
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(initialPrice ? formatMoneyFromCents(initialPrice) : 'R$ 0,00')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) {
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isEditing])

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (newValue: string) => {
      const priceCents = parseInt(newValue.replace(/\D/g, ''))
      
      const payload = {
        product_id: row.productId,
        price: field === 'price' ? priceCents : row.price,
        sale_price: field === 'salePrice' ? priceCents : (row.salePrice ?? null),
        price_table_id: row.priceTableId
      }

      await privateInstance.put(`/api:c3X9fE5j/product_prices`, payload)
      return priceCents
    },
    onSuccess: (newPrice) => {
      toast.success('Preço atualizado!')
      setIsEditing(false)
      onSaved(newPrice)
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao atualizar preço', {
        description: errorData?.detail || 'Não foi possível atualizar o preço do produto.'
      })
    }
  })

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await mutateAsync(value)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setValue(initialPrice ? formatMoneyFromCents(initialPrice) : 'R$ 0,00')
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      mutateAsync(value)
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  const discountPercentage = useMemo(() => {
    if (field === 'salePrice' && row.price && row.salePrice && row.price > 0) {
      const discount = ((row.price - row.salePrice) / row.price) * 100
      if (discount > 0) {
        return Math.round(discount)
      }
    }
    return null
  }, [field, row.price, row.salePrice])

  if (isEditing) {
    return (
      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
        <Input
          ref={inputRef}
          value={value}
          onChange={e => setValue(maskMoneyInput(e.target.value))}
          className="h-7 w-24 px-2 py-1 text-xs"
          onKeyDown={handleKeyDown}
          onBlur={() => {
            setTimeout(() => {
              if (document.activeElement !== inputRef.current) {
                handleCancel()
              }
            }, 100)
          }}
        />
        <Button 
          size="sm" 
          variant="ghost" 
          className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
          onClick={handleSave}
          onMouseDown={(e) => e.preventDefault()}
          disabled={isPending}
        >
          <Check className="size-[0.85rem]" />
        </Button>
      </div>
    )
  }

  return (
    <div 
      onDoubleClick={(e) => {
        e.stopPropagation()
        setIsEditing(true)
        setValue(initialPrice ? formatMoneyFromCents(initialPrice) : 'R$ 0,00')
      }}
      className="cursor-pointer hover:bg-muted/50 p-1 rounded -ml-1 border border-transparent hover:border-border transition-colors flex items-center gap-2"
      title="Clique duas vezes para editar"
    >
      <span className={cn('truncate text-sm', className)}>{initialPrice ? formatMoneyFromCents(initialPrice) : 'R$ 0,00'}</span>
      {discountPercentage !== null && (
        <span className="text-xs text-red-500 ml-2 font-medium">(-{discountPercentage}%)</span>
      )}
    </div>
  )
}

export function SimpleProductPricesSheet({ productId }: { productId: number }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [selectedPriceTableId, setSelectedPriceTableId] = useState<string>('')

  const updatePriceInCache = (id: number, field: 'price' | 'salePrice', value: number) => {
    queryClient.setQueryData(['simple-product-prices', productId, selectedPriceTableId], (oldData: any) => {
      if (!oldData) return oldData
      
      const isArray = Array.isArray(oldData)
      const items = isArray ? oldData : oldData.items || []
      
      const newItems = items.map((item: any) => {
        if (Number(item.id) === id) {
          // Map back to API structure if needed, or just update the field
          // The API response uses 'salePrice', so we update that
          return { ...item, [field]: value }
        }
        return item
      })
      
      return isArray ? newItems : { ...oldData, items: newItems }
    })
  }

  // Fetch price tables for filter and name mapping
  const { data: priceTablesData } = useQuery({
    queryKey: ['price-tables', 'select'],
    queryFn: async () => {
      const response = await privateInstance.get('/api:m3u66HYX/price_tables?page=1&per_page=100')
      return response.data
    },
    enabled: open
  })

  const priceTables = useMemo(() => {
    return Array.isArray(priceTablesData) ? priceTablesData : 
           (priceTablesData as any)?.items ? (priceTablesData as any).items : []
  }, [priceTablesData])

  // Set default price table
  useEffect(() => {
    if (open && priceTables.length > 0 && !selectedPriceTableId) {
      setSelectedPriceTableId(String(priceTables[0].id))
    }
  }, [open, priceTables, selectedPriceTableId])

  // Fetch prices
  const { data: pricesData, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['simple-product-prices', productId, selectedPriceTableId],
    queryFn: async () => {
      if (!selectedPriceTableId) return { items: [], total: 0 }
      
      const response = await privateInstance.get('/tenant/product-prices/simple', {
        params: {
          productId,
          priceTableId: selectedPriceTableId
        }
      })
      return response.data
    },
    enabled: open && !!selectedPriceTableId,
    refetchOnWindowFocus: false
  })

  const items: SimpleProductPriceItem[] = useMemo(() => {
    if (!pricesData) return []
    const raw = Array.isArray((pricesData as any).items) ? (pricesData as any).items : Array.isArray(pricesData) ? pricesData : []
    
    return raw.map((i: any) => ({
      id: Number(i.id),
      productId: Number(i.productId),
      productName: i.productName,
      sku: i.sku,
      price: Number(i.price),
      salePrice: i.salePrice ? Number(i.salePrice) : 0,
      updatedAt: i.updatedAt,
      priceTableId: Number(selectedPriceTableId)
    }))
  }, [pricesData, selectedPriceTableId])

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

  const columns: ColumnDef<SimpleProductPriceItem>[] = [
    {
      id: 'select',
      width: '60px',
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
      headerClassName: 'w-[60px] border-r',
      className: 'font-medium border-r',
    },
    {
      id: 'price_table_name',
      header: 'Tabela de Preço',
      cell: (i) => {
        const pt = priceTables.find((t: any) => t.id === i.priceTableId)
        return <span className='block truncate min-w-0' title={pt?.name}>{pt?.name}</span>
      },
      width: '240px',
      headerClassName: 'w-[240px] min-w-[240px] border-r',
      className: 'w-[240px] min-w-[240px] !px-4',
    },
    {
      id: 'price',
      header: 'Preço',
      cell: (i) => (
        <EditablePriceCell 
          row={i}
          field="price"
          onSaved={(val) => updatePriceInCache(i.id, 'price', val)} 
        />
      ),
      width: '150px',
      headerClassName: 'w-[150px] min-w-[150px] border-r',
      className: 'w-[150px] min-w-[150px] !px-4',
    },
    {
      id: 'salePrice',
      header: 'Preço Promocional',
      cell: (i) => (
        <EditablePriceCell 
          row={i}
          field="salePrice"
          className="text-muted-foreground"
          onSaved={(val) => updatePriceInCache(i.id, 'salePrice', val)} 
        />
      ),
      width: '150px',
      headerClassName: 'w-[150px] min-w-[150px] border-r',
      className: 'w-[150px] min-w-[150px] !px-4',
    },
  ]

  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (o) refetch() }}>
      <SheetTrigger asChild>
        <Button size={'sm'} variant={'outline'}>
          <BadgeDollarSign className="size-[0.85rem]" /> Preços
        </Button>
      </SheetTrigger>
      <SheetContent className='w-4xl sm:max-w-[1000px] p-0'>
        <SheetHeader className='px-4 py-4'>
          <SheetTitle>Preços do Produto</SheetTitle>
          <SheetDescription>Gerencie os preços deste produto por tabela.</SheetDescription>
        </SheetHeader>

        <div className='flex flex-col flex-1 overflow-hidden'>
          <div className='flex items-center justify-between px-4 gap-2'>
            <div className='flex items-center gap-2'>
              <span className='text-sm text-muted-foreground'>Filtros: </span>
              <Select value={selectedPriceTableId} onValueChange={setSelectedPriceTableId}>
                <SelectTrigger className="w-[200px] h-8">
                  <SelectValue placeholder="Selecione uma tabela" />
                </SelectTrigger>
                <SelectContent>
                  {priceTables.map((pt: any) => (
                    <SelectItem key={pt.id} value={String(pt.id)}>{pt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              {selectedIds.length === 1 ? (
                <SimpleProductPriceEditSheet 
                  item={items.find(i => i.id === selectedIds[0])} 
                  onUpdated={() => { refetch(); setSelectedIds([]) }} 
                />
              ) : selectedIds.length > 1 ? (
                <SimpleProductPriceMassEditSheet
                  items={items.filter(i => selectedIds.includes(i.id))}
                  onUpdated={() => {
                    refetch()
                    setSelectedIds([])
                  }}
                />
              ) : (
                <Button size={'sm'} variant={'outline'} disabled>
                  <Edit className='size-[0.85rem]' /> Editar
                </Button>
              )}
              <SimpleProductPriceCreateSheet productId={productId} onCreated={() => refetch()} />
            </div>
          </div>

          <div className='mt-2 mb-0 flex-1 flex flex-col overflow-hidden border-t'>
            <DataTable<SimpleProductPriceItem>
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

        <SheetFooter className='border-t'>
          <div className='flex w-full items-center justify-between'>
            <span className='text-sm text-muted-foreground'>
              {items.length} {items.length === 1 ? 'preço cadastrado' : 'preços cadastrados'}
              {selectedIds.length > 0 && ` • ${selectedIds.length} selecionado(s)`}
            </span>
            <SheetClose asChild>
              <Button variant='outline' className='w-fit'>Fechar</Button>
            </SheetClose>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
