import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Form, FormField, FormItem, FormLabel, FormMessage, FormControl } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { privateInstance } from '@/lib/auth'
import { toast } from 'sonner'
import { Edit, Loader } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const formSchema = z.object({
  name: z.string().min(1, { message: 'Nome é obrigatório' }),
})

export function EditDistributionCenterSheet({ distributionCenterId, onSaved }: { distributionCenterId: number, onSaved?: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '' },
  })

  useEffect(() => {
    async function run() {
      try {
        setLoading(true)
        const response = await privateInstance.get(`/api:k-mANdpH/distribution_centers/${distributionCenterId}`)
        if (response.status !== 200 || !response.data) throw new Error('Falha ao carregar centro')
        const data = response.data as { name?: string }
        form.reset({ name: data.name ?? '' })
      } catch (error: any) {
        const errorData = error?.response?.data
        toast.error(errorData?.title || 'Erro ao carregar centro', {
          description: errorData?.detail || 'Não foi possível carregar os dados do centro.'
        })
      } finally {
        setLoading(false)
      }
    }
    if (open && distributionCenterId) {
      run()
    }
  }, [open, distributionCenterId])

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const payload = { name: values.name }
      const response = await privateInstance.put(`/api:k-mANdpH/distribution_centers/${distributionCenterId}`, payload)
      if (response.status !== 200) throw new Error('Erro ao salvar centro')
      return response.data
    },
    onSuccess: () => {
      toast.success('Centro atualizado com sucesso!')
      setOpen(false)
      onSaved?.()
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao salvar centro', {
        description: errorData?.detail || 'Não foi possível atualizar o centro.'
      })
    }
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await mutateAsync(values)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant={'outline'}>
          <Edit className='h-4 w-4' />
          Editar
        </Button>
      </SheetTrigger>
      <SheetContent className='sm:max-w-sm'>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col h-full'>
            <SheetHeader>
              <SheetTitle>Editar centro</SheetTitle>
              <SheetDescription>
                {loading ? (
                  <span className='flex items-center gap-2'><Loader className='animate-spin h-4 w-4' />Carregando...</span>
                ) : (
                  <>Atualize os dados do centro de distribuição.</>
                )}
              </SheetDescription>
            </SheetHeader>
            <div className='flex-1 grid auto-rows-min gap-6 px-4 py-4'>
              <FormField control={form.control} name='name' render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder='Ex.: Centro SP' {...field} disabled={loading || isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className='mt-auto border-t p-4'>
              <div className='grid grid-cols-2 gap-4'>
                <SheetClose asChild>
                  <Button variant='outline' className='w-full'>Cancelar</Button>
                </SheetClose>
                <Button type='submit' disabled={isPending} className='w-full'>
                  {isPending ? <Loader className='animate-spin' /> : 'Salvar' }
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}