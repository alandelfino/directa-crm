import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { privateInstance } from "@/lib/auth"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader } from "lucide-react"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  carrierId: z.string().min(1, 'Transportadora é obrigatória'),
})

type Carrier = {
  id: number
  name: string
  code: string
}

type CarrierIntegration = {
  id: number
  name: string
  carrierId: number
}

interface EditCarrierIntegrationSheetProps {
  id: number
  onOpenChange: (open: boolean) => void
}

export function EditCarrierIntegrationSheet({ id, onOpenChange }: EditCarrierIntegrationSheetProps) {
  const queryClient = useQueryClient()
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: '',
      carrierId: '',
    },
  })

  const { data: carriers } = useQuery({
    queryKey: ['carriers-list'],
    queryFn: async () => {
      const response = await privateInstance.get('/tenant/carriers?limit=100')
      // Ensure we always return an array
      const items = response.data.items || response.data
      return Array.isArray(items) ? items : []
    }
  })

  const { data: integration, isLoading } = useQuery({
    queryKey: ['carrier-integration', id],
    queryFn: async () => {
      const response = await privateInstance.get(`/tenant/carriers-integrations/${id}`)
      return response.data as CarrierIntegration
    },
    enabled: !!id
  })

  useEffect(() => {
    if (integration) {
      // Prioritize nested carrier.id, fallback to carrierId
      const carrierId = (integration as any).carrier?.id || integration.carrierId
      
      // Ensure we have a string value, default to empty string if undefined/null/0
      const formattedCarrierId = carrierId ? String(carrierId) : ''

      form.reset({
        name: integration.name,
        carrierId: formattedCarrierId,
      })
    }
  }, [integration, form])

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      await privateInstance.put(`/tenant/carriers-integrations/${id}`, {
        ...values,
        carrierId: Number(values.carrierId)
      })
    },
    onSuccess: () => {
      toast.success('Integração atualizada com sucesso')
      queryClient.invalidateQueries({ queryKey: ['carrier-integrations'] })
      onOpenChange(false)
    },
    onError: () => {
      toast.error('Erro ao atualizar integração')
    }
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutateAsync(values)
  }

  return (
    <Sheet open={true} onOpenChange={onOpenChange}>
      <SheetContent className='min-w-[500px] sm:w-[540px] overflow-y-auto'>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col h-full'>
            <SheetHeader>
              <SheetTitle>Editar Integração</SheetTitle>
              <SheetDescription>
                Atualize os dados da integração com transportadora.
              </SheetDescription>
            </SheetHeader>

            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <Loader className="animate-spin size-6" />
              </div>
            ) : (
                <>
                <div className="flex-1 grid auto-rows-min gap-6 px-4 py-4 overflow-y-auto">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nome</FormLabel>
                            <FormControl>
                            <Input placeholder="Ex: Correios SEDEX" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="carrierId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Transportadora</FormLabel>
                            <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                            disabled={isPending}
                            >
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Selecione uma transportadora" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {carriers?.map((carrier) => (
                                <SelectItem key={carrier.id} value={String(carrier.id)}>
                                    {carrier.name}
                                </SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
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
                </>
            )}
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
