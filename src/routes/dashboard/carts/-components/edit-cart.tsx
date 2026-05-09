import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { privateInstance } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { ChevronDown, MapPin, ShoppingCart, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { AddProductsToCartSheet } from "./add-products-to-cart-sheet"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { CartAddress, CartBasic, CartCuponsResponse, CartProductsResponse, CartShippingQuoteResponse, CustomerAddress, DerivatedProduct, ProductGroup } from "./edit-cart.types"
import { CartCouponCard, CartCustomerInfoCard, CartItemsTab } from "./cart-items-tab"
import { CartSummaryCard } from "./cart-summary-card"

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null

const getApiErrorData = (err: unknown): { title?: string; detail?: string } | null => {
  if (!isRecord(err)) return null
  const response = err.response
  if (!isRecord(response)) return null
  const data = response.data
  if (!isRecord(data)) return null

  const title = typeof data.title === "string" ? data.title : undefined
  const detail = typeof data.detail === "string" ? data.detail : undefined
  return title || detail ? { title, detail } : null
}

type CustomerAddressesResponse = { items: CustomerAddress[] } | CustomerAddress[]

export function EditCartSheet({
  cartId,
  onOpenChange,
  onCartChanged,
}: {
  cartId: number
  onOpenChange?: (open: boolean) => void
  onCartChanged?: () => void
}) {
  const [open, setOpen] = useState(true)
  const [addProductOpen, setAddProductOpen] = useState(false)
  const [openProducts, setOpenProducts] = useState<string[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)
  const [shippingSheetOpen, setShippingSheetOpen] = useState(false)
  const [shippingSelectedId, setShippingSelectedId] = useState<number | null>(null)
  const [isUpdatingCartAfterShippingSelect, setIsUpdatingCartAfterShippingSelect] = useState(false)
  const [isUpdatingCartAfterAddressSelect, setIsUpdatingCartAfterAddressSelect] = useState(false)
  const [couponCode, setCouponCode] = useState("")
  const [removeCouponOpen, setRemoveCouponOpen] = useState(false)
  const [selectedCouponCode, setSelectedCouponCode] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: cartBasic, isLoading: isLoadingCartBasic } = useQuery<CartBasic>({
    queryKey: ["cart-basic", cartId],
    enabled: !!cartId && open,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await privateInstance.get<CartBasic>(`/tenant/carts/${cartId}`)
      return response.data
    },
  })

  const { data: cartProducts, isLoading: isLoadingCartProducts } = useQuery<CartProductsResponse>({
    queryKey: ["cart-products", cartId],
    enabled: !!cartId && open,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await privateInstance.get<CartProductsResponse>(`/tenant/carts/${cartId}/products`)
      return response.data
    },
  })

  const { data: cartCupons, isLoading: isLoadingCartCupons } = useQuery<CartCuponsResponse>({
    queryKey: ["cart-cupons", cartId],
    enabled: !!cartId && open,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await privateInstance.get<CartCuponsResponse>(`/tenant/carts/${cartId}/cupons`)
      return response.data
    },
  })

  const { data: cartShipping, isLoading: isLoadingCartShipping } = useQuery<CartShippingQuoteResponse>({
    queryKey: ["cart-shipping-quote", cartId],
    enabled: !!cartId && open,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await privateInstance.get<CartShippingQuoteResponse>(`/tenant/carts/${cartId}/shipping-quote`)
      return response.data
    },
  })

  const customerId = cartBasic?.customer?.id

  const { data: customerAddressesData, isLoading: isLoadingAddresses } = useQuery<CustomerAddressesResponse>({
    queryKey: ["customer-addresses", customerId],
    enabled: shippingSheetOpen && Number(customerId) > 0,
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

  useEffect(() => {
    const next = cartBasic?.address?.id
    if (typeof next === 'number') setSelectedAddressId(next)
    else setSelectedAddressId(null)
  }, [cartBasic?.address?.id])

  useEffect(() => {
    setCouponCode('')
    setRemoveCouponOpen(false)
    setSelectedCouponCode(null)
  }, [cartId])

  const { mutate: selectShippingQuote, isPending: isSelectingShippingQuote } = useMutation<
    { id: number; cartId: number; serviceId: number; price: number; deadline: number; isSelected: boolean; updatedAt: string },
    unknown,
    number,
    { previousShipping: CartShippingQuoteResponse | undefined }
  >({
    mutationFn: async (shippingQuoteId: number) => {
      const response = await privateInstance.put<{ id: number; cartId: number; serviceId: number; price: number; deadline: number; isSelected: boolean; updatedAt: string }>(
        `/tenant/carts/${cartId}/shipping-quote/${shippingQuoteId}/select`
      )
      return response.data
    },
    onMutate: async (shippingQuoteId: number) => {
      const previousShipping = queryClient.getQueryData<CartShippingQuoteResponse>(["cart-shipping-quote", cartId])
      queryClient.setQueryData<CartShippingQuoteResponse>(["cart-shipping-quote", cartId], (old) => {
        if (!old) return old
        return {
          ...old,
          shippingQuote: old.shippingQuote.map((q) => ({ ...q, isSelected: q.id === shippingQuoteId })),
        }
      })
      return { previousShipping }
    },
    onSuccess: async () => {
      onCartChanged?.()
      setIsUpdatingCartAfterShippingSelect(true)
      await queryClient.refetchQueries({ queryKey: ["cart-shipping-quote", cartId], exact: true })
      setIsUpdatingCartAfterShippingSelect(false)
    },
    onError: (error, _shippingQuoteId, context) => {
      if (context?.previousShipping) {
        queryClient.setQueryData(["cart-shipping-quote", cartId], context.previousShipping)
      }
      const errorData = getApiErrorData(error)
      toast.error(errorData?.title || "Erro ao selecionar frete", {
        description: errorData?.detail || "Não foi possível selecionar a cotação de frete.",
      })
      setIsUpdatingCartAfterShippingSelect(false)
    },
    onSettled: () => {
      setIsUpdatingCartAfterShippingSelect(false)
    },
  })

  const { mutate: selectCartAddress, isPending: isSelectingAddress } = useMutation<
    { cartId: number; address: CartAddress },
    unknown,
    number,
    { prevSelectedAddressId: number | null }
  >({
    mutationFn: async (addressId: number) => {
      const response = await privateInstance.put(`/tenant/carts/${cartId}/address`, { addressId })
      return response.data as { cartId: number; address: CartAddress }
    },
    onMutate: async (addressId: number) => {
      const prev = selectedAddressId
      setSelectedAddressId(addressId)
      return { prevSelectedAddressId: prev }
    },
    onSuccess: async () => {
      onCartChanged?.()
      setIsUpdatingCartAfterAddressSelect(true)
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["cart-basic", cartId], exact: true }),
        queryClient.refetchQueries({ queryKey: ["cart-shipping-quote", cartId], exact: true }),
      ])
      setIsUpdatingCartAfterAddressSelect(false)
    },
    onError: (error, _addressId, context) => {
      const prev = context?.prevSelectedAddressId
      if (typeof prev === 'number' || prev === null) setSelectedAddressId(prev ?? null)
      const errorData = getApiErrorData(error)
      toast.error(errorData?.title || 'Erro ao selecionar endereço', {
        description: errorData?.detail || 'Não foi possível atualizar o endereço do carrinho.'
      })
      setIsUpdatingCartAfterAddressSelect(false)
    },
    onSettled: () => {
      setIsUpdatingCartAfterAddressSelect(false)
    }
  })

  const { mutate: applyCoupon, isPending: isApplyingCoupon } = useMutation<
    {
      cartId: number
      cupon: {
        id: number
        code: string
        description: string
        customerMessage: string
        type: string
        value: number
        storeId: number
      }
      totals: {
        productsValue: number
        shippingValue: number
        totalValue: number
        discountApplied: number
        finalTotalValue: number
      }
      applied: null | {
        id: number
        cuponId: number
        cuponValue: number
        discountApplied: number
        type: string
      }
    },
    unknown,
    string
  >({
    mutationFn: async (code: string) => {
      const response = await privateInstance.post(`/tenant/carts/${cartId}/cupons/apply`, { code })
      return response.data as {
        cartId: number
        cupon: {
          id: number
          code: string
          description: string
          customerMessage: string
          type: string
          value: number
          storeId: number
        }
        totals: {
          productsValue: number
          shippingValue: number
          totalValue: number
          discountApplied: number
          finalTotalValue: number
        }
        applied: null | {
          id: number
          cuponId: number
          cuponValue: number
          discountApplied: number
          type: string
        }
      }
    },
    onSuccess: async () => {
      onCartChanged?.()
      toast.success("Cupom aplicado com sucesso!")
      setCouponCode("")
      await queryClient.refetchQueries({ queryKey: ["cart-cupons", cartId], exact: true })
    },
    onError: (error) => {
      const errorData = getApiErrorData(error)
      toast.error(errorData?.title || "Erro ao aplicar cupom", {
        description: errorData?.detail || "Não foi possível aplicar o cupom no carrinho.",
      })
    },
    onSettled: () => {
    },
  })

  const { mutate: removeCoupon, isPending: isRemovingCoupon } = useMutation<number, unknown, void>({
    mutationFn: async () => {
      const response = await privateInstance.delete(`/tenant/carts/${cartId}/cupons`)
      return response.status
    },
    onSuccess: async () => {
      onCartChanged?.()
      setRemoveCouponOpen(false)
      setSelectedCouponCode(null)
      toast.success("Cupom removido.")
      setCouponCode("")
      await queryClient.refetchQueries({ queryKey: ["cart-cupons", cartId], exact: true })
    },
    onError: (error) => {
      setRemoveCouponOpen(false)
      setSelectedCouponCode(null)
      const errorData = getApiErrorData(error)
      toast.error(errorData?.title || "Erro ao remover cupom", {
        description: errorData?.detail || "Não foi possível remover o cupom do carrinho.",
      })
    },
    onSettled: () => {
    },
  })

  // Add items mutation
  const { mutateAsync: addItems } = useMutation<void, unknown, { derivatedProductId: number; amount: number }[]>({
    mutationFn: async (newItems: { derivatedProductId: number, amount: number }[]) => {
      for (const item of newItems) {
        await privateInstance.post(`/tenant/carts/${cartId}/derivated-products`, {
          derivatedProductId: item.derivatedProductId,
          amount: item.amount
        })
      }
    },
    onSuccess: () => {
      onCartChanged?.()
      toast.success('Produtos adicionados com sucesso!')
      queryClient.invalidateQueries({ queryKey: ["cart-products", cartId] })
      queryClient.invalidateQueries({ queryKey: ["cart-shipping-quote", cartId] })
      setAddProductOpen(false)
    },
    onError: (error) => {
      const errorData = getApiErrorData(error)
      toast.error(errorData?.title || 'Erro ao adicionar produtos', {
        description: errorData?.detail || 'Não foi possível adicionar os produtos ao carrinho.'
      })
    }
  })

  // Update item amount mutation
  const { mutate: updateItem } = useMutation<
    { id: number; amount: number },
    unknown,
    { cartDerivatedProductId: number; amount: number }
  >({
    mutationFn: async ({ cartDerivatedProductId, amount }: { cartDerivatedProductId: number, amount: number }) => {
      const response = await privateInstance.put<{ id: number; amount: number }>(`/tenant/carts/${cartId}/derivated-products/${cartDerivatedProductId}`, {
        amount
      })
      return response.data
    },
    onSuccess: (updatedItem) => {
      onCartChanged?.()
      queryClient.setQueryData<CartProductsResponse>(["cart-products", cartId], (oldData) => {
        if (!oldData) return oldData
        const nextAmount = Number(updatedItem.amount)

        const nextProducts = oldData.products
          .map((group: ProductGroup) => {
            const nextDerivatedProducts = group.derivatedProducts
              .map((p: DerivatedProduct) => {
                if (Number(p.id) !== Number(updatedItem.id)) return p
                return { ...p, amount: nextAmount, totalValue: nextAmount * p.price }
              })
              .filter((p) => p.amount > 0)

            return { ...group, derivatedProducts: nextDerivatedProducts }
          })
          .filter((group) => group.derivatedProducts.length > 0)

        return { ...oldData, products: nextProducts }
      })
      queryClient.invalidateQueries({ queryKey: ["cart-shipping-quote", cartId] })
    },
    onError: () => {
      toast.error('Erro ao atualizar item.')
    }
  })

  // Delete item mutation
  const { mutate: deleteItem } = useMutation<number, unknown, number>({
    mutationFn: async (cartDerivatedProductId: number) => {
      await privateInstance.put(`/tenant/carts/${cartId}/derivated-products/${cartDerivatedProductId}`, {
        amount: 0
      })
      return cartDerivatedProductId
    },
    onSuccess: (deletedId) => {
      onCartChanged?.()
      toast.success('Item removido.')

      queryClient.setQueryData<CartProductsResponse>(["cart-products", cartId], (oldData) => {
        if (!oldData) return oldData
        const nextProducts = oldData.products
          .map((group: ProductGroup) => ({
            ...group,
            derivatedProducts: group.derivatedProducts.filter((p) => Number(p.id) !== Number(deletedId)),
          }))
          .filter((group) => group.derivatedProducts.length > 0)

        return { ...oldData, products: nextProducts }
      })
      queryClient.invalidateQueries({ queryKey: ["cart-shipping-quote", cartId] })
    },
    onError: () => {
      toast.error('Erro ao remover item.')
    }
  })

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    onOpenChange?.(newOpen)
  }

  const toggleProductOpen = (productName: string) => {
    setOpenProducts(prev =>
      prev.includes(productName)
        ? prev.filter(n => n !== productName)
        : [...prev, productName]
    )
  }

  const isReadOnly = cartBasic ? cartBasic.status !== "open" : true
  const shippingQuotes = cartShipping?.shippingQuote ?? []
  const selectedShippingQuote = shippingQuotes.find((q) => q.isSelected) ?? null
  const selectedShippingPrice = selectedShippingQuote?.price ?? 0
  const cupons = cartCupons?.cupons ?? []
  const selectedAddress = cartBasic?.address ?? null

  useEffect(() => {
    if (!shippingSheetOpen) {
      setShippingSelectedId(null)
      return
    }
    setShippingSelectedId(selectedShippingQuote?.id ?? null)
  }, [shippingSheetOpen, selectedShippingQuote?.id])

  const productGroups = cartProducts?.products ?? []
  const totalItems = productGroups.reduce(
    (acc, group) => acc + group.derivatedProducts.reduce((acc2, item) => acc2 + item.amount, 0),
    0
  )
  const productsValueCents = productGroups.reduce(
    (acc, group) => acc + group.derivatedProducts.reduce((acc2, item) => acc2 + item.totalValue, 0),
    0
  )
  const discountsCents = cupons.reduce((acc, c) => acc + (c.discountApplied || 0), 0)
  const totalWithShippingCents = Math.max(0, productsValueCents + selectedShippingPrice - discountsCents)
  const formatBRL = (valueInCents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((valueInCents || 0) / 100)

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent className="w-[90vw] sm:max-w-none flex flex-col h-full p-0 gap-0">
          <div className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-3">
              <SheetHeader className="gap-0 p-0 flex flex-row items-center">
                <div className="flex gap-2.5 items-center min-w-0">
                  <Avatar className="h-8 w-8 border bg-white shadow-xs shrink-0 rounded-lg">
                    <AvatarFallback className="bg-white">
                      <ShoppingCart className="h-4 w-4 stroke-neutral-600" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0 min-w-0">
                    <SheetTitle className="text-base leading-snug truncate">Carrinho de compras</SheetTitle>
                    <SheetDescription className="text-xs text-muted-foreground">
                      Revise os itens e finalize o pedido
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <SheetClose asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Fechar" title="Fechar">
                  <span className="text-base leading-none">×</span>
                </Button>
              </SheetClose>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden bg-muted/20">
            <div className="mx-auto flex min-h-0 h-full max-w-[1400px] flex-col px-4 py-4">
              <div className="grid flex-1 min-h-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
                <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto pr-1">
                  <CartItemsTab
                    products={productGroups}
                    totalItems={totalItems}
                    isLoading={isLoadingCartProducts}
                    openProducts={openProducts}
                    toggleProductOpen={toggleProductOpen}
                    setAddProductOpen={setAddProductOpen}
                    isReadOnly={isReadOnly}
                    formatBRL={formatBRL}
                    updateItem={updateItem}
                    deleteItem={deleteItem}
                  />

                  <CartCouponCard
                    cupons={cupons}
                    isLoading={isLoadingCartCupons}
                    couponCode={couponCode}
                    setCouponCode={(next) => setCouponCode(next)}
                    applyCoupon={applyCoupon}
                    isApplyingCoupon={isApplyingCoupon}
                    isRemovingCoupon={isRemovingCoupon}
                    setSelectedCouponCode={(code) => setSelectedCouponCode(code)}
                    setRemoveCouponOpen={(next) => setRemoveCouponOpen(next)}
                    isReadOnly={isReadOnly}
                  />
                </div>

                <div className="lg:pl-0">
                  <div className="mb-3">
                    <CartCustomerInfoCard cart={cartBasic} customerId={customerId} isLoadingCartBasic={isLoadingCartBasic} />
                  </div>
                  <CartSummaryCard
                    status={cartBasic?.status ?? null}
                    totalItems={totalItems}
                    productsValueCents={productsValueCents}
                    discountsCents={discountsCents}
                    isLoadingBasic={isLoadingCartBasic}
                    isLoadingProducts={isLoadingCartProducts}
                    isLoadingCupons={isLoadingCartCupons}
                    selectedShippingQuote={selectedShippingQuote}
                    selectedShippingPrice={selectedShippingPrice}
                    isLoadingShipping={isLoadingCartShipping}
                    totalWithShippingCents={totalWithShippingCents}
                    formatBRL={formatBRL}
                    cartId={cartId}
                    isReadOnly={isReadOnly}
                    onEditShipping={() => setShippingSheetOpen(true)}
                  />
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={shippingSheetOpen} onOpenChange={setShippingSheetOpen}>
        <SheetContent className="flex flex-col gap-0 p-0 w-full sm:w-[min(720px,calc(100vw-2rem))]">
          <SheetHeader className="border-b p-4">
            <SheetTitle>Selecionar frete</SheetTitle>
            <SheetDescription>Escolha uma opção para aplicar ao carrinho.</SheetDescription>
          </SheetHeader>

          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild disabled={isReadOnly || !customerId || isSelectingAddress || isUpdatingCartAfterAddressSelect}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-auto w-full justify-between gap-3 px-3 py-2"
                >
                  <span className="flex min-w-0 items-start gap-2">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 text-left">
                      <span className="block text-[11px] text-muted-foreground">Endereço para cotação</span>
                      <span className="block truncate text-xs font-medium">
                        {selectedAddress
                          ? `${selectedAddress.name} • ${selectedAddress.city} - ${selectedAddress.state}`
                          : "Selecionar endereço"}
                      </span>
                    </span>
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[360px] max-h-[320px] overflow-y-auto">
                {isLoadingAddresses ? (
                  <div className="p-2 space-y-2">
                    <Skeleton className="h-4 w-[220px]" />
                    <Skeleton className="h-4 w-[300px]" />
                    <Skeleton className="h-4 w-[260px]" />
                  </div>
                ) : customerAddresses.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground">Nenhum endereço encontrado.</div>
                ) : (
                  customerAddresses.map((a) => {
                    const isSelected = a.id === (selectedAddressId ?? null)
                    return (
                      <DropdownMenuItem
                        key={a.id}
                        className="flex flex-col items-start gap-0.5"
                        onSelect={() => {
                          if (isSelected) return
                          setShippingSelectedId(null)
                          selectCartAddress(a.id)
                        }}
                      >
                        <div className="w-full flex items-center justify-between gap-3">
                          <span className="truncate text-sm font-medium">{a.name}</span>
                          {isSelected ? (
                            <Badge variant="secondary" className="h-5 px-2 text-[10px]">
                              Atual
                            </Badge>
                          ) : null}
                        </div>
                        <span className="truncate text-xs text-muted-foreground">
                          {a.streetName}, {a.number} • {a.neighborhood} • {a.city} - {a.state}
                        </span>
                      </DropdownMenuItem>
                    )
                  })
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {isSelectingAddress || isUpdatingCartAfterAddressSelect ? (
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
            ) : (isLoadingCartShipping || isSelectingShippingQuote || isUpdatingCartAfterShippingSelect) && shippingQuotes.length === 0 ? (
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
                      disabled={isReadOnly || isSelectingAddress || isUpdatingCartAfterAddressSelect}
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
              disabled={isSelectingAddress || isUpdatingCartAfterAddressSelect || isSelectingShippingQuote || isUpdatingCartAfterShippingSelect}
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
                isSelectingAddress ||
                isUpdatingCartAfterAddressSelect ||
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

      <AddProductsToCartSheet
        open={addProductOpen}
        onOpenChange={setAddProductOpen}
        onAddItems={(items) => addItems(items)}
      />

      <AlertDialog open={removeCouponOpen} onOpenChange={setRemoveCouponOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover cupom?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedCouponCode ? `Tem certeza que deseja remover o cupom ${selectedCouponCode} do carrinho?` : 'Tem certeza que deseja remover o cupom do carrinho?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemovingCoupon}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                removeCoupon()
              }}
              disabled={isRemovingCoupon || isReadOnly}
            >
              {isRemovingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
