import { Separator } from "@/components/ui/separator"
import { TabsContent } from "@/components/ui/tabs"
import { Calendar, Info, Package, Store, User } from "lucide-react"
import type { Cart } from "./edit-cart.types"

export function CartDetailsTab({ cart }: { cart: Cart | undefined }) {
  return (
    <TabsContent value="details" className="m-0 flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Info className="h-4 w-4" /> Detalhes
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 gap-4 border rounded-lg p-4 bg-muted/10">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" /> Cliente
            </span>
            <p className="text-sm font-medium" title={cart?.customer?.name}>
              {cart?.customer?.name || "—"}
            </p>
          </div>
          <Separator />
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Store className="h-3 w-3" /> Loja
            </span>
            <p className="text-sm font-medium" title={cart?.store?.name}>
              {cart?.store?.name || "—"}
            </p>
          </div>
          <Separator />
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Criado em
            </span>
            <p className="text-sm font-medium">
              {cart?.createdAt ? new Date(cart.createdAt).toLocaleDateString("pt-BR") : "—"} às{" "}
              {cart?.createdAt ? new Date(cart.createdAt).toLocaleTimeString("pt-BR") : "—"}
            </p>
          </div>
          <Separator />
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Package className="h-3 w-3" /> Total de Itens
            </span>
            <p className="text-sm font-medium">{cart?.totalItems || 0}</p>
          </div>
        </div>
      </div>
    </TabsContent>
  )
}

