import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronDown, ChevronUp, Minus, Package, Plus, ShoppingCart, Trash2 } from "lucide-react"
import type { ProductGroup } from "./edit-cart.types"
import { Badge } from "@/components/ui/badge"

export function CartItemsTab({
  products,
  totalItems,
  isLoading,
  openProducts,
  toggleProductOpen,
  setAddProductOpen,
  isReadOnly,
  formatBRL,
  updateItem,
  deleteItem,
}: {
  products: ProductGroup[]
  totalItems: number
  isLoading: boolean
  openProducts: string[]
  toggleProductOpen: (productName: string) => void
  setAddProductOpen: (open: boolean) => void
  isReadOnly: boolean
  formatBRL: (valueInCents: number) => string
  updateItem: (args: { cartDerivatedProductId: number; amount: number }) => void
  deleteItem: (cartDerivatedProductId: number) => void
}) {
  const totalDistinctItems = products.reduce((acc, group) => acc + group.derivatedProducts.length, 0)
  const totalUnits = totalItems
  const itemLabel = totalDistinctItems === 1 ? "item" : "itens"
  const unitLabel = totalUnits === 1 ? "unidade" : "unidades"

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          <span className="text-base font-semibold">Itens</span>
        </div>
        <Button size="sm" variant="outline" className="h-9 px-3 text-sm" onClick={() => setAddProductOpen(true)} disabled={isReadOnly}>
          <Plus className="h-3 w-3 mr-1.5" /> Adicionar
        </Button>
      </div>

      <div className="mt-3 space-y-3 flex-1">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border rounded-lg bg-card p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-[220px]" />
                    <Skeleton className="h-3 w-[140px]" />
                  </div>
                  <Skeleton className="h-4 w-[80px]" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <Empty className="gap-2">
              <EmptyMedia variant="icon">
                <ShoppingCart className="h-5 w-5 text-muted-foreground" />
              </EmptyMedia>
              <EmptyTitle className="mt-0">Carrinho vazio</EmptyTitle>
              <EmptyDescription className="mt-0">Adicione produtos para começar o atendimento.</EmptyDescription>
              <Button size="sm" variant="outline" className="h-9 px-3 text-sm mt-2" onClick={() => setAddProductOpen(true)} disabled={isReadOnly}>
                <Plus className="h-3 w-3 mr-1.5" /> Adicionar Produtos
              </Button>
            </Empty>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((product) => {
              const isOpen = openProducts.includes(product.name)
              const productTotalItems = product.derivatedProducts.reduce((acc, item) => acc + item.amount, 0)
              const productTotalValueCents = product.derivatedProducts.reduce((acc, item) => acc + (Number(item.totalValue) || 0), 0)
              const summaryParts = product.derivatedProducts
                .filter((i) => (Number(i.amount) || 0) > 0)
                .map((i) => `${i.name}: ${i.amount}`)
              const summaryText =
                summaryParts.length <= 4
                  ? summaryParts.join(" - ")
                  : `${summaryParts.slice(0, 4).join(" - ")} +${summaryParts.length - 4}`

              return (
                <Collapsible
                  key={product.id}
                  open={isOpen}
                  onOpenChange={() => toggleProductOpen(product.name)}
                  className="border rounded-lg bg-card shadow-xs transition-all hover:shadow-md"
                >
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="h-auto w-full justify-start gap-3 min-w-0 px-1 py-1 hover:bg-transparent">
                        <div className="h-8 w-8 rounded-lg bg-primary/5 border flex items-center justify-center shrink-0">
                          <Package className="h-3.5 w-3.5 text-primary/70" />
                        </div>
                        <div className="flex flex-col items-start text-left gap-1 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            {product.sku && (
                              <Badge variant="secondary" className="font-mono text-xs px-2 py-0 h-5 leading-none rounded-sm text-muted-foreground shrink-0">
                                {product.sku}
                              </Badge>
                            )}
                            <span className="text-sm font-semibold text-foreground/90 truncate">{product.name}</span>
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {summaryText || `${productTotalItems} ${productTotalItems === 1 ? "item" : "itens"}`}
                          </div>
                        </div>
                        <div className="ml-auto flex items-center gap-2 pl-2">
                          <span className="text-sm font-semibold tabular-nums text-foreground/90">{formatBRL(productTotalValueCents)}</span>
                          {isOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/50" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50" />}
                        </div>
                      </Button>
                    </CollapsibleTrigger>
                  </div>

                  <CollapsibleContent>
                    <div className="border-t divide-y bg-muted/30">
                      {product.derivatedProducts.map((item) => (
                        <div key={item.id} className="flex items-center justify-between py-2.5 pl-12 pr-3 hover:bg-muted/50 transition-colors group">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Variação</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-foreground/80">{item.name}</span>
                              <div className="flex items-center gap-2 text-sm mt-0.5">
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
                              <div className="flex items-center border rounded-md bg-background shadow-xs h-7 overflow-hidden group-hover:border-primary/20 transition-colors">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 rounded-none border-r hover:bg-muted active:bg-muted/80"
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
                                  className="h-7 w-7 rounded-none border-l hover:bg-muted active:bg-muted/80"
                                  onClick={() => updateItem({ cartDerivatedProductId: item.id, amount: item.amount + 1 })}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-xs px-2 py-0.5 font-mono">
                                {item.amount} un
                              </Badge>
                            )}

                            <div className="text-right min-w-[80px]">
                              <span className="text-sm font-bold text-foreground">{formatBRL(item.amount * item.price)}</span>
                            </div>

                            {!isReadOnly && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                                onClick={() => deleteItem(item.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
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
      </div>

      <div className="pt-3 text-sm text-muted-foreground">
        {isLoading ? (
          <Skeleton className="h-4 w-[220px]" />
        ) : (
          <>
            Total de {totalDistinctItems} {itemLabel} e {totalUnits} {unitLabel}.
          </>
        )}
      </div>
    </div>
  )
}
