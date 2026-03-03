import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader, Plus, Trash2, ShoppingCart, Package, User, ChevronDown, ChevronUp, Minus } from "lucide-react"
import { useForm } from "react-hook-form"
import { useState } from "react"
import { z } from "zod"
import { toast } from "sonner"
import { privateInstance } from "@/lib/auth"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { AddProductsToCartSheet } from "./add-products-to-cart-sheet"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

const formSchema = z.object({
  customerId: z.coerce.number().min(1, { message: "Cliente é obrigatório" }),
  storeId: z.coerce.number().min(1, { message: "Loja é obrigatória" }),
})

type CartItem = {
  derivatedProductId: number
  productName: string
  derivationName: string
  amount: number
}

export function NewCartSheet({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false)
  const [addProductOpen, setAddProductOpen] = useState(false)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [openProducts, setOpenProducts] = useState<string[]>([])
  const queryClient = useQueryClient()
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      customerId: 0,
      storeId: 0,
    },
  })

  // Fetch Customers
  const { data: customers, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['customers-list-select'],
    queryFn: async () => {
        const response = await privateInstance.get('/tenant/customers?limit=100')
        return response.data.items || []
    },
    enabled: open,
    staleTime: 1000 * 60 * 5, 
  })

  // Fetch Stores
  const { data: stores, isLoading: isLoadingStores } = useQuery({
    queryKey: ['stores-list-select'],
    queryFn: async () => {
        const response = await privateInstance.get('/tenant/stores?limit=100')
        return response.data.items || []
    },
    enabled: open,
    staleTime: 1000 * 60 * 5,
  })

  const handleAddItems = (newItems: CartItem[]) => {
    setCartItems(prev => {
      const updated = [...prev]
      newItems.forEach(newItem => {
        const existingIndex = updated.findIndex(item => item.derivatedProductId === newItem.derivatedProductId)
        if (existingIndex >= 0) {
          updated[existingIndex].amount += newItem.amount
        } else {
          updated.push(newItem)
        }
      })
      return updated
    })
    
    // Automatically open new products
    const newProductNames = new Set(newItems.map(i => i.productName))
    setOpenProducts(prev => Array.from(new Set([...prev, ...newProductNames])))
  }

  const updateItemAmount = (id: number, delta: number) => {
    setCartItems(prev => prev.map(item => {
      if (item.derivatedProductId === id) {
        const newAmount = Math.max(1, item.amount + delta)
        return { ...item, amount: newAmount }
      }
      return item
    }))
  }

  const removeItemFromCart = (id: number) => {
    setCartItems(prev => prev.filter(item => item.derivatedProductId !== id))
  }

  const toggleProductOpen = (productName: string) => {
    setOpenProducts(prev => 
      prev.includes(productName) 
        ? prev.filter(n => n !== productName)
        : [...prev, productName]
    )
  }

  // Group cart items by product name
  const groupedItems = cartItems.reduce((acc, item) => {
    if (!acc[item.productName]) {
      acc[item.productName] = []
    }
    acc[item.productName].push(item)
    return acc
  }, {} as Record<string, CartItem[]>)

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      // 1. Create Cart
      const cartResponse = await privateInstance.post('/tenant/carts', values)
      const cartId = cartResponse.data.id

      // 2. Add Items sequentially
      for (const item of cartItems) {
        await privateInstance.post(`/tenant/carts/${cartId}/derivated-products`, {
          derivatedProductId: item.derivatedProductId,
          amount: item.amount
        })
      }
      return cartResponse.data
    },
    onSuccess: () => {
      toast.success('Carrinho criado com sucesso!')
      onCreated?.()
      form.reset()
      setCartItems([])
      setOpenProducts([])
      setOpen(false)
      queryClient.invalidateQueries({ queryKey: ['carts'] })
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao criar carrinho', {
        description: errorData?.detail || 'Não foi possível criar o carrinho e adicionar os itens.'
      })
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (cartItems.length === 0) {
      toast.warning('Adicione pelo menos um produto ao carrinho.')
      return
    }
    mutateAsync(values)
  }

  const totalItems = cartItems.reduce((acc, item) => acc + item.amount, 0)

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button size={'sm'}>
            <Plus className="size-[0.85rem]" /> Novo Carrinho
          </Button>
        </SheetTrigger>
        <SheetContent className="sm:max-w-xl w-full flex flex-col h-full p-0 gap-0">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col h-full'>
              <div className="p-6 border-b bg-background z-10">
                <SheetHeader>
                  <SheetTitle>Novo Carrinho</SheetTitle>
                  <SheetDescription>Inicie um novo atendimento selecionando o cliente e os produtos.</SheetDescription>
                </SheetHeader>
              </div>

              <div className='flex-1 overflow-y-auto'>
                <div className="p-6 space-y-8">
                  {/* Dados Iniciais */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                      <User className="h-4 w-4" /> Dados do Atendimento
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name='customerId'
                        render={({ field }) => (
                          <FormItem className="w-full">
                            <FormLabel className="text-xs">Cliente</FormLabel>
                            {isLoadingCustomers ? (
                                <Skeleton className="h-9 w-full" />
                            ) : (
                                <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? String(field.value) : undefined}>
                                    <FormControl>
                                        <SelectTrigger className="h-9 w-full">
                                            <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {customers?.map((customer: any) => (
                                            <SelectItem key={customer.id} value={String(customer.id)}>
                                                {customer.nameOrTradeName || customer.lastNameOrCompanyName || `Cliente #${customer.id}`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name='storeId'
                        render={({ field }) => (
                          <FormItem className="w-full">
                            <FormLabel className="text-xs">Loja</FormLabel>
                            {isLoadingStores ? (
                                <Skeleton className="h-9 w-full" />
                            ) : (
                                <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? String(field.value) : undefined}>
                                    <FormControl>
                                        <SelectTrigger className="h-9 w-full">
                                            <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {stores?.map((store: any) => (
                                            <SelectItem key={store.id} value={String(store.id)}>
                                                {store.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Produtos */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                        <ShoppingCart className="h-4 w-4" /> Itens do Carrinho
                        {totalItems > 0 && <Badge variant="secondary" className="ml-2 text-xs">{totalItems}</Badge>}
                      </h3>
                      <Button type="button" size="sm" onClick={() => setAddProductOpen(true)}>
                        <Plus className="size-3.5 mr-1.5" /> Adicionar Produto
                      </Button>
                    </div>

                    {cartItems.length === 0 ? (
                        <div className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center gap-3 text-muted-foreground bg-muted/5">
                            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                              <Package className="h-6 w-6 opacity-50" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-foreground">Carrinho vazio</p>
                              <p className="text-xs">Adicione produtos para continuar o atendimento.</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setAddProductOpen(true)} className="mt-2">
                              Adicionar Agora
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {Object.entries(groupedItems).map(([productName, items]) => {
                                const isOpen = openProducts.includes(productName)
                                const totalProductItems = items.reduce((acc, i) => acc + i.amount, 0)
                                
                                return (
                                  <Collapsible 
                                    key={productName} 
                                    open={isOpen} 
                                    onOpenChange={() => toggleProductOpen(productName)}
                                    className="border rounded-lg bg-card shadow-sm"
                                  >
                                    <div className="flex items-center justify-between p-3">
                                        <CollapsibleTrigger asChild>
                                          <Button variant="ghost" size="sm" className="p-0 h-auto hover:bg-transparent flex-1 justify-start gap-3">
                                            <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                                              <Package className="h-4 w-4 text-primary" />
                                            </div>
                                            <div className="flex flex-col items-start text-left">
                                              <span className="text-sm font-medium">{productName}</span>
                                              <span className="text-xs text-muted-foreground">{totalProductItems} itens</span>
                                            </div>
                                            {isOpen ? <ChevronUp className="ml-auto h-4 w-4 text-muted-foreground" /> : <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground" />}
                                          </Button>
                                        </CollapsibleTrigger>
                                    </div>
                                    
                                    <CollapsibleContent>
                                        <div className="border-t divide-y bg-muted/5">
                                            {items.map((item, idx) => (
                                                <div key={`${item.derivatedProductId}-${idx}`} className="flex items-center justify-between p-3 pl-14 hover:bg-muted/10 transition-colors">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Variação</span>
                                                        <span className="text-sm font-medium">{item.derivationName || 'Padrão'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex items-center border rounded-md bg-background shadow-sm h-8">
                                                          <Button 
                                                            type="button" 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 rounded-none rounded-l-md hover:bg-muted"
                                                            onClick={() => updateItemAmount(item.derivatedProductId, -1)}
                                                            disabled={item.amount <= 1}
                                                          >
                                                            <Minus className="h-3 w-3" />
                                                          </Button>
                                                          <div className="w-10 text-center text-sm font-medium tabular-nums border-x h-full flex items-center justify-center">
                                                            {item.amount}
                                                          </div>
                                                          <Button 
                                                            type="button" 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 rounded-none rounded-r-md hover:bg-muted"
                                                            onClick={() => updateItemAmount(item.derivatedProductId, 1)}
                                                          >
                                                            <Plus className="h-3 w-3" />
                                                          </Button>
                                                        </div>
                                                        <Button 
                                                            type="button" 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                            onClick={() => removeItemFromCart(item.derivatedProductId)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
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

              <div className='border-t p-4 bg-background z-10'>
                <div className="grid grid-cols-2 gap-4">
                  <SheetClose asChild>
                    <Button variant='outline' size="default" className='w-full'>Cancelar</Button>
                  </SheetClose>
                  <Button type='submit' size="default" disabled={isPending || cartItems.length === 0} className='w-full'>
                    {isPending ? <Loader className='animate-spin mr-2 size-4' /> : null} 
                    {isPending ? 'Salvando...' : 'Salvar Carrinho'}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <AddProductsToCartSheet 
        open={addProductOpen} 
        onOpenChange={setAddProductOpen}
        onAddItems={handleAddItems}
      />
    </>
  )
}
