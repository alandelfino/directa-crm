import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ArrowRight } from "lucide-react"
import type { Cart, ShippingQuote } from "./edit-cart.types"
import { PaymentMethodsOverviewSheet } from "./payment-methods-overview-sheet"

export function CartSummaryCard({
  cart,
  selectedShippingQuote,
  selectedShippingPrice,
  subtotalCents,
  totalWithShippingCents,
  formatBRL,
  cartId,
  isReadOnly,
}: {
  cart: Cart | undefined
  selectedShippingQuote: ShippingQuote | null
  selectedShippingPrice: number
  subtotalCents: number
  totalWithShippingCents: number
  formatBRL: (valueInCents: number) => string
  cartId: number
  isReadOnly: boolean
}) {
  return (
    <div className="rounded-xl border bg-background shadow-sm p-4 lg:sticky lg:top-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] font-semibold">Resumo</span>
          <span className="text-xs text-muted-foreground">
            {cart?.totalItems || 0} {(cart?.totalItems || 0) === 1 ? "item" : "itens"} no carrinho
          </span>
        </div>
        <div className="flex items-center gap-2">
          {cart && (
            <Badge className="h-5 px-2 text-[10px]" variant={cart.status === "open" ? "outline" : cart.status === "abandoned" ? "destructive" : "default"}>
              {cart.status === "open" ? "Aberto" : cart.status === "abandoned" ? "Abandonado" : "Finalizado"}
            </Badge>
          )}
          {selectedShippingQuote ? (
            <Badge variant="secondary" className="h-5 px-2 text-[10px]">
              {selectedShippingQuote.carrierName}
            </Badge>
          ) : (
            <Badge variant="outline" className="h-5 px-2 text-[10px]">
              Sem frete
            </Badge>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-2 text-[13px]">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Produtos</span>
          <span className="font-medium tabular-nums">{formatBRL(subtotalCents)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Frete</span>
          <span className="font-medium tabular-nums">{formatBRL(selectedShippingPrice)}</span>
        </div>

        {(cart?.additions || []).length > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Adicionais</span>
            <span className="font-medium tabular-nums">{formatBRL(cart?.totalAdditions || 0)}</span>
          </div>
        )}
        {(cart?.discounts || []).length > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Descontos</span>
            <span className="font-medium tabular-nums">-{formatBRL(cart?.totalDiscounts || 0)}</span>
          </div>
        )}

        <div className="pt-2 space-y-3">
          <span className="text-muted-foreground">Métodos de pagamento</span>
          <PaymentMethodsOverviewSheet
            cartId={cartId}
            formatBRL={formatBRL}
            trigger={
              <Button type="button" variant="link" className="w-full text-left justify-start text-xs font-light p-0 text-blue-600" disabled={isReadOnly || !cartId}>
                Ver todas as formas de pagamentos
              </Button>
            }
          />
        </div>

        <Separator className="my-2.5" />

        <div className="flex items-end justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold">Total</span>
            <span className="text-xs text-muted-foreground">Inclui frete selecionado</span>
          </div>
          <span className="text-xl font-semibold tracking-tight tabular-nums text-primary">{formatBRL(totalWithShippingCents)}</span>
        </div>
      </div>

      <div className="mt-3">
        <Button disabled={isReadOnly || !cart?.totalItems || cart?.totalItems === 0} className="w-full h-9 font-semibold gap-2 bg-green-500">
          Finalizar Pedido <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
