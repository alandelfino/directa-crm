import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { privateInstance } from "@/lib/auth"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { Skeleton } from "@/components/ui/skeleton"
import { NumericFormat, PatternFormat } from 'react-number-format'

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  minPostalCode: z.string().min(8, 'CEP mínimo deve ter 8 dígitos').max(9, 'CEP inválido'),
  maxPostalCode: z.string().min(8, 'CEP máximo deve ter 8 dígitos').max(9, 'CEP inválido'),
  minWeight: z.string().min(1, 'Peso mínimo é obrigatório'),
  maxWeight: z.string().min(1, 'Peso máximo é obrigatório'),
  price: z.string().min(1, 'Preço é obrigatório'),
})

interface EditCarrierIntegrationPostalCodeRangeSheetProps {
  carrierIntegrationId: number
  serviceId: number
  rangeId: number
  onUpdated?: () => void
  onOpenChange: (open: boolean) => void
}

function RangeFormSkeleton() {
    return (
        <div className='flex flex-col h-full'>
            <SheetHeader>
                <SheetTitle>Editar Faixa de CEP</SheetTitle>
                <SheetDescription>
                    Atualize os dados da faixa de CEP.
                </SheetDescription>
            </SheetHeader>

            <div className="flex-1 grid auto-rows-min gap-6 px-4 py-4 overflow-y-auto">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full" />
                </div>
            </div>

            <div className='mt-auto border-t p-4'>
                <div className='grid grid-cols-2 gap-4'>
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                </div>
            </div>
        </div>
    )
}

export function EditCarrierIntegrationPostalCodeRangeSheet({ carrierIntegrationId, serviceId, rangeId, onUpdated, onOpenChange }: EditCarrierIntegrationPostalCodeRangeSheetProps) {
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(true)
  
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

  useEffect(() => {
    async function fetchRange() {
        if (!rangeId) return
        try {
            setLoading(true)
            const response = await privateInstance.get(`/tenant/carriers-integrations/${carrierIntegrationId}/carrier-integration-services/${serviceId}/postal-code-range/${rangeId}`)
            const range = response.data

            if (range) {
                form.reset({
                    name: range.name,
                    minPostalCode: range.minPostalCode,
                    maxPostalCode: range.maxPostalCode,
                    minWeight: String(range.minWeight / 1000),
                    maxWeight: String(range.maxWeight / 1000),
                    price: String(range.price / 100),
                })
            }
        } catch (error) {
            console.error(error)
            toast.error('Erro ao carregar faixa de CEP')
            onOpenChange(false)
        } finally {
            setLoading(false)
        }
    }

    fetchRange()
  }, [carrierIntegrationId, serviceId, rangeId, form, onOpenChange])

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      // Remover formatação de CEP (mantém apenas números)
      const minPostalCode = values.minPostalCode.replace(/\D/g, '')
      const maxPostalCode = values.maxPostalCode.replace(/\D/g, '')

      // Converter peso (string com vírgula para number inteiro em gramas)
      const minWeight = Math.round(parseFloat(values.minWeight) * 1000)
      const maxWeight = Math.round(parseFloat(values.maxWeight) * 1000)

      // Converter preço (string com vírgula para number inteiro em centavos)
      const price = Math.round(parseFloat(values.price) * 100)

      await privateInstance.put(`/tenant/carriers-integrations/${carrierIntegrationId}/carrier-integration-services/${serviceId}/postal-code-range/${rangeId}`, {
        name: values.name,
        minPostalCode,
        maxPostalCode,
        minWeight,
        maxWeight,
        price
      })
    },
    onSuccess: () => {
      toast.success('Faixa de CEP atualizada com sucesso')
      queryClient.invalidateQueries({ queryKey: ['carrier-integration-postal-code-ranges', serviceId] })
      onUpdated?.()
      onOpenChange(false)
    },
    onError: () => {
      toast.error('Erro ao atualizar faixa de CEP')
    }
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutateAsync(values)
  }

  return (
    <Sheet open={true} onOpenChange={onOpenChange}>
      <SheetContent className='min-w-[500px] sm:w-[540px] overflow-y-auto'>
        {loading ? (
            <RangeFormSkeleton />
        ) : (
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col h-full'>
                <SheetHeader>
                <SheetTitle>Editar Faixa de CEP</SheetTitle>
                <SheetDescription>
                    Atualize os dados da faixa de CEP.
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
        )}
      </SheetContent>
    </Sheet>
  )
}
