import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TagsSelect } from '@/components/tags-select'
import CategoryTreeSelect from '@/components/category-tree-select'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader, PackagePlus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { privateInstance } from '@/lib/auth'
import { Switch } from '@/components/ui/switch'
import { useEffect, useState, useMemo } from 'react'
 

  const formSchema = z.object({
    sku: z.string().min(1, { message: 'Campo obrigatório' }).regex(/^[a-z0-9-]+$/, 'Use apenas minúsculas, números e hífen (-)'),
    name: z.string().min(1, { message: 'Campo obrigatório' }),
    description: z.string().optional().or(z.literal('')),
    type: z.enum(['simple', 'with_derivations'] as const, { message: 'Campo obrigatório' }),
    promotional_price_active: z.boolean().default(false),
    active: z.boolean({ message: 'Campo obrigatório' }),
    managed_inventory: z.boolean({ message: 'Campo obrigatório' }),
  unit_id: z.preprocess(
    (v) => {
      if (v === '' || v === null || v === undefined) return undefined
      if (typeof v === 'string') {
        const n = Number(v)
        return Number.isFinite(n) ? n : NaN
      }
      return v
    },
    z
      .number({ message: 'Campo obrigatório' })
      .refine((v) => !Number.isNaN(v), { message: 'Campo obrigatório' })
      .int()
  ),
  brand_id: z.preprocess(
    (v) => {
      if (v === '' || v === null || v === undefined) return undefined
      if (typeof v === 'string') {
        const n = Number(v)
        return Number.isFinite(n) ? n : NaN
      }
      return v
    },
    z
      .number({ message: 'Campo obrigatório' })
      .refine((v) => !Number.isNaN(v), { message: 'Campo obrigatório' })
      .int()
  ),
  derivation_ids: z.array(z.number()).default([]),
  warranty_ids: z.array(z.number()).default([]),
  store_ids: z.array(z.number()).default([]),
  category_ids: z.array(z.number()).min(1, 'Selecione pelo menos uma categoria').default([]),
  }).superRefine((data, ctx) => {
  if (data.type === 'with_derivations' && (!data.derivation_ids || data.derivation_ids.length === 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['derivation_ids'], message: 'Selecione pelo menos uma derivação' })
  }
})

export function NewProductSheet({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      sku: '',
      name: '',
      description: '',
      type: 'simple',
      promotional_price_active: false,
      active: true,
      managed_inventory: true,
      unit_id: undefined,
      brand_id: undefined,
      derivation_ids: [],
      category_ids: [],
      warranty_ids: [],
      store_ids: [],
    }
  })

  const isWithDerivations = form.watch('type') === 'with_derivations'

  const { isPending, mutate } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const response = await privateInstance.post('/api:c3X9fE5j/products', values)
      return response
    },
    onSuccess: (response) => {
      if (response.status === 200 || response.status === 201) {
        toast.success('Produto criado com sucesso!')
        setOpen(false)
        form.reset()
        onCreated?.()
        queryClient.invalidateQueries({ queryKey: ['products'] })
      } else {
        const errorData = (response.data as any)
        toast.error(errorData?.title || 'Erro ao salvar produto', {
          description: errorData?.detail || 'Não foi possível cadastrar o produto.'
        })
      }
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao criar produto', {
        description: errorData?.detail || 'Não foi possível cadastrar o produto.'
      })
    }
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutate(values)
  }

  // Carregar marcas e unidades do backend (Xano Products API)
  const { data: brandsData, isLoading: isBrandsLoading } = useQuery({
    queryKey: ['brands'],
    enabled: open,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryFn: async () => {
      const response = await privateInstance.get('/api:tc5G7www/brands?per_page=50')
      if (response.status !== 200) throw new Error('Erro ao carregar marcas')
      return response.data as any
    }
  })

  const { data: unitsData, isLoading: isUnitsLoading } = useQuery({
    queryKey: ['units'],
    enabled: open,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryFn: async () => {
      const response = await privateInstance.get('/api:-b71x_vk/unit_of_measurement?per_page=50')
      if (response.status !== 200) throw new Error('Erro ao carregar unidades')
      return response.data as any
    }
  })

  // Carregar derivações
  
  // Carregar categorias
  type ApiCategory = { id: number | string; name: string; parent_id?: number | string | null; children?: ApiCategory[] }
  const { data: categoriesResponse } = useQuery({
    queryKey: ['categories'],
    enabled: open,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryFn: async () => {
      const res = await privateInstance.get('/api:ojk_IOB-/categories?page=1&per_page=50')
      if (res.status !== 200) throw new Error('Erro ao carregar categorias')
      return res.data
    },
  })
  const categories: ApiCategory[] = useMemo(() => {
    const d: any = categoriesResponse
    if (!d) return []
    if (Array.isArray(d)) return d as ApiCategory[]
    if (Array.isArray(d.items)) return d.items as ApiCategory[]
    if (Array.isArray(d.categories)) return d.categories as ApiCategory[]
    if (Array.isArray(d.data)) return d.data as ApiCategory[]
    return []
  }, [categoriesResponse])
  const { items: categoryItems, rootChildren: categoryRootChildren } = useMemo(() => {
    const items: Record<string, { name: string; children?: string[] }> = {}
    const rootChildren: string[] = []
    if (!categories || categories.length === 0) return { items, rootChildren }
    const hasNested = categories.some((c) => Array.isArray(c.children) && c.children!.length > 0)
    if (hasNested) {
      const visit = (cat: ApiCategory, isRootChild: boolean) => {
        const id = String(cat.id)
        items[id] = { name: cat.name, children: [] }
        if (isRootChild) rootChildren.push(id)
        if (Array.isArray(cat.children)) {
          for (const child of cat.children) {
            const childId = String(child.id)
            items[id].children!.push(childId)
            visit(child, false)
          }
        }
      }
      for (const cat of categories) visit(cat, true)
    } else {
      const childrenMap = new Map<string, string[]>()
      const byId = new Map<string, ApiCategory>()
      const getId = (c: ApiCategory) => String(c.id)
      const getParent = (c: ApiCategory) => {
        const raw = c.parent_id as unknown as string | number | null | undefined
        const pid = raw == null || raw === 0 || raw === '0' ? null : String(raw)
        return pid
      }
      for (const c of categories) {
        const id = getId(c)
        byId.set(id, c)
        childrenMap.set(id, [])
      }
      for (const c of categories) {
        const id = getId(c)
        const parentId = getParent(c)
        if (parentId && childrenMap.has(parentId)) childrenMap.get(parentId)!.push(id)
        else rootChildren.push(id)
      }
      for (const [id, cat] of byId.entries()) {
        items[id] = { name: cat.name, children: childrenMap.get(id) }
      }
    }
    return { items, rootChildren }
  }, [categories])

  // Helpers de máscara
  function toSkuSlug(val: string) {
    const base = String(val || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
    const spaced = base.replace(/\s+/g, '-')
    return spaced
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-{2,}/g, '-')
  }
  
  
  

  

  useEffect(() => {
    if (!open) {
      form.reset({
        sku: '',
        name: '',
        description: '',
        type: 'simple',
        promotional_price_active: false,
        active: true,
        managed_inventory: true,
        unit_id: undefined,
        brand_id: undefined,
        warranty_ids: [],
        store_ids: [],
        derivation_ids: [],
        category_ids: [],
      })
    }
  }, [open])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant={'default'} size={'sm'}>
          <PackagePlus className="size-[0.85rem]" /> Novo produto
        </Button>
      </SheetTrigger>
      <SheetContent className='sm:max-w-[800px] md:max-w-[700px] lg:max-w-[600px]'>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col h-full'>
            <SheetHeader>
              <SheetTitle>Novo produto</SheetTitle>
              <SheetDescription>Cadastre um novo produto no catálogo.</SheetDescription>
            </SheetHeader>

            <div className='flex-1 overflow-y-auto px-4 py-4'>
              
              <Tabs defaultValue='geral' className='flex-1'>
                <TabsList>
                  <TabsTrigger value='geral' className='px-4'>Geral</TabsTrigger>
                  <TabsTrigger value='descricao' className='px-4'>Descrição</TabsTrigger>
                </TabsList>

                <TabsContent value='geral' className='mt-4'>
                  <div className='grid auto-rows-min gap-6'>
                    <div className='grid grid-cols-1 md:grid-cols-[150px_1fr] gap-4'>
                      <FormField control={form.control} name='sku' render={({ field }) => (
                        <FormItem>
                          <FormLabel>SKU</FormLabel>
                          <FormControl>
                            <Input
                              placeholder='SKU'
                              className='min-w-[120px] w-[150px] max-w-[150px]'
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(toSkuSlug(e.target.value))}
                              disabled={isPending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name='name' render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome</FormLabel>
                          <FormControl>
                            <Input className='w-full' placeholder='Nome do produto' {...field} disabled={isPending} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <div className='grid grid-cols-1 gap-4'>
                      <FormField control={form.control} name='category_ids' render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categorias</FormLabel>
                          <FormControl>
                            <CategoryTreeSelect
                              value={field.value || []}
                              onChange={(next) => form.setValue('category_ids', next, { shouldDirty: true, shouldValidate: true })}
                              disabled={isPending}
                              items={categoryItems}
                              rootChildren={categoryRootChildren}
                              placeholder='Selecione as categorias...'
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <div className='grid grid-cols-1 gap-4'>
                      <FormField control={form.control} name='type' render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger className='w-full' aria-label='Tipo do produto'>
                                <SelectValue placeholder='Selecione o tipo' />
                              </SelectTrigger>
                              <SelectContent
                                position="popper"
                                className="max-h-64 z-[60] overscroll-y-contain"
                                onWheel={(e) => { e.stopPropagation(); const el = e.currentTarget as HTMLElement; el.scrollTop += e.deltaY; e.preventDefault(); }}
                                onWheelCapture={(e) => { e.stopPropagation(); const el = e.currentTarget as HTMLElement; el.scrollTop += e.deltaY; e.preventDefault(); }}
                              >
                                <SelectGroup>
                                  <SelectItem value='simple'>Simples</SelectItem>
                                  <SelectItem value='with_derivations'>Com variações</SelectItem>
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <div className={`overflow-hidden transition-all duration-200 ease-in-out ${isWithDerivations ? 'opacity-100 translate-y-0 max-h-[500px]' : 'opacity-0 -translate-y-1 max-h-0'}`}>
                        <FormField control={form.control} name='derivation_ids' render={({ field }) => (
                          <FormItem>
                            <FormLabel>Derivações</FormLabel>
                            <FormControl>
                              <TagsSelect
                                value={field.value || []}
                                onChange={(next) => form.setValue('derivation_ids', (next as any[]).map((v) => Number(v)).filter((n) => Number.isFinite(n)), { shouldDirty: true, shouldValidate: true })}
                                disabled={isPending}
                                enabled={open}
                                queryKey={['derivations']}
                                fetcher={async () => {
                                  const response = await privateInstance.get('/api:JOs6IYNo/derivations?per_page=50')
                                  if (response.status !== 200) throw new Error('Erro ao carregar derivações')
                                  return response.data as any
                                }}
                                getId={(item: any) => item?.id}
                                getLabel={(item: any) => item?.name ?? item?.title ?? `#${item?.id}`}
                                placeholder='Selecione as derivações...'
                                searchPlaceholder='Digite para pesquisar'
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    </div>

                    

                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                      <FormField control={form.control} name='unit_id' render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unidade</FormLabel>
                          <FormControl>
                            <Select value={field.value ? String(field.value) : ''} onValueChange={(v) => field.onChange(Number(v))} disabled={isUnitsLoading}>
                              <SelectTrigger className='w-full'>
                                <SelectValue placeholder={isUnitsLoading ? 'Carregando unidades...' : 'Selecione a unidade'} />
                              </SelectTrigger>
                              <SelectContent
                                position="popper"
                                className="max-h-64 z-[60] overscroll-y-contain"
                                onWheel={(e) => { e.stopPropagation(); const el = e.currentTarget as HTMLElement; el.scrollTop += e.deltaY; e.preventDefault(); }}
                                onWheelCapture={(e) => { e.stopPropagation(); const el = e.currentTarget as HTMLElement; el.scrollTop += e.deltaY; e.preventDefault(); }}
                              >
                                <SelectGroup>
                                  {Array.isArray((unitsData as any)?.items)
                                    ? (unitsData as any).items.map((u: any) => (
                                      <SelectItem key={u.id} value={String(u.id)}>{u.name ?? `Unidade #${u.id}`}</SelectItem>
                                    ))
                                    : Array.isArray(unitsData)
                                      ? (unitsData as any).map((u: any) => (
                                        <SelectItem key={u.id} value={String(u.id)}>{u.name ?? `Unidade #${u.id}`}</SelectItem>
                                      ))
                                      : null}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name='brand_id' render={({ field }) => (
                        <FormItem>
                          <FormLabel>Marca</FormLabel>
                          <FormControl>
                            <Select value={field.value ? String(field.value) : ''} onValueChange={(v) => field.onChange(Number(v))} disabled={isBrandsLoading}>
                              <SelectTrigger className='w-full'>
                                <SelectValue placeholder={isBrandsLoading ? 'Carregando marcas...' : 'Selecione a marca'} />
                              </SelectTrigger>
                              <SelectContent
                                position="popper"
                                className="max-h-64 z-[60] overscroll-y-contain"
                                onWheel={(e) => { e.stopPropagation(); const el = e.currentTarget as HTMLElement; el.scrollTop += e.deltaY; e.preventDefault(); }}
                                onWheelCapture={(e) => { e.stopPropagation(); const el = e.currentTarget as HTMLElement; el.scrollTop += e.deltaY; e.preventDefault(); }}
                              >
                                <SelectGroup>
                                  {Array.isArray((brandsData as any)?.items)
                                    ? (brandsData as any).items.map((b: any) => (
                                      <SelectItem key={b.id} value={String(b.id)}>{b.name ?? `Marca #${b.id}`}</SelectItem>
                                    ))
                                    : Array.isArray(brandsData)
                                      ? (brandsData as any).map((b: any) => (
                                        <SelectItem key={b.id} value={String(b.id)}>{b.name ?? `Marca #${b.id}`}</SelectItem>
                                      ))
                                      : null}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <div className='grid grid-cols-1 gap-4'>
                      <FormField control={form.control} name='warranty_ids' render={({ field }) => (
                        <FormItem>
                          <FormLabel>Garantias</FormLabel>
                          <FormControl>
                            <TagsSelect
                              value={field.value || []}
                              onChange={(next) => form.setValue('warranty_ids', (next as any[]).map((v) => Number(v)).filter((n) => Number.isFinite(n)), { shouldDirty: true, shouldValidate: true })}
                              disabled={isPending}
                              enabled={open}
                              queryKey={['warranties']}
                              fetcher={async () => {
                                const response = await privateInstance.get('/api:PcyOgAiT/warranties?page=1&per_page=50')
                                if (response.status !== 200) throw new Error('Erro ao carregar garantias')
                                return response.data as any
                              }}
                              getId={(item: any) => item?.id}
                              getLabel={(item: any) => item?.name ?? item?.store_name ?? `#${item?.id}`}
                              placeholder='Selecione as garantias...'
                              searchPlaceholder='Digite para pesquisar'
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <div className='grid grid-cols-1 gap-4'>
                      <FormField control={form.control} name='store_ids' render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lojas</FormLabel>
                          <FormControl>
                            <TagsSelect
                              value={field.value || []}
                              onChange={(next) => form.setValue('store_ids', (next as any[]).map((v) => Number(v)).filter((n) => Number.isFinite(n)), { shouldDirty: true, shouldValidate: true })}
                              disabled={isPending}
                              enabled={open}
                              queryKey={['stores']}
                              fetcher={async () => {
                                const response = await privateInstance.get('/api:c3X9fE5j/stores?per_page=100')
                                if (response.status !== 200) throw new Error('Erro ao carregar lojas')
                                return response.data as any
                              }}
                              getId={(item: any) => item?.id}
                              getLabel={(item: any) => item?.name ?? `#${item?.id}`}
                              placeholder='Selecione as lojas...'
                              searchPlaceholder='Digite para pesquisar'
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>


                    <div className='grid grid-cols-1 gap-4'>
                      <FormField control={form.control} name='active' render={({ field }) => (
                        <FormItem>
                          <div className='flex border items-center justify-between gap-3 bg-neutral-50 dark:bg-neutral-900 px-3 py-2.5 rounded-md'>
                            <div className='flex flex-col gap-0.5'>
                              <FormLabel>Ativo</FormLabel>
                              <FormDescription className='leading-snug text-xs'>Quando habilitado, o produto aparece ativo no catálogo.</FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={Boolean(field.value)} onCheckedChange={(v) => field.onChange(v)} disabled={isPending} />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name='promotional_price_active' render={({ field }) => (
                        <FormItem>
                          <div className='flex border items-center justify-between gap-3 bg-neutral-50 dark:bg-neutral-900 px-3 py-2.5 rounded-md'>
                            <div className='flex flex-col gap-0.5'>
                              <FormLabel>Promoção ativa</FormLabel>
                              <FormDescription className='leading-snug text-xs'>Aplica o preço promocional quando disponível.</FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={!!field.value} onCheckedChange={(v) => field.onChange(!!v)} disabled={isPending} />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )} />

                      

                      <FormField control={form.control} name='managed_inventory' render={({ field }) => (
                        <FormItem>
                          <div className='flex border items-center justify-between gap-3 bg-neutral-50 dark:bg-neutral-900 px-3 py-2.5 rounded-md'>
                            <div className='flex flex-col gap-0.5'>
                              <FormLabel>Gerenciar estoque</FormLabel>
                              <FormDescription className='leading-snug text-xs'>Controla o estoque automaticamente para vendas e entradas.</FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={!!field.value} onCheckedChange={(v) => field.onChange(!!v)} disabled={isPending} />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value='descricao' className='mt-4'>
                  <div className='grid auto-rows-min gap-6'>
                    <FormField control={form.control} name='description' render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <textarea placeholder='Opcional' {...field} disabled={isPending}
                            className='file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm h-28 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive'
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </TabsContent>

              </Tabs>
            </div>

            <div className='mt-auto border-t p-4'>
              <div className='grid grid-cols-2 gap-4'>
                <SheetClose asChild>
                  <Button variant='outline' size="sm" className='w-full'>Cancelar</Button>
                </SheetClose>
                <Button type='submit' size="sm" disabled={isPending} className='w-full'>
                  {isPending ? <Loader className='animate-spin' /> : 'Salvar produto'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}