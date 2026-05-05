import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { privateInstance } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { ShoppingCart, Package, Info, Loader2, Truck, LocationEdit } from "lucide-react"
import { toast } from "sonner"
import { AddProductsToCartSheet } from "./add-products-to-cart-sheet"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { Cart, CartAddress, CustomerAddress, DerivatedProduct, ProductGroup } from "./edit-cart.types"
import { CartItemsTab } from "./cart-items-tab"
import { CartShippingTab } from "./cart-shipping-tab"
import { CartAddressesTab } from "./cart-addresses-tab"
import { CartDetailsTab } from "./cart-details-tab"
import { CartSummaryCard } from "./cart-summary-card"

export function EditCartSheet({ cartId, onOpenChange }: { cartId: number, onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(true)
  const [addProductOpen, setAddProductOpen] = useState(false)
  const [openProducts, setOpenProducts] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'items' | 'shipping' | 'addresses' | 'details'>('items')
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)
  const [isUpdatingCartAfterShippingSelect, setIsUpdatingCartAfterShippingSelect] = useState(false)
  const [isUpdatingCartAfterAddressSelect, setIsUpdatingCartAfterAddressSelect] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [isUpdatingCartAfterCouponChange, setIsUpdatingCartAfterCouponChange] = useState(false)
  const [removeCouponOpen, setRemoveCouponOpen] = useState(false)
  const [selectedCouponCode, setSelectedCouponCode] = useState<string | null>(null)
  const queryClient = useQueryClient()

  // Fetch Cart Details (Store, Status, etc.)
  const { data: cart, isLoading: isLoadingCart } = useQuery({
    queryKey: ['cart', cartId],
    queryFn: async () => {
      const response = await privateInstance.get(`/tenant/carts/${cartId}`)
      return response.data as Cart
    },
    enabled: !!cartId
  })

  const customerId = cart?.customer?.id

  useEffect(() => {
    const next = cart?.address?.id
    if (typeof next === 'number') setSelectedAddressId(next)
    else setSelectedAddressId(null)
  }, [cart?.address?.id])

  useEffect(() => {
    setCouponCode('')
    setRemoveCouponOpen(false)
    setSelectedCouponCode(null)
  }, [cartId])

  const { data: customerAddresses, isLoading: isLoadingAddresses, isRefetching: isRefetchingAddresses, refetch: refetchAddresses } = useQuery({
    queryKey: ['customer-addresses', customerId],
    queryFn: async () => {
      const response = await privateInstance.get(`/tenant/customers/${customerId}/address`)
      const raw = response.data as any
      return Array.isArray(raw) ? (raw as CustomerAddress[]) : []
    },
    enabled: activeTab === 'addresses' && !!customerId,
    refetchOnWindowFocus: false,
  })

  const { mutate: selectShippingQuote, isPending: isSelectingShippingQuote } = useMutation({
    mutationFn: async (shippingQuoteId: number) => {
      const response = await privateInstance.put(`/tenant/carts/${cartId}/shipping-quote/${shippingQuoteId}/select`)
      return response.data as { id: number; cartId: number; price: number; deadline: number; isSelected: boolean; updatedAt: string }
    },
    onMutate: async (shippingQuoteId: number) => {
      const previousCart = queryClient.getQueryData(['cart', cartId]) as Cart | undefined
      queryClient.setQueryData(['cart', cartId], (old: Cart | undefined) => {
        if (!old) return old
        const nextQuotes = (old.shippingQuote ?? []).map((q) => ({
          ...q,
          isSelected: q.id === shippingQuoteId,
        }))
        return { ...old, shippingQuote: nextQuotes }
      })
      return { previousCart }
    },
    onSuccess: async () => {
      setIsUpdatingCartAfterShippingSelect(true)
      await queryClient.refetchQueries({ queryKey: ['cart', cartId], exact: true })
      setIsUpdatingCartAfterShippingSelect(false)
    },
    onError: (error: any, _shippingQuoteId: number, context: any) => {
      const previousCart = context?.previousCart as Cart | undefined
      if (previousCart) {
        queryClient.setQueryData(['cart', cartId], previousCart)
      }
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao selecionar frete', {
        description: errorData?.detail || 'Não foi possível selecionar a cotação de frete.'
      })
      setIsUpdatingCartAfterShippingSelect(false)
    },
    onSettled: () => {
      setIsUpdatingCartAfterShippingSelect(false)
    }
  })

  const { mutate: selectCartAddress, isPending: isSelectingAddress } = useMutation({
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
      setIsUpdatingCartAfterAddressSelect(true)
      await queryClient.refetchQueries({ queryKey: ['cart', cartId], exact: true })
      setIsUpdatingCartAfterAddressSelect(false)
    },
    onError: (error: any, _addressId: number, context: any) => {
      const prev = context?.prevSelectedAddressId
      if (typeof prev === 'number' || prev === null) setSelectedAddressId(prev ?? null)
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao selecionar endereço', {
        description: errorData?.detail || 'Não foi possível atualizar o endereço do carrinho.'
      })
      setIsUpdatingCartAfterAddressSelect(false)
    },
    onSettled: () => {
      setIsUpdatingCartAfterAddressSelect(false)
    }
  })

  const { mutate: applyCoupon, isPending: isApplyingCoupon } = useMutation({
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
      toast.success('Cupom aplicado com sucesso!')
      setCouponCode('')
      setIsUpdatingCartAfterCouponChange(true)
      await queryClient.refetchQueries({ queryKey: ['cart', cartId], exact: true })
      setIsUpdatingCartAfterCouponChange(false)
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao aplicar cupom', {
        description: errorData?.detail || 'Não foi possível aplicar o cupom no carrinho.',
      })
    },
    onSettled: () => {
      setIsUpdatingCartAfterCouponChange(false)
    },
  })

  const { mutate: removeCoupon, isPending: isRemovingCoupon } = useMutation({
    mutationFn: async () => {
      const response = await privateInstance.delete(`/tenant/carts/${cartId}/cupons`)
      return response.status
    },
    onSuccess: async () => {
      setRemoveCouponOpen(false)
      setSelectedCouponCode(null)
      toast.success('Cupom removido.')
      setCouponCode('')
      setIsUpdatingCartAfterCouponChange(true)
      await queryClient.refetchQueries({ queryKey: ['cart', cartId], exact: true })
      setIsUpdatingCartAfterCouponChange(false)
    },
    onError: (error: any) => {
      setRemoveCouponOpen(false)
      setSelectedCouponCode(null)
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao remover cupom', {
        description: errorData?.detail || 'Não foi possível remover o cupom do carrinho.',
      })
    },
    onSettled: () => {
      setIsUpdatingCartAfterCouponChange(false)
    },
  })

  // Add items mutation
  const { mutateAsync: addItems, isPending: isAddingItems } = useMutation({
    mutationFn: async (newItems: { derivatedProductId: number, amount: number }[]) => {
      for (const item of newItems) {
        await privateInstance.post(`/tenant/carts/${cartId}/derivated-products`, {
          derivatedProductId: item.derivatedProductId,
          amount: item.amount
        })
      }
    },
    onSuccess: () => {
      toast.success('Produtos adicionados com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['cart', cartId] })
      setAddProductOpen(false)

      // Automatically open new products
      // We can't access productName here easily anymore, so we might need to rely on CartItems component 
      // or fetch names separately. For now, removing this auto-expand feature or simplifying it.
      // const newNames = new Set(variables.map(v => v.productName))
      // setOpenProducts(prev => Array.from(new Set([...prev, ...newNames])))
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao adicionar produtos', {
        description: errorData?.detail || 'Não foi possível adicionar os produtos ao carrinho.'
      })
    }
  })

  // Update item amount mutation
  const { mutate: updateItem, isPending: isUpdatingItem } = useMutation({
    mutationFn: async ({ cartDerivatedProductId, amount }: { cartDerivatedProductId: number, amount: number }) => {
      const response = await privateInstance.put(`/tenant/carts/${cartId}/derivated-products/${cartDerivatedProductId}`, {
        amount
      })
      return response.data
    },
    onSuccess: (updatedItem) => {
      // Update the main cart query (which contains the products list)
      queryClient.setQueryData(['cart', cartId], (oldData: Cart | undefined) => {
        if (!oldData) return oldData

        const newGroups = (oldData.products || []).map((group: ProductGroup) => {
          // Check if the updated item belongs to this group
          // Note: Using updatedItem.id (relationship ID) to match item.id
          const itemIndex = group.derivatedProducts.findIndex((p: DerivatedProduct) => Number(p.id) === Number(updatedItem.id))

          if (itemIndex === -1) return group

          // Update the specific item in the group
          const newDerivatedProducts = [...group.derivatedProducts]

          // Calculate new total value locally since API doesn't return it in the update response
          const currentItem = newDerivatedProducts[itemIndex]
          const newAmount = Number(updatedItem.amount)
          const newTotalValue = newAmount * currentItem.price

          newDerivatedProducts[itemIndex] = {
            ...currentItem,
            amount: newAmount,
            totalValue: newTotalValue
          }

          // Recalculate group totals
          const groupTotalItems = newDerivatedProducts.reduce((acc, curr) => acc + curr.amount, 0)
          const groupTotalValue = newDerivatedProducts.reduce((acc, curr) => acc + curr.totalValue, 0)

          return {
            ...group,
            derivatedProducts: newDerivatedProducts,
            totalItems: groupTotalItems,
            totalValue: groupTotalValue
          }
        })

        // Recalculate cart totals from the updated groups
        const newTotalItems = newGroups.reduce((acc, group) => acc + group.totalItems, 0)
        const newTotalValue = newGroups.reduce((acc, group) => acc + group.totalValue, 0)

        return {
          ...oldData,
          products: newGroups,
          totalItems: newTotalItems,
          totalValue: newTotalValue
        }
      })
      queryClient.invalidateQueries({ queryKey: ['carts-mini'] })
    },
    onError: () => {
      toast.error('Erro ao atualizar item.')
    }
  })

  // Delete item mutation
  const { mutate: deleteItem, isPending: isDeletingItem } = useMutation({
    mutationFn: async (cartDerivatedProductId: number) => {
      await privateInstance.put(`/tenant/carts/${cartId}/derivated-products/${cartDerivatedProductId}`, {
        amount: 0
      })
      return cartDerivatedProductId
    },
    onSuccess: (deletedId) => {
      toast.success('Item removido.')

      // Optimistically update the cart by removing the item
      queryClient.setQueryData(['cart', cartId], (oldData: Cart | undefined) => {
        if (!oldData) return oldData

        const newGroups = (oldData.products || []).map((group: ProductGroup) => {
          // Filter out the deleted item
          const newDerivatedProducts = group.derivatedProducts.filter(p => Number(p.id) !== Number(deletedId))

          if (newDerivatedProducts.length === group.derivatedProducts.length) return group

          // Recalculate group totals
          const groupTotalItems = newDerivatedProducts.reduce((acc, curr) => acc + curr.amount, 0)
          const groupTotalValue = newDerivatedProducts.reduce((acc, curr) => acc + curr.totalValue, 0)

          return {
            ...group,
            derivatedProducts: newDerivatedProducts,
            totalItems: groupTotalItems,
            totalValue: groupTotalValue
          }
        }).filter(group => group.derivatedProducts.length > 0) // Remove empty groups if any

        // Recalculate cart totals
        const newTotalItems = newGroups.reduce((acc, group) => acc + group.totalItems, 0)
        const newTotalValue = newGroups.reduce((acc, group) => acc + group.totalValue, 0)

        return {
          ...oldData,
          products: newGroups,
          totalItems: newTotalItems,
          totalValue: newTotalValue
        }
      })
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

  const isReadOnly = cart?.status !== 'open'
  const selectedShippingQuote = (cart?.shippingQuote ?? []).find((q) => q.isSelected) ?? null
  const selectedShippingPrice = selectedShippingQuote?.price ?? 0
  const cupons = Array.isArray(cart?.cupons) ? cart!.cupons : []
  const addresses = useMemo(() => (customerAddresses ?? []) as CustomerAddress[], [customerAddresses])
  const isBusy =
    isLoadingCart ||
    isAddingItems ||
    isUpdatingItem ||
    isDeletingItem ||
    isUpdatingCartAfterAddressSelect ||
    isUpdatingCartAfterShippingSelect ||
    isUpdatingCartAfterCouponChange
  const subtotalCents = (cart?.totalValue || 0) - (cart?.totalAdditions || 0) + (cart?.totalDiscounts || 0)
  const totalWithShippingCents = (cart?.totalValue || 0) + selectedShippingPrice
  const formatBRL = (valueInCents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((valueInCents || 0) / 100)

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent className="w-[80vw] sm:max-w-none flex flex-col h-full p-0 gap-0">
          <div className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="mx-auto flex max-w-[1400px] items-start justify-between gap-4 px-6 py-4">
              <SheetHeader className="gap-0 p-0 flex flex-row items-center">
                <div className="flex gap-3 items-center min-w-0">
                  <Avatar className="h-10 w-10 border bg-white shadow-sm shrink-0 rounded-lg">
                    <AvatarFallback className="bg-white">
                      <ShoppingCart className="h-5 w-5 stroke-neutral-600" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-1 min-w-0">
                    <SheetTitle className="text-lg leading-snug truncate">Carrinho de compras</SheetTitle>
                  </div>
                </div>
              </SheetHeader>

              <SheetClose asChild>
                <Button variant="ghost" size="icon" aria-label="Fechar" title="Fechar">
                  <span className="text-lg leading-none">×</span>
                </Button>
              </SheetClose>
            </div>
          </div>

          <div className="flex-1 overflow-hidden bg-muted/20">
            <div className="mx-auto flex h-full max-w-[1400px] flex-col px-6 py-6">
              {isBusy ? (
                <div className="flex flex-col h-full flex-1 items-center justify-center space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Carregando informações...</p>
                </div>
              ) : (
                <div className="grid flex-1 min-h-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
                  <div className="flex min-h-0 flex-col">
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex min-h-0 flex-col">
                      <TabsList className="flex gap-4 h-10 p-1 rounded-xl bg-muted/60">
                        <TabsTrigger value="items"> <Package className="h-2 w-2" /> Itens do Carrinho</TabsTrigger>
                        <TabsTrigger value="shipping"> <Truck className="h-2 w-2" /> Fretes</TabsTrigger>
                        <TabsTrigger value="addresses"> <LocationEdit className="h-2 w-2" /> Endereços</TabsTrigger>
                        <TabsTrigger value="details"> <Info className="h-2 w-2" /> Detalhes</TabsTrigger>
                      </TabsList>

                      <div className="mt-4 flex min-h-0 flex-1 flex-col rounded-xl border bg-background shadow-sm overflow-hidden">
                        <CartItemsTab
                          cart={cart}
                          openProducts={openProducts}
                          toggleProductOpen={toggleProductOpen}
                          setAddProductOpen={setAddProductOpen}
                          isReadOnly={isReadOnly}
                          formatBRL={formatBRL}
                          updateItem={updateItem}
                          deleteItem={deleteItem}
                          cupons={cupons}
                          couponCode={couponCode}
                          setCouponCode={(next) => setCouponCode(next)}
                          applyCoupon={applyCoupon}
                          isApplyingCoupon={isApplyingCoupon}
                          isRemovingCoupon={isRemovingCoupon}
                          setSelectedCouponCode={(code) => setSelectedCouponCode(code)}
                          setRemoveCouponOpen={(next) => setRemoveCouponOpen(next)}
                        />

                        <CartShippingTab
                          cart={cart}
                          isReadOnly={isReadOnly}
                          isSelectingShippingQuote={isSelectingShippingQuote}
                          isUpdatingCartAfterShippingSelect={isUpdatingCartAfterShippingSelect}
                          selectShippingQuote={selectShippingQuote}
                          formatBRL={formatBRL}
                        />

                        <CartAddressesTab
                          customerId={customerId}
                          isReadOnly={isReadOnly}
                          isLoadingAddresses={isLoadingAddresses}
                          isRefetchingAddresses={isRefetchingAddresses}
                          isSelectingAddress={isSelectingAddress}
                          isUpdatingCartAfterAddressSelect={isUpdatingCartAfterAddressSelect}
                          refetchAddresses={() => {
                            refetchAddresses()
                          }}
                          addresses={addresses}
                          selectedAddressId={selectedAddressId}
                          selectCartAddress={selectCartAddress}
                        />

                        <CartDetailsTab cart={cart} />
                      </div>
                    </Tabs>
                  </div>

                  <div className="lg:pl-0">
                    <CartSummaryCard
                      cart={cart}
                      selectedShippingQuote={selectedShippingQuote}
                      selectedShippingPrice={selectedShippingPrice}
                      subtotalCents={subtotalCents}
                      totalWithShippingCents={totalWithShippingCents}
                      formatBRL={formatBRL}
                      cartId={cartId}
                      isReadOnly={isReadOnly}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
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
