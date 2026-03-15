import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { privateInstance } from '@/lib/auth'
import { toast } from 'sonner'
import { Edit, Loader } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Skeleton } from '@/components/ui/skeleton'

const pageTypes = [
  { value: 'landingpage', label: 'Landing Page' },
  { value: 'search', label: 'Busca' },
  { value: 'product', label: 'Produto' },
  { value: 'cart', label: 'Carrinho' },
  { value: 'checkout', label: 'Checkout' },
  { value: 'login', label: 'Login' },
  { value: 'register', label: 'Cadastro' },
  { value: 'my_account', label: 'Minha conta' },
] as const

type PageItem = {
  id: number
  name: string
  path: string
  active: boolean
  storeId: number
  type: string
}

const formSchema = z.object({
  name: z.string().min(1, { message: 'Nome é obrigatório' }).max(255, { message: 'Máximo 255 caracteres' }),
  path: z.string().min(1, { message: 'Path é obrigatório' }).max(255, { message: 'Máximo 255 caracteres' }).refine((v) => !/\s/.test(v), { message: 'Path não pode conter espaços' }),
  active: z.boolean().default(true),
  storeId: z.coerce.number().min(1, { message: 'Loja é obrigatória' }),
  type: z.enum(['landingpage', 'search', 'product', 'cart', 'checkout', 'login', 'register', 'my_account']),
})

export function EditPageSheet({ pageId, onSaved }: { pageId: number, onSaved?: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: '',
      path: '',
      active: true,
      storeId: 0,
      type: 'landingpage',
    },
  })

  const { data: stores } = useQuery({
    queryKey: ['stores-list-select'],
    enabled: open,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 0,
    queryFn: async () => {
      const response = await privateInstance.get('/tenant/stores', {
        params: { page: 1, limit: 100, sortBy: 'name', orderBy: 'asc' },
      })
      const items = response.data?.items ?? response.data
      return Array.isArray(items) ? items : []
    },
  })

  useEffect(() => {
    async function run() {
      try {
        setLoading(true)
        const response = await privateInstance.get(`/tenant/pages/${pageId}`)
        if (response.status !== 200 || !response.data) throw new Error('Falha ao carregar página')
        const p = response.data as PageItem
        form.reset({
          name: p.name ?? '',
          path: p.path ?? '',
          active: p.active === true,
          storeId: p.storeId ?? 0,
          type: (p.type as any) ?? 'landingpage',
        })
      } catch (err: any) {
        const errorData = err?.response?.data
        toast.error(errorData?.title || 'Erro ao carregar página', {
          description: errorData?.detail || 'Não foi possível carregar os dados da página.',
        })
        setOpen(false)
      } finally {
        setLoading(false)
      }
    }
    if (open && pageId) run()
  }, [open, pageId])

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const payload = {
        name: values.name,
        path: values.path,
        active: values.active,
        storeId: values.storeId,
        type: values.type,
      }
      const response = await privateInstance.put(`/tenant/pages/${pageId}`, payload)
      if (response.status !== 200) throw new Error('Erro ao atualizar página')
      return response.data
    },
    onSuccess: () => {
      toast.success('Página atualizada com sucesso!')
      setOpen(false)
      onSaved?.()
      queryClient.invalidateQueries({ queryKey: ['pages'] })
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao atualizar página', {
        description: errorData?.detail || 'Não foi possível atualizar a página.',
      })
    },
  })

  return (
    <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) form.reset() }}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" disabled={!pageId}>
          <Edit className="size-[0.85rem]" /> Editar
        </Button>
      </SheetTrigger>
      <SheetContent className="min-w-[520px] sm:w-[560px] overflow-y-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutateAsync(v))} className="flex flex-col h-full">
            <SheetHeader>
              <SheetTitle>Editar página</SheetTitle>
              <SheetDescription>Atualize os dados da página e salve.</SheetDescription>
            </SheetHeader>

            <div className="flex-1 grid auto-rows-min gap-6 px-4 py-4 overflow-y-auto">
              <FormField control={form.control as any} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    {loading ? <Skeleton className="h-9 w-full" /> : <Input placeholder="Ex: Home" {...field} disabled={loading || isPending} />}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control as any} name="path" render={({ field }) => (
                <FormItem>
                  <FormLabel>Path</FormLabel>
                  <FormControl>
                    {loading ? (
                      <Skeleton className="h-9 w-full" />
                    ) : (
                      <Input
                        placeholder="/home"
                        name={field.name}
                        ref={field.ref}
                        value={field.value ?? ''}
                        onBlur={() => {
                          field.onBlur()
                          const v = String(field.value ?? '').trim().replace(/\s+/g, '')
                          if (v && !v.startsWith('/')) field.onChange(`/${v}`)
                        }}
                        onChange={(e) => field.onChange(e.target.value.replace(/\s+/g, ''))}
                        disabled={loading || isPending}
                      />
                    )}
                  </FormControl>
                  <FormDescription className="text-xs">Sem espaços. Ex: /home, /produtos, /contato</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control as any} name="storeId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loja</FormLabel>
                    <FormControl>
                      {loading ? (
                        <Skeleton className="h-9 w-full" />
                      ) : (
                        <Select value={field.value ? String(field.value) : ''} onValueChange={(v) => field.onChange(Number(v))} disabled={loading || isPending}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {(stores ?? []).map((s: any) => (
                              <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control as any} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <FormControl>
                      {loading ? (
                        <Skeleton className="h-9 w-full" />
                      ) : (
                        <Select value={String(field.value)} onValueChange={field.onChange} disabled={loading || isPending}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {pageTypes.map((t) => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control as any} name="active" render={({ field }) => (
                <FormItem>
                  <div className="flex border items-center justify-between gap-3 bg-neutral-50 dark:bg-neutral-900 px-3 py-2.5 rounded-md">
                    <div className="flex flex-col gap-0.5">
                      <FormLabel>Ativa</FormLabel>
                      <FormDescription className="leading-snug text-xs">Quando habilitada, a página fica ativa.</FormDescription>
                      <FormMessage />
                    </div>
                    <FormControl>
                      <Switch checked={Boolean(field.value)} onCheckedChange={(v) => field.onChange(v)} disabled={loading || isPending} />
                    </FormControl>
                  </div>
                </FormItem>
              )} />
            </div>

            <div className="mt-auto border-t p-4">
              <div className="grid grid-cols-2 gap-4">
                <SheetClose asChild>
                  <Button variant="outline" size="sm" className="w-full">Cancelar</Button>
                </SheetClose>
                <Button type="submit" disabled={loading || isPending} size="sm" className="w-full">
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

