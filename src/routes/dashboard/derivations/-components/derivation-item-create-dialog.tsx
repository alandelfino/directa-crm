import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { ImagePickerDialog } from '@/components/image-picker-dialog'
import { Loader, Plus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { privateInstance } from '@/lib/auth'

const getSchemaByType = (t: 'text' | 'color' | 'image') => {
  const base = z.object({
    nome: z.string().min(1, { message: 'Nome é obrigatório' }),
  })
  if (t === 'color') {
    return base.merge(z.object({
      value: z.string().regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/i, { message: 'Informe a cor em hex, ex.: #000000' })
    }))
  }
  if (t === 'image') {
    return base.merge(z.object({
      value: z.string().url({ message: 'Informe uma URL válida para a imagem' })
    }))
  }
  return base.merge(z.object({ value: z.string().min(1, { message: 'Valor é obrigatório' }) }))
}

export function DerivationItemCreateDialog({ derivationId, derivationType, itemsCount = 0, onCreated }: {
  derivationId: number
  derivationType: 'text' | 'color' | 'image'
  itemsCount?: number
  onCreated?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  const schema = getSchemaByType(derivationType)
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { nome: '', value: derivationType === 'color' ? '#000000' : '' },
  })

  const { isPending: creating, mutate: createItem } = useMutation({
    mutationFn: async (values: z.infer<typeof schema>) => {
      const payload: any = { derivation_id: derivationId, value: values.value, order: itemsCount + 1, name: values.nome }
      const response = await privateInstance.post(`/api:JOs6IYNo/derivation_items`, payload)
      if (response.status !== 200 && response.status !== 201) throw new Error('Erro ao cadastrar item')
      return response
    },
    onSuccess: () => {
      toast.success('Item cadastrado com sucesso!')
      form.reset({ nome: '', value: derivationType === 'color' ? '#000000' : '' })
      setOpen(false)
      setPickerOpen(false)
      onCreated?.()
    },
    onError: (error: any) => toast.error(error?.response?.data?.message ?? 'Erro ao cadastrar item')
  })

  return (
    <Dialog open={open} onOpenChange={(o) => {
      setOpen(o)
      if (!o) {
        form.reset({ nome: '', value: derivationType === 'color' ? '#000000' : '' })
        setPickerOpen(false)
      }
    }}>
      <DialogTrigger asChild>
        <Button size={'sm'}>
          <Plus className="size-[0.85rem]" /> Cadastrar item
        </Button>
      </DialogTrigger>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((values) => createItem(values))} className='flex flex-col gap-4'>
            <DialogHeader>
              <DialogTitle>Novo item</DialogTitle>
              <DialogDescription>Preencha o valor e salve.</DialogDescription>
            </DialogHeader>
            <FormField control={form.control} name='nome' render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input type='text' placeholder='Ex.: Vermelho / EG / Foto 1' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            {derivationType === 'color' ? (
              <FormField control={form.control} name='value' render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor</FormLabel>
                  <FormControl>
                    <div className='flex items-center gap-2'>
                      <Input type='text' placeholder='#000000' {...field} disabled />
                      <input
                        type='color'
                        className='h-9 w-9 rounded-md border'
                        value={/^#(?:[0-9a-fA-F]{3}){1,2}$/.test(field.value ?? '') ? field.value : '#000000'}
                        onChange={(e) => field.onChange(e.target.value)}
                        aria-label='Selecionar cor'
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            ) : derivationType === 'image' ? (
              <FormField control={form.control} name='value' render={({ field }) => (
                <FormItem>
                  <FormLabel>Imagem</FormLabel>
                  <FormControl>
                    <div className='space-y-2'>
                      <Input type='url' placeholder='https://exemplo.com/imagem.png' {...field} disabled />
                      <div className='rounded-md border overflow-hidden cursor-pointer' onClick={() => setPickerOpen(true)}>
                        <div className='aspect-video w-full bg-muted flex items-center justify-center'>
                          {field.value ? (
                            <img src={field.value} alt='Preview' className='object-cover w-full h-full' />
                          ) : (
                            <div className='flex flex-col items-center justify-center text-muted-foreground'>
                              <span className='text-xs'>Clique para escolher na biblioteca</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <ImagePickerDialog
                        open={pickerOpen}
                        onOpenChange={setPickerOpen}
                        onInsert={(url) => { field.onChange(url); setPickerOpen(false) }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            ) : (
              <FormField control={form.control} name='value' render={({ field }) => (
                <FormItem>
                  <FormLabel>Texto</FormLabel>
                  <FormControl>
                    <Input type='text' placeholder='Ex.: EG' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}
            <DialogFooter>
              <DialogClose asChild>
                <Button variant='outline' size="sm">Cancelar</Button>
              </DialogClose>
              <Button type='submit' size="sm" disabled={creating}>{creating ? <Loader className='animate-spin size-[0.85rem]' /> : 'Cadastrar'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}