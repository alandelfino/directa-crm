import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowRight, Pencil } from "lucide-react"
import type { CartStatus, ShippingQuote } from "./edit-cart.types"
import { PaymentMethodsOverviewSheet } from "./payment-methods-overview-sheet"

export function CartSummaryCard({
  status,
  totalItems,
  productsValueCents,
  cuponDiscountsCents,
  isLoadingBasic,
  isLoadingProducts,
  isLoadingCupons,
  selectedShippingQuote,
  selectedShippingPrice,
  isLoadingShipping,
  totalWithShippingCents,
  baseTotalBeforeDiscountsCents,
  formatBRL,
  cartId,
  storeId,
  isReadOnly,
  onEditShipping,
  couponSection,
}: {
  status: CartStatus | null
  totalItems: number
  productsValueCents: number
  cuponDiscountsCents: number
  isLoadingBasic: boolean
  isLoadingProducts: boolean
  isLoadingCupons: boolean
  selectedShippingQuote: ShippingQuote | null
  selectedShippingPrice: number
  isLoadingShipping: boolean
  totalWithShippingCents: number
  baseTotalBeforeDiscountsCents: number
  formatBRL: (valueInCents: number) => string
  cartId: number
  storeId: number
  isReadOnly: boolean
  onEditShipping?: () => void
  couponSection?: React.ReactNode
}) {
  const showDiscounts = isLoadingCupons || cuponDiscountsCents > 0
  const showPromoSection = Boolean(couponSection)
  const showBaseTotal =
    !isLoadingProducts && !isLoadingCupons && !isLoadingShipping && baseTotalBeforeDiscountsCents > totalWithShippingCents

  return (
    <div className="rounded-xl border bg-background shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Detalhes roláveis */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-base font-semibold">Resumo</span>
            <span className="text-sm text-muted-foreground">
              {isLoadingProducts ? (
                <Skeleton className="inline-block h-3 w-28 align-middle" />
              ) : (
                <>
                  {totalItems} {totalItems === 1 ? "item" : "itens"} no carrinho
                </>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isLoadingBasic ? (
              <Skeleton className="h-5 w-20 rounded-full" />
            ) : status ? (
              <Badge className="h-6 px-2 text-xs" variant={status === "open" ? "outline" : status === "abandoned" ? "destructive" : "default"}>
                {status === "open" ? "Aberto" : status === "abandoned" ? "Abandonado" : "Finalizado"}
              </Badge>
            ) : null}
            {isLoadingShipping && !selectedShippingQuote ? (
              <Skeleton className="h-5 w-20 rounded-full" />
            ) : selectedShippingQuote ? (
              <Badge variant="secondary" className="h-6 px-2 text-xs">
                {selectedShippingQuote.carrierName}
              </Badge>
            ) : (
              <Badge variant="outline" className="h-6 px-2 text-xs">
                Sem frete
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Produtos</span>
            {isLoadingProducts ? <Skeleton className="h-4 w-20" /> : <span className="font-medium tabular-nums">{formatBRL(productsValueCents)}</span>}
          </div>

          <Separator className="my-2.5" />

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Frete</span>
                {!isReadOnly && onEditShipping ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-sm font-normal text-blue-600 hover:bg-transparent hover:text-blue-600 hover:underline"
                    onClick={onEditShipping}
                  >
                    <Pencil className="h-3 w-3 mr-1.5" />
                    Editar
                  </Button>
                ) : null}
              </div>
              <div className="mt-0.5 text-sm text-muted-foreground truncate">
                {isLoadingShipping ? (
                  <Skeleton className="h-3 w-[260px]" />
                ) : selectedShippingQuote
                  ? `${selectedShippingQuote.carrierName} • ${selectedShippingQuote.serviceName} • ${selectedShippingQuote.deadline} dia(s)`
                  : "Selecione uma cotação de frete."}
              </div>
            </div>
            {isLoadingShipping ? <Skeleton className="h-4 w-16" /> : <span className="font-medium tabular-nums">{formatBRL(selectedShippingPrice)}</span>}
          </div>

          {showPromoSection ? (
            <>
              <Separator className="my-2.5" />
              {couponSection ? <div className="pt-2">{couponSection}</div> : null}
            </>
          ) : null}

          <div className="pt-2 space-y-3">
            <span className="text-muted-foreground text-sm">Métodos de pagamento</span>
            <PaymentMethodsOverviewSheet
              cartId={cartId}
              storeId={storeId}
              formatBRL={formatBRL}
              trigger={
                <Button type="button" variant="link" className="w-full text-left justify-start text-sm font-normal p-0 text-blue-600" disabled={isReadOnly || !cartId}>
                  Ver todas as formas de pagamentos
                </Button>
              }
            />
          </div>
        </div>
      </div>

      {/* Rodapé Fixo */}
      <div className="border-t bg-background p-4 shrink-0 space-y-3 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
        {showDiscounts ? (
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Descontos (cupons)</span>
              {isLoadingCupons ? <Skeleton className="h-4 w-16" /> : <span className="font-medium tabular-nums text-red-600">-{formatBRL(cuponDiscountsCents)}</span>}
            </div>
            <Separator className="my-2.5" />
          </div>
        ) : null}

        <div className="flex items-end justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-base font-semibold">Total</span>
            <span className="text-xs text-muted-foreground">Inclui frete selecionado</span>
          </div>
          <div className="flex flex-col items-end">
            {showBaseTotal ? <span className="text-xs tabular-nums text-muted-foreground line-through decoration-muted-foreground/60">{formatBRL(baseTotalBeforeDiscountsCents)}</span> : null}
            <span className="text-xl font-bold tracking-tight tabular-nums text-primary">{formatBRL(totalWithShippingCents)}</span>
          </div>
        </div>

        <div className="pt-1">
          <Button disabled={isReadOnly || totalItems === 0} className="w-full h-10 font-semibold gap-2 bg-green-500 hover:bg-green-600 transition-colors">
            Finalizar Pedido <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
