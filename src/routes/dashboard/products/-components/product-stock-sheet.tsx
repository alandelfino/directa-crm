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
  amount: number
}

type ProductStockResponse = {
  product: {
    id: number
    sku: string
    name: string
    type: 'simple' | 'with_derivations'
  }
  unitOfMeasurement?: {
    id: number
    name: string
    numberType: 'integer' | 'decimal'
  }
  total: number
  items: Array<ProductStockSimpleItem | ProductStockWithDerivationsItem>
}

type ProductStockSheetProps = {
  productId: number
}

export function ProductStockSheet({ productId }: ProductStockSheetProps) {
  const [open, setOpen] = useState(false)

  const formatQuantityFromCents = (value: number) => {
    const base = Number.isFinite(value) ? value / 100 : 0
    const numberType = data?.unitOfMeasurement?.numberType ?? 'decimal'

    return base.toLocaleString('pt-BR', {
      minimumFractionDigits: numberType === 'integer' ? 0 : 2,
      maximumFractionDigits: numberType === 'integer' ? 0 : 2,
    })
  }

  const { data, isLoading, isRefetching, refetch } = useQuery<ProductStockResponse>({
    queryKey: ['product-stock', productId],
    queryFn: async () => {
      const response = await privateInstance.get(`/tenant/products/${productId}/stock/with-derivations`)
      return response.data
    },
    enabled: open,
    refetchOnWindowFocus: false,
  })

  const product = data?.product
  
  const itemsRaw = useMemo(() => {
    if (!data) return []
    const value: any = data
    if (Array.isArray(value.items)) return value.items
    if (Array.isArray(value.data)) return value.data
    if (Array.isArray(value)) return value
    return []
  }, [data])

  const totalAmountCents = useMemo(() => {
    if (typeof data?.total === 'number') return data.total
    return itemsRaw.reduce(
      (sum: number, item: any) => sum + Number(item?.amount ?? 0),
      0,
    )
  }, [data?.total, itemsRaw])

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
      const amount = Number(item.amount ?? 0)

      return {
        id: `${derivatedProductId}-${warehouseId}-${index}`,
        derivatedProductId,
        derivatedProductName,
        warehouseId,
        warehouseName,
        amount,
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
          id: 'amount',
          header: 'Quantidade',
          cell: (item) => (
            <span className="font-medium text-right block">
              {formatQuantityFromCents(item.amount)}
            </span>
          ),
          width: '140px',
          headerClassName:
            'w-[140px] min-w-[140px] border-r text-right',
          className:
            'w-[140px] min-w-[140px] !px-4 text-right',
        },
      ],
      [data?.unitOfMeasurement],
    )

  const itemsCount = derivationItems.length

  const formattedTotal =
    typeof totalAmountCents === 'number'
      ? formatQuantityFromCents(totalAmountCents)
      : '0,00'

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
      <SheetContent className="w-4xl sm:max-w-[900px] p-0">
        <SheetHeader className="px-4 py-4">
          <SheetTitle>Estoque do Produto</SheetTitle>
          <SheetDescription>
            Visualize a distribuição de estoque deste produto por
            depósito.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="px-4 pb-3 space-y-3">
            <div className="rounded-lg border bg-muted/40 px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-full bg-neutral-900/5 dark:bg-neutral-50/5 flex items-center justify-center">
                  <Archive className="h-4 w-4 text-muted-foreground" />
                </div>
                {product ? (
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-sm truncate">
                        {product.name}
                      </span>
                      <Badge
                        variant="outline"
                        className="font-mono text-[10px]"
                      >
                        {product.sku}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {itemsCount}{' '}
                        {itemsCount === 1
                          ? 'registro de estoque'
                          : 'registros de estoque'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 min-w-0 flex-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs text-muted-foreground">
                  Estoque total
                </span>
                <span className="text-lg font-semibold tabular-nums">
                  {formattedTotal}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Valores em quantidade padrão do produto.</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => refetch()}
                disabled={isLoading || isRefetching}
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

          <div className="mt-2 mb-0 flex-1 flex flex-col overflow-hidden border-t">
              <DataTable<ProductStockWithDerivationsItem>
                columns={derivationColumns}
                data={derivationItems}
                loading={isLoading || isRefetching}
                hideFooter={true}
                rowClassName="h-8"
              />
          </div>
        </div>

        <SheetFooter className="border-t">
          <div className="flex w-full items-center justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">
              {itemsCount === 0
                ? 'Nenhum registro de estoque para este produto'
                : `${itemsCount} ${
                    itemsCount === 1
                      ? 'registro de estoque'
                      : 'registros de estoque'
                  } • Total: ${formattedTotal}`}
            </span>
            <SheetClose asChild>
              <Button variant="outline" className="w-fit">
                Fechar
              </Button>
            </SheetClose>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

