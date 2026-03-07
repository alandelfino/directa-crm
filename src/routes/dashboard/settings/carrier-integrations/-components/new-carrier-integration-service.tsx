import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { privateInstance } from "@/lib/auth"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader, Plus } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  carrierServiceId: z.string().min(1, 'Serviço da transportadora é obrigatório'),
  storeId: z.string().min(1, 'Loja é obrigatória'),
  active: z.boolean().default(true),
})

interface NewCarrierIntegrationServiceSheetProps {
  carrierIntegrationId: number
  onCreated?: () => void
}

export function NewCarrierIntegrationServiceSheet({ carrierIntegrationId, onCreated }: NewCarrierIntegrationServiceSheetProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: '',
      carrierServiceId: '',
      storeId: '',
      active: true,
    },
  })

  // Carregar lojas
  const { data: stores, isLoading: isLoadingStores } = useQuery({
    queryKey: ['stores-list'],
    queryFn: async () => {
      const response = await privateInstance.get('/tenant/stores?limit=100')
      const items = response.data.items || response.data
      return Array.isArray(items) ? items : []
    },
    enabled: open
  })

  // Carregar serviços da transportadora (precisamos saber qual é a transportadora da integração primeiro)
  // Para simplificar, vamos assumir que o usuário deve selecionar o serviço de uma lista filtrada se possível
  // Mas como a API pede carrierServiceId, precisamos listar os serviços disponíveis para a transportadora desta integração
  // Primeiro, precisamos obter a integração para saber qual é a transportadora
  const { data: integration } = useQuery({
    queryKey: ['carrier-integration', carrierIntegrationId],
    queryFn: async () => {
        const response = await privateInstance.get(`/tenant/carriers-integrations/${carrierIntegrationId}`)
        return response.data
    },
    enabled: open
  })

  const carrierId = (integration as any)?.carrier?.id || (integration as any)?.carrierId

  const { data: carrierServices, isLoading: isLoadingServices } = useQuery({
    queryKey: ['carrier-services', carrierId],
    queryFn: async () => {
      const response = await privateInstance.get(`/tenant/carriers/${carrierId}/carrier-services`)
      const items = response.data.items || response.data
      return Array.isArray(items) ? items : []
    },
    enabled: open && !!carrierId
  })

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      await privateInstance.post(`/tenant/carriers-integrations/${carrierIntegrationId}/carrier-integration-services`, {
        ...values,
        carrierServiceId: Number(values.carrierServiceId),
        storeId: Number(values.storeId)
      })
    },
    onSuccess: () => {
      toast.success('Serviço criado com sucesso')
      queryClient.invalidateQueries({ queryKey: ['carrier-integration-services', carrierIntegrationId] })
      form.reset()
      setOpen(false)
      onCreated?.()
    },
    onError: () => {
      toast.error('Erro ao criar serviço')
    }
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutateAsync(values)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size={'sm'}>
          <Plus className="size-[0.85rem] mr-2" /> Novo Serviço
        </Button>
      </SheetTrigger>
      <SheetContent className='min-w-[500px] sm:w-[540px] overflow-y-auto'>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col h-full'>
            <SheetHeader>
              <SheetTitle>Novo Serviço</SheetTitle>
              <SheetDescription>
                Adicione um novo serviço a esta integração.
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 grid auto-rows-min gap-6 px-4 py-4 overflow-y-auto">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nome Personalizado</FormLabel>
                        <FormControl>
                        <Input placeholder="Ex: Entrega Expressa" {...field} />
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
                        <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={isPending || isLoadingStores}
                        >
                        <FormControl>
                            <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione uma loja" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {stores?.map((store: any) => (
                            <SelectItem key={store.id} value={String(store.id)}>
                                {store.name}
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
                    name="carrierServiceId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Serviço da Transportadora</FormLabel>
                        <Select 
                        onValueChange={(val) => {
                            field.onChange(val)
                            // Auto-fill name if empty
                            const service = carrierServices?.find((s: any) => String(s.id) === val)
                            if (service && !form.getValues('name')) {
                                form.setValue('name', service.name)
                            }
                        }}
                        value={field.value}
                        disabled={isPending || isLoadingServices || !carrierId}
                        >
                        <FormControl>
                            <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione um serviço" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {carrierServices?.map((service: any) => (
                            <SelectItem key={service.id} value={String(service.id)}>
                                {service.name} ({service.code})
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
                  name="active"
                  render={({ field }) => (
                    <FormItem>
                      <div className='flex border items-center justify-between gap-3 bg-neutral-50 dark:bg-neutral-900 px-3 py-2.5 rounded-md'>
                        <div className='flex flex-col gap-0.5'>
                          <FormLabel>Ativo</FormLabel>
                          <p className='leading-snug text-xs text-muted-foreground'>Quando habilitado, o serviço aparece ativo.</p>
                          <FormMessage />
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isPending} />
                        </FormControl>
                      </div>
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
