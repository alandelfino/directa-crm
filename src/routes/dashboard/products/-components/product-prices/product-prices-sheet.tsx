import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from '@/components/ui/sheet'
import { BadgeDollarSign, Edit, RefreshCcw } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTable, type ColumnDef } from '@/components/data-table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ProductPriceCreateDialog } from './product-price-create-dialog'
import { ProductPriceEditDialog } from './product-price-edit-dialog'
import { ProductPriceMassEditDialog } from './product-price-mass-edit-dialog'
import { privateInstance } from '@/lib/auth'
import { formatMoneyFromCents, cn } from '@/lib/utils'

type ProductPriceItem = {
  id: number
  price: number
  sale_price?: number
  price_table_id: number
  price_table_name?: string
  derivation_sku?: string
}

export function ProductPricesSheet({ productId }: { productId: number }) {
  const [open, setOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [selectedPriceTableId, setSelectedPriceTableId] = useState<string>('all')

  // Fetch price tables for filter
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
    queryKey: ['product-prices', productId, selectedPriceTableId],
    queryFn: async () => {
      let url = `/api:c3X9fE5j/derivated_product_price?product_id=${productId}`
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

  const items: ProductPriceItem[] = useMemo(() => {
    if (!pricesData) return []
    const raw = Array.isArray((pricesData as any).items) ? (pricesData as any).items : Array.isArray(pricesData) ? pricesData : []
    
    return raw.map((i: any) => {
      // Prioritize price_table object from response
      const ptName = i.price_table?.name
      const ptId = i.price_table?.id ?? i.price_table_id
      
      return {
        id: Number(i.id),
        price: Number(i.price),
        sale_price: i.sale_price ? Number(i.sale_price) : undefined,
        price_table_id: Number(ptId),
        price_table_name: ptName ?? 'Tabela sem nome',
        derivation_sku: i.derivated_product?.sku ?? '—'
      }
    })
  }, [pricesData])

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

  const columns: ColumnDef<ProductPriceItem>[] = [
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
      id: 'derivation_sku',
      header: 'Derivação',
      cell: (i) => (
        <span className='block truncate min-w-0' title={i.derivation_sku}>{i.derivation_sku}</span>
      ),
      width: '180px',
      headerClassName: 'w-[180px] min-w-[180px] border-r',
      className: 'w-[180px] min-w-[180px] !px-4',
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
        <span className='truncate text-sm' title={formatMoneyFromCents(i.price)}>{formatMoneyFromCents(i.price)}</span>
      ),
      width: '150px',
      headerClassName: 'w-[150px] min-w-[150px] border-r',
      className: 'w-[150px] min-w-[150px] !px-4',
    },
    {
      id: 'sale_price',
      header: 'Preço Promocional',
      cell: (i) => (
        <span className='truncate text-sm text-muted-foreground' title={formatMoneyFromCents(i.sale_price)}>
          {i.sale_price ? formatMoneyFromCents(i.sale_price) : 'R$ 0,00'}
        </span>
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
          <BadgeDollarSign className="size-[0.85rem] mr-2" /> Preços
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
                <ProductPriceEditDialog 
                  item={selectedItems[0]} 
                  onUpdated={() => { refetch(); setSelectedIds([]) }} 
                />
              ) : selectedIds.length > 1 ? (
                <ProductPriceMassEditDialog 
                  selectedIds={selectedIds}
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
              <ProductPriceCreateDialog productId={productId} onCreated={() => refetch()} />
            </div>
          </div>

          <div className='mt-2 mb-0 flex-1 flex flex-col overflow-hidden border-t'>
            <DataTable<ProductPriceItem>
              columns={columns}
              data={items}
              loading={isLoading || isRefetching}
              hideFooter={true}
              onRowClick={(item) => toggleSelect(item.id)}
              rowIsSelected={(item) => selectedIds.includes(item.id)}
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
