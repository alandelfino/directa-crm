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
import { Edit, Loader } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { privateInstance } from '@/lib/auth'
import { Switch } from '@/components/ui/switch'
import { buildCategoryTree } from '@/utils/category-tree'
import { useEffect, useState, useMemo, lazy, Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

// Lazy load auxiliary creation sheets
const NewCategorySheet = lazy(() => import('../../categories/-components/new-category').then(m => ({ default: m.NewCategorySheet })))
const NewBrandSheet = lazy(() => import('../../brands/-components/new-brand').then(m => ({ default: m.NewBrandSheet })))
const NewUnitSheet = lazy(() => import('../../units/-components/new-unit').then(m => ({ default: m.NewUnitSheet })))
const NewWarrantySheet = lazy(() => import('../../warranties/-components/new-warranty').then(m => ({ default: m.NewWarrantySheet })))

function ProductFormSkeleton() {
  return (
    <div className='flex flex-col h-full'>
      <SheetHeader>
        <SheetTitle>Editar produto</SheetTitle>
        <SheetDescription>
          <Skeleton className="h-4 w-64" />
        </SheetDescription>
      </SheetHeader>

      <div className='flex-1 overflow-y-auto px-4 py-4 space-y-6'>
        <Skeleton className="h-10 w-48 rounded-md bg-muted" />

        <div className="space-y-6">
          <div className='grid grid-cols-1 md:grid-cols-[150px_1fr] gap-4'>
            <div className="space-y-2">
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-16 w-full rounded-md" />
            <Skeleton className="h-16 w-full rounded-md" />
          </div>
        </div>
      </div>

      <div className='mt-auto border-t p-4'>
        <div className='flex justify-end gap-4'>
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
    </div>
  )
}

const formSchema = z.object({
  sku: z.string().min(1, { message: 'Campo obrigatório' }).regex(/^[a-z0-9-]+$/, 'Use apenas minúsculas, números e hífen (-)'),
  name: z.string().min(1, { message: 'Campo obrigatório' }),
  description: z.string().optional(),
  active: z.boolean().default(true),
  managedInventory: z.boolean().default(false),
  unitId: z.preprocess(
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
      .min(1, 'Selecione uma unidade')
  ),
  brandId: z.preprocess(
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
      .min(1, 'Selecione uma marca')
  ),
  derivations: z.array(z.number()).default([]),
  warranties: z.array(z.number()).default([]),
  stores: z.array(z.number()).min(1, 'Selecione pelo menos uma loja').default([]),
  categories: z.array(z.number()).min(1, 'Selecione pelo menos uma categoria').default([]),
})

type ProductFormValues = z.infer<typeof formSchema>

export function EditProductSheet({
  productId,
  onSaved,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  trigger
}: {
  productId: number
  onSaved?: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = externalOnOpenChange !== undefined ? externalOnOpenChange : setInternalOpen
  const [loading, setLoading] = useState(false)

  const queryClient = useQueryClient()

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      sku: '',
      name: '',
      description: '',
      active: true,
      managedInventory: false,
      unitId: undefined,
      brandId: undefined,
      derivations: [],
      categories: [],
      warranties: [],
      stores: [],
    }
  })

  function extractIds(data: any): number[] {
    if (!Array.isArray(data)) return []
    return data.map((item: any) => {
      if (typeof item === 'number') return item
      if (typeof item === 'string') return Number(item)
      if (typeof item === 'object' && item !== null && 'id' in item) return Number(item.id)
      return NaN
    }).filter(n => Number.isFinite(n))
  }

  async function fetchProduct() {
    if (!productId) return
    try {
      setLoading(true)
      const response = await privateInstance.get(`/tenant/products/${productId}`)
      const p = response?.data
      if (!p) throw new Error('Resposta inválida ao buscar produto')

      form.reset({
        sku: p.sku || '',
        name: p.name,
        description: p.description || '',
        active: p.active,
        managedInventory: p.managed_inventory ?? p.managedInventory ?? false,
        unitId: p.unit_id ?? p.unitId ?? p.unit?.id ?? p.unitOfMeasurement?.id,
        brandId: p.brand_id ?? p.brandId ?? p.brand?.id,
        derivations: extractIds(p.derivations),
        warranties: extractIds(p.warranties),
        stores: extractIds(p.stores),
        categories: extractIds(p.categories),
      })
    } catch (error) {
      console.error(error)
      toast.error('Erro ao carregar produto')
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && productId) {
      fetchProduct()
    }
  }, [open, productId])

  const { isPending, mutate } = useMutation({
    mutationFn: async (values: ProductFormValues) => {
      const payload = {
        ...values,
        derivations: undefined, // Backend does not accept derivations update
        description: values.description || undefined,
      }
      return privateInstance.put(`/tenant/products/${productId}`, payload)
    },
    onSuccess: (response) => {
      if (response.status === 200) {
        toast.success('Produto atualizado com sucesso!')
        setOpen(false)
        onSaved?.()
        queryClient.invalidateQueries({ queryKey: ['products'] })
      } else {
        const errorData = (response.data as any)
        toast.error(errorData?.title || 'Erro ao salvar produto', {
          description: errorData?.detail || 'Não foi possível salvar as alterações.'
        })
      }
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao atualizar produto', {
        description: errorData?.detail || 'Não foi possível salvar as alterações.'
      })
    }
  })

  function onSubmit(values: ProductFormValues) {
    mutate(values)
  }

  function onInvalid(errors: any) {
    console.log('Form errors:', errors)
    const errorMessages = Object.values(errors).map((e: any) => e.message).join(', ')
    toast.error('Erro de validação', {
      description: `Verifique os campos obrigatórios: ${errorMessages}`
    })
  }

  // Carregar marcas e unidades do backend (Xano Products API)
  const { data: brandsData, isLoading: isBrandsLoading } = useQuery({
    queryKey: ['brands'],
    enabled: open,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 0,
    queryFn: async () => {
      const response = await privateInstance.get('/tenant/brands?limit=100')
      if (response.status !== 200) throw new Error('Erro ao carregar marcas')
      return response.data as any
    }
  })

  const { data: unitsData, isLoading: isUnitsLoading } = useQuery({
    queryKey: ['units'],
    enabled: open,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 0,
    queryFn: async () => {
      const response = await privateInstance.get('/tenant/unit-of-measurement?limit=100')
      if (response.status !== 200) throw new Error('Erro ao carregar unidades')
      return response.data as any
    }
  })

  // Carregar categorias
  const { data: categoriesResponse } = useQuery({
    queryKey: ['categories'],
    enabled: open,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 0,
    queryFn: async () => {
      const res = await privateInstance.get('/tenant/categories?page=1&limit=100')
      if (res.status !== 200) throw new Error('Erro ao carregar categorias')
      return res.data
    },
  })
  
  const { items: categoryItems, rootChildren: categoryRootChildren } = useMemo(() => {
    return buildCategoryTree(categoriesResponse)
  }, [categoriesResponse])

  function toSkuSlug(val: string): string {
    const base = String(val || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[\u0300-\u036f]/g, '')
    const spaced = base.replace(/\s+/g, '-')
    return spaced
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-{2,}/g, '-')
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {trigger !== null && (
        <SheetTrigger asChild>
          {trigger ?? (
            <Button variant={'outline'} size={'sm'}>
              <Edit className='size-[0.85rem]' /> Editar
            </Button>
          )}
        </SheetTrigger>
      )}
      <SheetContent className='sm:max-w-3xl'>
        {loading ? (
          <ProductFormSkeleton />
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className='flex flex-col h-full'>
              <SheetHeader>
                <SheetTitle>Editar produto</SheetTitle>
                <SheetDescription>Atualize os campos abaixo e salve as alterações.</SheetDescription>
              </SheetHeader>

              <div className='flex-1 overflow-y-auto px-4 py-4'>
                <Tabs defaultValue='geral' className='flex-1'>
                  <TabsList>
                    <TabsTrigger value='geral'>Geral</TabsTrigger>
                    <TabsTrigger value='descricao'>Descrição</TabsTrigger>
                  </TabsList>

                  <TabsContent value='geral' className='mt-4'>
                    <div className='grid auto-rows-min gap-6'>
                      <div className='grid grid-cols-1 md:grid-cols-[150px_1fr] gap-4'>
                        <FormField control={form.control as any} name='sku' render={({ field }) => (
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

                        <FormField control={form.control as any} name='name' render={({ field }) => (
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
                        <FormField control={form.control as any} name='categories' render={({ field }) => (
                          <FormItem>
                            <div className='flex items-center justify-between'>
                              <FormLabel>Categorias</FormLabel>
                              <Suspense fallback={null}>
                                <NewCategorySheet />
                              </Suspense>
                            </div>
                            <FormControl>
                              <CategoryTreeSelect
                                value={field.value || []}
                                onChange={(next) => form.setValue('categories', next, { shouldDirty: true, shouldValidate: true })}
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
                        <FormField control={form.control as any} name='derivations' render={({ field }) => (
                          <FormItem>
                            <div className='flex items-center justify-between'>
                              <FormLabel>Derivações</FormLabel>
                            </div>
                            <FormControl>
                              <TagsSelect
                                value={(field.value as any[]) || []}
                                onChange={(next) => form.setValue('derivations', (next as any[]).map((v) => Number(v)).filter((n) => Number.isFinite(n)), { shouldDirty: true, shouldValidate: true })}
                                disabled={true}
                                enabled={open}
                                queryKey={['derivations']}
                                fetcher={async () => {
                                  const response = await privateInstance.get('/tenant/derivations?limit=100')
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

                      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                        <FormField control={form.control as any} name='unitId' render={({ field }) => (
                          <FormItem>
                            <div className='flex items-center justify-between'>
                              <FormLabel>Unidade</FormLabel>
                              <Suspense fallback={null}>
                                <NewUnitSheet />
                              </Suspense>
                            </div>
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

                        <FormField control={form.control as any} name='brandId' render={({ field }) => (
                          <FormItem>
                            <div className='flex items-center justify-between'>
                              <FormLabel>Marca</FormLabel>
                              <Suspense fallback={null}>
                                <NewBrandSheet />
                              </Suspense>
                            </div>
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
                        <FormField control={form.control as any} name='warranties' render={({ field }) => (
                          <FormItem>
                            <div className='flex items-center justify-between'>
                              <FormLabel>Garantias</FormLabel>
                              <Suspense fallback={null}>
                                <NewWarrantySheet />
                              </Suspense>
                            </div>
                            <FormControl>
                              <TagsSelect
                                value={(field.value as any[]) || []}
                                onChange={(next) => form.setValue('warranties', (next as any[]).map((v) => Number(v)).filter((n) => Number.isFinite(n)), { shouldDirty: true, shouldValidate: true })}
                                disabled={isPending}
                                enabled={open}
                                queryKey={['warranties']}
                                fetcher={async () => {
                                  const response = await privateInstance.get('/tenant/warranties?limit=100')
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
                        <FormField control={form.control as any} name='stores' render={({ field }) => (
                          <FormItem>
                            <FormLabel>Lojas</FormLabel>
                            <FormControl>
                              <TagsSelect
                                value={(field.value as any[]) || []}
                                onChange={(next) => form.setValue('stores', (next as any[]).map((v) => Number(v)).filter((n) => Number.isFinite(n)), { shouldDirty: true, shouldValidate: true })}
                                disabled={isPending}
                                enabled={open}
                                queryKey={['stores']}
                                fetcher={async () => {
                                  const response = await privateInstance.get('/tenant/stores?limit=100')
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
                        <FormField control={form.control as any} name='active' render={({ field }) => (
                          <FormItem>
                            <div className='flex items-center justify-between gap-3 bg-neutral-50 dark:bg-neutral-900 px-3 py-2.5 rounded-md'>
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

                        <FormField control={form.control as any} name='managedInventory' render={({ field }) => (
                          <FormItem>
                            <div className='flex items-center justify-between gap-3 bg-neutral-50 dark:bg-neutral-900 px-3 py-2.5 rounded-md'>
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
                      <FormField control={form.control as any} name='description' render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <textarea placeholder='Opcional' {...field} value={field.value || ''} disabled={isPending}
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
                    {isPending ? <><Loader className='animate-spin' /> Salvando...</> : 'Salvar alterações'}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        )}
      </SheetContent>
    </Sheet>
  )
}
