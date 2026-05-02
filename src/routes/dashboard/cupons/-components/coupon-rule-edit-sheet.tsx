import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader, Edit } from 'lucide-react'
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

export type CouponRule = {
  id: number
  cuponId: number
  type: RuleType | string
  value: number
  createdAt: string
  updatedAt: string
}

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

export function CouponRuleEditSheet({
  cuponId,
  rule,
  disabled,
  onSaved,
}: {
  cuponId: number
  rule: CouponRule | null
  disabled: boolean
  onSaved?: () => void
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
    if (!open) return
    if (!rule) return
    const normalizedType = (ruleTypes.some((t) => t.value === rule.type) ? rule.type : 'total_value_is_greater_than_or_equal') as RuleType
    const normalizedValue = Number(rule.value ?? 0)
    form.reset({
      type: normalizedType,
      value: normalizedValue,
    })
  }, [open, rule, form])

  useEffect(() => {
    if (open && !rule) setOpen(false)
  }, [open, rule])

  const { isPending, mutate } = useMutation({
    mutationFn: async (values: z.infer<typeof schema>) => {
      if (!rule) throw new Error('Regra inválida')
      const response = await privateInstance.put(`/tenant/cupons/${cuponId}/rules/${rule.id}`, values)
      if (response.status !== 200) throw new Error('Erro ao atualizar regra')
      return response.data
    },
    onSuccess: () => {
      toast.success('Regra atualizada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['cupon-rules', cuponId] })
      setOpen(false)
      onSaved?.()
    },
    onError: (err: any) => {
      const errorData = err?.response?.data
      toast.error(errorData?.title || 'Erro ao atualizar regra', {
        description: errorData?.detail || 'Não foi possível atualizar a regra.',
      })
    },
  })

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!rule && next) return
        setOpen(next)
      }}
    >
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled || !rule}>
          <Edit className="size-[0.85rem]" /> Editar
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col overflow-hidden">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((values) => mutate(values))} className="flex flex-col h-full">
            <SheetHeader>
              <SheetTitle>Editar regra</SheetTitle>
              <SheetDescription>Atualize a regra selecionada.</SheetDescription>
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
                  {isPending ? <Loader className="animate-spin size-[0.85rem]" /> : 'Salvar'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}

