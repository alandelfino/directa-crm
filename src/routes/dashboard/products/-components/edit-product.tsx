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
import { Skeleton } from '@/components/ui/skeleton'
import { buildCategoryTree } from '@/utils/category-tree'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'

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
        {/* Tabs List Skeleton */}
        <Skeleton className="h-10 w-48 rounded-md bg-muted" />

        <div className="space-y-6">
          {/* SKU + Name */}
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

          {/* Categories */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-10 w-full" />
          </div>

          {/* Unit + Brand */}
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

          {/* Warranties */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>

          {/* Stores */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>

          {/* Switches */}
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

import { useEffect, useState, useMemo } from 'react'
import React from 'react'


const formSchema = z.object({
  sku: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  type: z.enum(['simple', 'with_derivations'] as const).optional(),
  active: z.boolean().optional(),
  managedInventory: z.boolean().optional(),
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
      .number()
      .refine((v) => !Number.isNaN(v))
      .int()
      .min(1)
      .optional()
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
      .number()
      .refine((v) => !Number.isNaN(v))
      .int()
      .min(1)
      .optional()
  ),
  warranties: z.array(z.number()).optional(),
  stores: z.array(z.number()).min(1).optional(),
  categories: z.array(z.number()).min(1).optional(),
})

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

  function extractIds(data: any): number[] {
    if (!Array.isArray(data)) return []
    return data.map((item: any) => {
      if (typeof item === 'number') return item
      if (typeof item === 'string') return Number(item)
      if (typeof item === 'object' && item !== null && 'id' in item) return Number(item.id)
      return NaN
    }).filter(n => Number.isFinite(n))
  }



  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      sku: '',
      name: '',
      description: '',
      type: 'simple',
      active: true,
      managedInventory: false,
      unitId: undefined,
      brandId: undefined,
      warranties: [],
      stores: [],
      categories: [],
    }
  })

  async function fetchProduct() {
    try {
      setLoading(true)
      const response = await privateInstance.get(`/tenant/products/${productId}`)
      const p = response?.data
      if (!p) throw new Error('Resposta inválida ao buscar produto')

      form.reset({
        sku: p.sku || '',
        name: p.name,
        description: p.description || '',
        type: String(p.type || 'simple').toLowerCase() as any,
        active: p.active,
        managedInventory: p.managed_inventory ?? p.managedInventory ?? false,
        unitId: p.unit_id ?? p.unitId ?? p.unit?.id,
        brandId: p.brand_id ?? p.brandId ?? p.brand?.id,
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

  useEffect(() => { if (open && productId) fetchProduct() }, [open, productId])

  useEffect(() => {
    if (!open) {
      form.reset({
        sku: '',
        name: '',
        description: '',
        type: 'simple',
        active: true,
        managedInventory: false,
        unitId: undefined,
        brandId: undefined,
        warranties: [],
        stores: [],
        categories: [],
      })
    }
  }, [open])

  const { isPending, mutate } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const { type, ...payload } = values
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

  function onSubmit(values: z.infer<typeof formSchema>) { mutate(values) }

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
    enabled: true,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryFn: async () => {
      const response = await privateInstance.get('/tenant/brands?limit=100')
      if (response.status !== 200) throw new Error('Erro ao carregar marcas')
      return response.data as any
    }
  })

  const { data: unitsData, isLoading: isUnitsLoading } = useQuery({
    queryKey: ['units'],
    enabled: true,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
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
    refetchOnMount: false,
    queryFn: async () => {
      // Aumentado o limite para garantir que todas as categorias (pais e filhos) sejam carregadas
      const res = await privateInstance.get('/tenant/categories?page=1&limit=100')
      if (res.status !== 200) throw new Error('Erro ao carregar categorias')
      return res.data
    },
  })
  
  // Usar utilitário centralizado para construção da árvore
  const { items: categoryItems, rootChildren: categoryRootChildren } = useMemo(() => {
    return buildCategoryTree(categoriesResponse)
  }, [categoriesResponse])
  



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
              <SheetDescription>
                {loading ? (
                  <span className='flex items-center gap-2'><Loader className='size-[0.85rem] animate-spin' />Carregando dados do produto...</span>
                ) : (
                  <>Atualize os campos abaixo e salve as alterações.</>
                )}
              </SheetDescription>
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
                      <FormField control={form.control} name='sku' render={({ field }) => (
                        <FormItem>
                          <FormLabel>SKU</FormLabel>
                          <FormControl>
                            <Input
                              placeholder='Código interno do produto'
                              className='min-w-[120px] w-[150px] max-w-[150px]'
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(toSkuSlug(e.target.value))}
                              disabled={loading || isPending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name='name' render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome</FormLabel>
                          <FormControl>
                            <Input className='w-full' placeholder='Nome do produto' {...field} disabled={loading || isPending} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <div className='grid grid-cols-1 gap-4'>
                      <FormField control={form.control} name='categories' render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categorias</FormLabel>
                          <FormControl>
                            <CategoryTreeSelect
                              value={(field.value || [])}
                              onChange={(next) => form.setValue('categories', next.map((v) => Number(v)).filter((n) => Number.isFinite(n)), { shouldDirty: true, shouldValidate: true })}
                              disabled={isPending || loading}
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
                            <Select value={field.value} onValueChange={field.onChange} disabled>
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

                    </div>

                    

                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                      <FormField control={form.control} name='unitId' render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unidade</FormLabel>
                          <FormControl>
                            <Select value={field.value ? String(field.value) : ''} onValueChange={(v) => field.onChange(Number(v))} disabled={isUnitsLoading || loading}>
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

                      <FormField control={form.control} name='brandId' render={({ field }) => (
                        <FormItem>
                          <FormLabel>Marca</FormLabel>
                          <FormControl>
                            <Select value={field.value ? String(field.value) : ''} onValueChange={(v) => field.onChange(Number(v))} disabled={isBrandsLoading || loading}>
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
              <FormField control={form.control} name='warranties' render={({ field }) => (
                <FormItem>
                  <FormLabel>Garantias</FormLabel>
                  <FormControl>
                    <TagsSelect
                      value={(field.value as any[]) || []}
                      onChange={(next) => form.setValue('warranties', (next as any[]).map((v) => Number(v)).filter((n) => Number.isFinite(n)), { shouldDirty: true, shouldValidate: true })}
                      disabled={loading || isPending}
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
                    <FormField control={form.control} name='stores' render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lojas</FormLabel>
                        <FormControl>
                          <TagsSelect
                            value={(field.value as any[]) || []}
                            onChange={(next) => form.setValue('stores', (next as any[]).map((v) => Number(v)).filter((n) => Number.isFinite(n)), { shouldDirty: true, shouldValidate: true })}
                            disabled={loading || isPending}
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
                      <FormField control={form.control} name='active' render={({ field }) => (
                        <FormItem>
                          <div className='flex items-center justify-between gap-3 bg-neutral-50 dark:bg-neutral-900 px-3 py-2.5 rounded-md'>
                            <div className='flex flex-col gap-0.5'>
                              <FormLabel>Ativo</FormLabel>
                              <FormDescription className='leading-snug'>Quando habilitado, o produto aparece ativo no catálogo.</FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={!!field.value} onCheckedChange={(v) => field.onChange(!!v)} disabled={loading || isPending} />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )} />



                      

                      <FormField control={form.control} name='managedInventory' render={({ field }) => (
                        <FormItem>
                          <div className='flex items-center justify-between gap-3 bg-neutral-50 dark:bg-neutral-900 px-3 py-2.5 rounded-md'>
                            <div className='flex flex-col gap-0.5'>
                              <FormLabel>Gerenciar estoque</FormLabel>
                              <FormDescription className='leading-snug'>Controla o estoque automaticamente para vendas e entradas.</FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={!!field.value} onCheckedChange={(v) => field.onChange(!!v)} disabled={loading || isPending} />
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
                          <div className="h-72 mb-12">
                            <ReactQuill 
                              theme="snow" 
                              value={field.value || ''} 
                              onChange={field.onChange}
                              readOnly={loading || isPending}
                              className="h-full bg-background text-foreground"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </TabsContent>



              </Tabs>
            </div>

            <div className='mt-auto border-t p-4'>
              <div className='flex justify-end gap-4'>
                <SheetClose asChild>
                  <Button variant='outline' size="sm" className='w-fit'>Cancelar</Button>
                </SheetClose>
                <Button type='submit' size="sm" disabled={isPending} className='w-fit'>
                  {isPending ? <Loader className='animate-spin' /> : 'Salvar alterações'}
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