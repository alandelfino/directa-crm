import { useState } from 'react'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Form, FormField, FormItem, FormLabel, FormMessage, FormControl, FormDescription } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { privateInstance } from '@/lib/auth'
import { toast } from 'sonner'
import { Loader, Plus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Switch } from '@/components/ui/switch'

const formSchema = z.object({
  name: z.string().min(1, { message: 'Nome é obrigatório' }),
  active: z.boolean().default(true),
})

export function NewPriceTableSheet({ className, ...props }: React.ComponentProps<'form'>) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: { name: '', active: true },
  })

  const closeSheet = () => { setOpen(false); form.reset() }

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const response = await privateInstance.post('/tenant/price-tables', values)
      if (response.status !== 200 && response.status !== 201) throw new Error('Erro ao cadastrar tabela de preço')
      return response.data
    },
    onSuccess: () => {
      toast.success('Tabela de preço cadastrada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['price-tables'] })
      closeSheet()
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao cadastrar tabela de preço', {
        description: errorData?.detail || 'Não foi possível cadastrar a tabela de preço.'
      })
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) { await mutateAsync(values) }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant={'default'} size="sm">
          <Plus className="size-[0.85rem]" /> Cadastrar
        </Button>
      </SheetTrigger>
      <SheetContent>
        <Form {...form}>
          <form {...props} onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col h-full'>
            <SheetHeader>
              <SheetTitle>Cadastro de tabela de preço</SheetTitle>
              <SheetDescription>Preencha os campos abaixo para cadastrar.</SheetDescription>
            </SheetHeader>

            <div className='flex-1 grid auto-rows-min gap-6 px-4 py-4'>
              <FormField control={form.control} name='name' render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder='Digite o nome...' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name='active' render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Ativo</FormLabel>
                    <FormDescription>
                      Indica se a tabela de preço está ativa para uso.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )} />
            </div>

            <div className='mt-auto border-t p-4'>
              <div className='grid grid-cols-2 gap-4'>
                <SheetClose asChild>
                  <Button variant='outline' size="sm" className='w-full'>Cancelar</Button>
                </SheetClose>
                <Button type='submit' size="sm" disabled={isPending} className='w-full'>
                  {isPending ? <Loader className='animate-spin size-[0.85rem]' /> : 'Cadastrar'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}