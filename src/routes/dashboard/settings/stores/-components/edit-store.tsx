import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Form, FormField, FormItem, FormLabel, FormMessage, FormControl, FormDescription } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { privateInstance } from '@/lib/auth'
import { toast } from 'sonner'
import { AlertCircleIcon, CheckCircle2Icon, Edit, Loader } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

type StoreItem = { id: number; name?: string; description?: string; active?: boolean; price_table_id?: number }

const formSchema = z.object({
  name: z.string().min(1, { message: 'Nome da loja é obrigatório' }),
  description: z.string().optional().or(z.literal('')),
  active: z.boolean().default(true),
  price_table_id: z.number({ error: 'Tabela de preço é obrigatória' }),
  desktop_product_media_size_id: z.number({ error: 'Tamanho de mídia (Desktop) é obrigatório' }),
  tablet_product_media_size_id: z.number({ error: 'Tamanho de mídia (Tablet) é obrigatório' }),
  mobile_product_media_size_id: z.number({ error: 'Tamanho de mídia (Mobile) é obrigatório' }),
  mobile_app_product_media_size_id: z.number({ error: 'Tamanho de mídia (App) é obrigatório' }),
})

type MediaSize = { id: number; name?: string }
type MediaSizesResponse = { items?: MediaSize[] } | MediaSize[]

type PriceTable = { id: number; name?: string }
type PriceTablesResponse = { items?: PriceTable[] } | PriceTable[]

export function EditStoreSheet({ storeId, onSaved }: { storeId: number, onSaved?: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: '',
      description: '',
      active: true,
      price_table_id: undefined,
      desktop_product_media_size_id: undefined,
      tablet_product_media_size_id: undefined,
      mobile_product_media_size_id: undefined,
      mobile_app_product_media_size_id: undefined,
    },
  })

  const { data: priceTablesData } = useQuery({
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryKey: ['price-tables', 'select'],
    queryFn: async () => {
      const url = `/api:m3u66HYX/price_tables?page=1&per_page=${50}`
      const response = await privateInstance.get(url)
      if (response.status !== 200) throw new Error('Erro ao carregar tabelas de preço')
      return response.data as PriceTablesResponse
    }
  })
  const priceTables = Array.isArray(priceTablesData)
    ? priceTablesData
    : Array.isArray((priceTablesData as any)?.items)
      ? (priceTablesData as any).items
      : []

  const { data: mediaSizesData } = useQuery({
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryKey: ['media-sizes', 'select'],
    queryFn: async () => {
      const url = `/api:jJaPcZVn/media_size?page=1&per_page=100`
      const response = await privateInstance.get(url)
      if (response.status !== 200) throw new Error('Erro ao carregar tamanhos de mídia')
      return response.data as MediaSizesResponse
    }
  })

  const mediaSizes = Array.isArray(mediaSizesData)
    ? mediaSizesData
    : Array.isArray((mediaSizesData as any)?.items)
      ? (mediaSizesData as any).items
      : []

  useEffect(() => {
    async function run() {
      try {
        setLoading(true)
        const response = await privateInstance.get(`/api:gI4qBCGQ/stores/${storeId}`)
        if (response.status !== 200 || !response.data) throw new Error('Falha ao carregar loja')
        const s = response.data as StoreItem & {
          desktop_product_media_size_id?: number
          tablet_product_media_size_id?: number
          mobile_product_media_size_id?: number
          mobile_app_product_media_size_id?: number
        }
        form.reset({
          name: s.name ?? '',
          description: s.description ?? '',
          active: s.active === true,
          price_table_id: typeof s.price_table_id === 'number' ? s.price_table_id : undefined,
          desktop_product_media_size_id: typeof s.desktop_product_media_size_id === 'number' ? s.desktop_product_media_size_id : undefined,
          tablet_product_media_size_id: typeof s.tablet_product_media_size_id === 'number' ? s.tablet_product_media_size_id : undefined,
          mobile_product_media_size_id: typeof s.mobile_product_media_size_id === 'number' ? s.mobile_product_media_size_id : undefined,
          mobile_app_product_media_size_id: typeof s.mobile_app_product_media_size_id === 'number' ? s.mobile_app_product_media_size_id : undefined,
        })
      } catch (err: any) {
        toast.error(err?.response?.data?.message ?? 'Erro ao carregar loja')
      } finally {
        setLoading(false)
      }
    }
    if (open) run()
  }, [open, storeId])

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const payload = {
        name: values.name,
        description: values.description ?? '',
        active: values.active,
        price_table_id: values.price_table_id,
        desktop_product_media_size_id: values.desktop_product_media_size_id,
        tablet_product_media_size_id: values.tablet_product_media_size_id,
        mobile_product_media_size_id: values.mobile_product_media_size_id,
        mobile_app_product_media_size_id: values.mobile_app_product_media_size_id,
      }
      const response = await privateInstance.put(`/api:gI4qBCGQ/stores/${storeId}`, payload)
      if (response.status !== 200) throw new Error('Erro ao atualizar loja')
      return response.data
    },
    onSuccess: () => {
      toast.success('Loja atualizada com sucesso!')
      setOpen(false)
      onSaved?.()
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? 'Erro ao atualizar loja')
    }
  })

  async function onSubmit(values: z.infer<typeof formSchema>) { await mutateAsync(values) }

  return (
    <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) form.reset(); }}>
      <SheetTrigger asChild>
        <Button variant={'outline'}>
          <Edit /> Editar
        </Button>
      </SheetTrigger>
      <SheetContent className='min-w-md'>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col h-full'>
            <SheetHeader>
              <SheetTitle>Editar loja</SheetTitle>
              <SheetDescription>Atualize os dados da loja e salve.</SheetDescription>
            </SheetHeader>

            <Tabs defaultValue="general" className="flex-1 flex flex-col overflow-hidden">
              <div className="px-4 pt-4">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="general">Geral</TabsTrigger>
                  <TabsTrigger value="media-sizes">Tamanhos de mídia</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="general" className="flex-1 overflow-y-auto px-4 py-4">
                <div className='grid grid-cols-1 gap-6'>
                  <FormField control={form.control} name='name' render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input placeholder='Nome da loja' {...field} disabled={loading || isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name='description' render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <textarea placeholder='Opcional' {...field} disabled={loading || isPending}
                          className='file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm h-28 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive'
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name='price_table_id' render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tabela de preço padrão</FormLabel>
                      <FormControl>
                        <Select value={field.value != null ? String(field.value) : undefined} onValueChange={(v) => field.onChange(v ? Number(v) : undefined)}>
                          <SelectTrigger className='w-full'>
                            <SelectValue placeholder='Selecione uma tabela' />
                          </SelectTrigger>
                          <SelectContent>
                            {priceTables.map((pt: PriceTable) => (
                              <SelectItem key={pt.id} value={String(pt.id)}>{pt.name ?? `Tabela ${pt.id}`}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name='active' render={({ field }) => (
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
              </TabsContent>

              <TabsContent value="media-sizes" className="flex-1 overflow-y-auto px-4 py-4">

                <Alert className='mb-4 bg-blue-50/50 border-blue-200'>
                  <AlertCircleIcon className='text-blue-500!' />
                  <AlertDescription className='text-sm text-blue-500'>
                    Tamanho de mídia para listagem de produtos na loja.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 gap-6">

                  <FormField control={form.control} name='desktop_product_media_size_id' render={({ field }) => (
                    <FormItem className='flex items-start gap-2'>
                      <FormLabel className='text-sm min-w-[90px] mt-2'>Desktop</FormLabel>
                      <div className='w-full flex flex-col gap-1'>
                        <FormControl>
                          <Select value={field.value != null ? String(field.value) : undefined} onValueChange={(v) => field.onChange(v ? Number(v) : undefined)}>
                            <SelectTrigger className='w-full'>
                              <SelectValue placeholder='Selecione um tamanho' />
                            </SelectTrigger>
                            <SelectContent>
                              {mediaSizes.map((ms: MediaSize) => (
                                <SelectItem key={ms.id} value={String(ms.id)}>{ms.name ?? `Tamanho ${ms.id}`}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name='tablet_product_media_size_id' render={({ field }) => (
                    <FormItem className='flex items-start gap-2'>
                      <FormLabel className='text-sm min-w-[90px] mt-2'>Tablet</FormLabel>
                      <div className='w-full flex flex-col gap-1'>
                        <FormControl>
                          <Select value={field.value != null ? String(field.value) : undefined} onValueChange={(v) => field.onChange(v ? Number(v) : undefined)}>
                            <SelectTrigger className='w-full'>
                              <SelectValue placeholder='Selecione um tamanho' />
                            </SelectTrigger>
                            <SelectContent>
                              {mediaSizes.map((ms: MediaSize) => (
                                <SelectItem key={ms.id} value={String(ms.id)}>{ms.name ?? `Tamanho ${ms.id}`}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name='mobile_product_media_size_id' render={({ field }) => (
                    <FormItem className='flex items-start gap-2'>
                      <FormLabel className='text-sm min-w-[90px] mt-2'>Celular</FormLabel>
                      <div className='w-full flex flex-col gap-1'>
                        <FormControl>
                          <Select value={field.value != null ? String(field.value) : undefined} onValueChange={(v) => field.onChange(v ? Number(v) : undefined)}>
                            <SelectTrigger className='w-full'>
                              <SelectValue placeholder='Selecione um tamanho' />
                            </SelectTrigger>
                            <SelectContent>
                              {mediaSizes.map((ms: MediaSize) => (
                                <SelectItem key={ms.id} value={String(ms.id)}>{ms.name ?? `Tamanho ${ms.id}`}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name='mobile_app_product_media_size_id' render={({ field }) => (
                    <FormItem className='flex items-start gap-2'>
                      <FormLabel className='text-sm min-w-[90px] mt-2'>Aplicativo</FormLabel>
                      <div className='w-full flex flex-col gap-1'>
                        <FormControl>
                          <Select value={field.value != null ? String(field.value) : undefined} onValueChange={(v) => field.onChange(v ? Number(v) : undefined)}>
                            <SelectTrigger className='w-full'>
                              <SelectValue placeholder='Selecione um tamanho' />
                            </SelectTrigger>
                            <SelectContent>
                              {mediaSizes.map((ms: MediaSize) => (
                                <SelectItem key={ms.id} value={String(ms.id)}>{ms.name ?? `Tamanho ${ms.id}`}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )} />
                </div>
              </TabsContent>
            </Tabs>

            <div className='mt-auto border-t p-4'>
              <div className='grid grid-cols-2 gap-4'>
                <SheetClose asChild>
                  <Button variant='outline' className='w-full'>Cancelar</Button>
                </SheetClose>
                <Button type='submit' disabled={isPending} className='w-full'>
                  {isPending ? <Loader className='animate-spin' /> : 'Salvar alterações'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}