import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { privateInstance } from '@/lib/auth'
import { Edit, Loader } from 'lucide-react'
import { Switch } from '@/components/ui/switch'

const formSchema = z.object({
  name: z.string().min(1, { message: 'Nome é obrigatório' }),
  numberOfInstallments: z.coerce.number().int().min(1, { message: 'Número de parcelas é obrigatório' }),
  payInInterestType: z.enum(['simple', 'price_table']).optional(),
  installmentType: z.enum(['fixed', 'dynamic']).optional(),
  active: z.boolean().optional(),
})

type PayIn = {
  id: number
  name: string
  numberOfInstallments: number
  active: boolean
  paymentMethodId: number
  payInInterestType: 'simple' | 'price_table'
  installmentType: 'fixed' | 'dynamic'
  paymentMethod: { id: number; name: string }
  createdAt: string
  updatedAt: string
}

export function PayInEditSheet({
  paymentMethodId,
  paymentMethodName,
  payInId,
  disabled,
  onSaved,
  trigger,
}: {
  paymentMethodId: number
  paymentMethodName?: string | null
  payInId: number | null
  disabled: boolean
  onSaved?: () => void
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: '',
      numberOfInstallments: 1,
      payInInterestType: 'simple',
      installmentType: 'fixed',
      active: true,
    },
  })

  const { data, isLoading } = useQuery({
    queryKey: ['pay-in', payInId],
    enabled: open && !!payInId,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await privateInstance.get(`/tenant/pay-ins/${payInId}`)
      return response.data as PayIn
    },
  })

  useEffect(() => {
    if (!open) return
    if (!data) return
    const rawInstallmentType = String((data as any)?.installmentType ?? '').toLowerCase()
    const normalizedInstallmentType =
      rawInstallmentType === 'dynamic' || rawInstallmentType === 'dinamico' || rawInstallmentType === 'dinâmico'
        ? 'dynamic'
        : 'fixed'
    const rawPayInInterestType = String((data as any)?.payInInterestType ?? '')
      .toLowerCase()
      .replace(/-/g, '_')
    const normalizedPayInInterestType = rawPayInInterestType === 'price_table' ? 'price_table' : 'simple'
    form.reset({
      name: data.name ?? '',
      numberOfInstallments: data.numberOfInstallments ?? 1,
      payInInterestType: normalizedPayInInterestType,
      installmentType: normalizedInstallmentType,
      active: typeof data.active === 'boolean' ? data.active : true,
    })
  }, [open, data, form])

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      if (!payInId) throw new Error('Pay in inválido')
      const payload = {
        name: values.name,
        numberOfInstallments: values.numberOfInstallments,
        paymentMethodId,
        payInInterestType: values.payInInterestType,
        installmentType: values.installmentType,
        active: values.active,
      }
      const response = await privateInstance.put(`/tenant/pay-ins/${payInId}`, payload)
      if (response.status !== 200 && response.status !== 201) throw new Error('Erro ao atualizar pay in')
      return response.data
    },
    onSuccess: () => {
      toast.success('Condição de pagamento atualizada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['pay-ins', paymentMethodId] })
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
        if (!v) form.reset({ name: '', numberOfInstallments: 1, payInInterestType: 'simple', installmentType: 'fixed', active: true })
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
              <SheetTitle>Editar condição</SheetTitle>
              <SheetDescription>
                {methodName ? `Vinculado a: ${methodName}.` : 'Atualize os dados da condição de pagamento.'}
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

                  <div className="grid grid-cols-5 gap-4">
                    <div className="col-span-4">
                      <FormField
                        control={form.control as any}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Até 6x sem juros" {...field} disabled={isPending} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-1">
                      <FormField
                        control={form.control as any}
                        name="numberOfInstallments"
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
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control as any}
                      name="payInInterestType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de juros</FormLabel>
                          <Select
                            key={`payInInterestType-${field.value === 'price_table' ? 'price_table' : 'simple'}`}
                            value={field.value === 'price_table' ? 'price_table' : 'simple'}
                            onValueChange={field.onChange}
                            disabled={isPending}
                          >
                            <FormControl>
                              <SelectTrigger className="h-10 w-full">
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="simple">Simples</SelectItem>
                              <SelectItem value="price_table">Tabela de preço</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control as any}
                      name="installmentType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de parcelamento</FormLabel>
                          <Select
                            key={`installmentType-${field.value === 'dynamic' ? 'dynamic' : 'fixed'}`}
                            value={field.value === 'dynamic' ? 'dynamic' : 'fixed'}
                            onValueChange={field.onChange}
                            disabled={isPending}
                          >
                            <FormControl>
                              <SelectTrigger className="h-10 w-full">
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="fixed">Fixo</SelectItem>
                              <SelectItem value="dynamic">Dinâmico</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control as any}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>Ativo</FormLabel>
                          <div className="text-xs text-muted-foreground">Controla se a condição pode ser usada.</div>
                        </div>
                        <FormControl>
                          <Switch checked={!!field.value} onCheckedChange={field.onChange} disabled={isPending} />
                        </FormControl>
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
