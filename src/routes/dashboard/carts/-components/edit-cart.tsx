import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { privateInstance } from "@/lib/auth"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Plus, Trash2, ShoppingCart, Package, User, Store, Calendar, ChevronDown, ChevronUp, Minus, Info, Loader2, ArrowRight, Truck, MapPin, RefreshCw, LocationEdit, TicketPercent, X } from "lucide-react"
import { toast } from "sonner"
import { AddProductsToCartSheet } from "./add-products-to-cart-sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"

type DerivatedProduct = {
  id: number
  name: string
  price: number
  oldPrice: number
  amount: number
  productId: number
  cartId: number
  totalValue: number
  derivatedProductId: number
}

type ProductGroup = {
  id: number
  productId: number
  name: string
  sku?: string
  cartId: number
  totalItems: number
  totalValue: number
  derivatedProducts: DerivatedProduct[]
}

type ShippingQuote = {
  id: number
  carrierName: string
  serviceName: string
  price: number
  deadline: number
  isSelected: boolean
}

type CartAddress = {
  id: number
  name: string
  streetName: string
  number: number
  neighborhood: string
  city: string
  state: string
  zipCode: string
  country: string
  complement: string
  isDefault: boolean
}

type CustomerAddress = CartAddress & {
  createdAt: string
  updatedAt: string
}

type Cart = {
  id: number
  customer: { id: number, name: string }
  store: { id: number, name: string }
  address?: CartAddress | null
  status: 'open' | 'abandoned' | 'finished'
  totalItems: number
  totalAdditions: number
  totalDiscounts: number
  totalValue: number
  createdAt: string
  updatedAt: string
  additions: { id: number, name: string, value: number }[]
  discounts: { id: number, name: string, value: number }[]
  cupons?: {
    id: number
    code: string
    description: string
    customerMessage: string
    type: string
    value: number
    storeId: number
    discountApplied: number
  }[]
  products: ProductGroup[]
  shippingQuote?: ShippingQuote[]
}

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
                                  <EmptyDescription className="mt-0">
                                    Adicione produtos para começar o atendimento.
                                  </EmptyDescription>
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
                                                  {productTotalItems} {productTotalItems === 1 ? 'item' : 'itens'}
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
                                                    {item.oldPrice > item.price && (
                                                      <span className="text-muted-foreground/60 line-through">
                                                        {formatBRL(item.oldPrice)}
                                                      </span>
                                                    )}
                                                    <span className={item.oldPrice > item.price ? "text-green-600 font-semibold bg-green-50 px-1.5 rounded-sm" : "text-muted-foreground font-medium"}>
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
                                                  <Badge variant="outline" className="text-sm px-3 py-1 font-mono">{item.amount} un</Badge>
                                                )}

                                                <div className="text-right min-w-[90px]">
                                                  <span className="text-sm font-bold text-foreground">
                                                    {formatBRL(item.amount * item.price)}
                                                  </span>
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
                                      {cupons.length > 0 ? 'Cupons aplicados no carrinho.' : 'Digite o código para aplicar no carrinho.'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {cupons.length > 0 ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {cupons.map((c) => (
                                    <Badge key={c.id} variant="secondary" className="font-mono gap-1 pr-1">
                                      {String(c.code || '').toUpperCase()}
                                      <button
                                        type="button"
                                        className="ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded-sm hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        disabled={isReadOnly || isRemovingCoupon || isApplyingCoupon}
                                        onClick={() => {
                                          setSelectedCouponCode(String(c.code || '').toUpperCase())
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
                                    setCouponCode(e.target.value.replace(/\s/g, '').toUpperCase())
                                  }}
                                  placeholder="XXX-XXX"
                                  disabled={isReadOnly || isApplyingCoupon || isRemovingCoupon}
                                  onKeyDown={(e) => {
                                    if (e.key !== 'Enter') return
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

                        <TabsContent value="shipping" className="m-0 flex min-h-0 flex-1 flex-col">
                          <div className="flex items-center justify-between border-b px-4 py-3">
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                              <Truck className="h-4 w-4" /> Cotação de Frete
                            </h3>
                          </div>

                          <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {Array.isArray(cart?.shippingQuote) && cart.shippingQuote.length > 0 ? (
                              cart.shippingQuote.map((q) => (
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
                                      <div className="text-xs text-muted-foreground truncate">
                                        {q.serviceName}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex flex-col items-end gap-1 shrink-0">
                                    <span className="text-sm font-semibold tabular-nums">
                                      {formatBRL(q.price)}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {q.deadline} {q.deadline === 1 ? 'dia' : 'dias'}
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
                                <p className="text-xs text-muted-foreground">
                                  Este carrinho ainda não possui opções de frete cotadas.
                                </p>
                              </div>
                            )}
                          </div>
                        </TabsContent>

                        <TabsContent value="addresses" className="m-0 flex min-h-0 flex-1 flex-col">
                          <div className="flex items-center justify-between border-b px-4 py-3">
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                              <MapPin className="h-4 w-4" /> Endereços
                            </h3>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={!customerId || isLoadingAddresses || isRefetchingAddresses || isSelectingAddress || isUpdatingCartAfterAddressSelect}
                              onClick={() => { refetchAddresses() }}
                              title="Atualizar"
                              aria-label="Atualizar"
                            >
                              <RefreshCw className={`size-[0.85rem] ${isLoadingAddresses || isRefetchingAddresses || isUpdatingCartAfterAddressSelect ? 'animate-spin' : ''}`} />
                            </Button>
                          </div>

                          <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {!customerId ? (
                              <div className="border rounded-lg p-6 flex flex-col items-center justify-center text-center gap-2 text-muted-foreground">
                                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                  <MapPin className="h-6 w-6 opacity-50" />
                                </div>
                                <p className="text-sm font-medium text-foreground">Nenhum cliente vinculado</p>
                                <p className="text-xs text-muted-foreground">
                                  Selecione um cliente para visualizar os endereços.
                                </p>
                              </div>
                            ) : (isLoadingAddresses || isRefetchingAddresses) ? (
                              <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" /> Carregando endereços...
                              </div>
                            ) : addresses.length > 0 ? (
                              addresses.map((a) => {
                                const isSelected = selectedAddressId === a.id
                                const selectionLocked = isReadOnly || isSelectingAddress || isUpdatingCartAfterAddressSelect
                                return (
                                  <button
                                    key={a.id}
                                    type="button"
                                    className={`w-full text-left border rounded-lg p-3 flex items-start justify-between gap-4 hover:bg-muted/30 transition-colors disabled:opacity-60 disabled:pointer-events-none ${isSelected ? 'border-primary ring-1 ring-primary/20' : ''}`}
                                    disabled={selectionLocked}
                                    onClick={() => {
                                      if (selectionLocked) return
                                      if (isSelected) return
                                      selectCartAddress(a.id)
                                    }}
                                  >
                                    <div className="flex items-start gap-3 min-w-0">
                                      <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                                        <Checkbox
                                          checked={isSelected}
                                          onCheckedChange={() => {
                                            if (selectionLocked) return
                                            if (isSelected) return
                                            selectCartAddress(a.id)
                                          }}
                                          aria-label="Selecionar endereço"
                                        />
                                      </div>
                                      <div className="flex flex-col gap-1 min-w-0">
                                        <div className="flex items-center gap-2 min-w-0">
                                          <span className="text-sm font-semibold truncate">{a.name}</span>
                                          {a.isDefault && (
                                            <Badge variant="secondary" className="h-5 px-2 text-[10px]">
                                              Padrão
                                            </Badge>
                                          )}
                                          {isSelected && (
                                            <Badge className="h-5 px-2 text-[10px]" variant="default">
                                              Selecionado
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate">
                                          {a.streetName}, {a.number} • {a.neighborhood}
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate">
                                          {a.city} - {a.state} • {a.zipCode}
                                          {a.complement ? ` • ${a.complement}` : ''}
                                        </div>
                                      </div>
                                    </div>
                                  </button>
                                )
                              })
                            ) : (
                              <div className="border rounded-lg p-6 flex flex-col items-center justify-center text-center gap-2 text-muted-foreground">
                                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                  <MapPin className="h-6 w-6 opacity-50" />
                                </div>
                                <p className="text-sm font-medium text-foreground">Nenhum endereço cadastrado</p>
                                <p className="text-xs text-muted-foreground">
                                  Este cliente ainda não possui endereços.
                                </p>
                              </div>
                            )}
                          </div>
                        </TabsContent>

                        <TabsContent value="details" className="m-0 flex min-h-0 flex-1 flex-col">
                          <div className="flex items-center justify-between border-b px-4 py-3">
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                              <Info className="h-4 w-4" /> Detalhes
                            </h3>
                          </div>

                          <div className="flex-1 overflow-y-auto p-4">
                            <div className="grid grid-cols-1 gap-4 border rounded-lg p-4 bg-muted/10">
                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" /> Cliente</span>
                                <p className="text-sm font-medium" title={cart?.customer?.name}>{cart?.customer?.name || '—'}</p>
                              </div>
                              <Separator />
                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground flex items-center gap-1"><Store className="h-3 w-3" /> Loja</span>
                                <p className="text-sm font-medium" title={cart?.store?.name}>{cart?.store?.name || '—'}</p>
                              </div>
                              <Separator />
                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Criado em</span>
                                <p className="text-sm font-medium">
                                  {cart?.createdAt ? new Date(cart.createdAt).toLocaleDateString('pt-BR') : '—'} às {cart?.createdAt ? new Date(cart.createdAt).toLocaleTimeString('pt-BR') : '—'}
                                </p>
                              </div>
                              <Separator />
                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground flex items-center gap-1"><Package className="h-3 w-3" /> Total de Itens</span>
                                <p className="text-sm font-medium">{cart?.totalItems || 0}</p>
                              </div>
                            </div>
                          </div>
                        </TabsContent>
                      </div>
                    </Tabs>
                  </div>

                  <div className="lg:pl-0">
                    <div className="rounded-xl border bg-background shadow-sm p-4 lg:sticky lg:top-6">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-semibold">Resumo</span>
                          <span className="text-xs text-muted-foreground">
                            {cart?.totalItems || 0} {(cart?.totalItems || 0) === 1 ? 'item' : 'itens'} no carrinho
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {cart && (
                            <Badge className="h-6 px-2 text-[11px]" variant={cart.status === 'open' ? 'outline' : cart.status === 'abandoned' ? 'destructive' : 'default'}>
                              {cart.status === 'open' ? 'Aberto' : cart.status === 'abandoned' ? 'Abandonado' : 'Finalizado'}
                            </Badge>
                          )}
                          {selectedShippingQuote ? (
                            <Badge variant="secondary" className="h-6 px-2 text-[11px]">
                              {selectedShippingQuote.carrierName}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="h-6 px-2 text-[11px]">
                              Sem frete
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 space-y-2 text-sm">
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

                        <Separator className="my-3" />

                        <div className="flex items-end justify-between gap-2">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold">Total</span>
                            <span className="text-xs text-muted-foreground">Inclui frete selecionado</span>
                          </div>
                          <span className="text-2xl font-semibold tracking-tight tabular-nums text-primary">
                            {formatBRL(totalWithShippingCents)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4">
                        <Button disabled={isReadOnly || !cart?.totalItems || cart?.totalItems === 0} className="w-full h-10 font-semibold gap-2">
                          Finalizar Pedido <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
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
