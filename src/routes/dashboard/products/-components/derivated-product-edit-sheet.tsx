import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { privateInstance } from '@/lib/auth'
import { Switch } from '@/components/ui/switch'
import { useEffect, useState } from 'react'

const formSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório'),
  active: z.boolean(),
  width: z.coerce.number().min(0).optional(),
  height: z.coerce.number().min(0).optional(),
  weight: z.coerce.number().min(0).optional(),
  length: z.coerce.number().min(0).optional(),
})

type FormValues = z.infer<typeof formSchema>

type DerivatedProduct = {
  id: number
  productId: number
  name?: string
  active?: boolean
  width?: number
  height?: number
  weight?: number
  length?: number
}

interface DerivatedProductEditSheetProps {
  derivation: DerivatedProduct
  trigger?: React.ReactNode
  onSaved?: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function DerivatedProductEditSheet({ 
  derivation, 
  trigger, 
  onSaved,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange
}: DerivatedProductEditSheetProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = (value: boolean) => {
    if (isControlled) {
      controlledOnOpenChange?.(value)
    } else {
      setInternalOpen(value)
    }
  }

  const queryClient = useQueryClient()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: derivation.name || '',
      active: derivation.active ?? true,
      width: derivation.width ? derivation.width / 10 : undefined,
      height: derivation.height ? derivation.height / 10 : undefined,
      weight: derivation.weight ? derivation.weight / 1000 : undefined,
      length: derivation.length ? derivation.length / 10 : undefined,
    }
  })

  // Update form values when derivation prop changes
  useEffect(() => {
    if (open) {
      form.reset({
        name: derivation.name || '',
        active: derivation.active ?? true,
        width: derivation.width ? derivation.width / 10 : undefined,
        height: derivation.height ? derivation.height / 10 : undefined,
        weight: derivation.weight ? derivation.weight / 1000 : undefined,
        length: derivation.length ? derivation.length / 10 : undefined,
      })
    }
  }, [derivation, open, form])

  const { mutate, isPending } = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        ...values,
        width: values.width ? Math.round(values.width * 10) : undefined,
        height: values.height ? Math.round(values.height * 10) : undefined,
        weight: values.weight ? Math.round(values.weight * 1000) : undefined,
        length: values.length ? Math.round(values.length * 10) : undefined,
      }
      const response = await privateInstance.put(`/tenant/derivated-product/${derivation.id}`, payload)
      if (response.status !== 200) throw new Error('Erro ao atualizar derivação')
      return response.data
    },
    onSuccess: () => {
      toast.success('Derivação atualizada com sucesso')
      setOpen(false)
      queryClient.invalidateQueries({ queryKey: ['derivated-products', derivation.productId] })
      onSaved?.()
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao atualizar derivação', {
        description: errorData?.detail || 'Não foi possível salvar as alterações.'
      })
    }
  })

  function onSubmit(values: FormValues) {
    mutate(values)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent className="sm:max-w-[540px] flex flex-col h-full bg-background/95 backdrop-blur-sm">
        <SheetHeader className='flex gap-0 p-4'>
          <SheetTitle>Editar Derivação</SheetTitle>
          <SheetDescription>
            Faça alterações nos dados da derivação do produto.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden p-4">
            <div className="flex-1 overflow-y-auto pr-2">
              <div className="space-y-4">
                <FormField<FormValues, "active">
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted">
                      <div>
                        <FormLabel className="text-base">Status</FormLabel>
                        <FormDescription>
                          Indica se a derivação está ativa ou inativa.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-4">
                  <FormField<FormValues, "name">
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome da variação" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-medium text-sm text-muted-foreground">Dimensões e Peso</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField<FormValues, "weight">
                      name="weight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Peso (kg)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.001" min="0" placeholder="0.000" {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField<FormValues, "width">
                      name="width"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Largura (cm)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField<FormValues, "height">
                      name="height"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Altura (cm)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField<FormValues, "length">
                      name="length"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Comprimento (cm)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-6 border-t mt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar alterações
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
