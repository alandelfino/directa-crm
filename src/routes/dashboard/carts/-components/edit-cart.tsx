import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { privateInstance } from "@/lib/auth"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Plus, Trash2, ShoppingCart, Package, User, Store, Calendar, ChevronDown, ChevronUp, Minus, Info } from "lucide-react"
import { toast } from "sonner"
import { AddProductsToCartSheet } from "./add-products-to-cart-sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type DerivatedProduct = {
  id: number
  name: string
  price: number
  oldPrice: number
  amount: number
  productId: number
  cartId: number
  totalValue: number
}

type ProductGroup = {
  id: number
  productId: number
  name: string
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
  const { data: cart, isLoading: isLoadingCart } = useQuery({
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
    mutationFn: async ({ derivatedProductId, amount }: { derivatedProductId: number, amount: number }) => {
      await privateInstance.put(`/tenant/carts/${cartId}/derivated-products/${derivatedProductId}`, {
        amount
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart', cartId] })
    },
    onError: () => {
      toast.error('Erro ao atualizar item.')
    }
  })

  // Delete item mutation
  const { mutate: deleteItem, isPending: isDeletingItem } = useMutation({
    mutationFn: async (derivatedProductId: number) => {
      await privateInstance.delete(`/tenant/carts/${cartId}/derivated-products/${derivatedProductId}`)
    },
    onSuccess: () => {
      toast.success('Item removido.')
      queryClient.invalidateQueries({ queryKey: ['cart', cartId] })
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
            <SheetHeader className="gap-0 p-0 flex flex-row justify-between items-center">
              <div className="flex gap-4">
                <div className="border shadow-sm p-4 rounded-xl">
                  <ShoppingCart className="h-4 w-4 text-primary" />
                </div>
                <div className="flex flex-col">
                  <SheetTitle>{cart?.customer?.name || `Carrinho #${cartId}`}</SheetTitle>
                  <SheetDescription>
                    {cart?.createdAt ? `Criado em ${new Date(cart.createdAt).toLocaleDateString('pt-BR')} às ${new Date(cart.createdAt).toLocaleTimeString('pt-BR')}` : 'Carregando...'}
                  </SheetDescription>
                </div>
              </div>
              {cart && (
                <Badge className="h-fit" variant={cart.status === 'open' ? 'outline' : cart.status === 'abandoned' ? 'destructive' : 'default'}>
                  {cart.status === 'open' ? 'Aberto' : cart.status === 'abandoned' ? 'Abandonado' : 'Finalizado'}
                </Badge>
              )}
            </SheetHeader>
          </div>

          {isLoadingCart || isAddingItems || isUpdatingItem || isDeletingItem ? (
            <div className="p-6 space-y-6">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            <Tabs defaultValue="items" className="flex-1 flex flex-col overflow-hidden">
              <div className="px-6 pt-4 border-b">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="items">Itens do Carrinho</TabsTrigger>
                  <TabsTrigger value="details">Detalhes</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="items" className="flex-1 overflow-y-auto m-0 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" /> Itens ({cart?.totalItems || 0})
                  </h3>
                  <Button size="sm" variant="outline" onClick={() => setAddProductOpen(true)} disabled={isReadOnly}>
                            <Plus className="h-3.5 w-3.5 mr-1.5" /> Adicionar
                        </Button>
                    </div>

                    {(cart?.products || []).length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                            Carrinho vazio.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {cart?.products.map((product) => {
                                const isOpen = openProducts.includes(product.name)

                                return (
                        <Collapsible
                          key={product.id}
                          open={isOpen}
                          onOpenChange={() => toggleProductOpen(product.name)}
                          className="border rounded-lg bg-card shadow-sm"
                        >
                          <div className="flex items-center justify-between p-3">
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="p-0 h-auto hover:bg-transparent flex-1 justify-start gap-3">
                                <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                                  <Package className="h-4 w-4 text-primary" />
                                </div>
                                <div className="flex flex-col items-start text-left">
                                  <span className="text-sm font-medium">{product.name}</span>
                                  <span className="text-xs text-muted-foreground">{product.totalItems} itens</span>
                                </div>
                                {isOpen ? <ChevronUp className="ml-auto h-4 w-4 text-muted-foreground" /> : <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground" />}
                              </Button>
                            </CollapsibleTrigger>
                          </div>

                          <CollapsibleContent>
                            <div className="border-t divide-y bg-muted/5">
                              {product.derivatedProducts.map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-3 pl-14 hover:bg-muted/10 transition-colors">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Variação</span>
                                    <div className="flex flex-col">
                                      <span className="text-sm font-medium">{item.name}</span>
                                      <div className="flex items-center gap-2 text-xs">
                                        {item.oldPrice > item.price && (
                                          <span className="text-muted-foreground line-through">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.oldPrice / 100)}
                                          </span>
                                        )}
                                        <span className={item.oldPrice > item.price ? "text-green-600 font-medium" : "text-muted-foreground"}>
                                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price / 100)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-4">
                                    {!isReadOnly ? (
                                      <div className="flex items-center border rounded-md bg-background shadow-sm h-8">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 rounded-none rounded-l-md hover:bg-muted"
                                          onClick={() => updateItem({ derivatedProductId: item.id, amount: Math.max(0, item.amount - 1) })}
                                          disabled={item.amount <= 1}
                                        >
                                          <Minus className="h-3 w-3" />
                                        </Button>
                                        <div className="w-10 text-center text-sm font-medium tabular-nums border-x h-full flex items-center justify-center">
                                          {item.amount}
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 rounded-none rounded-r-md hover:bg-muted"
                                          onClick={() => updateItem({ derivatedProductId: item.id, amount: item.amount + 1 })}
                                        >
                                          <Plus className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <Badge variant="outline" className="text-sm px-3 py-1">{item.amount} un</Badge>
                                    )}

                                    <div className="text-right min-w-[80px]">
                                      <span className="text-sm font-semibold">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((item.amount * item.price) / 100)}
                                      </span>
                                    </div>

                                    {!isReadOnly && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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

          <div className="border-t p-4 bg-background z-10 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(((cart?.totalValue || 0) - (cart?.totalAdditions || 0) + (cart?.totalDiscounts || 0)) / 100)}
                </span>
              </div>

              {cart?.additions && cart.additions.length > 0 && (
                <div className="space-y-1">
                  {cart.additions.map((addition) => (
                    <div key={addition.id} className="flex justify-between items-center text-xs text-green-600">
                      <span>+ {addition.name}</span>
                      <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(addition.value / 100)}</span>
                    </div>
                  ))}
                </div>
              )}

              {cart?.discounts && cart.discounts.length > 0 && (
                <div className="space-y-1">
                  {cart.discounts.map((discount) => (
                    <div key={discount.id} className="flex justify-between items-center text-xs text-red-600">
                      <span>- {discount.name}</span>
                      <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(discount.value / 100)}</span>
                    </div>
                  ))}
                </div>
              )}

              <Separator />

              <div className="flex justify-between items-center">
                <span className="text-base font-semibold">Total</span>
                <span className="text-lg font-bold">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((cart?.totalValue || 0) / 100)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <SheetClose asChild>
                <Button variant="outline" className="w-full">
                  Fechar
                </Button>
              </SheetClose>
              <Button disabled={isReadOnly || !cart?.totalItems || cart?.totalItems === 0} className="w-full">
                Finalizar
              </Button>
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
