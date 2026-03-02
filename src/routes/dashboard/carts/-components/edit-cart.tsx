import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { privateInstance } from "@/lib/auth"
import { Skeleton } from "@/components/ui/skeleton"
import { CartItems } from "./cart-items"

export function EditCartSheet({ cartId, onOpenChange }: { cartId: number, onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(true)

  const { data: cart, isLoading } = useQuery({
    queryKey: ['cart', cartId],
    queryFn: async () => {
      const response = await privateInstance.get(`/tenant/carts/${cartId}`)
      return response.data
    },
    enabled: !!cartId
  })

  // Fetch lookups for display names
  const { data: customers } = useQuery({
    queryKey: ['customers-lookup'],
    queryFn: async () => {
        const response = await privateInstance.get('/tenant/customers?limit=100')
        return response.data.items || []
    },
    staleTime: 1000 * 60 * 5
  })

  const { data: stores } = useQuery({
    queryKey: ['stores-lookup'],
    queryFn: async () => {
        const response = await privateInstance.get('/tenant/stores?limit=100')
        return response.data.items || []
    },
    staleTime: 1000 * 60 * 5
  })

  const handleOpenChange = (newOpen: boolean) => {
      setOpen(newOpen)
      onOpenChange?.(newOpen)
  }

  const customerName = customers?.find((c: any) => c.id === cart?.customerId)?.nameOrTradeName || `Cliente #${cart?.customerId}`
  const storeName = stores?.find((s: any) => s.id === cart?.storeId)?.name || `Loja #${cart?.storeId}`

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-xl w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Detalhes do Carrinho #{cartId}</SheetTitle>
          <SheetDescription>Visualize os detalhes e gerencie os itens do carrinho.</SheetDescription>
        </SheetHeader>

        {isLoading ? (
            <div className="py-6 space-y-4">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-32 w-full" />
            </div>
        ) : (
            <div className="py-6 space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-muted-foreground">Cliente:</span>
                        <p className="font-medium">{customerName}</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Loja:</span>
                        <p className="font-medium">{storeName}</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Criado em:</span>
                        <p className="font-medium">{new Date(cart?.createdAt).toLocaleDateString('pt-BR')} {new Date(cart?.createdAt).toLocaleTimeString('pt-BR')}</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Atualizado em:</span>
                        <p className="font-medium">{new Date(cart?.updatedAt).toLocaleDateString('pt-BR')} {new Date(cart?.updatedAt).toLocaleTimeString('pt-BR')}</p>
                    </div>
                </div>

                <div className="border-t pt-6">
                    <CartItems cartId={cartId} />
                </div>
            </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
