import { useState } from 'react'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { privateInstance } from '@/lib/auth'
import { toast } from 'sonner'
import { Loader, Plus } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Switch } from '@/components/ui/switch'
import { NumericFormat } from 'react-number-format'

const discountAmountSchema = z
  .preprocess((v) => (v === '' || v === null ? undefined : v), z.number())
  .optional()
  .refine((v) => v === undefined || Number.isInteger(v), { message: 'Valor deve ser um número inteiro' })
  .refine((v) => v === undefined || v >= 0, { message: 'Valor mínimo é 0' })

const formSchema = z.object({
  name: z.string().min(1, { message: 'Nome é obrigatório' }),
  paymentGatewayId: z.coerce.number().int().min(1, { message: 'Gateway é obrigatório' }),
  activeDiscount: z.boolean().default(false),
  discountType: z.enum(['percent', 'fixed']).optional(),
  discountAmount: discountAmountSchema,
}).superRefine((data, ctx) => {
  if (!data.activeDiscount) return

  if (!data.discountType) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['discountType'],
      message: 'Tipo de desconto é obrigatório',
    })
  }

  if (typeof data.discountAmount !== 'number' || !Number.isFinite(data.discountAmount)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['discountAmount'],
      message: 'Valor do desconto é obrigatório',
    })
    return
  }

  if (data.discountType === 'percent' && data.discountAmount > 10000) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['discountAmount'],
      message: 'Percentual máximo é 100,00%',
    })
  }
})

type PaymentGateway = {
  id: number
  name: string
  createdAt?: string
  updatedAt?: string
}

export function NewPaymentIntegrationSheet() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: '',
      paymentGatewayId: 0,
      activeDiscount: false,
      discountType: undefined,
      discountAmount: undefined,
    },
  })

  const activeDiscount = useWatch({ control: form.control, name: 'activeDiscount' })
  const discountType = useWatch({ control: form.control, name: 'discountType' })

  const { data: gateways, isLoading: isLoadingGateways } = useQuery({
    queryKey: ['payment-methods', 'payment-gateways', 'select'],
    queryFn: async () => {
      const response = await privateInstance.get('/tenant/payment-methods/payment-gateways', {
        params: {
          page: 1,
          limit: 100,
          sortBy: 'name',
          orderBy: 'asc',
        }
      })
      const items = response.data?.items
      return Array.isArray(items) ? (items as PaymentGateway[]) : []
    },
    enabled: open,
  })

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const payload = {
        name: values.name,
        paymentGatewayId: values.paymentGatewayId,
        activeDiscount: values.activeDiscount,
        discountType: values.activeDiscount ? values.discountType : undefined,
        discountAmount: values.activeDiscount ? values.discountAmount : undefined,
      }
      const response = await privateInstance.post('/tenant/payment-methods', payload)
      if (response.status !== 200 && response.status !== 201) throw new Error('Erro ao criar método de pagamento')
      return response.data
    },
    onSuccess: () => {
      toast.success('Método de pagamento criado com sucesso!')
      setOpen(false)
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] })
      form.reset()
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao criar método de pagamento', {
        description: errorData?.detail || 'Não foi possível criar o método de pagamento.'
      })
    }
  })

  async function onSubmit(values: z.infer<typeof formSchema>) { await mutateAsync(values) }

  return (
    <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) form.reset(); }}>
      <SheetTrigger asChild>
        <Button variant={'default'} size="sm">
          <Plus className="size-[0.85rem] mr-2" /> Novo método
        </Button>
      </SheetTrigger>
      <SheetContent className='min-w-[500px] sm:w-[540px] overflow-y-auto'>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col h-full'>
            <SheetHeader>
              <SheetTitle>Novo método de pagamento</SheetTitle>
              <SheetDescription>Cadastre um método de pagamento e vincule um gateway.</SheetDescription>
            </SheetHeader>

            <div className="flex-1 grid auto-rows-min gap-6 px-4 py-4 overflow-y-auto">
              <FormField control={form.control as any} name='name' render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder='Ex: Cartão de crédito' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control as any} name='paymentGatewayId' render={({ field }) => (
                <FormItem>
                  <FormLabel>Gateway</FormLabel>
                  <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? String(field.value) : undefined} disabled={isPending || isLoadingGateways}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={isLoadingGateways ? 'Carregando...' : 'Selecione...'} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {gateways?.map((g: any) => (
                        <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField
                control={form.control as any}
                name="activeDiscount"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Ativar desconto</FormLabel>
                      <div className="text-xs text-muted-foreground">
                        Configure um desconto para este método de pagamento.
                      </div>
                    </div>
                    <FormControl>
                      <Switch checked={!!field.value} onCheckedChange={field.onChange} disabled={isPending} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {activeDiscount && (
                <>
                  <FormField
                    control={form.control as any}
                    name="discountType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de desconto</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="percent">Percentual</SelectItem>
                            <SelectItem value="fixed">Fixo</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control as any}
                    name="discountAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor do desconto</FormLabel>
                        <FormControl>
                          {!discountType ? (
                            <Input disabled placeholder="Selecione o tipo primeiro" />
                          ) : discountType === 'percent' ? (
                            <NumericFormat
                              customInput={Input}
                              value={typeof field.value === 'number' ? field.value / 100 : undefined}
                              onValueChange={(v) => {
                                if (v.floatValue === undefined) {
                                  field.onChange(undefined)
                                  return
                                }
                                const next = Math.min(Math.round(v.floatValue * 100), 10000)
                                field.onChange(next)
                              }}
                              isAllowed={(v) => v.floatValue === undefined || v.floatValue <= 100}
                              decimalScale={2}
                              fixedDecimalScale
                              decimalSeparator=","
                              thousandSeparator="."
                              allowNegative={false}
                              suffix="%"
                              placeholder=""
                              inputMode="numeric"
                              disabled={isPending}
                            />
                          ) : (
                            <NumericFormat
                              customInput={Input}
                              value={typeof field.value === 'number' ? field.value / 100 : undefined}
                              onValueChange={(v) => {
                                if (v.floatValue === undefined) {
                                  field.onChange(undefined)
                                  return
                                }
                                field.onChange(Math.round(v.floatValue * 100))
                              }}
                              decimalScale={2}
                              fixedDecimalScale
                              decimalSeparator=","
                              thousandSeparator="."
                              allowNegative={false}
                              prefix="R$ "
                              placeholder="R$ 0,00"
                              inputMode="numeric"
                              disabled={isPending}
                            />
                          )}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </div>

            <div className='mt-auto border-t p-4'>
              <div className='grid grid-cols-2 gap-4'>
                <SheetClose asChild>
                  <Button variant='outline' size="sm" className='w-full'>Cancelar</Button>
                </SheetClose>
                <Button type='submit' disabled={isPending} size="sm" className='w-full'>
                  {isPending ? <Loader className='animate-spin h-4 w-4' /> : 'Cadastrar'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}

export function NewPaymentMethodSheet() {
  return <NewPaymentIntegrationSheet />
}
