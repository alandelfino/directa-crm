import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Form, FormField, FormItem, FormLabel, FormMessage, FormControl, FormDescription } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { privateInstance } from '@/lib/auth'
import { toast } from 'sonner'
import { Edit, Loader } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { cn } from '@/lib/utils'

type StoreItem = {
  id: number
  name: string
  description: string
  priceTableId: number
  active: boolean
  desktopProductMediaSizeId: number
  tabletProductMediaSizeId: number
  mobileProductMediaSizeId: number
  mobileAppProductMediaSizeId: number
}

const formSchema = z.object({
  name: z.string().min(1, { message: 'Nome da loja é obrigatório' }),
  description: z.string().min(1, { message: 'Descrição é obrigatória' }),
  priceTableId: z.coerce.number().min(1, { message: 'Tabela de preço é obrigatória' }),
  desktopProductMediaSizeId: z.coerce.number().min(1, { message: 'Tamanho de mídia Desktop é obrigatório' }),
  tabletProductMediaSizeId: z.coerce.number().min(1, { message: 'Tamanho de mídia Tablet é obrigatório' }),
  mobileProductMediaSizeId: z.coerce.number().min(1, { message: 'Tamanho de mídia Mobile é obrigatório' }),
  mobileAppProductMediaSizeId: z.coerce.number().min(1, { message: 'Tamanho de mídia App é obrigatório' }),
  active: z.boolean().default(true),
})

export function EditStoreSheet({ storeId, onSaved }: { storeId: number, onSaved?: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: '',
      description: '',
      priceTableId: 0,
      desktopProductMediaSizeId: 0,
      tabletProductMediaSizeId: 0,
      mobileProductMediaSizeId: 0,
      mobileAppProductMediaSizeId: 0,
      active: true,
    },
  })

  // Fetch Price Tables
  const { data: priceTables } = useQuery({
    queryKey: ['price-tables-list-select'],
    queryFn: async () => {
      const response = await privateInstance.get('/tenant/price-tables?limit=100')
      return response.data.items || []
    },
    enabled: open
  })

  // Fetch Media Sizes
  const { data: mediaSizes } = useQuery({
    queryKey: ['media-sizes-list-select'],
    queryFn: async () => {
      const response = await privateInstance.get('/tenant/media-sizes?limit=100')
      return response.data.items || []
    },
    enabled: open
  })

  useEffect(() => {
    async function run() {
      try {
        setLoading(true)
        const response = await privateInstance.get(`/tenant/stores/${storeId}`)
        if (response.status !== 200 || !response.data) throw new Error('Falha ao carregar loja')
        const s = response.data as StoreItem
        form.reset({
          name: s.name ?? '',
          description: s.description ?? '',
          priceTableId: s.priceTableId ?? 0,
          desktopProductMediaSizeId: s.desktopProductMediaSizeId ?? 0,
          tabletProductMediaSizeId: s.tabletProductMediaSizeId ?? 0,
          mobileProductMediaSizeId: s.mobileProductMediaSizeId ?? 0,
          mobileAppProductMediaSizeId: s.mobileAppProductMediaSizeId ?? 0,
          active: s.active === true,
        })
      } catch (err: any) {
        const errorData = err?.response?.data
        toast.error(errorData?.title || 'Erro ao carregar loja', {
          description: errorData?.detail || 'Não foi possível carregar os dados da loja.'
        })
      } finally {
        setLoading(false)
      }
    }
    if (open) run()
  }, [open, storeId])

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const response = await privateInstance.put(`/tenant/stores/${storeId}`, values)
      if (response.status !== 200) throw new Error('Erro ao atualizar loja')
      return response.data
    },
    onSuccess: () => {
      toast.success('Loja atualizada com sucesso!')
      setOpen(false)
      onSaved?.()
      queryClient.invalidateQueries({ queryKey: ['stores'] })
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao atualizar loja', {
        description: errorData?.detail || 'Não foi possível atualizar a loja.'
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
              <SheetTitle>Editar loja</SheetTitle>
              <SheetDescription>Atualize os dados da loja e salve.</SheetDescription>
            </SheetHeader>

            <div className="flex-1 grid auto-rows-min gap-6 px-4 py-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control as any} name='name' render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder='Nome da loja' {...field} disabled={loading || isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control as any} name='priceTableId' render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tabela de Preço</FormLabel>
                    <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? String(field.value) : undefined}>
                      <FormControl>
                        <SelectTrigger disabled={loading || isPending} className="w-full">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {priceTables?.map((pt: any) => (
                          <SelectItem key={pt.id} value={String(pt.id)}>{pt.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control as any} name='description' render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <textarea
                      className={cn(
                        "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      )}
                      placeholder='Descrição da loja'
                      {...field}
                      disabled={loading || isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control as any} name='desktopProductMediaSizeId' render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mídia Desktop</FormLabel>
                    <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? String(field.value) : undefined}>
                      <FormControl>
                        <SelectTrigger disabled={loading || isPending} className="w-full">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {mediaSizes?.map((ms: any) => (
                          <SelectItem key={ms.id} value={String(ms.id)}>{ms.name} ({ms.width}x{ms.height})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control as any} name='tabletProductMediaSizeId' render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mídia Tablet</FormLabel>
                    <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? String(field.value) : undefined}>
                      <FormControl>
                        <SelectTrigger disabled={loading || isPending} className="w-full">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {mediaSizes?.map((ms: any) => (
                          <SelectItem key={ms.id} value={String(ms.id)}>{ms.name} ({ms.width}x{ms.height})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control as any} name='mobileProductMediaSizeId' render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mídia Mobile</FormLabel>
                    <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? String(field.value) : undefined}>
                      <FormControl>
                        <SelectTrigger disabled={loading || isPending} className="w-full">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {mediaSizes?.map((ms: any) => (
                          <SelectItem key={ms.id} value={String(ms.id)}>{ms.name} ({ms.width}x{ms.height})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control as any} name='mobileAppProductMediaSizeId' render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mídia App</FormLabel>
                    <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? String(field.value) : undefined}>
                      <FormControl>
                        <SelectTrigger disabled={loading || isPending} className="w-full">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {mediaSizes?.map((ms: any) => (
                          <SelectItem key={ms.id} value={String(ms.id)}>{ms.name} ({ms.width}x{ms.height})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control as any} name='active' render={({ field }) => (
                <FormItem>
                  <div className='flex border items-center justify-between gap-3 bg-neutral-50 dark:bg-neutral-900 px-3 py-2.5 rounded-md'>
                    <div className='flex flex-col gap-0.5'>
                      <FormLabel>Ativo</FormLabel>
                      <FormDescription className='leading-snug text-xs'>Quando habilitada, a loja aparece ativa.</FormDescription>
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
