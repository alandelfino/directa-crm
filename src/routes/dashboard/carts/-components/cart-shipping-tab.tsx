import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { TabsContent } from "@/components/ui/tabs"
import { Truck } from "lucide-react"
import type { Cart, ShippingQuote } from "./edit-cart.types"

export function CartShippingTab({
  cart,
  isReadOnly,
  isSelectingShippingQuote,
  isUpdatingCartAfterShippingSelect,
  selectShippingQuote,
  formatBRL,
}: {
  cart: Cart | undefined
  isReadOnly: boolean
  isSelectingShippingQuote: boolean
  isUpdatingCartAfterShippingSelect: boolean
  selectShippingQuote: (shippingQuoteId: number) => void
  formatBRL: (valueInCents: number) => string
}) {
  return (
    <TabsContent value="shipping" className="m-0 flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Truck className="h-4 w-4" /> Cotação de Frete
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {Array.isArray(cart?.shippingQuote) && cart.shippingQuote.length > 0 ? (
          cart.shippingQuote.map((q: ShippingQuote) => (
            <button
              key={q.id}
              type="button"
              className="w-full text-left border rounded-lg p-3 flex items-start justify-between gap-4 hover:bg-muted/30 transition-colors disabled:opacity-60 disabled:pointer-events-none"
              disabled={isReadOnly || isSelectingShippingQuote || isUpdatingCartAfterShippingSelect}
              onClick={() => {
                if (q.isSelected) return
                selectShippingQuote(q.id)
              }}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={q.isSelected}
                    onCheckedChange={() => {
                      if (isReadOnly || isSelectingShippingQuote || isUpdatingCartAfterShippingSelect) return
                      if (q.isSelected) return
                      selectShippingQuote(q.id)
                    }}
                    aria-label="Selecionar cotação de frete"
                  />
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-semibold truncate">{q.carrierName}</span>
                    {q.isSelected && (
                      <Badge className="h-5 px-2 text-[10px]" variant="default">
                        Selecionado
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{q.serviceName}</div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-sm font-semibold tabular-nums">{formatBRL(q.price)}</span>
                <span className="text-xs text-muted-foreground">
                  {q.deadline} {q.deadline === 1 ? "dia" : "dias"}
                </span>
              </div>
            </button>
          ))
        ) : (
          <div className="border rounded-lg p-6 flex flex-col items-center justify-center text-center gap-2 text-muted-foreground">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Truck className="h-6 w-6 opacity-50" />
            </div>
            <p className="text-sm font-medium text-foreground">Nenhuma cotação disponível</p>
            <p className="text-xs text-muted-foreground">Este carrinho ainda não possui opções de frete cotadas.</p>
          </div>
        )}
      </div>
    </TabsContent>
  )
}

