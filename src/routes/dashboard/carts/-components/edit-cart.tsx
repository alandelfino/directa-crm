import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { privateInstance } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { ShoppingCart, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { AddProductsToCartSheet } from "./add-products-to-cart-sheet"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { Cart, CartAddress, DerivatedProduct, ProductGroup } from "./edit-cart.types"
import { CartCouponCard, CartItemsTab, CartTopCards } from "./cart-items-tab"
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

export function EditCartSheet({ cartId, onOpenChange }: { cartId: number, onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(true)
  const [addProductOpen, setAddProductOpen] = useState(false)
  const [openProducts, setOpenProducts] = useState<string[]>([])
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

  const { mutate: selectShippingQuote, isPending: isSelectingShippingQuote } = useMutation<
    { id: number; cartId: number; price: number; deadline: number; isSelected: boolean; updatedAt: string },
    unknown,
    number,
    { previousCart: Cart | undefined }
  >({
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
    onError: (error, _shippingQuoteId, context) => {
      const previousCart = context?.previousCart
      if (previousCart) {
        queryClient.setQueryData(['cart', cartId], previousCart)
      }
      const errorData = getApiErrorData(error)
      toast.error(errorData?.title || 'Erro ao selecionar frete', {
        description: errorData?.detail || 'Não foi possível selecionar a cotação de frete.'
      })
      setIsUpdatingCartAfterShippingSelect(false)
    },
    onSettled: () => {
      setIsUpdatingCartAfterShippingSelect(false)
    }
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
      setIsUpdatingCartAfterAddressSelect(true)
      await queryClient.refetchQueries({ queryKey: ['cart', cartId], exact: true })
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
      toast.success('Cupom aplicado com sucesso!')
      setCouponCode('')
      setIsUpdatingCartAfterCouponChange(true)
      await queryClient.refetchQueries({ queryKey: ['cart', cartId], exact: true })
      setIsUpdatingCartAfterCouponChange(false)
    },
    onError: (error) => {
      const errorData = getApiErrorData(error)
      toast.error(errorData?.title || 'Erro ao aplicar cupom', {
        description: errorData?.detail || 'Não foi possível aplicar o cupom no carrinho.',
      })
    },
    onSettled: () => {
      setIsUpdatingCartAfterCouponChange(false)
    },
  })

  const { mutate: removeCoupon, isPending: isRemovingCoupon } = useMutation<number, unknown, void>({
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
    onError: (error) => {
      setRemoveCouponOpen(false)
      setSelectedCouponCode(null)
      const errorData = getApiErrorData(error)
      toast.error(errorData?.title || 'Erro ao remover cupom', {
        description: errorData?.detail || 'Não foi possível remover o cupom do carrinho.',
      })
    },
    onSettled: () => {
      setIsUpdatingCartAfterCouponChange(false)
    },
  })

  // Add items mutation
  const { mutateAsync: addItems, isPending: isAddingItems } = useMutation<void, unknown, { derivatedProductId: number, amount: number }[]>({
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
    onError: (error) => {
      const errorData = getApiErrorData(error)
      toast.error(errorData?.title || 'Erro ao adicionar produtos', {
        description: errorData?.detail || 'Não foi possível adicionar os produtos ao carrinho.'
      })
    }
  })

  // Update item amount mutation
  const { mutate: updateItem, isPending: isUpdatingItem } = useMutation<
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
  const { mutate: deleteItem, isPending: isDeletingItem } = useMutation<number, unknown, number>({
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
        }).filter(group => group.derivatedProducts.length > 0)

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
              {isBusy ? (
                <div className="flex flex-col h-full flex-1 items-center justify-center space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Carregando informações...</p>
                </div>
              ) : (
                <div className="grid flex-1 min-h-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
                  <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto pr-1">
                    <CartTopCards
                      cart={cart}
                      customerId={customerId}
                      selectedShippingQuote={selectedShippingQuote}
                      isSelectingShippingQuote={isSelectingShippingQuote}
                      isUpdatingCartAfterShippingSelect={isUpdatingCartAfterShippingSelect}
                      selectShippingQuote={selectShippingQuote}
                      selectedAddressId={selectedAddressId}
                      setSelectedAddressId={setSelectedAddressId}
                      isSelectingAddress={isSelectingAddress}
                      isUpdatingCartAfterAddressSelect={isUpdatingCartAfterAddressSelect}
                      selectCartAddress={selectCartAddress}
                      isReadOnly={isReadOnly}
                      formatBRL={formatBRL}
                    />

                    <CartItemsTab
                      cart={cart}
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
