import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader, Plus } from 'lucide-react'
import { NumericFormat } from 'react-number-format'

import { privateInstance } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

type RuleType =
  | 'total_value_is_greater_than_or_equal'
  | 'products_value_is_greater_than_or_equal'
  | 'shipping_value_is_greater_than_or_equal'

const ruleTypes: Array<{ value: RuleType; label: string }> = [
  { value: 'total_value_is_greater_than_or_equal', label: 'O valor total é maior ou igual a' },
  { value: 'products_value_is_greater_than_or_equal', label: 'O valor dos produtos é maior ou igual a' },
  { value: 'shipping_value_is_greater_than_or_equal', label: 'O frete é maior ou igual a' },
]

const valueSchema = z
  .any()
  .refine((v) => typeof v === 'number' && Number.isFinite(v), { message: 'Valor é obrigatório' })
  .transform((v) => v as number)
  .refine((v) => Number.isInteger(v), { message: 'Valor deve ser um número inteiro' })
  .refine((v) => v >= 0, { message: 'Valor mínimo é 0' })

const schema = z.object({
  type: z.enum(['total_value_is_greater_than_or_equal', 'products_value_is_greater_than_or_equal', 'shipping_value_is_greater_than_or_equal']),
  value: valueSchema,
})

export function CouponRuleCreateSheet({
  cuponId,
  trigger,
  onCreated,
}: {
  cuponId: number
  trigger?: React.ReactNode
  onCreated?: () => void
}) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      type: 'total_value_is_greater_than_or_equal',
      value: undefined,
    },
  })

  useEffect(() => {
    if (!open) form.reset()
  }, [open, form])

  const { isPending, mutate } = useMutation({
    mutationFn: async (values: z.infer<typeof schema>) => {
      const response = await privateInstance.post(`/tenant/cupons/${cuponId}/rules`, values)
      if (response.status !== 200 && response.status !== 201) throw new Error('Erro ao criar regra')
      return response.data
    },
    onSuccess: () => {
      toast.success('Regra criada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['cupon-rules', cuponId] })
      setOpen(false)
      onCreated?.()
    },
    onError: (err: any) => {
      const errorData = err?.response?.data
      toast.error(errorData?.title || 'Erro ao criar regra', {
        description: errorData?.detail || 'Não foi possível criar a regra.',
      })
    },
  })

  const disabled = !Number.isFinite(Number(cuponId)) || Number(cuponId) <= 0

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button size="sm" disabled={disabled}>
            <Plus className="size-[0.85rem]" /> Nova regra
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="flex flex-col overflow-hidden">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((values) => mutate(values))} className="flex flex-col h-full">
            <SheetHeader>
              <SheetTitle>Nova regra</SheetTitle>
              <SheetDescription>Configure uma nova regra para o cupom.</SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto grid auto-rows-min gap-6 px-4 py-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={disabled || isPending}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ruleTypes.map((t) => (
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
                        disabled={disabled || isPending}
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
                  <Button type="button" variant="outline" size="sm" className="w-full" disabled={isPending}>
                    Cancelar
                  </Button>
                </SheetClose>
                <Button type="submit" size="sm" className="w-full" disabled={disabled || isPending}>
                  {isPending ? <Loader className="animate-spin size-[0.85rem]" /> : 'Criar'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}

