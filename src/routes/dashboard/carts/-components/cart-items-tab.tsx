import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { TabsContent } from "@/components/ui/tabs"
import { ChevronDown, ChevronUp, Loader2, Minus, Package, Plus, ShoppingCart, TicketPercent, Trash2, X } from "lucide-react"
import type { Cart } from "./edit-cart.types"

export function CartItemsTab({
  cart,
  openProducts,
  toggleProductOpen,
  setAddProductOpen,
  isReadOnly,
  formatBRL,
  updateItem,
  deleteItem,
  cupons,
  couponCode,
  setCouponCode,
  applyCoupon,
  isApplyingCoupon,
  isRemovingCoupon,
  setSelectedCouponCode,
  setRemoveCouponOpen,
}: {
  cart: Cart | undefined
  openProducts: string[]
  toggleProductOpen: (productName: string) => void
  setAddProductOpen: (open: boolean) => void
  isReadOnly: boolean
  formatBRL: (valueInCents: number) => string
  updateItem: (args: { cartDerivatedProductId: number; amount: number }) => void
  deleteItem: (cartDerivatedProductId: number) => void
  cupons: NonNullable<Cart["cupons"]>
  couponCode: string
  setCouponCode: (next: string) => void
  applyCoupon: (code: string) => void
  isApplyingCoupon: boolean
  isRemovingCoupon: boolean
  setSelectedCouponCode: (code: string | null) => void
  setRemoveCouponOpen: (open: boolean) => void
}) {
  return (
    <TabsContent value="items" className="m-0 flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <ShoppingCart className="h-4 w-4" /> Itens ({cart?.totalItems || 0})
        </h3>
        <Button size="sm" variant="outline" onClick={() => setAddProductOpen(true)} disabled={isReadOnly}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Adicionar
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {(cart?.products || []).length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <Empty className="gap-2">
              <EmptyMedia variant="icon">
                <ShoppingCart className="h-6 w-6 text-muted-foreground" />
              </EmptyMedia>
              <EmptyTitle className="mt-0">Carrinho vazio</EmptyTitle>
              <EmptyDescription className="mt-0">Adicione produtos para começar o atendimento.</EmptyDescription>
              <Button size="sm" variant="outline" onClick={() => setAddProductOpen(true)} disabled={isReadOnly} className="mt-2">
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Adicionar Produtos
              </Button>
            </Empty>
          </div>
        ) : (
          <div className="space-y-4">
            {cart?.products.map((product) => {
              const isOpen = openProducts.includes(product.name)
              const productTotalItems = product.totalItems || product.derivatedProducts.reduce((acc, item) => acc + item.amount, 0)

              return (
                <Collapsible
                  key={product.id}
                  open={isOpen}
                  onOpenChange={() => toggleProductOpen(product.name)}
                  className="border rounded-lg bg-card shadow-sm transition-all hover:shadow-md"
                >
                  <div className="flex items-center justify-between p-3">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="p-0 h-auto hover:bg-transparent flex-1 justify-start gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-primary/5 border flex items-center justify-center shrink-0">
                          <Package className="h-4 w-4 text-primary/70" />
                        </div>
                        <div className="flex flex-col items-start text-left gap-1 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            {product.sku && (
                              <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0 h-5 leading-none rounded-sm text-muted-foreground shrink-0">
                                {product.sku}
                              </Badge>
                            )}
                            <span className="text-sm font-semibold text-foreground/90 truncate">{product.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 leading-none font-normal border-muted-foreground/20">
                              {productTotalItems} {productTotalItems === 1 ? "item" : "itens"}
                            </Badge>
                          </span>
                        </div>
                        {isOpen ? <ChevronUp className="ml-auto h-4 w-4 text-muted-foreground/50" /> : <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground/50" />}
                      </Button>
                    </CollapsibleTrigger>
                  </div>

                  <CollapsibleContent>
                    <div className="border-t divide-y bg-muted/30">
                      {product.derivatedProducts.map((item) => (
                        <div key={item.id} className="flex items-center justify-between py-3 pl-14 pr-4 hover:bg-muted/50 transition-colors group">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-[10px]">Variação</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-foreground/80">{item.name}</span>
                              <div className="flex items-center gap-2 text-xs mt-0.5">
                                {item.oldPrice > item.price && <span className="text-muted-foreground/60 line-through">{formatBRL(item.oldPrice)}</span>}
                                <span
                                  className={
                                    item.oldPrice > item.price
                                      ? "text-green-600 font-semibold bg-green-50 px-1.5 rounded-sm"
                                      : "text-muted-foreground font-medium"
                                  }
                                >
                                  {formatBRL(item.price)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            {!isReadOnly ? (
                              <div className="flex items-center border rounded-md bg-background shadow-sm h-8 overflow-hidden group-hover:border-primary/20 transition-colors">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-none border-r hover:bg-muted active:bg-muted/80"
                                  onClick={() => updateItem({ cartDerivatedProductId: item.id, amount: Math.max(0, item.amount - 1) })}
                                  disabled={item.amount <= 1}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <div className="w-10 text-center text-sm font-medium tabular-nums h-full flex items-center justify-center bg-transparent">
                                  {item.amount}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-none border-l hover:bg-muted active:bg-muted/80"
                                  onClick={() => updateItem({ cartDerivatedProductId: item.id, amount: item.amount + 1 })}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-sm px-3 py-1 font-mono">
                                {item.amount} un
                              </Badge>
                            )}

                            <div className="text-right min-w-[90px]">
                              <span className="text-sm font-bold text-foreground">{formatBRL(item.amount * item.price)}</span>
                            </div>

                            {!isReadOnly && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                                onClick={() => deleteItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )
            })}
          </div>
        )}

        <div className="rounded-lg border bg-muted/10 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-primary/5 border flex items-center justify-center shrink-0">
                <TicketPercent className="h-4 w-4 text-primary/70" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold leading-none">Cupom de desconto</span>
                <span className="text-xs text-muted-foreground truncate">
                  {cupons.length > 0 ? "Cupons aplicados no carrinho." : "Digite o código para aplicar no carrinho."}
                </span>
              </div>
            </div>
          </div>

          {cupons.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {cupons.map((c) => (
                <Badge key={c.id} variant="secondary" className="font-mono gap-1 pr-1">
                  {String(c.code || "").toUpperCase()}
                  <button
                    type="button"
                    className="ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded-sm hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    disabled={isReadOnly || isRemovingCoupon || isApplyingCoupon}
                    onClick={() => {
                      setSelectedCouponCode(String(c.code || "").toUpperCase())
                      setRemoveCouponOpen(true)
                    }}
                    aria-label={`Remover cupom ${c.code}`}
                    title={`Remover cupom ${c.code}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : null}

          <div className="mt-3 flex items-center gap-2">
            <Input
              value={couponCode}
              onChange={(e) => {
                setCouponCode(e.target.value.replace(/\s/g, "").toUpperCase())
              }}
              placeholder="XXX-XXX"
              disabled={isReadOnly || isApplyingCoupon || isRemovingCoupon}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return
                e.preventDefault()
                const nextCode = couponCode.trim()
                if (!nextCode) return
                if (isReadOnly || isApplyingCoupon || isRemovingCoupon) return
                applyCoupon(nextCode)
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={isReadOnly || !couponCode.trim() || isApplyingCoupon || isRemovingCoupon}
              onClick={() => {
                const nextCode = couponCode.trim()
                if (!nextCode) return
                applyCoupon(nextCode)
              }}
              aria-label="Aplicar cupom"
              title="Aplicar cupom"
            >
              {isApplyingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : <TicketPercent className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </TabsContent>
  )
}
