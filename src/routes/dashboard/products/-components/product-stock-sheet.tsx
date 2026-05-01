import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet'
import { Archive, RefreshCw } from 'lucide-react'
import { DataTable, type ColumnDef } from '@/components/data-table'
import { privateInstance } from '@/lib/auth'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { formatStockQuantity, normalizeStockNumberType } from '@/lib/format'

type ProductStockSimpleItem = {
  id: string | number
  warehouseId: number
  warehouseName: string
  amount: number
}

type ProductStockWithDerivationsItem = {
  id: string | number
  derivatedProductId: number
  derivatedProductName: string
  warehouseId: number
  warehouseName: string
  physicalStock: number
  reservedStock: number
  available: number
}

type ProductStockResponse = {
  product: {
    id: number
    sku: string
    name: string
    type?: string
  }
  unitOfMeasurement?: {
    id: number
    name: string
    numberType: 'integer' | 'decimal'
  }
  total?: number
  totalPhysicalStock?: number
  totalReservedStock?: number
  totalAvailable?: number
  items: Array<ProductStockSimpleItem | ProductStockWithDerivationsItem>
}

type ProductStockSheetProps = {
  productId: number
}

export function ProductStockSheet({ productId }: ProductStockSheetProps) {
  const [open, setOpen] = useState(false)

  const { data, isLoading, isRefetching, refetch } = useQuery<ProductStockResponse>({
    queryKey: ['product-stock', productId],
    queryFn: async () => {
      const response = await privateInstance.get(`/tenant/products/${productId}/stock/with-derivations`)
      return response.data
    },
    enabled: open,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 0,
  })

  const product = data?.product
  const qtyType = normalizeStockNumberType(data?.unitOfMeasurement?.numberType)
  
  const itemsRaw = useMemo(() => {
    if (!data) return []
    const value: any = data
    if (Array.isArray(value.items)) return value.items
    if (Array.isArray(value.data)) return value.data
    if (Array.isArray(value)) return value
    return []
  }, [data])

  const totals = useMemo(() => {
    const physical =
      typeof data?.totalPhysicalStock === 'number'
        ? data.totalPhysicalStock
        : itemsRaw.reduce((sum: number, item: any) => sum + Number(item?.physicalStock ?? item?.physical_stock ?? 0), 0)
    const reserved =
      typeof data?.totalReservedStock === 'number'
        ? data.totalReservedStock
        : itemsRaw.reduce((sum: number, item: any) => sum + Number(item?.reservedStock ?? item?.reserved_stock ?? 0), 0)
    const available =
      typeof data?.totalAvailable === 'number'
        ? data.totalAvailable
        : itemsRaw.reduce((sum: number, item: any) => sum + Number(item?.available ?? 0), 0)
    const total =
      typeof data?.total === 'number'
        ? data.total
        : physical
    return { total, physical, reserved, available }
  }, [data?.total, data?.totalPhysicalStock, data?.totalReservedStock, data?.totalAvailable, itemsRaw])

  const derivationItems: ProductStockWithDerivationsItem[] = useMemo(() => {
    return itemsRaw.map((item: any, index: number) => {
      const derivatedProductId = Number(
        item.derivatedProductId ??
          item.derivated_product_id ??
          item.derivatedProduct?.id ??
          0,
      )
      const derivatedProductName = String(
        item.derivatedProductName ??
          item.derivated_product_name ??
          item.derivatedProduct?.name ??
          '—',
      )
      const warehouseId = Number(item.warehouseId ?? item.warehouse_id ?? 0)
      const warehouseName = String(
        item.warehouseName ?? item.warehouse_name ?? '—',
      )
      const physicalStock = Number(item.physicalStock ?? item.physical_stock ?? item.amount ?? 0)
      const reservedStock = Number(item.reservedStock ?? item.reserved_stock ?? 0)
      const available = Number(item.available ?? 0)

      return {
        id: `${derivatedProductId}-${warehouseId}-${index}`,
        derivatedProductId,
        derivatedProductName,
        warehouseId,
        warehouseName,
        physicalStock,
        reservedStock,
        available,
      }
    })
  }, [itemsRaw])

  const derivationColumns: ColumnDef<ProductStockWithDerivationsItem>[] =
    useMemo(
      () => [
        {
          id: 'derivation',
          header: 'Derivação',
          cell: (item) => (
            <span
              className="block truncate min-w-0"
              title={item.derivatedProductName}
            >
              {item.derivatedProductName || '—'}
            </span>
          ),
          width: '280px',
          headerClassName: 'w-[280px] min-w-[280px] border-r',
          className: 'w-[280px] min-w-[280px] !px-4',
        },
        {
          id: 'warehouse',
          header: 'Depósito',
          cell: (item) => (
            <span
              className="block truncate min-w-0"
              title={item.warehouseName}
            >
              {item.warehouseName || '—'}
            </span>
          ),
          width: '260px',
          headerClassName: 'w-[260px] min-w-[260px] border-r',
          className: 'w-[260px] min-w-[260px] !px-4',
        },
        {
          id: 'physicalStock',
          header: 'Físico',
          cell: (item) => (
            <span className="font-medium text-right block">
              {formatStockQuantity(qtyType, item.physicalStock)}
            </span>
          ),
          width: '140px',
          headerClassName:
            'w-[140px] min-w-[140px] border-r text-right',
          className:
            'w-[140px] min-w-[140px] !px-4 text-right',
        },
        {
          id: 'reservedStock',
          header: 'Reservado',
          cell: (item) => (
            <span className="text-right block text-muted-foreground">
              {formatStockQuantity(qtyType, item.reservedStock)}
            </span>
          ),
          width: '140px',
          headerClassName:
            'w-[140px] min-w-[140px] border-r text-right',
          className:
            'w-[140px] min-w-[140px] !px-4 text-right',
        },
        {
          id: 'available',
          header: 'Disponível',
          cell: (item) => (
            <span className="font-semibold text-right block">
              {formatStockQuantity(qtyType, item.available)}
            </span>
          ),
          width: '150px',
          headerClassName:
            'w-[150px] min-w-[150px] text-right',
          className:
            'w-[150px] min-w-[150px] !px-4 text-right',
        },
      ],
      [qtyType],
    )

  const itemsCount = derivationItems.length
  const formattedTotal = formatStockQuantity(qtyType, totals.total)
  const formattedPhysical = formatStockQuantity(qtyType, totals.physical)
  const formattedReserved = formatStockQuantity(qtyType, totals.reserved)
  const formattedAvailable = formatStockQuantity(qtyType, totals.available)

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (nextOpen) {
          refetch()
        }
      }}
    >
      <SheetTrigger asChild>
        <Button size="sm" variant="outline">
          <Archive className="size-[0.85rem]" /> Estoque
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[80vw] sm:max-w-none p-0">
        <div className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <SheetHeader className="px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1 min-w-0">
                <SheetTitle>Estoque do Produto</SheetTitle>
                <SheetDescription>
                  Distribuição por depósito e variação.
                </SheetDescription>
              </div>
              <SheetClose asChild>
                <Button variant="ghost" size="icon" aria-label="Fechar" title="Fechar">
                  <span className="text-lg leading-none">×</span>
                </Button>
              </SheetClose>
            </div>
          </SheetHeader>
        </div>

        <div className="flex flex-col flex-1 overflow-hidden bg-muted/20">
          <div className="mx-auto flex h-full w-full max-w-[1100px] flex-col px-6 py-3">
            <div className="rounded-xl border bg-background shadow-sm px-4 py-4 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-primary/5 border flex items-center justify-center shrink-0">
                  <Archive className="h-4 w-4 text-primary/70" />
                </div>
                {product ? (
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-sm truncate">
                        {product.name}
                      </span>
                      <Badge variant="secondary" className="font-mono text-[10px] h-5 px-2 shrink-0">
                        {product.sku}
                      </Badge>
                      {data?.unitOfMeasurement?.name ? (
                        <Badge variant="outline" className="text-[10px] h-5 px-2 shrink-0">
                          {data.unitOfMeasurement.name}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {itemsCount === 1 ? '1 registro' : `${itemsCount} registros`}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 min-w-0 flex-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => refetch()}
                  disabled={isLoading || isRefetching}
                  aria-label="Atualizar"
                  title="Atualizar"
                >
                  <RefreshCw
                    className={cn(
                      'size-[0.85rem]',
                      isRefetching && 'animate-spin',
                    )}
                  />
                </Button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border bg-background px-4 py-3 shadow-sm">
                <div className="text-xs text-muted-foreground">Total</div>
                <div className="mt-1 text-lg font-semibold tabular-nums">{formattedTotal}</div>
              </div>
              <div className="rounded-xl border bg-background px-4 py-3 shadow-sm">
                <div className="text-xs text-muted-foreground">Físico</div>
                <div className="mt-1 text-lg font-semibold tabular-nums">{formattedPhysical}</div>
              </div>
              <div className="rounded-xl border bg-background px-4 py-3 shadow-sm">
                <div className="text-xs text-muted-foreground">Reservado</div>
                <div className="mt-1 text-lg font-semibold tabular-nums">{formattedReserved}</div>
              </div>
              <div className="rounded-xl border bg-background px-4 py-3 shadow-sm">
                <div className="text-xs text-muted-foreground">Disponível</div>
                <div className="mt-1 text-lg font-semibold tabular-nums">{formattedAvailable}</div>
              </div>
            </div>

            <div className="mt-4 flex-1 min-h-0 flex flex-col overflow-hidden shadow-sm rounded-lg">
              <DataTable<ProductStockWithDerivationsItem>
                columns={derivationColumns}
                data={derivationItems}
                loading={isLoading || isRefetching}
                hideFooter={true}
                rowClassName="h-10"
              />
            </div>
          </div>
        </div>

        <SheetFooter className="border-t">
          <div className="flex w-full items-center justify-end px-6 py-4">
            <SheetClose asChild>
              <Button variant="outline" className="w-fit">Fechar</Button>
            </SheetClose>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

