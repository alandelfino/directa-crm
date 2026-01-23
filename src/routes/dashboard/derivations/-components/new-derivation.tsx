import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
// Removed Select in favor of a card-based radio group for type selection
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Loader, Plus, Type as TypeIcon, Palette, Image as ImageIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useState } from 'react'
import { z } from 'zod'
import { toast } from 'sonner'
import { privateInstance } from '@/lib/auth'

const formSchema = z.object({
  nome: z.string().min(1, { message: 'Nome é obrigatório' }),
  nomeCatalogo: z.string().min(1, { message: 'Nome no catálogo é obrigatório' }),
  type: z.enum(['text', 'color', 'image']),
})

export function NewDerivationSheet({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false)
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: '',
      nomeCatalogo: '',
      type: 'text',
    },
  })

  const { isPending, mutate } = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) => {
      const payload = {
        name: values.nome,
        storeName: values.nomeCatalogo,
        type: values.type,
      }
      return privateInstance.post('/tenant/derivations', payload)
    },
    onSuccess: (response) => {
      if (response.status === 200 || response.status === 201) {
        toast.success('Derivação cadastrada com sucesso!')
        onCreated?.()
        form.reset()
        setOpen(false)
      } else {
        const errorData = (response.data as any)
        toast.error(errorData?.title || 'Erro ao cadastrar derivação', {
          description: errorData?.detail || 'Não foi possível cadastrar a derivação.'
        })
      }
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao cadastrar derivação', {
        description: errorData?.detail || 'Não foi possível cadastrar a derivação.'
      })
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutate(values)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size={'sm'}>
          <Plus className="size-[0.85rem]" /> Cadastrar
        </Button>
      </SheetTrigger>
      <SheetContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col h-full'>
            <SheetHeader>
              <SheetTitle>Cadastro de derivação</SheetTitle>
              <SheetDescription>Preencha os campos abaixo para cadastrar.</SheetDescription>
            </SheetHeader>

            <div className='flex-1 grid auto-rows-min gap-6 px-4 py-4'>
              <FormField
                control={form.control}
                name='nome'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder='Ex.: Tamanhos (PP ao EG)' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='nomeCatalogo'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome no catálogo</FormLabel>
                    <FormControl>
                      <Input placeholder='Ex.: Tamanhos' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='type'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Selecione um tipo</FormLabel>
                    <FormControl>
                      <div role='radiogroup' aria-label='Tipo de derivação' className='grid grid-cols-3 gap-3'>
                        {[
                          { value: 'text' as const, label: 'Texto', Icon: TypeIcon },
                          { value: 'color' as const, label: 'Cor', Icon: Palette },
                          { value: 'image' as const, label: 'Imagem', Icon: ImageIcon },
                        ].map(({ value, label, Icon }) => {
                          const selected = field.value === value
                          return (
                            <button
                              type='button'
                              key={value}
                              role='radio'
                              aria-checked={selected}
                              onClick={() => field.onChange(value)}
                              className={`rounded-md border bg-background p-4 text-left shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring flex flex-col items-center gap-2 ${
                                selected ? 'border-foreground' : 'border-muted'
                              } hover:bg-muted/40`}
                            >
                              <Icon className={`h-6 w-6 ${selected ? 'text-foreground' : 'text-muted-foreground'}`} />
                              <span className='text-sm font-medium'>{label}</span>
                              <span className={`mt-2 inline-flex items-center justify-center h-4 w-4 rounded-full border ${selected ? 'border-foreground' : 'border-muted-foreground'}`}>
                                <span className={`h-2 w-2 rounded-full ${selected ? 'bg-foreground' : 'bg-transparent'}`} />
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='mt-auto border-t p-4'>
              <div className="grid grid-cols-2 gap-4">
            <SheetClose asChild>
              <Button variant='outline' size="sm" className='w-full'>Cancelar</Button>
            </SheetClose>
            <Button type='submit' size="sm" disabled={isPending} className='w-full'>
              {isPending ? <Loader className='animate-spin size-[0.85rem]' /> : 'Cadastrar'}
            </Button>
          </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}