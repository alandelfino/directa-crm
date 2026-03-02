import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader, Plus } from "lucide-react"
import { useForm } from "react-hook-form"
import { useState } from "react"
import { z } from "zod"
import { toast } from "sonner"
import { privateInstance } from "@/lib/auth"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

const formSchema = z.object({
  customerId: z.coerce.number().min(1, { message: "Cliente é obrigatório" }),
  storeId: z.coerce.number().min(1, { message: "Loja é obrigatória" }),
})

export function NewCartSheet({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      customerId: 0,
      storeId: 0,
    },
  })

  // Fetch Customers
  const { data: customers, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['customers-list-select'],
    queryFn: async () => {
        const response = await privateInstance.get('/tenant/customers?limit=100')
        return response.data.items || []
    },
    enabled: open,
    staleTime: 1000 * 60 * 5, 
  })

  // Fetch Stores
  const { data: stores, isLoading: isLoadingStores } = useQuery({
    queryKey: ['stores-list-select'],
    queryFn: async () => {
        const response = await privateInstance.get('/tenant/stores?limit=100')
        return response.data.items || []
    },
    enabled: open,
    staleTime: 1000 * 60 * 5,
  })

  const { isPending, mutate } = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) => privateInstance.post('/tenant/carts', values),
    onSuccess: (response) => {
      if (response.status === 200 || response.status === 201) {
        toast.success('Carrinho criado com sucesso!')
        onCreated?.()
        form.reset()
        setOpen(false)
        queryClient.invalidateQueries({ queryKey: ['carts'] })
      } else {
        const errorData = (response.data as any)
        toast.error(errorData?.title || 'Erro ao criar carrinho', {
          description: errorData?.detail || 'Não foi possível criar o carrinho.'
        })
      }
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao criar carrinho', {
        description: errorData?.detail || 'Não foi possível criar o carrinho.'
      })
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutate(values)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size={'sm'}>
          <Plus className="size-[0.85rem]" /> Novo Carrinho
        </Button>
      </SheetTrigger>
      <SheetContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col h-full'>
            <SheetHeader>
              <SheetTitle>Novo Carrinho</SheetTitle>
              <SheetDescription>Selecione o cliente e a loja para iniciar um novo carrinho.</SheetDescription>
            </SheetHeader>

            <div className='flex-1 grid auto-rows-min gap-6 px-4 py-4'>
              <FormField
                control={form.control}
                name='customerId'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    {isLoadingCustomers ? (
                        <Skeleton className="h-10 w-full" />
                    ) : (
                        <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? String(field.value) : undefined}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione um cliente" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {customers?.map((customer: any) => (
                                    <SelectItem key={customer.id} value={String(customer.id)}>
                                        {customer.nameOrTradeName || customer.lastNameOrCompanyName || `Cliente #${customer.id}`}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='storeId'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loja</FormLabel>
                    {isLoadingStores ? (
                        <Skeleton className="h-10 w-full" />
                    ) : (
                        <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? String(field.value) : undefined}>
                            <FormControl>
                                <SelectTrigger>
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
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='mt-auto border-t p-4'>
              <div className="grid grid-cols-2 gap-4">
                <SheetClose asChild>
                  <Button variant='outline' size="sm" className='w-full'>Cancelar</Button>
                </SheetClose>
                <Button type='submit' size="sm" disabled={isPending} className='w-full'>
                  {isPending ? <Loader className='animate-spin size-[0.85rem]' /> : 'Criar'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
