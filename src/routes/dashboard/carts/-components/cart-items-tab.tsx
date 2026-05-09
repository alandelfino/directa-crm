import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { privateInstance } from "@/lib/auth"
import { useQuery } from "@tanstack/react-query"
import { ChevronDown, ChevronUp, Loader2, Mail, MapPin, Minus, Package, Pencil, Phone, Plus, ShoppingCart, TicketPercent, Trash2, Truck, User2, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import type { Cart, CustomerAddress, ShippingQuote } from "./edit-cart.types"
import { IconPencil } from "@tabler/icons-react"

type CustomerDetails = {
  id: number
  name?: string | null
  nameOrTradeName?: string | null
  email?: string | null
  phone?: string | null
  personType?: "natural" | "entity" | null
  cpfOrCnpj?: string | null
}

type CustomerAddressesResponse = { items: CustomerAddress[] } | CustomerAddress[]

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null

export function CartTopCards({
  cart,
  customerId,
  selectedShippingQuote,
  isSelectingShippingQuote,
  isUpdatingCartAfterShippingSelect,
  selectShippingQuote,
  selectedAddressId,
  setSelectedAddressId,
  isSelectingAddress,
  isUpdatingCartAfterAddressSelect,
  selectCartAddress,
  isReadOnly,
  formatBRL,
}: {
  cart: Cart | undefined
  customerId: number | undefined
  selectedShippingQuote: ShippingQuote | null
  isSelectingShippingQuote: boolean
  isUpdatingCartAfterShippingSelect: boolean
  selectShippingQuote: (shippingQuoteId: number) => void
  selectedAddressId: number | null
  setSelectedAddressId: (next: number | null) => void
  isSelectingAddress: boolean
  isUpdatingCartAfterAddressSelect: boolean
  selectCartAddress: (addressId: number) => void
  isReadOnly: boolean
  formatBRL: (valueInCents: number) => string
}) {
  const [shippingSheetOpen, setShippingSheetOpen] = useState(false)
  const [shippingSelectedId, setShippingSelectedId] = useState<number | null>(null)

  const [addressSheetOpen, setAddressSheetOpen] = useState(false)
  const [addressSelectedId, setAddressSelectedId] = useState<number | null>(null)

  const shippingQuotes = useMemo<ShippingQuote[]>(() => cart?.shippingQuote ?? [], [cart?.shippingQuote])

  useEffect(() => {
    if (!shippingSheetOpen) {
      setShippingSelectedId(null)
      return
    }
    setShippingSelectedId(selectedShippingQuote?.id ?? null)
  }, [shippingSheetOpen, selectedShippingQuote?.id])

  useEffect(() => {
    if (!addressSheetOpen) {
      setAddressSelectedId(null)
      return
    }
    const initialId = cart?.address?.id ?? selectedAddressId ?? null
    setAddressSelectedId(initialId)
  }, [addressSheetOpen, cart?.address?.id, selectedAddressId])

  const { data: customer } = useQuery<CustomerDetails>({
    queryKey: ["customer-details", customerId],
    enabled: Number(customerId) > 0,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await privateInstance.get<CustomerDetails>(`/tenant/customers/${customerId}`)
      return response.data
    },
  })

  const {
    data: customerAddressesData,
    isLoading: isLoadingAddresses,
  } = useQuery<CustomerAddressesResponse>({
    queryKey: ["customer-addresses", customerId],
    enabled: addressSheetOpen && Number(customerId) > 0,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await privateInstance.get<CustomerAddressesResponse>(`/tenant/customers/${customerId}/address`)
      return response.data
    },
  })

  const customerAddresses = useMemo<CustomerAddress[]>(() => {
    if (!customerAddressesData) return []
    if (Array.isArray(customerAddressesData)) return customerAddressesData
    if (isRecord(customerAddressesData) && Array.isArray(customerAddressesData.items)) return customerAddressesData.items as CustomerAddress[]
    return []
  }, [customerAddressesData])

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
  const customerEmail = String(customer?.email ?? "")
  const customerPhone = String(customer?.phone ?? "")
  const customerPersonType = customer?.personType ?? undefined
  const customerCpfOrCnpj = String(customer?.cpfOrCnpj ?? "")
  const customerDoc =
    customerPersonType === "entity" ? formatCnpj(customerCpfOrCnpj) : customerPersonType === "natural" ? formatCpf(customerCpfOrCnpj) : customerCpfOrCnpj

  const selectedAddress = cart?.address ?? null

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="md:col-span-2 rounded-xl border bg-background shadow-sm p-4">
        <div className="flex items-start gap-3">
          <div>
            <User2 className="h-3.5 w-3.5 text-primary/70" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs text-muted-foreground">Cliente</div>
            <div className="mt-0.5 text-[13px] font-semibold truncate">{customerName || "—"}</div>
            <div className="mt-2 grid grid-cols-1 gap-1.5 text-xs text-muted-foreground md:grid-cols-3">
              <div className="flex items-center gap-2 min-w-0">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate">{customerEmail || "—"}</span>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <Phone className="h-3 w-3 shrink-0" />
                <span className="truncate">{customerPhone || "—"}</span>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant="outline" className="text-[10px] h-4 px-2 shrink-0">
                  {customerPersonType === "entity" ? "CNPJ" : customerPersonType === "natural" ? "CPF" : "Documento"}
                </Badge>
                <span className="truncate">{customerDoc || "—"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative rounded-xl border bg-background shadow-sm p-4 flex flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div>
              <Truck className="h-3.5 w-3.5 text-primary/70" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">Frete selecionado</div>
              <div className="mt-0.5 text-[13px] font-semibold truncate">{selectedShippingQuote ? selectedShippingQuote.carrierName : "Sem frete"}</div>
              {selectedShippingQuote ? (
                <div className="mt-1 text-xs text-muted-foreground truncate">
                  {selectedShippingQuote.serviceName} • {selectedShippingQuote.deadline} dia(s)
                </div>
              ) : (
                <div className="mt-1 text-xs text-muted-foreground">Selecione uma cotação para calcular o total.</div>
              )}
            </div>
          </div>

          {selectedShippingQuote ? (
            <div className="shrink-0 text-[13px] font-semibold tabular-nums">{formatBRL(selectedShippingQuote.price)}</div>
          ) : null}
        </div>

        <div className="mt-auto pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute -top-3 -right-3 border rounded bg-white w-6 h-6 text-blue-600 cursor-pointer"
            onClick={() => setShippingSheetOpen(true)}
            disabled={isReadOnly}
          >
            <IconPencil />
          </Button>
        </div>
      </div>

      <div className="relative rounded-xl border bg-background shadow-sm p-4 flex flex-col">
        <div className="flex items-start gap-3">
          <div>
            <MapPin className="h-3.5 w-3.5 text-primary/70" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">Endereço selecionado</div>
            <div className="mt-0.5 text-[13px] font-semibold truncate">{selectedAddress ? selectedAddress.name : "Sem endereço"}</div>
            {selectedAddress ? (
              <div className="mt-1 text-xs text-muted-foreground truncate">
                {selectedAddress.streetName}, {selectedAddress.number} • {selectedAddress.neighborhood}
              </div>
            ) : (
              <div className="mt-1 text-xs text-muted-foreground">Selecione um endereço para o carrinho.</div>
            )}
            {selectedAddress ? (
              <div className="mt-1 text-xs text-muted-foreground truncate">
                {selectedAddress.city} - {selectedAddress.state} • {selectedAddress.zipCode}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-auto pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute -top-3 -right-3 border rounded bg-white w-6 h-6 text-blue-600 cursor-pointer"
            onClick={() => setAddressSheetOpen(true)}
            disabled={isReadOnly || !customerId}
          >
            <Pencil />
          </Button>
        </div>
      </div>

      <Sheet open={shippingSheetOpen} onOpenChange={setShippingSheetOpen}>
        <SheetContent className="flex flex-col gap-0 p-0 w-full sm:w-[min(720px,calc(100vw-2rem))]">
          <SheetHeader className="border-b p-4">
            <SheetTitle>Mais opções de frete</SheetTitle>
            <SheetDescription>Selecione uma opção para aplicar ao carrinho.</SheetDescription>
          </SheetHeader>

          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
            {(isSelectingShippingQuote || isUpdatingCartAfterShippingSelect) && shippingQuotes.length === 0 ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <Skeleton className="h-4 w-[180px]" />
                        <Skeleton className="mt-2 h-3 w-[240px]" />
                      </div>
                      <Skeleton className="h-4 w-[90px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : shippingQuotes.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhuma cotação de frete disponível.</div>
            ) : (
              <div className="space-y-2">
                {shippingQuotes.map((q) => {
                  const checked = shippingSelectedId === q.id
                  return (
                    <button
                      key={q.id}
                      type="button"
                      className={[
                        "w-full rounded-lg border p-3 text-left transition-colors",
                        checked ? "border-primary bg-primary/5" : "hover:bg-muted/30",
                      ].join(" ")}
                      onClick={() => setShippingSelectedId(q.id)}
                      disabled={isReadOnly}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                            <Checkbox checked={checked} onCheckedChange={() => setShippingSelectedId(q.id)} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold truncate">{q.carrierName}</div>
                            <div className="mt-0.5 text-xs text-muted-foreground truncate">
                              {q.serviceName} • {q.deadline} dia(s)
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 text-sm font-semibold tabular-nums">{formatBRL(q.price)}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <SheetFooter className="border-t p-4 flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShippingSheetOpen(false)}
              disabled={isSelectingShippingQuote || isUpdatingCartAfterShippingSelect}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!shippingSelectedId) return
                selectShippingQuote(shippingSelectedId)
                setShippingSheetOpen(false)
              }}
              disabled={
                isReadOnly ||
                !shippingSelectedId ||
                isSelectingShippingQuote ||
                isUpdatingCartAfterShippingSelect ||
                shippingSelectedId === (selectedShippingQuote?.id ?? null)
              }
            >
              Aplicar
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={addressSheetOpen} onOpenChange={setAddressSheetOpen}>
        <SheetContent className="flex flex-col gap-0 p-0 w-full sm:w-[min(720px,calc(100vw-2rem))]">
          <SheetHeader className="border-b p-4">
            <SheetTitle>Escolher outro endereço</SheetTitle>
            <SheetDescription>Selecione um endereço para aplicar ao carrinho.</SheetDescription>
          </SheetHeader>

          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
            {isLoadingAddresses ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <Skeleton className="h-4 w-[220px]" />
                        <Skeleton className="mt-2 h-3 w-[300px]" />
                      </div>
                      <Skeleton className="h-4 w-[60px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : customerAddresses.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhum endereço encontrado.</div>
            ) : (
              <div className="space-y-2">
                {customerAddresses.map((a) => {
                  const checked = addressSelectedId === a.id
                  return (
                    <button
                      key={a.id}
                      type="button"
                      className={[
                        "w-full rounded-lg border p-3 text-left transition-colors",
                        checked ? "border-primary bg-primary/5" : "hover:bg-muted/30",
                      ].join(" ")}
                      onClick={() => setAddressSelectedId(a.id)}
                      disabled={isReadOnly}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                            <Checkbox checked={checked} onCheckedChange={() => setAddressSelectedId(a.id)} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold truncate">{a.name}</div>
                            <div className="mt-0.5 text-xs text-muted-foreground truncate">
                              {a.streetName}, {a.number} • {a.neighborhood}
                            </div>
                            <div className="mt-0.5 text-xs text-muted-foreground truncate">
                              {a.city} - {a.state} • {a.zipCode}
                            </div>
                          </div>
                        </div>
                        {a.isDefault ? (
                          <Badge variant="secondary" className="shrink-0 h-5 px-2 text-[10px]">
                            Padrão
                          </Badge>
                        ) : null}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <SheetFooter className="border-t p-4 flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddressSheetOpen(false)}
              disabled={isSelectingAddress || isUpdatingCartAfterAddressSelect}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!addressSelectedId) return
                setSelectedAddressId(addressSelectedId)
                selectCartAddress(addressSelectedId)
                setAddressSheetOpen(false)
              }}
              disabled={
                isReadOnly ||
                !addressSelectedId ||
                isSelectingAddress ||
                isUpdatingCartAfterAddressSelect ||
                addressSelectedId === (cart?.address?.id ?? null)
              }
            >
              Aplicar
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

export function CartItemsTab({
  cart,
  openProducts,
  toggleProductOpen,
  setAddProductOpen,
  isReadOnly,
  formatBRL,
  updateItem,
  deleteItem,
}: {
  cart: Cart | undefined
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
          <ShoppingCart className="h-3.5 w-3.5" /> Itens ({cart?.totalItems || 0})
        </h3>
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setAddProductOpen(true)} disabled={isReadOnly}>
          <Plus className="h-3 w-3 mr-1.5" /> Adicionar
        </Button>
      </div>

      <div className="p-3 space-y-3 flex-1">
        {(cart?.products || []).length === 0 ? (
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
            {cart?.products.map((product) => {
              const isOpen = openProducts.includes(product.name)
              const productTotalItems = product.totalItems || product.derivatedProducts.reduce((acc, item) => acc + item.amount, 0)

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
  couponCode,
  setCouponCode,
  applyCoupon,
  isApplyingCoupon,
  isRemovingCoupon,
  setSelectedCouponCode,
  setRemoveCouponOpen,
  isReadOnly,
}: {
  cupons: NonNullable<Cart["cupons"]>
  couponCode: string
  setCouponCode: (next: string) => void
  applyCoupon: (code: string) => void
  isApplyingCoupon: boolean
  isRemovingCoupon: boolean
  setSelectedCouponCode: (code: string | null) => void
  setRemoveCouponOpen: (open: boolean) => void
  isReadOnly: boolean
}) {
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
              {cupons.length > 0 ? "Cupons aplicados no carrinho." : "Digite o código para aplicar no carrinho."}
            </div>
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
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9"
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
  )
}
