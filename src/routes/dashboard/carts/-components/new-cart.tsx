import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader, Plus, Info } from "lucide-react"
import { useForm } from "react-hook-form"
import { useState } from "react"
import { z } from "zod"
import { toast } from "sonner"
import { privateInstance } from "@/lib/auth"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const formSchema = z.object({
  customerId: z.coerce.number().min(1, { message: "Cliente é obrigatório" }),
})

export function NewCartSheet({ onCreated, onOpenChange }: { onCreated?: (id: number) => void, onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    onOpenChange?.(newOpen)
    if (!newOpen && onCreated) {
        // Se fechar sem criar, talvez queiramos dar refresh? 
        // Mas o onCreated é chamado apenas no sucesso da criação.
        // O refetch da lista pai já é chamado no onCreated.
        // Se quisermos refetch ao fechar mesmo sem criar (ex: cancelou), precisaríamos de outra prop.
        // Por enquanto, mantemos o comportamento atual focado em onCreated.
    }
  }

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      customerId: 0,
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

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      // 1. Create Cart
      const cartResponse = await privateInstance.post('/tenant/carts', values)
      return cartResponse.data
    },
    onSuccess: (data) => {
      toast.success('Carrinho criado com sucesso!')
      onCreated?.(data.id)
      form.reset()
      setOpen(false)
      queryClient.invalidateQueries({ queryKey: ['carts'] })
      queryClient.invalidateQueries({ queryKey: ['carts-mini'] })
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao criar carrinho', {
        description: errorData?.detail || 'Não foi possível criar o carrinho.'
      })
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutateAsync(values)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button size={'sm'}>
          <Plus className="size-[0.85rem]" /> Novo Carrinho
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-md w-full flex flex-col h-full p-0 gap-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col h-full'>
            <div className="p-6 border-b bg-background z-10">
              <SheetHeader className="gap-0 p-0">
                <SheetTitle>Novo Carrinho</SheetTitle>
                <SheetDescription>Inicie um novo atendimento selecionando o cliente e a loja.</SheetDescription>
              </SheetHeader>
            </div>

            <div className='flex-1 overflow-y-auto'>
              <div className="p-6 space-y-6">
                {/* Dados Iniciais */}
                <div className="space-y-4">
                  
                  <FormField
                    control={form.control}
                    name='customerId'
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel className="text-xs">Cliente</FormLabel>
                        {isLoadingCustomers ? (
                            <Skeleton className="h-9 w-full" />
                        ) : (
                            <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? String(field.value) : undefined}>
                                <FormControl>
                                    <SelectTrigger className="h-9 w-full">
                                        <SelectValue placeholder="Selecione..." />
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
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Adicionar Produtos</AlertTitle>
                  <AlertDescription>
                    Para adicionar produtos ao carrinho, salve este formulário primeiro. Você será redirecionado automaticamente para a tela de edição do carrinho.
                  </AlertDescription>
                </Alert>
              </div>
            </div>

            <div className='border-t p-4 bg-background z-10'>
              <div className="grid grid-cols-2 gap-4">
                <SheetClose asChild>
                  <Button variant='outline' size="default" className='w-full'>Cancelar</Button>
                </SheetClose>
                <Button type='submit' size="default" disabled={isPending} className='w-full'>
                  {isPending ? <Loader className='animate-spin mr-2 size-4' /> : null} 
                  {isPending ? 'Salvando...' : 'Salvar e Continuar'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
