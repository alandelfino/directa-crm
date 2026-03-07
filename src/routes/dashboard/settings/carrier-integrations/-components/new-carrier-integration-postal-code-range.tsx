import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { privateInstance } from "@/lib/auth"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader, Plus } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { NumericFormat, PatternFormat } from 'react-number-format'

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  minPostalCode: z.string().min(8, 'CEP mínimo deve ter 8 dígitos').max(9, 'CEP inválido'),
  maxPostalCode: z.string().min(8, 'CEP máximo deve ter 8 dígitos').max(9, 'CEP inválido'),
  minWeight: z.string().min(1, 'Peso mínimo é obrigatório'),
  maxWeight: z.string().min(1, 'Peso máximo é obrigatório'),
  price: z.string().min(1, 'Preço é obrigatório'),
})

interface NewCarrierIntegrationPostalCodeRangeSheetProps {
  carrierIntegrationId: number
  serviceId: number
  onCreated?: () => void
}

export function NewCarrierIntegrationPostalCodeRangeSheet({ carrierIntegrationId, serviceId, onCreated }: NewCarrierIntegrationPostalCodeRangeSheetProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: '',
      minPostalCode: '',
      maxPostalCode: '',
      minWeight: '',
      maxWeight: '',
      price: '',
    },
  })

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      // Remover formatação de CEP (mantém apenas números)
      const minPostalCode = values.minPostalCode.replace(/\D/g, '')
      const maxPostalCode = values.maxPostalCode.replace(/\D/g, '')

      // Converter peso (string com vírgula para number inteiro em gramas)
      // Ex: "1.500" -> 1.5 -> 1500
      const minWeight = Math.round(parseFloat(values.minWeight) * 1000)
      const maxWeight = Math.round(parseFloat(values.maxWeight) * 1000)

      // Converter preço (string com vírgula para number inteiro em centavos)
      // Ex: "32.50" -> 32.50 -> 3250
      const price = Math.round(parseFloat(values.price) * 100)

      await privateInstance.post(`/tenant/carriers-integrations/${carrierIntegrationId}/carrier-integration-services/${serviceId}/postal-code-ranges`, {
        name: values.name,
        minPostalCode,
        maxPostalCode,
        minWeight,
        maxWeight,
        price
      })
    },
    onSuccess: () => {
      toast.success('Faixa de CEP criada com sucesso')
      queryClient.invalidateQueries({ queryKey: ['carrier-integration-postal-code-ranges', serviceId] })
      form.reset()
      setOpen(false)
      onCreated?.()
    },
    onError: () => {
      toast.error('Erro ao criar faixa de CEP')
    }
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutateAsync(values)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size={'sm'}>
          <Plus className="size-[0.85rem] mr-2" /> Nova Faixa
        </Button>
      </SheetTrigger>
      <SheetContent className='min-w-[500px] sm:w-[540px] overflow-y-auto'>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col h-full'>
            <SheetHeader>
              <SheetTitle>Nova Faixa de CEP</SheetTitle>
              <SheetDescription>
                Adicione uma nova faixa de CEP para este serviço.
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 grid auto-rows-min gap-6 px-4 py-4 overflow-y-auto">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nome da Faixa</FormLabel>
                        <FormControl>
                        <Input placeholder="Ex: Capital SP" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="minPostalCode"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>CEP Mínimo</FormLabel>
                            <FormControl>
                                <PatternFormat
                                    format="#####-###"
                                    customInput={Input}
                                    placeholder="00000-000"
                                    value={field.value}
                                    onValueChange={(values) => {
                                        field.onChange(values.value)
                                    }}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="maxPostalCode"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>CEP Máximo</FormLabel>
                            <FormControl>
                                <PatternFormat
                                    format="#####-###"
                                    customInput={Input}
                                    placeholder="00000-000"
                                    value={field.value}
                                    onValueChange={(values) => {
                                        field.onChange(values.value)
                                    }}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="minWeight"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Peso Mínimo (kg)</FormLabel>
                            <FormControl>
                                <NumericFormat
                                    customInput={Input}
                                    placeholder="0,000"
                                    decimalSeparator=","
                                    thousandSeparator="."
                                    decimalScale={3}
                                    fixedDecimalScale
                                    value={field.value}
                                    onValueChange={(values) => {
                                        field.onChange(values.value)
                                    }}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="maxWeight"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Peso Máximo (kg)</FormLabel>
                            <FormControl>
                                <NumericFormat
                                    customInput={Input}
                                    placeholder="0,000"
                                    decimalSeparator=","
                                    thousandSeparator="."
                                    decimalScale={3}
                                    fixedDecimalScale
                                    value={field.value}
                                    onValueChange={(values) => {
                                        field.onChange(values.value)
                                    }}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Preço (R$)</FormLabel>
                        <FormControl>
                            <NumericFormat
                                customInput={Input}
                                placeholder="0,00"
                                decimalSeparator=","
                                thousandSeparator="."
                                decimalScale={2}
                                fixedDecimalScale
                                prefix="R$ "
                                value={field.value}
                                onValueChange={(values) => {
                                    field.onChange(values.value)
                                }}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>

            <div className='mt-auto border-t p-4'>
                <div className='grid grid-cols-2 gap-4'>
                    <SheetClose asChild>
                    <Button variant='outline' size="sm" className='w-full'>Cancelar</Button>
                    </SheetClose>
                    <Button type='submit' disabled={isPending} size="sm" className='w-full'>
                    {isPending ? <Loader className='animate-spin h-4 w-4' /> : 'Salvar'}
                    </Button>
                </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
