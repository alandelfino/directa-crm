import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { privateInstance } from "@/lib/auth"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { Skeleton } from "@/components/ui/skeleton"

function CarrierIntegrationFormSkeleton() {
    return (
        <div className='flex flex-col h-full'>
            <SheetHeader>
                <SheetTitle>Editar Integração</SheetTitle>
                <SheetDescription>
                    Atualize os dados da integração com transportadora.
                </SheetDescription>
            </SheetHeader>

            <div className="flex-1 grid auto-rows-min gap-6 px-4 py-4 overflow-y-auto">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-10" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
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

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  carrierId: z.string().min(1, 'Transportadora é obrigatória'),
})

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
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    async function fetchIntegration() {
        if (!id) return
        try {
            setLoading(true)
            const response = await privateInstance.get(`/tenant/carriers-integrations/${id}`)
            const integration = response.data as CarrierIntegration

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
        } catch (error) {
            console.error(error)
            toast.error('Erro ao carregar integração')
            onOpenChange(false)
        } finally {
            setLoading(false)
        }
    }

    fetchIntegration()
  }, [id, form, onOpenChange])

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
        {loading ? (
            <CarrierIntegrationFormSkeleton />
        ) : (
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col h-full'>
                <SheetHeader>
                <SheetTitle>Editar Integração</SheetTitle>
                <SheetDescription>
                    Atualize os dados da integração com transportadora.
                </SheetDescription>
                </SheetHeader>

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
                            defaultValue={field.value}
                            disabled={isPending}
                            >
                            <FormControl>
                                <SelectTrigger className="w-full">
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
            </form>
            </Form>
        )}
      </SheetContent>
    </Sheet>
  )
}
