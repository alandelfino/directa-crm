import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader, Plus, Minus, Trash2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { useState } from "react"
import { z } from "zod"
import { toast } from "sonner"
import { privateInstance } from "@/lib/auth"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SelectProductSearch } from '@/components/select-product-search'

const formSchema = z.object({
  customerId: z.coerce.number().min(1, { message: "Cliente é obrigatório" }),
  storeId: z.coerce.number().min(1, { message: "Loja é obrigatória" }),
})

type CartItem = {
  derivatedProductId: number
  productName: string
  amount: number
}

export function NewCartSheet({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null)
  const [productAmount, setProductAmount] = useState(1)
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

  // Fetch product name when selected (optional, for display)
  const { data: productDetails } = useQuery({
    queryKey: ['product-details', selectedProduct],
    queryFn: async () => {
      if (!selectedProduct) return null
      const response = await privateInstance.get(`/tenant/products/${selectedProduct}`)
      return response.data
    },
    enabled: !!selectedProduct
  })

  const handleAddProduct = () => {
    if (!selectedProduct || !productDetails) return
    
    // Check if product needs derivation selection (simplified for now assuming product ID is used or derivation logic is handled inside SelectProductSearch or similar)
    // The prompt implies we add products. Let's assume the user selects a product/derivation. 
    // If the endpoint expects derivatedProductId, we need to make sure we are selecting that.
    // For this implementation, I'll assume SelectProductSearch returns a product ID that can be mapped or the user selects a derivation.
    // Given previous context, products have derivations. The prompt says "derivatedProductId". 
    // Let's assume for now we select a product and pick a default derivation or the search returns derivations.
    // Re-reading SelectProductSearch: it searches products. We might need to fetch derivations for the product.
    // However, to keep it simple and actionable as per prompt instructions to "add products", I will add a step to select derivation if needed or just add the product if it maps 1:1.
    // But wait, the API requires `derivatedProductId`.
    // Let's fetch derivations for the selected product and let user pick one if multiple, or auto-pick if one.
    
    // Actually, to fully implement "add products" correctly with `derivatedProductId`, we need to let user select the derivation.
    // I'll add a derivation selector if a product is selected.
  }

  // Fetch derivations for selected product
  const { data: derivations } = useQuery({
    queryKey: ['derivations', selectedProduct],
    queryFn: async () => {
      if (!selectedProduct) return []
      const response = await privateInstance.get('/tenant/derivated-product', {
        params: { productId: selectedProduct, limit: 100 }
      })
      return response.data.items || []
    },
    enabled: !!selectedProduct
  })

  const [selectedDerivation, setSelectedDerivation] = useState<string>('')

  const addItemToCart = () => {
    if (!selectedDerivation || !productDetails) return
    
    const derivation = derivations?.find((d: any) => d.id === Number(selectedDerivation))
    const name = derivation ? `${productDetails.name} - ${derivation.name || 'Padrão'}` : productDetails.name

    setCartItems(prev => {
      const existing = prev.find(item => item.derivatedProductId === Number(selectedDerivation))
      if (existing) {
        return prev.map(item => item.derivatedProductId === Number(selectedDerivation) ? { ...item, amount: item.amount + productAmount } : item)
      }
      return [...prev, { derivatedProductId: Number(selectedDerivation), productName: name, amount: productAmount }]
    })
    
    setSelectedProduct(null)
    setSelectedDerivation('')
    setProductAmount(1)
  }

  const removeItemFromCart = (id: number) => {
    setCartItems(prev => prev.filter(item => item.derivatedProductId !== id))
  }

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      // 1. Create Cart
      const cartResponse = await privateInstance.post('/tenant/carts', values)
      const cartId = cartResponse.data.id

      // 2. Add Items sequentially
      for (const item of cartItems) {
        await privateInstance.post('/tenant/carts/derivated-products', {
          cartId,
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
    mutateAsync(values)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size={'sm'}>
          <Plus className="size-[0.85rem]" /> Novo Carrinho
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-xl w-full flex flex-col h-full">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col h-full'>
            <SheetHeader className="pb-4">
              <SheetTitle>Novo Carrinho</SheetTitle>
              <SheetDescription>Selecione o cliente, loja e adicione produtos.</SheetDescription>
            </SheetHeader>

            <div className='flex-1 overflow-hidden flex flex-col gap-6'>
              <div className="grid grid-cols-2 gap-4 px-1">
                <FormField
                  control={form.control}
                  name='customerId'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente</FormLabel>
                      {isLoadingCustomers ? (
                          <Skeleton className="h-10 w-full" />
                      ) : (
                          <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? String(field.value) : undefined}>
                              <FormControl>
                                  <SelectTrigger>
                                      <SelectValue placeholder="Selecione" />
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
                    <FormItem>
                      <FormLabel>Loja</FormLabel>
                      {isLoadingStores ? (
                          <Skeleton className="h-10 w-full" />
                      ) : (
                          <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? String(field.value) : undefined}>
                              <FormControl>
                                  <SelectTrigger>
                                      <SelectValue placeholder="Selecione" />
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

              <Separator />

              <div className="space-y-4 px-1 flex-1 flex flex-col min-h-0">
                <h3 className="font-medium text-sm">Adicionar Produtos</h3>
                <div className="flex flex-col gap-3 p-3 border rounded-lg bg-muted/20">
                    <div className="flex gap-2 items-end">
                        <div className="flex-1 space-y-2">
                            <FormLabel className="text-xs">Produto</FormLabel>
                            <SelectProductSearch 
                                value={selectedProduct} 
                                onSelect={(val) => {
                                    setSelectedProduct(val)
                                    setSelectedDerivation('')
                                }} 
                                placeholder="Buscar produto..."
                            />
                        </div>
                        <div className="w-24 space-y-2">
                            <FormLabel className="text-xs">Qtd.</FormLabel>
                            <Input 
                                type="number" 
                                min={1} 
                                value={productAmount} 
                                onChange={(e) => setProductAmount(Number(e.target.value))}
                                className="h-10"
                            />
                        </div>
                    </div>
                    
                    {selectedProduct && derivations && derivations.length > 0 && (
                        <div className="space-y-2">
                            <FormLabel className="text-xs">Variação</FormLabel>
                            <Select value={selectedDerivation} onValueChange={setSelectedDerivation}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Selecione a variação" />
                                </SelectTrigger>
                                <SelectContent>
                                    {derivations.map((d: any) => (
                                        <SelectItem key={d.id} value={String(d.id)} className="text-xs">
                                            {d.name || 'Padrão'} {d.sku ? `(${d.sku})` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <Button 
                        type="button" 
                        size="sm" 
                        className="w-full mt-1" 
                        disabled={!selectedProduct || (derivations && derivations.length > 0 && !selectedDerivation)}
                        onClick={addItemToCart}
                    >
                        <Plus className="mr-2 h-3 w-3" /> Adicionar ao Carrinho
                    </Button>
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">{cartItems.length} itens adicionados</span>
                    </div>
                    <ScrollArea className="flex-1 border rounded-md p-2">
                        {cartItems.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-xs p-4">
                                <p>Nenhum item adicionado</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {cartItems.map((item, idx) => (
                                    <div key={`${item.derivatedProductId}-${idx}`} className="flex items-center justify-between p-2 bg-card border rounded text-sm">
                                        <div className="flex flex-col">
                                            <span className="font-medium">{item.productName}</span>
                                            <span className="text-xs text-muted-foreground">Qtd: {item.amount}</span>
                                        </div>
                                        <Button 
                                            type="button" 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                            onClick={() => removeItemFromCart(item.derivatedProductId)}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>
              </div>
            </div>

            <div className='mt-auto border-t p-4'>
              <div className="grid grid-cols-2 gap-4">
                <SheetClose asChild>
                  <Button variant='outline' size="sm" className='w-full'>Cancelar</Button>
                </SheetClose>
                <Button type='submit' size="sm" disabled={isPending} className='w-full'>
                  {isPending ? <Loader className='animate-spin size-[0.85rem]' /> : 'Salvar Carrinho'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
