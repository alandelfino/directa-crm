import { forwardRef, useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader, Plus, RefreshCw } from 'lucide-react'
import { NumericFormat } from 'react-number-format'

import { privateInstance } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'

const couponTypeValues = [
  'fixed_in_total_value',
  'percent_in_total_value',
  'fixed_in_product_value',
  'percent_in_product_value',
  'fixed_in_shipping_value',
  'percent_in_shipping_value',
] as const

const couponTypes: Array<{ value: (typeof couponTypeValues)[number]; label: string }> = [
  { value: 'fixed_in_total_value', label: 'Fixo no total do pedido' },
  { value: 'percent_in_total_value', label: 'Percentual no total do pedido' },
  { value: 'fixed_in_product_value', label: 'Fixo no valor dos produtos' },
  { value: 'percent_in_product_value', label: 'Percentual no valor dos produtos' },
  { value: 'fixed_in_shipping_value', label: 'Fixo no valor do frete' },
  { value: 'percent_in_shipping_value', label: 'Percentual no valor do frete' },
]

const valueSchema = z
  .any()
  .refine((v) => typeof v === 'number' && Number.isFinite(v), { message: 'Valor é obrigatório' })
  .transform((v) => v as number)
  .refine((v) => Number.isInteger(v), { message: 'Valor deve ser um número inteiro' })
  .refine((v) => v >= 0, { message: 'Valor mínimo é 0' })

const formSchema = z.object({
  code: z.string().min(1, { message: 'Código é obrigatório' }),
  customerMessage: z.string().optional(),
  description: z.string().min(1, { message: 'Descrição é obrigatória' }),
  type: z.enum(couponTypeValues).default('fixed_in_total_value'),
  value: valueSchema,
  storeId: z.coerce.number().int().min(1, { message: 'Loja é obrigatória' }),
}).superRefine((data, ctx) => {
  if (String(data.type).startsWith('percent_')) {
    if (typeof data.value === 'number' && Number.isFinite(data.value) && data.value > 10000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['value'],
        message: 'Percentual máximo é 100,00%',
      })
    }
  }
})

type NewCouponSheetProps = React.ComponentProps<'form'> & {
  trigger?: React.ReactNode
}

type Store = { id: number; name: string }

const COUPON_CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

function generateCouponCode(): string {
  const pick = () => COUPON_CODE_CHARS[Math.floor(Math.random() * COUPON_CODE_CHARS.length)]!
  const a = pick()
  const b = pick()
  const c = pick()
  const d = pick()
  const e = pick()
  const f = pick()
  return `${a}${b}${c}-${d}${e}${f}`
}

const CouponCodeInput = forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange'> & {
    value: string
    onChange: (next: string) => void
    onGenerate: () => void
    generating?: boolean
  }
>(({ value, onChange, onGenerate, generating, disabled, ...props }, ref) => {
  return (
    <div className="flex gap-2">
      <Input ref={ref} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} {...props} />
      <Button type="button" variant="outline" size="icon" onClick={onGenerate} disabled={disabled || generating} title="Gerar código">
        <RefreshCw className={generating ? 'size-[0.85rem] animate-spin' : 'size-[0.85rem]'} />
      </Button>
    </div>
  )
})

CouponCodeInput.displayName = 'CouponCodeInput'

export function NewCouponSheet({ className, trigger, ...props }: NewCouponSheetProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const usedCodesRef = useRef(new Set<string>())

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      code: '',
      customerMessage: '',
      description: '',
      type: 'fixed_in_total_value',
      value: undefined,
      storeId: 0,
    },
  })

  const type = useWatch({ control: form.control, name: 'type' })
  const isPercentType = (t: unknown) => String(t ?? '').startsWith('percent_')

  useEffect(() => {
    if (!open) return
    const raw = form.getValues('value')
    const current = typeof raw === 'number' && Number.isFinite(raw) ? raw : 0
    if (isPercentType(type)) {
      form.setValue('value', Math.min(current, 10000), { shouldDirty: true, shouldValidate: true })
    }
  }, [open, type, form])

  const { data: stores, isLoading: isLoadingStores } = useQuery({
    queryKey: ['stores-list-select'],
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await privateInstance.get('/tenant/stores', {
        params: { page: 1, limit: 100, sortBy: 'name', orderBy: 'asc' },
      })
      const items = response.data?.items ?? response.data
      return Array.isArray(items) ? (items as Store[]) : []
    },
    enabled: open,
  })

  const closeSheet = () => {
    setOpen(false)
    form.reset()
  }

  const { isPending, mutate } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      return privateInstance.post('/tenant/cupons', values)
    },
    onSuccess: (response) => {
      if (response.status === 200 || response.status === 201) {
        toast.success('Cupom cadastrado com sucesso!')
        closeSheet()
        queryClient.invalidateQueries({ queryKey: ['cupons'] })
      } else {
        const errorData = response.data as any
        toast.error(errorData?.title || 'Erro ao cadastrar cupom', {
          description: errorData?.detail || 'Não foi possível cadastrar o cupom.',
        })
      }
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao cadastrar cupom', {
        description: errorData?.detail || 'Não foi possível cadastrar o cupom.',
      })
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutate(values)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button size="sm" className={className}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Cupom
          </Button>
        )}
      </SheetTrigger>
      <SheetContent>
        <Form {...form}>
          <form {...props} onSubmit={(e) => { e.stopPropagation(); form.handleSubmit(onSubmit)(e) }} className="flex flex-col h-full">
            <SheetHeader>
              <SheetTitle>Cadastro de cupom</SheetTitle>
              <SheetDescription>Preencha os campos abaixo para cadastrar.</SheetDescription>
            </SheetHeader>

            <div className="flex-1 grid auto-rows-min gap-6 px-4 py-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <CouponCodeInput
                        placeholder="Ex.: ABC-123"
                        value={field.value}
                        onChange={field.onChange}
                        onGenerate={() => {
                          const current = String(form.getValues('code') ?? '').trim()
                          for (let i = 0; i < 25; i++) {
                            const next = generateCouponCode()
                            if (next !== current && !usedCodesRef.current.has(next)) {
                              usedCodesRef.current.add(next)
                              form.setValue('code', next, { shouldDirty: true, shouldValidate: true })
                              return
                            }
                          }
                          const fallback = generateCouponCode()
                          usedCodesRef.current.add(fallback)
                          form.setValue('code', fallback, { shouldDirty: true, shouldValidate: true })
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mensagem para o cliente</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex.: Obrigado por comprar com a gente!" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Input placeholder="Descreva como o cupom funciona..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {couponTypes.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor</FormLabel>
                    <FormControl>
                      {isPercentType(type) ? (
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

              <FormField
                control={form.control}
                name="storeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loja</FormLabel>
                    {isLoadingStores ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? String(field.value) : undefined}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(stores ?? []).map((store) => (
                            <SelectItem key={store.id} value={String(store.id)}>
                              {store.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="mt-auto border-t p-4">
              <div className="grid grid-cols-2 gap-4">
                <SheetClose asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    Cancelar
                  </Button>
                </SheetClose>
                <Button type="submit" size="sm" disabled={isPending} className="w-full">
                  {isPending ? <Loader className="animate-spin size-[0.85rem]" /> : 'Cadastrar'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
