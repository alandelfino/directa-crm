import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Edit, Loader } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { privateInstance } from '@/lib/auth'

const formSchema = z.object({
  nome: z.string().min(1, { message: 'Nome é obrigatório' }),
  nomeCatalogo: z.string().min(1, { message: 'Nome no catálogo é obrigatório' }),
  type: z.enum(['text', 'color', 'image']),
})

type DerivationDetail = {
  id: number
  nome?: string
  name?: string
  nomeCatalogo?: string
  catalog_name?: string
  store_name?: string
  tipo?: 'Cor' | 'Texto' | 'Imagem' | 'color' | 'text' | 'image'
  type?: 'text' | 'color' | 'image'
}

export function EditDerivationSheet({ derivationId, onUpdated }: { derivationId: number, onUpdated?: () => void }) {
  const [open, setOpen] = useState(false)
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: '',
      nomeCatalogo: '',
      type: 'text',
    },
  })

  const { data, isLoading, isError } = useQuery<DerivationDetail>({
    queryKey: ['derivation', derivationId],
    queryFn: async () => {
      const response = await privateInstance.get(`/api:JOs6IYNo/derivations/${derivationId}`)
      if (response.status !== 200) throw new Error('Erro ao carregar derivação')
      return response.data
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: open,
  })

  useEffect(() => {
    if (!data) return
    // Normaliza o tipo vindo do backend para o enum esperado (text|color|image)
    const typeVal: 'text' | 'color' | 'image' | undefined =
      data.type ??
      (data.tipo === 'Cor' ? 'color' : data.tipo === 'Texto' ? 'text' : data.tipo === 'Imagem' ? 'image' :
        data.tipo === 'color' ? 'color' : data.tipo === 'text' ? 'text' : data.tipo === 'image' ? 'image' : undefined)
    form.reset({
      nome: data.nome ?? data.name ?? '',
      nomeCatalogo: data.nomeCatalogo ?? data.catalog_name ?? data.store_name ?? '',
      type: typeVal ?? 'text',
    })
  }, [data])

  const { isPending, mutate } = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) => {
      const payload = {
        name: values.nome,
        store_name: values.nomeCatalogo,
        type: values.type,
      }
      return privateInstance.put(`/api:JOs6IYNo/derivations/${derivationId}`, payload)
    },
    onSuccess: (response) => {
      if (response.status === 200 || response.status === 204) {
        toast.success('Derivação atualizada com sucesso!')
        onUpdated?.()
        setOpen(false)
      } else {
        toast.error('Erro ao atualizar derivação')
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? 'Erro ao atualizar derivação')
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutate(values)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size={'sm'} variant={'outline'}>
          <Edit className="size-[0.85rem]" /> Editar
        </Button>
      </SheetTrigger>
      <SheetContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col h-full'>
            <SheetHeader>
              <SheetTitle>Editar derivação</SheetTitle>
              <SheetDescription>Atualize os campos e salve suas alterações.</SheetDescription>
            </SheetHeader>

            {isError && (
              <div className='px-4 text-sm text-red-600'>Erro ao carregar os dados da derivação.</div>
            )}

            <div className='flex-1 grid auto-rows-min gap-6 px-4 py-4'>
              <FormField
                control={form.control}
                name='nome'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder='Ex.: Tamanhos (PP ao EG)' {...field} disabled={isLoading} />
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
                      <Input placeholder='Ex.: Tamanhos' {...field} disabled={isLoading} />
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
                    <FormLabel>Tipo</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange} disabled={isLoading}>
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder='Selecione o tipo' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value='color'>Cor</SelectItem>
                            <SelectItem value='text'>Texto</SelectItem>
                            <SelectItem value='image'>Imagem</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
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
            <Button type='submit' size="sm" disabled={isPending || isLoading} className='w-full'>
              {(isPending || isLoading) ? <Loader className='animate-spin size-[0.85rem]' /> : 'Salvar'}
            </Button>
          </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}