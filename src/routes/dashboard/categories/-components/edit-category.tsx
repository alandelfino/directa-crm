import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit, Loader } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { privateInstance } from '@/lib/auth'

type ApiCategory = {
  id: number | string
  name?: string
  nome?: string
  parent_id?: number | string | null
  parentId?: number | string | null
}

const formSchema = z.object({
  name: z.string().min(1, { message: 'Nome é obrigatório' }),
  // Mantém o tipo como number e usa Select para converter string->number; default é controlado por RHF
  parent_id: z.number(),
})

export function EditCategorySheet({ categoryId, categories: categoriesProp = [] }: { categoryId: number | string; categories?: ApiCategory[] }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  // Carregar detalhes da categoria selecionada
  const { data: categoryResponse, isLoading: isLoadingCategory } = useQuery({
    queryKey: ['category', categoryId],
    enabled: !!categoryId && open,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryFn: async () => {
      const res = await privateInstance.get(`/tenant/categories/${categoryId}`)
      if (res.status !== 200) throw new Error('Erro ao carregar categoria')
      return res.data
    },
  })

  const currentCategory: ApiCategory | undefined = useMemo(() => {
    const d: any = categoryResponse
    if (!d) return undefined
    // Suporta retorno { id, name, parent_id } ou envelope com data
    if (typeof d === 'object' && d !== null) {
      if ('id' in d && ('name' in d || 'nome' in d)) return d as ApiCategory
      if ('data' in d && typeof d.data === 'object') return d.data as ApiCategory
    }
    return undefined
  }, [categoryResponse])

  // Recebe a lista de categorias do pai para evitar refetch ao montar o Sheet
  const categories: ApiCategory[] = useMemo(() => {
    return Array.isArray(categoriesProp) ? categoriesProp : []
  }, [categoriesProp])

  const closeSheet = () => {
    setOpen(false)
    form.reset()
  }

  const { isPending, mutate } = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) => {
      // Garante que parent_id seja número e que 0 representa raiz
      const payload = {
        name: values.name,
        parentId: Number(values.parent_id ?? 0),
      }
      return privateInstance.put(`/tenant/categories/${categoryId}`, payload)
    },
    onSuccess: (response) => {
      if (response.status === 200) {
        toast.success('Categoria atualizada com sucesso!')
        closeSheet()
        queryClient.invalidateQueries({ queryKey: ['categories'] })
        queryClient.invalidateQueries({ queryKey: ['category', categoryId] })
      } else {
        const errorData = (response.data as any)
        toast.error(errorData?.title || 'Erro ao atualizar categoria', {
          description: errorData?.detail || 'Não foi possível atualizar a categoria.'
        })
      }
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao atualizar categoria', {
        description: errorData?.detail || 'Não foi possível atualizar a categoria.'
      })
    },
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      parent_id: 0,
    },
  })

  useEffect(() => {
    if (!currentCategory) return
    const parentRaw = (currentCategory.parentId ?? currentCategory.parent_id) as unknown as string | number | null | undefined
    const parentId = parentRaw == null || parentRaw === 0 || parentRaw === '0' ? 0 : parseInt(String(parentRaw)) || 0
    form.reset({
      name: currentCategory.name ?? currentCategory.nome ?? '',
      parent_id: parentId,
    })
  }, [currentCategory])

  const onSubmit: SubmitHandler<z.infer<typeof formSchema>> = (values) => {
    mutate(values)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="font-normal" variant={'outline'} size="sm">
          <Edit className="size-[0.85rem]" /> Editar
        </Button>
      </SheetTrigger>
      <SheetContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <SheetHeader>
              <SheetTitle>Editar categoria</SheetTitle>
              <SheetDescription>Altere os campos e salve para atualizar.</SheetDescription>
            </SheetHeader>

            <div className="flex-1 grid auto-rows-min gap-6 px-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite o nome da categoria..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parent_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subcategoria de</FormLabel>
                    <FormControl>
                      <Select
                        value={String(field.value ?? 0)}
                        onValueChange={(val) => field.onChange(parseInt(val))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione a categoria pai" />
                        </SelectTrigger>
                        <SelectContent
                          position="popper"
                          className="max-h-64 z-[60] overscroll-y-contain"
                          onWheel={(e) => { e.stopPropagation(); const el = e.currentTarget as HTMLElement; el.scrollTop += e.deltaY; e.preventDefault(); }}
                          onWheelCapture={(e) => { e.stopPropagation(); const el = e.currentTarget as HTMLElement; el.scrollTop += e.deltaY; e.preventDefault(); }}
                        >
                          <SelectGroup>
                            <SelectItem value={'0'}>Nenhuma</SelectItem>
                            {isLoadingCategory ? (
                              <SelectItem value={'loading'} disabled>Carregando...</SelectItem>
                            ) : (
                              categories.map((cat) => (
                                <SelectItem key={String(cat.id)} value={String(cat.id)}>
                                  {cat.name ?? cat.nome}
                                </SelectItem>
                              ))
                            )}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="mt-auto border-t p-4">
              <div className="grid grid-cols-2 gap-4">
                <SheetClose asChild>
                  <Button variant="outline" size="sm" className="w-full">Cancelar</Button>
                </SheetClose>
                <Button type="submit" size="sm" disabled={isPending || isLoadingCategory} className="w-full">
                  {isPending ? <Loader className="animate-spin size-[0.85rem]" /> : 'Salvar'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}