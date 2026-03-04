import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { useQuery } from "@tanstack/react-query"
import { Loader, Package, Search, Minus, Plus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { privateInstance } from "@/lib/auth"
import { SelectProductSearch } from '@/components/select-product-search'
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
// import { Skeleton } from "@/components/ui/skeleton"

// type Derivation = {
//   id: number
//   name: string
//   sku: string
//   image?: string
//   prices?: { price: number, salePrice: number }[]
// }

type CartItem = {
  derivatedProductId: number
  productName: string
  derivationName: string
  amount: number
}

export function AddProductsToCartSheet({ 
  open, 
  onOpenChange, 
  onAddItems 
}: { 
  open: boolean, 
  onOpenChange: (open: boolean) => void,
  onAddItems: (items: { derivatedProductId: number, amount: number }[]) => void
}) {
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null)
  const [itemsToAdd, setItemsToAdd] = useState<Record<number, number>>({}) // derivatedProductId -> amount

  // Fetch product details and derivations when product is selected
  const { data: productData, isLoading: isLoadingProduct } = useQuery({
    queryKey: ['product-derivations-add', selectedProduct],
    queryFn: async () => {
      if (!selectedProduct) return null
      
      const [productRes, derivationsRes] = await Promise.all([
        privateInstance.get(`/tenant/products/${selectedProduct}`),
        privateInstance.get('/tenant/derivated-product', {
          params: { productId: selectedProduct, limit: 100 }
        })
      ])

      return {
        product: productRes.data,
        derivations: derivationsRes.data.items || []
      }
    },
    enabled: !!selectedProduct
  })

  const updateAmount = (derivationId: number, delta: number) => {
    setItemsToAdd(prev => {
      const current = prev[derivationId] || 0
      const next = Math.max(0, current + delta)
      
      if (next === 0) {
        const { [derivationId]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [derivationId]: next }
    })
  }

  const handleAdd = () => {
    if (!productData) return

    const newItems: CartItem[] = Object.entries(itemsToAdd).map(([dId, amount]) => {
      const derivationId = Number(dId)
      const derivation = productData.derivations.find((d: any) => d.id === derivationId)
      return {
        derivatedProductId: derivationId,
        productName: productData.product.name,
        derivationName: derivation?.name || 'Padrão',
        amount
      }
    })

    if (newItems.length === 0) {
      toast.warning('Selecione ao menos um item para adicionar.')
      return
    }

    onAddItems(newItems)
    
    // Reset state
    setSelectedProduct(null)
    setItemsToAdd({})
    // We don't close here anymore, let the parent handle closing or we close after parent confirms
    onOpenChange(false)
  }

  const totalSelected = Object.values(itemsToAdd).reduce((acc, curr) => acc + curr, 0)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl w-full flex flex-col h-full p-0 gap-0">
        <div className="p-6 border-b bg-background z-10">
          <SheetHeader className="gap-0 p-0">
            <SheetTitle>Adicionar Produtos</SheetTitle>
            <SheetDescription>Busque um produto e selecione as quantidades das variações.</SheetDescription>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Search className="h-4 w-4" /> Buscar Produto
              </h3>
              <SelectProductSearch 
                value={selectedProduct} 
                onSelect={(val) => {
                  setSelectedProduct(val)
                  setItemsToAdd({})
                }} 
                placeholder="Digite o nome ou SKU do produto..."
                className="h-10"
              />
            </div>

            <Separator />

            <div className="flex-1 flex flex-col min-h-0 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <Package className="h-4 w-4" /> Variações Disponíveis
                </h3>
                {totalSelected > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {totalSelected} itens selecionados
                  </Badge>
                )}
              </div>

              <div className="flex-1 border rounded-md overflow-hidden flex flex-col bg-muted/10 min-h-[300px]">
                {!selectedProduct ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2 p-8">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                      <Search className="h-6 w-6 opacity-50" />
                    </div>
                    <p>Selecione um produto para ver as variações</p>
                  </div>
                ) : isLoadingProduct ? (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground gap-2">
                    <Loader className="animate-spin h-4 w-4" /> Carregando variações...
                  </div>
                ) : productData?.derivations.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2 p-8">
                    <p>Nenhuma variação encontrada para este produto.</p>
                  </div>
                ) : (
                  <div className="flex flex-col h-full bg-background">
                    <div className="bg-muted/40 px-4 py-3 text-sm font-semibold flex items-center gap-2 border-b">
                      <Package className="h-4 w-4 text-primary" />
                      {productData?.product.name}
                    </div>
                    <ScrollArea className="flex-1">
                      <div className="divide-y">
                        {productData?.derivations.map((d: any) => {
                          const amount = itemsToAdd[d.id] || 0
                          return (
                            <div key={d.id} className="flex items-center justify-between p-4 hover:bg-muted/5 transition-colors">
                              <div className="flex flex-col gap-1">
                                <span className="font-medium text-sm">{d.name || 'Padrão'}</span>
                                {d.sku && (
                                  <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded w-fit">
                                    {d.sku}
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-3">
                                <div className="flex items-center border rounded-md bg-background shadow-sm h-9">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-9 w-9 rounded-none rounded-l-md hover:bg-muted disabled:opacity-50"
                                    onClick={() => updateAmount(d.id, -1)}
                                    disabled={amount === 0}
                                  >
                                    <Minus className="h-3.5 w-3.5" />
                                  </Button>
                                  <div className="w-12 text-center text-sm font-medium tabular-nums border-x h-full flex items-center justify-center">
                                    {amount}
                                  </div>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-9 w-9 rounded-none rounded-r-md hover:bg-muted"
                                    onClick={() => updateAmount(d.id, 1)}
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className='border-t p-4 bg-background z-10'>
          <div className="grid grid-cols-2 gap-4">
            <Button variant='outline' size="default" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button size="default" onClick={handleAdd} disabled={totalSelected === 0}>
              Adicionar Selecionados ({totalSelected})
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
