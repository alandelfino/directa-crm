import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { privateInstance } from "@/lib/auth"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Loader, Plus, Trash2, ShoppingCart, Package, User, Store, Calendar, ChevronDown, ChevronUp, Minus } from "lucide-react"
import { toast } from "sonner"
import { AddProductsToCartSheet } from "./add-products-to-cart-sheet"

type DerivatedProduct = {
  id: number
  name: string
  price: number
  oldPrice: number
  amount: number
  productId: number
  derivatedProductId: number
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

type CartResponse = {
  items: ProductGroup[]
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
      return response.data
    },
    enabled: !!cartId
  })

  // Fetch Cart Products (Grouped by product)
  const { data: cartProductsData, isLoading: isLoadingItems } = useQuery({
    queryKey: ['cart-products', cartId],
    queryFn: async () => {
      const response = await privateInstance.get(`/tenant/carts/${cartId}/products`)
      return response.data as CartResponse
    },
    enabled: !!cartId
  })

  // Add items mutation
  const { mutateAsync: addItems, isPending: isAdding } = useMutation({
    mutationFn: async (newItems: any[]) => {
      for (const item of newItems) {
        await privateInstance.post(`/tenant/carts/${cartId}/derivated-products`, {
          derivatedProductId: item.derivatedProductId,
          amount: item.amount
        })
      }
    },
    onSuccess: (_, variables) => {
      toast.success('Produtos adicionados com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['cart', cartId] })
      queryClient.invalidateQueries({ queryKey: ['cart-products', cartId] })
      
      // Open the groups for added items
      const newNames = new Set(variables.map(v => v.productName))
      setOpenProducts(prev => Array.from(new Set([...prev, ...newNames])))
    },
    onError: () => {
      toast.error('Erro ao adicionar produtos.')
    }
  })

  // Update item amount mutation
  const { mutate: updateItem } = useMutation({
    mutationFn: async ({ derivatedProductId, amount }: { derivatedProductId: number, amount: number }) => {
      await privateInstance.put(`/tenant/carts/${cartId}/derivated-products/${derivatedProductId}`, {
        amount
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart', cartId] })
      queryClient.invalidateQueries({ queryKey: ['cart-products', cartId] })
    },
    onError: () => {
      toast.error('Erro ao atualizar item.')
    }
  })

  // Delete item mutation
  const { mutate: deleteItem } = useMutation({
    mutationFn: async (derivatedProductId: number) => {
      await privateInstance.delete(`/tenant/carts/${cartId}/derivated-products/${derivatedProductId}`)
    },
    onSuccess: () => {
      toast.success('Item removido.')
      queryClient.invalidateQueries({ queryKey: ['cart', cartId] })
      queryClient.invalidateQueries({ queryKey: ['cart-products', cartId] })
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
            <SheetHeader>
              <div className="flex items-center justify-between">
                <SheetTitle>Carrinho #{cartId}</SheetTitle>
                {cart && (
                  <Badge variant={cart.status === 'open' ? 'outline' : cart.status === 'abandoned' ? 'destructive' : 'default'}>
                    {cart.status === 'open' ? 'Aberto' : cart.status === 'abandoned' ? 'Abandonado' : 'Finalizado'}
                  </Badge>
                )}
              </div>
              <SheetDescription>Gerencie os itens e detalhes deste carrinho.</SheetDescription>
            </SheetHeader>
          </div>

          {isLoadingCart ? (
             <div className="p-6 space-y-6">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-40 w-full" />
             </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-8">
                {/* Header Info */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" /> Cliente</span>
                    <p className="text-sm font-medium truncate" title={cart?.customer?.name}>{cart?.customer?.name || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Store className="h-3 w-3" /> Loja</span>
                    <p className="text-sm font-medium truncate" title={cart?.store?.name}>{cart?.store?.name || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Criado em</span>
                    <p className="text-sm font-medium">{new Date(cart?.createdAt).toLocaleDateString('pt-BR')} {new Date(cart?.createdAt).toLocaleTimeString('pt-BR')}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Package className="h-3 w-3" /> Total Itens</span>
                    <p className="text-sm font-medium">{cart?.totalItems || 0}</p>
                  </div>
                </div>

                <Separator />

                {/* Items Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" /> Itens
                    </h3>
                    <Button size="sm" variant="outline" onClick={() => setAddProductOpen(true)} disabled={isReadOnly}>
                      <Plus className="h-3.5 w-3.5 mr-1.5" /> Adicionar
                    </Button>
                  </div>

                  {isLoadingItems ? (
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : (cartProductsData?.items || []).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                      Carrinho vazio.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {cartProductsData?.items.map((product) => {
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
                                        <div key={item.derivatedProductId} className="flex items-center justify-between p-3 pl-14 hover:bg-muted/10 transition-colors">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Variação</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium">{item.name}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                {!isReadOnly ? (
                                                  <div className="flex items-center border rounded-md bg-background shadow-sm h-8">
                                                      <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 rounded-none rounded-l-md hover:bg-muted"
                                                        onClick={() => updateItem({ derivatedProductId: item.derivatedProductId, amount: Math.max(0, item.amount - 1) })}
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
                                                        onClick={() => updateItem({ derivatedProductId: item.derivatedProductId, amount: item.amount + 1 })}
                                                      >
                                                        <Plus className="h-3 w-3" />
                                                      </Button>
                                                  </div>
                                                ) : (
                                                  <Badge variant="outline" className="text-sm px-3 py-1">{item.amount} un</Badge>
                                                )}

                                                <div className="text-right min-w-[80px]">
                                                    <span className="text-sm font-semibold">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((item.totalValue || 0) / 100)}
                                                    </span>
                                                </div>

                                                {!isReadOnly && (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => deleteItem(item.derivatedProductId)}
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
              </div>
            </div>
          )}

          <div className="border-t p-4 bg-background z-10">
             <div className="flex justify-between items-center mb-4 px-2">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-lg font-bold">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((cart?.totalValue || 0) / 100)}
                </span>
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
