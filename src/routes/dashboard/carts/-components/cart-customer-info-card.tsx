import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { privateInstance } from "@/lib/auth"
import { useQuery } from "@tanstack/react-query"
import type { CartBasic } from "./edit-cart.types"
import { IconCircleFilled } from "@tabler/icons-react"

type CustomerDetails = {
  id: number
  name?: string | null
  nameOrTradeName?: string | null
  personType?: "natural" | "entity" | null
  cpfOrCnpj?: string | null
}

export function CartCustomerInfoCard({
  cart,
  customerId,
  isLoadingCartBasic,
}: {
  cart: CartBasic | undefined
  customerId: number | undefined
  isLoadingCartBasic: boolean
}) {
  const { data: customer, isLoading } = useQuery<CustomerDetails>({
    queryKey: ["customer-details", customerId],
    enabled: Number(customerId) > 0,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await privateInstance.get<CustomerDetails>(`/tenant/customers/${customerId}`)
      return response.data
    },
  })

  const onlyDigits = (v?: string) => String(v ?? "").replace(/\D/g, "")
  const formatCpf = (v?: string) => {
    let d = onlyDigits(v).slice(0, 11)
    d = d.replace(/^(\d{3})(\d)/, "$1.$2")
    d = d.replace(/^(\d{3}\.\d{3})(\d)/, "$1.$2")
    d = d.replace(/^(\d{3}\.\d{3}\.\d{3})(\d)/, "$1-$2")
    return d
  }
  const formatCnpj = (v?: string) => {
    let d = onlyDigits(v).slice(0, 14)
    d = d.replace(/^(\d{2})(\d)/, "$1.$2")
    d = d.replace(/^(\d{2}\.\d{3})(\d)/, "$1.$2")
    d = d.replace(/^(\d{2}\.\d{3}\.\d{3})(\d)/, "$1/$2")
    d = d.replace(/^(\d{2}\.\d{3}\.\d{3}\/\d{4})(\d)/, "$1-$2")
    return d
  }

  const customerName = String(customer?.nameOrTradeName ?? customer?.name ?? cart?.customer?.name ?? "")
  const customerPersonType = customer?.personType ?? undefined
  const customerCpfOrCnpj = String(customer?.cpfOrCnpj ?? "")
  const customerDoc =
    customerPersonType === "entity" ? formatCnpj(customerCpfOrCnpj) : customerPersonType === "natural" ? formatCpf(customerCpfOrCnpj) : customerCpfOrCnpj
  const showSkeleton = isLoadingCartBasic || isLoading

  return (
    <div className="border rounded-lg p-4 bg-background shadow-xs">
      <div className="flex items-center gap-3">
        <Avatar className="w-12 h-12 rounded-lg border shadow-sm flex justify-center items-center">
          <AvatarImage
            src="#"
            alt={customerName || "customerName"}
            className="grayscale"
          />
          <AvatarFallback>{customerName.split(" ").map((w, index) => index <= 1 ? w.charAt(0) : "")?.join("") || "—"}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          {showSkeleton ? (
            <div className="mt-1 space-y-2">
              <Skeleton className="h-4 w-[220px]" />
              <Skeleton className="h-3 w-[160px]" />
            </div>
          ) : (
            <div className="mt-1">
              <div className="mt-0.5 text-base font-semibold truncate">{customerName || "—"}</div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  {customerPersonType === "entity" ? "Pessoa jurídica" : customerPersonType === "natural" ? "Pessoa física" : "Documento"}
                </span>
                <IconCircleFilled className="size-1" />
                <span className="truncate">{customerDoc || "—"}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
