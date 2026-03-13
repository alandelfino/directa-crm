import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { privateInstance } from '@/lib/auth'
import { zodResolver } from '@hookform/resolvers/zod'
import { Edit, Loader } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

type StoreMenuItem = {
  id: number
  name: string
  store: {
    id: number
    name: string
  }
  createdAt: string
  updatedAt: string
}

const formSchema = z.object({
  name: z.string().min(1, { message: 'Nome do menu é obrigatório' }),
  storeId: z.coerce.number().min(1, { message: 'Loja é obrigatória' }),
})

export function EditStoreMenuSheet({ storeMenuId, storeId, onSaved }: { storeMenuId: number, storeId?: number, onSaved?: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()
  const storeIdNumber = Number(storeId)
  const initialStoreId = Number.isFinite(storeIdNumber) && storeIdNumber > 0 ? storeIdNumber : 0

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

  useEffect(() => {
    async function run() {
      try {
        setLoading(true)
        const response = await privateInstance.get(`/tenant/store-menus/${storeMenuId}`)
        if (response.status !== 200 || !response.data) throw new Error('Falha ao carregar menu')
        const m = response.data as StoreMenuItem
        form.reset({
          name: m.name ?? '',
          storeId: m.store?.id ?? initialStoreId,
        })
      } catch (err: any) {
        const errorData = err?.response?.data
        toast.error(errorData?.title || 'Erro ao carregar menu', {
          description: errorData?.detail || 'Não foi possível carregar os dados do menu.',
        })
      } finally {
        setLoading(false)
      }
    }
    if (open) run()
  }, [open, storeMenuId])

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const response = await privateInstance.put(`/tenant/store-menus/${storeMenuId}`, values)
      if (response.status !== 200) throw new Error('Erro ao atualizar menu')
      return response.data
    },
    onSuccess: () => {
      toast.success('Menu atualizado com sucesso!')
      setOpen(false)
      onSaved?.()
      queryClient.invalidateQueries({ queryKey: ['store-menus'] })
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao atualizar menu', {
        description: errorData?.detail || 'Não foi possível atualizar o menu.',
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
        <Button variant={'outline'} size="sm">
          <Edit className="size-[0.85rem]" /> Editar
        </Button>
      </SheetTrigger>
      <SheetContent className='min-w-[500px] sm:w-[540px] overflow-y-auto'>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col h-full'>
            <SheetHeader>
              <SheetTitle>Editar menu</SheetTitle>
              <SheetDescription>Atualize os dados do menu e salve.</SheetDescription>
            </SheetHeader>

            <div className="flex-1 grid auto-rows-min gap-6 px-4 py-4 overflow-y-auto">
              <FormField control={form.control as any} name='storeId' render={({ field }) => (
                <FormItem>
                  <FormLabel>Loja</FormLabel>
                  <FormControl>
                    {loading ? (
                      <Skeleton className="h-9 w-full" />
                    ) : (
                      <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? String(field.value) : ''} disabled={loading || isPending}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {(stores ?? []).map((s: any) => (
                            <SelectItem key={s.id} value={String(s.id)}>{s.name ?? `#${s.id}`}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control as any} name='name' render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    {loading ? (
                      <Skeleton className="h-9 w-full" />
                    ) : (
                      <Input placeholder='Nome do menu' {...field} disabled={loading || isPending} />
                    )}
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
