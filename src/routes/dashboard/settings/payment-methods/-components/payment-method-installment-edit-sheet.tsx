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

const formSchema = z.object({
  installments: z.coerce.number().int().min(1, { message: 'Número de parcelas é obrigatório' }),
  label: z.string().min(1, { message: 'Label é obrigatório' }),
})

type PaymentMethodInstallment = {
  id: number
  paymentMethodId: number
  paymentMethod: { id: number; name: string }
  installments: number
  label: string
  createdAt: string
  updatedAt: string
}

export function PaymentMethodInstallmentEditSheet({
  paymentMethodId,
  paymentMethodName,
  paymentMethodInstallmentId,
  disabled,
  onSaved,
  trigger,
}: {
  paymentMethodId: number
  paymentMethodName?: string | null
  paymentMethodInstallmentId: number | null
  disabled: boolean
  onSaved?: () => void
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      installments: 1,
      label: '',
    },
  })

  const { data, isLoading } = useQuery({
    queryKey: ['payment-method-installment', paymentMethodInstallmentId],
    enabled: open && !!paymentMethodInstallmentId,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await privateInstance.get(`/tenant/payment-method-installments/${paymentMethodInstallmentId}`)
      return response.data as PaymentMethodInstallment
    },
  })

  useEffect(() => {
    if (!open) return
    if (!data) return
    form.reset({
      installments: data.installments ?? 1,
      label: data.label ?? '',
    })
  }, [open, data, form])

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      if (!paymentMethodInstallmentId) throw new Error('Parcelamento inválido')
      const payload = {
        paymentMethodId,
        installments: values.installments,
        label: values.label,
      }
      const response = await privateInstance.put(`/tenant/payment-method-installments/${paymentMethodInstallmentId}`, payload)
      if (response.status !== 200 && response.status !== 201) throw new Error('Erro ao atualizar parcelamento')
      return response.data
    },
    onSuccess: () => {
      toast.success('Condição de pagamento atualizada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['payment-method-installments', paymentMethodId] })
      setOpen(false)
      onSaved?.()
    },
    onError: (err: any) => {
      const errorData = err?.response?.data
      toast.error(errorData?.title || 'Erro ao atualizar condição de pagamento', {
        description: errorData?.detail || 'Não foi possível atualizar a condição de pagamento.',
      })
    },
  })

  const methodName = (paymentMethodName ?? '').trim()

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await mutateAsync(values)
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) form.reset({ installments: 1, label: '' })
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
      <SheetContent className="min-w-[500px] sm:w-[540px] overflow-y-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <SheetHeader>
              <SheetTitle>Editar parcelamento</SheetTitle>
              <SheetDescription>
                {methodName ? `Vinculado a: ${methodName}.` : 'Atualize os dados do parcelamento.'}
              </SheetDescription>
            </SheetHeader>

            {(isLoading || !data) ? (
              <div className="flex justify-center items-center h-40">
                <Loader className="animate-spin size-6" />
              </div>
            ) : (
              <>
                <div className="flex-1 grid auto-rows-min gap-6 px-4 py-4 overflow-y-auto">
                  <FormItem>
                    <FormLabel>Método de pagamento</FormLabel>
                    <FormControl>
                      <Input value={methodName ? methodName : `ID ${paymentMethodId}`} disabled />
                    </FormControl>
                  </FormItem>

                  <FormField
                    control={form.control as any}
                    name="installments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parcelas</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value)}
                            disabled={isPending}
                            placeholder="Ex: 6"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control as any}
                    name="label"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Label</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Até 6x sem juros" {...field} disabled={isPending} />
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
