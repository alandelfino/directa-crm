import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { privateInstance } from "@/lib/auth"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Plus, Trash2, ShoppingCart, Package, User, Store, Calendar, ChevronDown, ChevronUp, Minus, Info, Loader2, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { AddProductsToCartSheet } from "./add-products-to-cart-sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

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

type Cart = {
  id: number
  customer: { id: number, name: string }
  store: { id: number, name: string }
  status: 'open' | 'abandoned' | 'finished'
  totalItems: number
  totalAdditions: number
  totalDiscounts: number
  totalValue: number
  createdAt: string
  updatedAt: string
  additions: { id: number, name: string, value: number }[]
  discounts: { id: number, name: string, value: number }[]
  products: ProductGroup[]
}

export function EditCartSheet({ cartId, onOpenChange }: { cartId: number, onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(true)
  const [addProductOpen, setAddProductOpen] = useState(false)
  const [openProducts, setOpenProducts] = useState<string[]>([])
  const queryClient = useQueryClient()

  // Fetch Cart Details (Store, Status, etc.)
  const { data: cart, isLoading: isLoadingCart, isRefetching: isRefetchingCart } = useQuery({
    queryKey: ['cart', cartId],
    queryFn: async () => {
      const response = await privateInstance.get(`/tenant/carts/${cartId}`)
      return response.data as Cart
    },
    enabled: !!cartId
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
    onError: () => {
      toast.error('Erro ao adicionar produtos.')
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

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent className="sm:max-w-xl w-full flex flex-col h-full p-0 gap-0">
          <div className="p-6 border-b bg-background z-10">
            <SheetHeader className="gap-0 p-0 flex flex-row justify-between items-start">
              <div className="flex gap-4 items-center">
                <Avatar className="h-12 w-12 border bg-primary/5">
                  <AvatarFallback className="bg-primary/5 text-primary">
                    <ShoppingCart className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1">
                  <SheetTitle className="text-xl">{cart?.customer?.name || `Carrinho #${cartId}`}</SheetTitle>
                  <SheetDescription className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 bg-muted px-2 py-0.5 rounded text-xs font-medium text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {cart?.createdAt ? new Date(cart.createdAt).toLocaleDateString('pt-BR') : '...'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {cart?.createdAt ? new Date(cart.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </SheetDescription>
                </div>
              </div>
              {cart && (
                <Badge className="h-fit px-2.5 py-0.5 text-xs font-medium" variant={cart.status === 'open' ? 'outline' : cart.status === 'abandoned' ? 'destructive' : 'default'}>
                  {cart.status === 'open' ? 'Aberto' : cart.status === 'abandoned' ? 'Abandonado' : 'Finalizado'}
                </Badge>
              )}
            </SheetHeader>
          </div>

          {isLoadingCart || isAddingItems || isUpdatingItem || isDeletingItem ? (
            <div className="flex flex-col h-full flex-1 items-center justify-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Carregando informações...</p>
            </div>
          ) : (
            <Tabs defaultValue="items" className="flex-1 flex flex-col overflow-hidden">
              <div className="px-6 pt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="items">Itens do Carrinho</TabsTrigger>
                  <TabsTrigger value="details">Detalhes</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="items" className="flex-1 overflow-hidden flex flex-col m-0 p-0">

                <div className="flex items-center justify-between px-6">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" /> Itens ({cart?.totalItems || 0})
                  </h3>
                  <Button size="sm" variant="outline" onClick={() => setAddProductOpen(true)} disabled={isReadOnly}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Adicionar
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {(cart?.products || []).length === 0 ? (
                    isLoadingCart || isRefetchingCart || isAddingItems ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
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
                    )
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
                            <div className="flex items-center justify-between p-4">
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="p-0 h-auto hover:bg-transparent flex-1 justify-start gap-4">
                                  <div className="h-10 w-10 rounded-lg bg-primary/5 border flex items-center justify-center shrink-0">
                                    <Package className="h-5 w-5 text-primary/70" />
                                  </div>
                                  <div className="flex flex-col items-start text-left gap-1">
                                    <div className="flex items-center gap-2">
                                      {product.sku && (
                                        <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0 h-5 leading-none rounded-sm text-muted-foreground">
                                          {product.sku}
                                        </Badge>
                                      )}
                                      <span className="text-sm font-semibold text-foreground/90">{product.name}</span>
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
                                  <div key={item.id} className="flex items-center justify-between p-3 pl-16 pr-4 hover:bg-muted/50 transition-colors group">
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-[10px]">Variação</span>
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-sm font-medium text-foreground/80">{item.name}</span>
                                        <div className="flex items-center gap-2 text-xs mt-0.5">
                                          {item.oldPrice > item.price && (
                                            <span className="text-muted-foreground/60 line-through">
                                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.oldPrice / 100)}
                                            </span>
                                          )}
                                          <span className={item.oldPrice > item.price ? "text-green-600 font-semibold bg-green-50 px-1.5 rounded-sm" : "text-muted-foreground font-medium"}>
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price / 100)}
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
                                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((item.amount * item.price) / 100)}
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
                </div>
              </TabsContent>

              <TabsContent value="details" className="flex-1 overflow-y-auto m-0 p-6 space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Info className="h-4 w-4" /> Informações do Atendimento
                  </h3>
                  <div className="grid grid-cols-1 gap-4 border rounded-lg p-4">
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
            </Tabs>
          )}

          <div className="border-t bg-background z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium">Subtotal</span>
                  <span className="font-medium text-foreground/80">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(((cart?.totalValue || 0) - (cart?.totalAdditions || 0) + (cart?.totalDiscounts || 0)) / 100)}
                  </span>
                </div>

                {cart?.additions && cart.additions.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-dashed">
                    {cart.additions.map((addition) => (
                      <div key={addition.id} className="flex justify-between items-center text-xs text-green-600 bg-green-50/50 p-1.5 rounded">
                        <span className="flex items-center gap-1.5"><Plus className="h-3 w-3" /> {addition.name}</span>
                        <span className="font-medium">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(addition.value / 100)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {cart?.discounts && cart.discounts.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-dashed">
                    {cart.discounts.map((discount) => (
                      <div key={discount.id} className="flex justify-between items-center text-xs text-red-600 bg-red-50/50 p-1.5 rounded">
                        <span className="flex items-center gap-1.5"><Minus className="h-3 w-3" /> {discount.name}</span>
                        <span className="font-medium">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(discount.value / 100)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <Separator className="my-2" />

                <div className="flex justify-between items-end">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-base font-bold">Total</span>
                    <span className="text-xs text-muted-foreground font-medium">
                      {cart?.totalItems || 0} {(cart?.totalItems || 0) === 1 ? 'item' : 'itens'} no carrinho
                    </span>
                  </div>
                  <span className="text-2xl font-bold tracking-tight text-primary">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((cart?.totalValue || 0) / 100)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <SheetClose asChild>
                  <Button variant="outline" className="w-full h-11 font-medium border-muted-foreground/20 hover:bg-muted/50">
                    Fechar
                  </Button>
                </SheetClose>
                <Button disabled={isReadOnly || !cart?.totalItems || cart?.totalItems === 0} className="w-full h-11 font-bold shadow-sm gap-2">
                  Finalizar Pedido <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AddProductsToCartSheet
        open={addProductOpen}
        onOpenChange={setAddProductOpen}
        onAddItems={(items) => addItems(items)}
      />
    </>
  )
}
