import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useQuery } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { privateInstance } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import type { PaymentMethod, PaymentMethodQuote } from "./edit-cart.types"

type PaymentMethodsResponse = {
  items: PaymentMethod[]
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null

const getApiErrorData = (err: unknown): { title?: string; detail?: string } | null => {
  if (!isRecord(err)) return null
  const response = err.response
  if (!isRecord(response)) return null
  const data = response.data
  if (!isRecord(data)) return null

  const title = typeof data.title === "string" ? data.title : undefined
  const detail = typeof data.detail === "string" ? data.detail : undefined
  return title || detail ? { title, detail } : null
}

export function PaymentMethodsOverviewSheet({
  className,
  cartId,
  storeId,
  trigger,
  formatBRL,
}: {
  className?: string
  cartId: number
  storeId?: number
  trigger: React.ReactNode
  formatBRL: (valueInCents: number) => string
}) {
  const [open, setOpen] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const { data, isLoading, isError, error } = useQuery<PaymentMethodQuote[], unknown>({
    queryKey: ["cart-payment-methods-overview", cartId, storeId],
    enabled: open && Number(cartId) > 0,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await privateInstance.get<PaymentMethodsResponse>("/tenant/payment-methods", {
        params: {
          page: 1,
          limit: 100,
          sortBy: "name",
          orderBy: "asc",
          ...(Number(storeId) > 0 ? { storeId } : {}),
        },
      })

      const paymentMethods = Array.isArray(response.data?.items) ? response.data.items : []

      const quoteResults = await Promise.allSettled(
        paymentMethods.map(async (m) => {
          const q = await privateInstance.post(`/tenant/carts/${cartId}/payment-method-quote`, {
            paymentMethodId: m.id,
          })
          return q.data as PaymentMethodQuote
        })
      )

      return quoteResults
        .map((r) => (r.status === "fulfilled" ? r.value : null))
        .filter(Boolean) as PaymentMethodQuote[]
    },
  })

  useEffect(() => {
    if (!isError) return
    const errorData = getApiErrorData(error)
    toast.error(errorData?.title || "Erro ao carregar formas de pagamento", {
      description: errorData?.detail || "Não foi possível carregar as formas de pagamento.",
    })
  }, [isError, error])

  const quotes = useMemo(() => (Array.isArray(data) ? data : []), [data])

  useEffect(() => {
    if (!open) {
      setExpandedItems([])
      return
    }
    setExpandedItems((prev) => {
      if (prev.length > 0) return prev
      return quotes.map((q) => String(q.paymentMethod.id))
    })
  }, [open, quotes])

  const PaymentMethodsOverviewSkeleton = useMemo(() => {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, methodIndex) => (
          <div key={methodIndex} className="bg-card overflow-hidden border rounded-xl shadow-sm">
            <div className="px-4 py-3 bg-muted/20">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-[180px]" />
                  <Skeleton className="mt-2 h-3 w-[220px]" />
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <Skeleton className="h-5 w-[90px] rounded-full" />
                </div>
              </div>
            </div>

            <div className="px-1 pb-2 pt-2">
              <div className="rounded-lg border bg-background overflow-hidden">
                <div className="divide-y">
                  {Array.from({ length: 4 }).map((__, payInIndex) => (
                    <div key={payInIndex} className="flex items-center justify-between gap-4 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <Skeleton className="h-3 w-[240px]" />
                        <Skeleton className="mt-2 h-3 w-[120px]" />
                      </div>
                      <Skeleton className="h-3 w-[80px]" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }, [])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        className={[
          "flex flex-col overflow-hidden p-0 gap-0 w-full min-w-xl",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <SheetHeader className="p-0 space-y-1">
            <SheetTitle>Formas de pagamento</SheetTitle>
            <SheetDescription>Lista de métodos e suas condições para o total atual do carrinho.</SheetDescription>
          </SheetHeader>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setOpen(false)}
            aria-label="Fechar"
            title="Fechar"
          >
            <span className="text-lg leading-none">×</span>
          </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-5">
          {isLoading ? (
            PaymentMethodsOverviewSkeleton
          ) : quotes.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhuma forma de pagamento encontrada.</div>
          ) : (
            <Accordion
              type="multiple"
              value={expandedItems}
              onValueChange={(v) => setExpandedItems(Array.isArray(v) ? v : [])}
              className="space-y-3"
            >
              {quotes.map((q) => (
                <AccordionItem
                  key={q.paymentMethod.id}
                  value={String(q.paymentMethod.id)}
                  className="bg-card overflow-hidden border-b-0 border rounded-xl shadow-sm"
                >
                  <AccordionTrigger className="px-4 py-3 bg-muted/20 hover:bg-muted/30 hover:no-underline">
                    <div className="flex flex-1 items-start justify-between gap-3 min-w-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="text-sm font-semibold truncate">{q.paymentMethod.name}</div>
                          {q.paymentMethod.activeDiscount && (Number(q.paymentMethod.discountAmount ?? 0) || 0) > 0 ? (
                            <span className="shrink-0 text-[11px] font-semibold text-destructive tabular-nums">
                              {q.paymentMethod.discountType === "percent"
                                ? `-${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format((Number(q.paymentMethod.discountAmount ?? 0) || 0) / 100)}%`
                                : `-${formatBRL(Number(q.paymentMethod.discountAmount ?? 0) || 0)}`}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">Condições disponíveis</div>
                      </div>


                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-0">
                    <div className="px-4 pb-4">
                      <div className="rounded-lg border bg-background overflow-hidden">
                        <div className="divide-y">
                          {(q.payIns ?? [])
                            .filter((p) => p.active)
                            .slice()
                            .sort((a, b) => (a.numberOfInstallments ?? 0) - (b.numberOfInstallments ?? 0))
                            .map((p) => (
                              <div key={p.id} className="flex items-center justify-between gap-4 px-3 py-2.5">
                                <div className="min-w-0">
                                  <div className="text-xs font-medium text-foreground/90 truncate">{p.name}</div>
                                  {p.noInterestRate ? <div className="mt-0.5 text-[11px] text-muted-foreground">sem juros</div> : null}
                                </div>

                                <div className="flex flex-col items-end gap-0.5 text-right">
                                  <div className="shrink-0 tabular-nums text-xs font-semibold text-foreground">
                                    {p.installmentType === "dynamic" ? (
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                                            Ver parcelas
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent align="end" className="w-[260px] p-3">
                                          <div className="flex items-start justify-between gap-3">
                                            <div className="text-sm font-semibold">Parcelas</div>
                                            <div className="text-xs text-muted-foreground">
                                              Total: <span className="tabular-nums font-semibold text-foreground">{formatBRL(Number(p.totals?.totalValue ?? 0) || 0)}</span>
                                            </div>
                                          </div>
                                          <div className="mt-2 max-h-[240px] overflow-y-auto">
                                            {Array.isArray(p.installmentValues) && p.installmentValues.length > 0 ? (
                                              <div className="space-y-1">
                                                {p.installmentValues
                                                  .filter((n) => typeof n === "number")
                                                  .map((v, idx) => (
                                                    <div key={`${p.id}-${idx}`} className="flex items-center justify-between text-xs">
                                                      <span className="text-muted-foreground">{idx + 1}ª parcela</span>
                                                      <span className="tabular-nums font-semibold">{formatBRL(v)}</span>
                                                    </div>
                                                  ))}
                                              </div>
                                            ) : (
                                              <div className="text-xs text-muted-foreground">Nenhuma parcela disponível.</div>
                                            )}
                                          </div>
                                        </PopoverContent>
                                      </Popover>
                                    ) : typeof p.installmentValue === "number" ? (
                                      formatBRL(p.installmentValue)
                                    ) : (
                                      "—"
                                    )}
                                  </div>
                                  {p.totals && (
                                    <div className="text-[10px] text-muted-foreground tabular-nums">
                                      {Number(p.totals.discountApplied ?? 0) > 0 ? (
                                        <span className="flex items-center gap-1 justify-end">
                                          <span className="line-through">{formatBRL(Number(p.totals.baseTotalValue ?? 0))}</span>
                                          <span>por</span>
                                          <span className="font-semibold text-foreground">{formatBRL(Number(p.totals.totalValue ?? 0))}</span>
                                        </span>
                                      ) : (
                                        <span>Total: {formatBRL(Number(p.totals.totalValue ?? 0))}</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>

      </SheetContent>
    </Sheet>
  )
}
