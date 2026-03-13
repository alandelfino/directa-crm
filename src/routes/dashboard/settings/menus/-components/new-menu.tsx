import { useState } from 'react'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { privateInstance } from '@/lib/auth'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader, Plus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

const formSchema = z.object({
  name: z.string().min(1, { message: 'Nome do menu é obrigatório' }),
  storeId: z.coerce.number().min(1, { message: 'Loja é obrigatória' }),
})

export function NewStoreMenuSheet({ storeId, onCreated }: { storeId?: number, onCreated?: () => void }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const initialStoreId = Number.isFinite(storeId) && (storeId ?? 0) > 0 ? Number(storeId) : 0

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: '',
      storeId: initialStoreId,
    },
  })

  const { data: stores } = useQuery({
    queryKey: ['stores-list-select'],
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await privateInstance.get('/tenant/stores', { params: { page: 1, limit: 100, sortBy: 'name', orderBy: 'asc' } })
      const items = response.data?.items ?? response.data
      return Array.isArray(items) ? items : []
    },
    enabled: open,
  })

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const response = await privateInstance.post('/tenant/store-menus', values)
      if (response.status !== 200 && response.status !== 201) throw new Error('Erro ao criar menu')
      return response.data
    },
    onSuccess: () => {
      toast.success('Menu criado com sucesso!')
      setOpen(false)
      onCreated?.()
      queryClient.invalidateQueries({ queryKey: ['store-menus'] })
      form.reset({ name: '', storeId: initialStoreId })
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao criar menu', {
        description: errorData?.detail || 'Não foi possível criar o menu.',
      })
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await mutateAsync(values)
  }

  return (
    <Sheet open={open} onOpenChange={(v) => {
      setOpen(v)
      if (!v) form.reset({ name: '', storeId: initialStoreId })
      if (v && initialStoreId > 0) form.setValue('storeId', initialStoreId)
    }}>
      <SheetTrigger asChild>
        <Button variant={'default'}>
          <Plus className="mr-2 h-4 w-4" /> Novo menu
        </Button>
      </SheetTrigger>
      <SheetContent className='min-w-[500px] sm:w-[540px] overflow-y-auto'>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col h-full'>
            <SheetHeader>
              <SheetTitle>Novo menu</SheetTitle>
              <SheetDescription>Cadastre um novo menu para a loja.</SheetDescription>
            </SheetHeader>

            <div className="flex-1 grid auto-rows-min gap-6 px-4 py-4 overflow-y-auto">
              <FormField control={form.control as any} name='storeId' render={({ field }) => (
                <FormItem>
                  <FormLabel>Loja</FormLabel>
                  <FormControl>
                    <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? String(field.value) : ''} disabled={isPending}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(stores ?? []).map((s: any) => (
                          <SelectItem key={s.id} value={String(s.id)}>{s.name ?? `#${s.id}`}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control as any} name='name' render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder='Nome do menu' {...field} disabled={isPending} />
                  </FormControl>
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
                  {isPending ? <Loader className='animate-spin h-4 w-4' /> : 'Cadastrar'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
