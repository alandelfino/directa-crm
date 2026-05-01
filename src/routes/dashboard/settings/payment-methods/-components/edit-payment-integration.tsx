import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { privateInstance } from '@/lib/auth'
import { toast } from 'sonner'
import { Loader } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const formSchema = z.object({
  name: z.string().min(1, { message: 'Nome é obrigatório' }),
  paymentGatewayId: z.coerce.number().min(1, { message: 'Gateway é obrigatório' }),
})

type PaymentGateway = {
  id: number
  name: string
  createdAt?: string
  updatedAt?: string
}

type PaymentIntegration = {
  id: number
  name: string
  paymentGateway: { id: number, name: string }
  createdAt: string
  updatedAt: string
}

export function EditPaymentIntegrationSheet({ id, onOpenChange }: { id: number, onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(true)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: '',
      paymentGatewayId: 0,
    },
  })

  const { data: gateways, isLoading: isLoadingGateways } = useQuery({
    queryKey: ['payment-gateways-list-select'],
    queryFn: async () => {
      const response = await privateInstance.get('/tenant/payment-integrations/payment-gateways', {
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
    enabled: true,
  })

  const { data: integration, isLoading } = useQuery({
    queryKey: ['payment-integration', id],
    queryFn: async () => {
      const response = await privateInstance.get(`/tenant/payment-integrations/${id}`)
      return response.data as PaymentIntegration
    },
    enabled: !!id,
  })

  useEffect(() => {
    if (!integration) return
    form.reset({
      name: integration.name,
      paymentGatewayId: integration.paymentGateway?.id ?? 0,
    })
    setLoading(false)
  }, [integration, form])

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const response = await privateInstance.put(`/tenant/payment-integrations/${id}`, values)
      if (response.status !== 200 && response.status !== 201) throw new Error('Erro ao atualizar integração')
      return response.data
    },
    onSuccess: () => {
      toast.success('Integração atualizada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['payment-integrations'] })
      onOpenChange(false)
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao atualizar integração', {
        description: errorData?.detail || 'Não foi possível atualizar a integração.'
      })
    }
  })

  async function onSubmit(values: z.infer<typeof formSchema>) { await mutateAsync(values) }

  return (
    <Sheet open={true} onOpenChange={onOpenChange}>
      <SheetContent className='min-w-[500px] sm:w-[540px] overflow-y-auto'>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col h-full'>
            <SheetHeader>
              <SheetTitle>Editar integração</SheetTitle>
              <SheetDescription>Atualize os dados da integração de pagamento.</SheetDescription>
            </SheetHeader>

            {isLoading || loading ? (
              <div className="flex justify-center items-center h-40">
                <Loader className="animate-spin size-6" />
              </div>
            ) : (
              <>
                <div className="flex-1 grid auto-rows-min gap-6 px-4 py-4 overflow-y-auto">
                  <FormField control={form.control as any} name='name' render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input placeholder='Ex: Gateway principal' {...field} />
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
