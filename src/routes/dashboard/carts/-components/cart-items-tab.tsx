import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { privateInstance } from "@/lib/auth"
import { useQuery } from "@tanstack/react-query"
import { ChevronDown, ChevronUp, Loader2, Minus, Package, Plus, ShoppingCart, TicketPercent, Trash2, User2, X } from "lucide-react"
import type { CartBasic, CartCuponsResponse, ProductGroup } from "./edit-cart.types"

type CustomerDetails = {
  id: number
  name?: string | null
  nameOrTradeName?: string | null
  personType?: "natural" | "entity" | null
  cpfOrCnpj?: string | null
}

export function CartCustomerInfoCard({
  cart,
  customerId,
  isLoadingCartBasic,
}: {
  cart: CartBasic | undefined
  customerId: number | undefined
  isLoadingCartBasic: boolean
}) {
  const { data: customer, isLoading } = useQuery<CustomerDetails>({
    queryKey: ["customer-details", customerId],
    enabled: Number(customerId) > 0,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await privateInstance.get<CustomerDetails>(`/tenant/customers/${customerId}`)
      return response.data
    },
  })

  const onlyDigits = (v?: string) => String(v ?? "").replace(/\D/g, "")
  const formatCpf = (v?: string) => {
    let d = onlyDigits(v).slice(0, 11)
    d = d.replace(/^(\d{3})(\d)/, "$1.$2")
    d = d.replace(/^(\d{3}\.\d{3})(\d)/, "$1.$2")
    d = d.replace(/^(\d{3}\.\d{3}\.\d{3})(\d)/, "$1-$2")
    return d
  }
  const formatCnpj = (v?: string) => {
    let d = onlyDigits(v).slice(0, 14)
    d = d.replace(/^(\d{2})(\d)/, "$1.$2")
    d = d.replace(/^(\d{2}\.\d{3})(\d)/, "$1.$2")
    d = d.replace(/^(\d{2}\.\d{3}\.\d{3})(\d)/, "$1/$2")
    d = d.replace(/^(\d{2}\.\d{3}\.\d{3}\/\d{4})(\d)/, "$1-$2")
    return d
  }

  const customerName = String(customer?.nameOrTradeName ?? customer?.name ?? cart?.customer?.name ?? "")
  const customerPersonType = customer?.personType ?? undefined
  const customerCpfOrCnpj = String(customer?.cpfOrCnpj ?? "")
  const customerDoc =
    customerPersonType === "entity" ? formatCnpj(customerCpfOrCnpj) : customerPersonType === "natural" ? formatCpf(customerCpfOrCnpj) : customerCpfOrCnpj
  const showSkeleton = isLoadingCartBasic || isLoading

  return (
    <div className="rounded-xl border bg-background shadow-sm p-4">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-xl bg-primary/5 border flex items-center justify-center shrink-0">
          <User2 className="h-3.5 w-3.5 text-primary/70" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted-foreground">Cliente</div>
          {showSkeleton ? (
            <div className="mt-1 space-y-2">
              <Skeleton className="h-4 w-[220px]" />
              <Skeleton className="h-3 w-[160px]" />
            </div>
          ) : (
            <>
              <div className="mt-0.5 text-[13px] font-semibold truncate">{customerName || "—"}</div>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-[10px] h-4 px-2 shrink-0">
                  {customerPersonType === "entity" ? "CNPJ" : customerPersonType === "natural" ? "CPF" : "Documento"}
                </Badge>
                <span className="truncate">{customerDoc || "—"}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

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
  return (
    <div className="rounded-xl border bg-background shadow-sm overflow-hidden flex flex-col min-h-[400px]">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h3 className="text-[13px] font-semibold flex items-center gap-2">
          <ShoppingCart className="h-3.5 w-3.5" />
          <span>Itens</span>
          {isLoading ? <Skeleton className="h-4 w-10" /> : <span>({totalItems})</span>}
        </h3>
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setAddProductOpen(true)} disabled={isReadOnly}>
          <Plus className="h-3 w-3 mr-1.5" /> Adicionar
        </Button>
      </div>

      <div className="p-3 space-y-3 flex-1">
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
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs mt-2" onClick={() => setAddProductOpen(true)} disabled={isReadOnly}>
                <Plus className="h-3 w-3 mr-1.5" /> Adicionar Produtos
              </Button>
            </Empty>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((product) => {
              const isOpen = openProducts.includes(product.name)
              const productTotalItems = product.derivatedProducts.reduce((acc, item) => acc + item.amount, 0)

              return (
                <Collapsible
                  key={product.id}
                  open={isOpen}
                  onOpenChange={() => toggleProductOpen(product.name)}
                  className="border rounded-lg bg-card shadow-xs transition-all hover:shadow-md"
                >
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="p-0 h-auto hover:bg-transparent flex-1 justify-start gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-primary/5 border flex items-center justify-center shrink-0">
                          <Package className="h-3.5 w-3.5 text-primary/70" />
                        </div>
                        <div className="flex flex-col items-start text-left gap-1 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            {product.sku && (
                              <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0 h-5 leading-none rounded-sm text-muted-foreground shrink-0">
                                {product.sku}
                              </Badge>
                            )}
                            <span className="text-[13px] font-semibold text-foreground/90 truncate">{product.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 leading-none font-normal border-muted-foreground/20">
                              {productTotalItems} {productTotalItems === 1 ? "item" : "itens"}
                            </Badge>
                          </span>
                        </div>
                        {isOpen ? <ChevronUp className="ml-auto h-3.5 w-3.5 text-muted-foreground/50" /> : <ChevronDown className="ml-auto h-3.5 w-3.5 text-muted-foreground/50" />}
                      </Button>
                    </CollapsibleTrigger>
                  </div>

                  <CollapsibleContent>
                    <div className="border-t divide-y bg-muted/30">
                      {product.derivatedProducts.map((item) => (
                        <div key={item.id} className="flex items-center justify-between py-2.5 pl-12 pr-3 hover:bg-muted/50 transition-colors group">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-[9px]">Variação</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[13px] font-medium text-foreground/80">{item.name}</span>
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
                                <div className="w-9 text-center text-xs font-medium tabular-nums h-full flex items-center justify-center bg-transparent">
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
                              <span className="text-[13px] font-bold text-foreground">{formatBRL(item.amount * item.price)}</span>
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
    </div>
  )
}

export function CartCouponCard({
  cupons,
  isLoading,
  couponCode,
  setCouponCode,
  applyCoupon,
  isApplyingCoupon,
  isRemovingCoupon,
  setSelectedCouponCode,
  setRemoveCouponOpen,
  isReadOnly,
}: {
  cupons: CartCuponsResponse["cupons"]
  isLoading: boolean
  couponCode: string
  setCouponCode: (next: string) => void
  applyCoupon: (code: string) => void
  isApplyingCoupon: boolean
  isRemovingCoupon: boolean
  setSelectedCouponCode: (code: string | null) => void
  setRemoveCouponOpen: (open: boolean) => void
  isReadOnly: boolean
}) {
  const isBusy = isLoading || isApplyingCoupon || isRemovingCoupon

  return (
    <div className="rounded-xl border bg-background shadow-sm p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-primary/5 border flex items-center justify-center shrink-0">
            <TicketPercent className="h-3.5 w-3.5 text-primary/70" />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold leading-none">Cupom de desconto</div>
            <div className="mt-1 text-xs text-muted-foreground truncate">
              {isLoading ? (
                <Skeleton className="h-3 w-[220px]" />
              ) : cupons.length > 0 ? (
                "Cupons aplicados no carrinho."
              ) : (
                "Digite o código para aplicar no carrinho."
              )}
            </div>
          </div>
        </div>
      </div>

      {!isLoading && cupons.length > 0 ? (
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
        {isLoading ? (
          <Skeleton className="h-9 flex-1" />
        ) : (
          <Input
            className="h-9 text-sm"
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
        )}
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9"
          disabled={isReadOnly || isBusy || !couponCode.trim()}
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
  )
}
