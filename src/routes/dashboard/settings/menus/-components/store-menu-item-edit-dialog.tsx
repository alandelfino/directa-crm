import { useEffect, useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { privateInstance } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Loader } from 'lucide-react'
import { IconEdit } from '@tabler/icons-react'

type StoreMenuItemDetail = {
  id: number
  name: string
  active: boolean
  parentId: number | null
}

type StoreMenuItemOption = {
  id: number
  name: string
}

const schema = z.object({
  name: z.string().min(1, { message: 'Nome é obrigatório' }),
  active: z.boolean(),
  parentId: z.coerce.number().optional(),
})

export function StoreMenuItemEditDialog({
  storeMenuId,
  itemId,
  parentOptions,
  onUpdated,
}: {
  storeMenuId: number
  itemId: number
  parentOptions: StoreMenuItemOption[]
  onUpdated?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      name: '',
      active: true,
      parentId: undefined,
    },
  })

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const response = await privateInstance.get(`/tenant/store-menus/${storeMenuId}/items/${itemId}`)
        if (response.status !== 200) throw new Error('Erro ao carregar item')
        const d = response.data as any
        const item: StoreMenuItemDetail = {
          id: Number(d.id),
          name: String(d.name ?? ''),
          active: Boolean(d.active ?? true),
          parentId: d.parentId == null ? null : Number(d.parentId),
        }
        form.reset({
          name: item.name,
          active: item.active,
          parentId: item.parentId && item.parentId > 0 ? item.parentId : undefined,
        })
      } catch (error: any) {
        const errorData = error?.response?.data
        toast.error(errorData?.title || 'Erro ao carregar item', {
          description: errorData?.detail || 'Não foi possível carregar os dados do item.',
        })
      } finally {
        setLoading(false)
      }
    }
    if (open) load()
  }, [open, storeMenuId, itemId])

  const options = useMemo(() => {
    return parentOptions
      .map((o) => ({ id: Number(o.id), name: String(o.name ?? '') }))
      .filter((o) => Number.isFinite(o.id) && o.id > 0 && o.id !== itemId)
  }, [parentOptions, itemId])

  const { isPending: updating, mutate: updateItem } = useMutation({
    mutationFn: async (values: z.infer<typeof schema>) => {
      const payload: any = {
        name: values.name,
        active: values.active,
      }
      if (values.parentId && values.parentId > 0) payload.parentId = values.parentId
      else payload.parentId = null
      const response = await privateInstance.put(`/tenant/store-menus/${storeMenuId}/items/${itemId}`, payload)
      if (response.status !== 200 && response.status !== 204) throw new Error('Erro ao atualizar item')
      return response
    },
    onSuccess: () => {
      toast.success('Item atualizado com sucesso!')
      setOpen(false)
      onUpdated?.()
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao atualizar item', {
        description: errorData?.detail || 'Não foi possível salvar as alterações.',
      })
    },
  })

  return (
    <Sheet open={open} onOpenChange={(o) => {
      setOpen(o)
      if (!o) form.reset({ name: '', active: true, parentId: undefined })
    }}>
      <SheetTrigger asChild>
        <Button size={'sm'} variant={'outline'}><IconEdit className="size-[0.85rem]" /> Editar</Button>
      </SheetTrigger>
      <SheetContent className='w-lg sm:max-w-[540px] p-0'>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((values) => updateItem(values))} className='flex flex-col h-full'>
            <SheetHeader className='px-4 py-4'>
              <SheetTitle>Editar item</SheetTitle>
              <SheetDescription>Altere os dados e salve.</SheetDescription>
            </SheetHeader>

            <div className='flex flex-col flex-1 overflow-hidden'>
              <div className='flex-1 grid auto-rows-min gap-6 px-4 py-4 overflow-y-auto'>
                <FormField control={form.control as any} name='name' render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input type='text' placeholder='Ex.: Home / Produtos / Contato' {...field} disabled={loading || updating} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control as any} name='parentId' render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item pai</FormLabel>
                    <FormControl>
                      <Select value={field.value ? String(field.value) : 'root'} onValueChange={(v) => field.onChange(v === 'root' ? undefined : Number(v))} disabled={loading || updating}>
                        <SelectTrigger>
                          <SelectValue placeholder="Raiz" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="root">Raiz</SelectItem>
                          {options.map((o) => (
                            <SelectItem key={o.id} value={String(o.id)}>{o.name || `#${o.id}`}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control as any} name='active' render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-md border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Ativo</FormLabel>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} disabled={loading || updating} />
                    </FormControl>
                  </FormItem>
                )} />
              </div>

              <div className='border-t p-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <SheetClose asChild>
                    <Button variant='outline' size="sm" className='w-full'>Cancelar</Button>
                  </SheetClose>
                  <Button size="sm" type="submit" disabled={loading || updating} className='w-full'>
                    {loading || updating ? <Loader className='animate-spin size-[0.85rem]' /> : 'Salvar'}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
