import { Button } from '@/components/ui/button'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { privateInstance } from '@/lib/auth'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader, Plus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

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

function isValidJsonObject(v: string) {
  try {
    const parsed = JSON.parse(v)
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
  } catch {
    return false
  }
}

const formSchema = z.object({
  title: z.string().min(1, { message: 'Título é obrigatório' }).max(255, { message: 'Máximo 255 caracteres' }),
  path: z.string().min(1, { message: 'Path é obrigatório' }).max(255, { message: 'Máximo 255 caracteres' }).refine((v) => !/\s/.test(v), { message: 'Path não pode conter espaços' }),
  active: z.boolean().default(true),
  storeId: z.coerce.number().min(1, { message: 'Loja é obrigatória' }),
  type: z.enum(['landingpage', 'search', 'product', 'cart', 'checkout', 'login', 'register', 'my_account']),
  content: z.string().optional().nullable().refine((v) => !v || v.trim().length === 0 || isValidJsonObject(v), {
    message: 'Informe um JSON válido (objeto)',
  }),
})

type NewPageSheetProps = {
  onCreated?: () => void
  trigger?: React.ReactNode
}

export function NewPageSheet({ onCreated, trigger }: NewPageSheetProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      title: '',
      path: '',
      active: true,
      storeId: 0,
      type: 'landingpage',
      content: '',
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

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const rawContent = String(values.content ?? '').trim()
      const content = rawContent.length > 0 ? JSON.parse(rawContent) : undefined
      const payload = {
        title: values.title,
        path: values.path,
        active: values.active,
        storeId: values.storeId,
        type: values.type,
        ...(content ? { content } : {}),
      }
      const response = await privateInstance.post('/tenant/pages', payload)
      if (response.status !== 200 && response.status !== 201) throw new Error('Erro ao criar página')
      return response.data
    },
    onSuccess: () => {
      toast.success('Página criada com sucesso!')
      setOpen(false)
      form.reset()
      onCreated?.()
      queryClient.invalidateQueries({ queryKey: ['pages'] })
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao criar página', {
        description: errorData?.detail || 'Não foi possível criar a página.',
      })
    },
  })

  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (!o) form.reset() }}>
      <SheetTrigger asChild>
        {trigger ? trigger : (
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" /> Nova página
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="min-w-[520px] sm:w-[560px] overflow-y-auto">
        <Form {...form}>
          <form onSubmit={(e) => { e.stopPropagation(); form.handleSubmit((v) => mutateAsync(v))(e) }} className="flex flex-col h-full">
            <SheetHeader>
              <SheetTitle>Nova página</SheetTitle>
              <SheetDescription>Cadastre uma página para a loja.</SheetDescription>
            </SheetHeader>

            <div className="flex-1 grid auto-rows-min gap-6 px-4 py-4 overflow-y-auto">
              <FormField control={form.control as any} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Home" {...field} disabled={isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control as any} name="path" render={({ field }) => (
                <FormItem>
                  <FormLabel>Path</FormLabel>
                  <FormControl>
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
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">Sem espaços. Ex: /home, /produtos, /contato</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control as any} name="storeId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loja</FormLabel>
                    <Select value={field.value ? String(field.value) : ''} onValueChange={(v) => field.onChange(Number(v))} disabled={isPending}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(stores ?? []).map((s: any) => (
                          <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control as any} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select value={String(field.value)} onValueChange={field.onChange} disabled={isPending}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {pageTypes.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                      <Switch checked={Boolean(field.value)} onCheckedChange={(v) => field.onChange(v)} disabled={isPending} />
                    </FormControl>
                  </div>
                </FormItem>
              )} />

              <FormField control={form.control as any} name="content" render={({ field }) => (
                <FormItem>
                  <FormLabel>Content (JSON)</FormLabel>
                  <FormControl>
                    <textarea
                      className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder='{"blocks":[]}'
                      name={field.name}
                      ref={field.ref}
                      value={(field.value as any) ?? ''}
                      onBlur={field.onBlur}
                      onChange={field.onChange}
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">Opcional. Informe um JSON (objeto).</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="mt-auto border-t p-4">
              <div className="grid grid-cols-2 gap-4">
                <SheetClose asChild>
                  <Button variant="outline" size="sm" className="w-full">Cancelar</Button>
                </SheetClose>
                <Button type="submit" size="sm" disabled={isPending} className="w-full">
                  {isPending ? <Loader className="animate-spin size-[0.85rem]" /> : 'Cadastrar'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}

