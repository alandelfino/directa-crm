import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Form, FormField, FormItem, FormLabel, FormMessage, FormControl, FormDescription } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { privateInstance } from '@/lib/auth'
import { toast } from 'sonner'
import { Edit, Loader } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { cn } from '@/lib/utils'

type PriceTableItem = {
  id: number
  name: string
  description?: string
  active: boolean
}

const formSchema = z.object({
  name: z.string().min(1, { message: 'Nome da tabela de preço é obrigatório' }),
  description: z.string().optional(),
  active: z.boolean().default(true),
})

export function EditPriceTableSheet({ id, onSaved }: { id: number, onSaved?: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: '',
      description: '',
      active: true,
    },
  })

  useEffect(() => {
    async function run() {
      try {
        setLoading(true)
        const response = await privateInstance.get(`/tenant/price-tables/${id}`)
        if (response.status !== 200 || !response.data) throw new Error('Falha ao carregar tabela de preço')
        const s = response.data as PriceTableItem
        form.reset({
          name: s.name ?? '',
          description: s.description ?? '',
          active: s.active === true,
        })
      } catch (err: any) {
        const errorData = err?.response?.data
        toast.error(errorData?.title || 'Erro ao carregar tabela de preço', {
          description: errorData?.detail || 'Não foi possível carregar os dados da tabela.'
        })
      } finally {
        setLoading(false)
      }
    }
    if (open) run()
  }, [open, id, form])

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const response = await privateInstance.put(`/tenant/price-tables/${id}`, values)
      if (response.status !== 200) throw new Error('Erro ao atualizar tabela de preço')
      return response.data
    },
    onSuccess: () => {
      toast.success('Tabela de preço atualizada com sucesso!')
      setOpen(false)
      onSaved?.()
      queryClient.invalidateQueries({ queryKey: ['price-tables'] })
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao atualizar tabela de preço', {
        description: errorData?.detail || 'Não foi possível atualizar a tabela.'
      })
    }
  })

  async function onSubmit(values: z.infer<typeof formSchema>) { await mutateAsync(values) }

  return (
    <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) form.reset(); }}>
      <SheetTrigger asChild>
        <Button variant={'outline'} size="sm">
          <Edit className="size-[0.85rem]" /> Editar
        </Button>
      </SheetTrigger>
      <SheetContent className='min-w-[500px] sm:w-[540px] overflow-y-auto'>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col h-full'>
            <SheetHeader>
              <SheetTitle>Editar tabela de preço</SheetTitle>
              <SheetDescription>Atualize os dados da tabela e salve.</SheetDescription>
            </SheetHeader>

            <div className="flex-1 grid auto-rows-min gap-6 px-4 py-4 overflow-y-auto">
              <FormField control={form.control as any} name='name' render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder='Nome da tabela' {...field} disabled={loading || isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control as any} name='description' render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <textarea
                      className={cn(
                        "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      )}
                      placeholder='Descrição da tabela'
                      {...field}
                      disabled={loading || isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control as any} name='active' render={({ field }) => (
                <FormItem>
                  <div className='flex border items-center justify-between gap-3 bg-neutral-50 dark:bg-neutral-900 px-3 py-2.5 rounded-md'>
                    <div className='flex flex-col gap-0.5'>
                      <FormLabel>Ativo</FormLabel>
                      <FormDescription className='leading-snug text-xs'>Quando habilitada, a tabela aparece ativa.</FormDescription>
                      <FormMessage />
                    </div>
                    <FormControl>
                      <Switch checked={Boolean(field.value)} onCheckedChange={(v) => field.onChange(v)} disabled={loading || isPending} />
                    </FormControl>
                  </div>
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
