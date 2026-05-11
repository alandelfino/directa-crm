import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Check, Loader2, X } from "lucide-react"
import type { CartCuponsResponse } from "./edit-cart.types"

export function CartCouponSection({
  cupons,
  isLoading,
  couponCode,
  setCouponCode,
  applyCoupon,
  isApplyingCoupon,
  isRemovingCoupon,
  setSelectedCouponCode,
  setRemoveCouponOpen,
  isReadOnly,
}: {
  cupons: CartCuponsResponse["cupons"]
  isLoading: boolean
  couponCode: string
  setCouponCode: (next: string) => void
  applyCoupon: (code: string) => void
  isApplyingCoupon: boolean
  isRemovingCoupon: boolean
  setSelectedCouponCode: (code: string | null) => void
  setRemoveCouponOpen: (open: boolean) => void
  isReadOnly: boolean
}) {
  const isBusy = isLoading || isApplyingCoupon || isRemovingCoupon

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">Cupom de desconto</span>
        {isLoading ? <Skeleton className="h-4 w-24" /> : cupons.length > 0 ? <span className="text-sm text-muted-foreground">{cupons.length} aplicado(s)</span> : null}
      </div>

      {!isLoading && cupons.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {cupons.map((c) => (
            <Badge key={c.id} variant="secondary" className="font-mono gap-1 pr-1 h-6">
              {String(c.code || "").toUpperCase()}
              <button
                type="button"
                className="ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded-sm hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={isReadOnly || isRemovingCoupon || isApplyingCoupon}
                onClick={() => {
                  setSelectedCouponCode(String(c.code || "").toUpperCase())
                  setRemoveCouponOpen(true)
                }}
                aria-label={`Remover cupom ${c.code}`}
                title={`Remover cupom ${c.code}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        {isLoading ? (
          <Skeleton className="h-8 flex-1" />
        ) : (
          <Input
            className="h-9 text-sm"
            value={couponCode}
            onChange={(e) => {
              setCouponCode(e.target.value.replace(/\s/g, "").toUpperCase())
            }}
            placeholder="Código do cupom"
            disabled={isReadOnly || isApplyingCoupon || isRemovingCoupon}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return
              e.preventDefault()
              const nextCode = couponCode.trim()
              if (!nextCode) return
              if (isReadOnly || isApplyingCoupon || isRemovingCoupon) return
              applyCoupon(nextCode)
            }}
          />
        )}
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9"
          disabled={isReadOnly || isBusy || !couponCode.trim()}
          onClick={() => {
            const nextCode = couponCode.trim()
            if (!nextCode) return
            applyCoupon(nextCode)
          }}
          aria-label="Aplicar cupom"
          title="Aplicar cupom"
        >
          {isApplyingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}
