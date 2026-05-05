import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { TabsContent } from "@/components/ui/tabs"
import { Loader2, MapPin, RefreshCw } from "lucide-react"
import type { CustomerAddress } from "./edit-cart.types"

export function CartAddressesTab({
  customerId,
  isReadOnly,
  isLoadingAddresses,
  isRefetchingAddresses,
  isSelectingAddress,
  isUpdatingCartAfterAddressSelect,
  refetchAddresses,
  addresses,
  selectedAddressId,
  selectCartAddress,
}: {
  customerId: number | undefined
  isReadOnly: boolean
  isLoadingAddresses: boolean
  isRefetchingAddresses: boolean
  isSelectingAddress: boolean
  isUpdatingCartAfterAddressSelect: boolean
  refetchAddresses: () => void
  addresses: CustomerAddress[]
  selectedAddressId: number | null
  selectCartAddress: (addressId: number) => void
}) {
  return (
    <TabsContent value="addresses" className="m-0 flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <MapPin className="h-4 w-4" /> Endereços
        </h3>
        <Button
          variant="ghost"
          size="sm"
          disabled={!customerId || isLoadingAddresses || isRefetchingAddresses || isSelectingAddress || isUpdatingCartAfterAddressSelect}
          onClick={() => {
            refetchAddresses()
          }}
          title="Atualizar"
          aria-label="Atualizar"
        >
          <RefreshCw className={`size-[0.85rem] ${isLoadingAddresses || isRefetchingAddresses || isUpdatingCartAfterAddressSelect ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {!customerId ? (
          <div className="border rounded-lg p-6 flex flex-col items-center justify-center text-center gap-2 text-muted-foreground">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <MapPin className="h-6 w-6 opacity-50" />
            </div>
            <p className="text-sm font-medium text-foreground">Nenhum cliente vinculado</p>
            <p className="text-xs text-muted-foreground">Selecione um cliente para visualizar os endereços.</p>
          </div>
        ) : isLoadingAddresses || isRefetchingAddresses ? (
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
                className={`w-full text-left border rounded-lg p-3 flex items-start justify-between gap-4 hover:bg-muted/30 transition-colors disabled:opacity-60 disabled:pointer-events-none ${isSelected ? "border-primary ring-1 ring-primary/20" : ""}`}
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
                      {a.complement ? ` • ${a.complement}` : ""}
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
            <p className="text-xs text-muted-foreground">Este cliente ainda não possui endereços.</p>
          </div>
        )}
      </div>
    </TabsContent>
  )
}

