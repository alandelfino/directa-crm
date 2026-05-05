import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { privateInstance } from '@/lib/auth'
import { Edit, Loader } from 'lucide-react'
import { NumericFormat } from 'react-number-format'
import { Skeleton } from '@/components/ui/skeleton'

const formSchema = z.object({
  label: z.string().min(1, { message: 'Label é obrigatório' }),
  interestRate: z.coerce.number().int().min(0, { message: 'Juros inválido' }),
  intervalInDays: z.coerce.number().int().min(0, { message: 'Intervalo inválido' }),
})

type PayInInstallment = {
  id: number
  payInId: number
  payIn: { id: number; name: string }
  label: string
  interestRate: number
  intervalInDays: number
  order: number
  createdAt: string
  updatedAt: string
}

export function PayInInstallmentEditSheet({
  payInId,
  payInName,
  payInInstallmentId,
  disabled,
  onSaved,
  trigger,
}: {
  payInId: number
  payInName?: string | null
  payInInstallmentId: number | null
  disabled: boolean
  onSaved?: () => void
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      label: '',
      interestRate: 0,
      intervalInDays: 0,
    },
  })

  const { data, isLoading } = useQuery({
    queryKey: ['pay-in-installment', payInInstallmentId],
    enabled: open && !!payInInstallmentId,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await privateInstance.get(`/tenant/pay-in-installments/${payInInstallmentId}`)
      return response.data as PayInInstallment
    },
  })

  useEffect(() => {
    if (!open) return
    if (!data) return
    form.reset({
      label: data.label ?? '',
      interestRate: typeof data.interestRate === 'number' ? data.interestRate : 0,
      intervalInDays: typeof data.intervalInDays === 'number' ? data.intervalInDays : 0,
    })
  }, [open, data, form])

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      if (!payInInstallmentId) throw new Error('Parcela inválida')
      const payload = {
        payInId,
        label: values.label,
        interestRate: values.interestRate,
        intervalInDays: values.intervalInDays,
      }
      const response = await privateInstance.put(`/tenant/pay-in-installments/${payInInstallmentId}`, payload)
      if (response.status !== 200 && response.status !== 201) throw new Error('Erro ao atualizar parcela')
      return response.data
    },
    onSuccess: () => {
      toast.success('Parcela atualizada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['pay-in-installments', payInId] })
      setOpen(false)
      onSaved?.()
    },
    onError: (err: any) => {
      const errorData = err?.response?.data
      toast.error(errorData?.title || 'Erro ao atualizar parcela', {
        description: errorData?.detail || 'Não foi possível atualizar a parcela.',
      })
    },
  })

  const headerName = (payInName ?? data?.payIn?.name ?? '').trim()

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await mutateAsync(values)
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) form.reset({ label: '', interestRate: 0, intervalInDays: 0 })
      }}
    >
      <SheetTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => {
              if (disabled) return
              setOpen(true)
            }}
          >
            <Edit className="size-[0.85rem]" /> Editar
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="min-w-sm sm:w-sm overflow-y-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <SheetHeader>
              <SheetTitle>Editar parcela</SheetTitle>
              <SheetDescription>{headerName ? `Condição: ${headerName}.` : 'Atualize os dados da parcela.'}</SheetDescription>
            </SheetHeader>

            {(isLoading || !data) ? (
              <>
                <div className="flex-1 grid auto-rows-min gap-6 px-4 py-4 overflow-y-auto">
                  <div className="grid gap-2">
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="grid gap-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="grid gap-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="grid gap-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>

                <div className="mt-auto border-t p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex-1 grid auto-rows-min gap-6 px-4 py-4 overflow-y-auto">
                  <FormItem>
                    <FormLabel>Condição de pagamento</FormLabel>
                    <FormControl>
                      <Input value={headerName ? headerName : `ID ${payInId}`} disabled />
                    </FormControl>
                  </FormItem>

                  <FormField
                    control={form.control as any}
                    name="label"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Label</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: 1x / Entrada" {...field} disabled={isPending} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control as any}
                    name="interestRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Juros</FormLabel>
                        <FormControl>
                          <NumericFormat
                            customInput={Input}
                            value={typeof field.value === 'number' ? field.value / 100 : 0}
                            onValueChange={(v) => {
                              if (v.floatValue === undefined) {
                                field.onChange(0)
                                return
                              }
                              field.onChange(Math.round(v.floatValue * 100))
                            }}
                            decimalScale={2}
                            fixedDecimalScale
                            decimalSeparator=","
                            thousandSeparator="."
                            allowNegative={false}
                            suffix="%"
                            placeholder="0,00%"
                            inputMode="numeric"
                            disabled={isPending}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control as any}
                    name="intervalInDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Intervalo (dias)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value)}
                            disabled={isPending}
                            placeholder="Ex: 30"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="mt-auto border-t p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <SheetClose asChild>
                      <Button variant="outline" size="sm" className="w-full" disabled={isPending}>
                        Cancelar
                      </Button>
                    </SheetClose>
                    <Button type="submit" size="sm" className="w-full" disabled={isPending}>
                      {isPending ? <Loader className="animate-spin h-4 w-4" /> : 'Salvar'}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
