import { Button } from "@/components/ui/button"
import { DataTable, type ColumnDef } from "@/components/data-table"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader, Plus, Trash, Minus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { privateInstance } from "@/lib/auth"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface CartItem {
  id: number
  cartId: number
  derivatedProductId: number
  amount: number
  price: number
  salePrice: number
  total: number
  createdAt: string
  updatedAt: string
}

export function CartItems({ cartId }: { cartId: number }) {
  const queryClient = useQueryClient()
  const [isAddItemOpen, setIsAddItemOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [amount, setAmount] = useState(1)

  // Fetch Items
  const { data: items, isLoading } = useQuery({
    queryKey: ['cart-items', cartId],
    queryFn: async () => {
      const response = await privateInstance.get(`/tenant/carts/${cartId}/derivated-products`)
      return response.data.items || []
    }
  })

  // Fetch Products for selection (assuming /tenant/derivations or similar)
  // The prompt mentions "derivatedProductId". I'll try /tenant/derivations based on the existing route.
  const { data: products } = useQuery({
    queryKey: ['products-list-select'],
    queryFn: async () => {
        const response = await privateInstance.get('/tenant/derivations?limit=100')
        return response.data.items || []
    },
    staleTime: 1000 * 60 * 5
  })

  const { isPending: isAdding, mutate: addItem } = useMutation({
    mutationFn: async () => {
      return privateInstance.post(`/tenant/carts/${cartId}/derivated-products`, {
        derivatedProductId: Number(selectedProduct),
        amount
      })
    },
    onSuccess: () => {
      toast.success('Item adicionado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['cart-items', cartId] })
      setIsAddItemOpen(false)
      setSelectedProduct('')
      setAmount(1)
    },
    onError: () => {
      toast.error('Erro ao adicionar item')
    }
  })

  const { mutate: updateItem } = useMutation({
    mutationFn: async ({ amount, derivatedProductId }: { id: number, amount: number, derivatedProductId: number }) => {
      return privateInstance.put(`/tenant/carts/derivated-products/${derivatedProductId}`, {
        cartId,
        amount
      })
    },
    onSuccess: () => {
      toast.success('Item atualizado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['cart-items', cartId] })
    },
    onError: () => {
      toast.error('Erro ao atualizar item')
    }
  })

  const columns: ColumnDef<CartItem>[] = [
    {
      id: 'product',
      header: 'Produto',
      cell: (item) => {
        const product = products?.find((p: any) => p.id === item.derivatedProductId)
        return product ? product.name : `Produto #${item.derivatedProductId}`
      }
    },
    {
      id: 'price',
      header: 'Preço',
      cell: (item) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.salePrice || item.price)
    },
    {
      id: 'amount',
      header: 'Qtd',
      cell: (item) => (
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateItem({ id: item.id, amount: Math.max(0, item.amount - 1), derivatedProductId: item.derivatedProductId })}>
                <Minus className="h-3 w-3" />
            </Button>
            <span className="w-8 text-center">{item.amount}</span>
            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateItem({ id: item.id, amount: item.amount + 1, derivatedProductId: item.derivatedProductId })}>
                <Plus className="h-3 w-3" />
            </Button>
        </div>
      )
    },
    {
      id: 'total',
      header: 'Total',
      cell: (item) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total)
    },
    {
      id: 'actions',
      header: '',
      cell: (item) => (
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => updateItem({ id: item.id, amount: 0, derivatedProductId: item.derivatedProductId })}>
            <Trash className="h-4 w-4" />
        </Button>
      )
    }
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Itens do Carrinho</h3>
        <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
            <DialogTrigger asChild>
                <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" /> Adicionar Item
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Adicionar Item</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Produto</label>
                        <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione um produto" />
                            </SelectTrigger>
                            <SelectContent>
                                {products?.map((p: any) => (
                                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Quantidade</label>
                        <Input 
                            type="number" 
                            min="1" 
                            value={amount} 
                            onChange={(e) => setAmount(Number(e.target.value))} 
                        />
                    </div>
                    <Button className="w-full" onClick={() => addItem()} disabled={!selectedProduct || amount < 1 || isAdding}>
                        {isAdding ? <Loader className="animate-spin h-4 w-4" /> : 'Adicionar'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        {isLoading ? (
            <div className="p-4 space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
            </div>
        ) : (
            <DataTable 
                columns={columns} 
                data={items || []} 
                totalItems={items?.length || 0}
                page={1}
                perPage={100}
            />
        )}
      </div>
    </div>
  )
}
