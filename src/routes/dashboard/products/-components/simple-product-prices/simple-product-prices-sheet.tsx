import { useMemo, useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from '@/components/ui/sheet'
import { BadgeDollarSign, RefreshCcw, Check, Edit } from 'lucide-react'
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
  price: number
  sale_price?: number
  product_id: number
  price_table_id: number
  price_table_name?: string
  company_id?: number
}

function EditablePriceCell({ 
  row, 
  field,
  onSaved,
  className
}: { 
  row: SimpleProductPriceItem, 
  field: 'price' | 'sale_price',
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
        product_id: row.product_id,
        price: field === 'price' ? priceCents : row.price,
        sale_price: field === 'sale_price' ? priceCents : (row.sale_price ?? null),
        price_table_id: row.price_table_id
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
      const title = error?.response?.data?.payload?.title
      const message = error?.response?.data?.message ?? 'Erro ao atualizar preço'
      if (title) toast.error(title, { description: message })
      else toast.error(message)
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
    if (field === 'sale_price' && row.price && row.sale_price && row.price > 0) {
      const discount = ((row.price - row.sale_price) / row.price) * 100
      if (discount > 0) {
        return Math.round(discount)
      }
    }
    return null
  }, [field, row.price, row.sale_price])

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
          size="icon" 
          variant="ghost" 
          className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
          onClick={handleSave}
          onMouseDown={(e) => e.preventDefault()}
          disabled={isPending}
        >
          <Check className="h-4 w-4" />
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
  const [selectedPriceTableId, setSelectedPriceTableId] = useState<string>('all')

  const updatePriceInCache = (id: number, field: 'price' | 'sale_price', value: number) => {
    queryClient.setQueryData(['simple-product-prices', productId, selectedPriceTableId], (oldData: any) => {
      if (!oldData) return oldData
      
      const isArray = Array.isArray(oldData)
      const items = isArray ? oldData : oldData.items || []
      
      const newItems = items.map((item: any) => {
        if (Number(item.id) === id) {
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

  // Fetch prices
  const { data: pricesData, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['simple-product-prices', productId, selectedPriceTableId],
    queryFn: async () => {
      let url = `/api:c3X9fE5j/product_prices?product_id=${productId}`
      
      if (selectedPriceTableId && selectedPriceTableId !== 'all') {
        url += `&price_table_id=${selectedPriceTableId}`
      }
      const response = await privateInstance.get(url)
      if (response.status !== 200) throw new Error('Erro ao carregar preços')
      return response.data
    },
    enabled: open,
    refetchOnWindowFocus: false
  })

  const items: SimpleProductPriceItem[] = useMemo(() => {
    if (!pricesData) return []
    const raw = Array.isArray((pricesData as any).items) ? (pricesData as any).items : Array.isArray(pricesData) ? pricesData : []
    
    return raw.map((i: any) => {
      // Find table name
      const pt = priceTables.find((t: any) => t.id === i.price_table_id)
      
      return {
        id: Number(i.id),
        price: Number(i.price),
        sale_price: i.sale_price ? Number(i.sale_price) : undefined,
        product_id: i.product_id ? Number(i.product_id) : productId,
        price_table_id: Number(i.price_table_id),
        price_table_name: pt?.name ?? 'Tabela desconhecida',
        company_id: i.company_id
      }
    })
  }, [pricesData, priceTables])

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
      cell: (i) => (
        <span className='block truncate min-w-0' title={i.price_table_name}>{i.price_table_name}</span>
      ),
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
      id: 'sale_price',
      header: 'Preço Promocional',
      cell: (i) => (
        <EditablePriceCell 
          row={i}
          field="sale_price"
          className="text-muted-foreground"
          onSaved={(val) => updatePriceInCache(i.id, 'sale_price', val)} 
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
          <BadgeDollarSign className="size-4" /> Preços
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
                  <SelectValue placeholder="Filtrar por tabela" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as tabelas</SelectItem>
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
                <RefreshCcw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
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
                  <Edit className='h-4 w-4 mr-2' /> Editar
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
