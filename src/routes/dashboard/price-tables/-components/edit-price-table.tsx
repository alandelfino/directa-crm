import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Form, FormField, FormItem, FormLabel, FormMessage, FormControl } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { privateInstance } from '@/lib/auth'
import { toast } from 'sonner'
import { Edit, Loader } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const formSchema = z.object({ name: z.string().min(1, { message: 'Nome é obrigatório' }) })

export function EditPriceTableSheet({ priceTableId, disabled = false }: { priceTableId: number; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm<z.infer<typeof formSchema>>({ resolver: zodResolver(formSchema) as any, defaultValues: { name: '' } })

  async function fetchItem() {
    try {
      setLoading(true)
      const response = await privateInstance.get(`/api:m3u66HYX/price_tables/${priceTableId}`)
      if (response.status !== 200 || !response.data) throw new Error('Falha ao carregar tabela de preço')
      const it = response.data as any
      form.reset({ name: it.name ?? '' })
    } catch (err: any) {
      const errorData = err?.response?.data
      toast.error(errorData?.title || 'Erro ao carregar tabela de preço', {
        description: errorData?.detail || 'Não foi possível carregar os dados da tabela de preço.'
      })
    } finally { setLoading(false) }
  }

  useEffect(() => { if (open) fetchItem() }, [open])

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const response = await privateInstance.put(`/api:m3u66HYX/price_tables/${priceTableId}`, { name: values.name })
      if (response.status !== 200) throw new Error('Erro ao atualizar tabela de preço')
      return response.data
    },
    onSuccess: () => { toast.success('Tabela de preço atualizada com sucesso!'); setOpen(false); queryClient.invalidateQueries({ queryKey: ['price-tables'] }) },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao atualizar tabela de preço', {
        description: errorData?.detail || 'Não foi possível atualizar a tabela de preço.'
      })
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) { await mutateAsync(values) }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant={'outline'} size="sm" disabled={disabled}>
          <Edit className="size-[0.85rem]" /> Editar
        </Button>
      </SheetTrigger>
      <SheetContent className='sm:max-w-sm'>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col h-full'>
            <SheetHeader>
              <SheetTitle>Editar tabela de preço</SheetTitle>
              <SheetDescription>{loading ? <span className='flex items-center gap-2'><Loader className='animate-spin size-[0.85rem]' /> Carregando...</span> : 'Atualize os dados e salve.'}</SheetDescription>
            </SheetHeader>
            <div className='flex-1 grid auto-rows-min gap-6 px-4 py-4'>
              <FormField control={form.control} name='name' render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder='Digite o nome...' {...field} disabled={loading || isPending} />
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
                <Button type='submit' size="sm" disabled={isPending || loading} className='w-full'>
                  {isPending ? <Loader className='animate-spin size-[0.85rem]' /> : 'Salvar'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}