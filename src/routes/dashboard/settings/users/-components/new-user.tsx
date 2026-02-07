import { useState } from 'react'
import { z } from 'zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Form, FormField, FormItem, FormLabel, FormMessage, FormControl } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { privateInstance } from '@/lib/auth'
import { toast } from 'sonner'
import { Plus, Loader } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.email('Email inválido'),
  teamId: z.string().optional(),
  profileId: z.string().optional(),
})

export function NewUserSheet({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false)
  const form = useForm<z.input<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      teamId: '',
      profileId: '',
    },
  })

  const { data: teamsData, isLoading: isTeamsLoading } = useQuery({
    queryKey: ['teams', 'lookup'],
    enabled: open,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const response = await privateInstance.get('/tenant/teams?limit=100')
      return response.data?.items as { id: number, name: string }[]
    },
  })

  const { data: profilesData, isLoading: isProfilesLoading } = useQuery({
    queryKey: ['profiles', 'lookup'],
    enabled: open,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const response = await privateInstance.get('/tenant/user-profiles?limit=100')
      return response.data?.items as { id: number, name: string }[]
    },
  })

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async (values: z.input<typeof formSchema>) => {
      const payload = {
        name: values.name,
        email: values.email,
        teamId: values.teamId ? Number(values.teamId) : undefined,
        profileId: values.profileId ? Number(values.profileId) : undefined,
      }
      const response = await privateInstance.post('/tenant/users', payload)
      if (response.status !== 201 && response.status !== 200) throw new Error('Erro ao criar usuário')
      return response.data
    },
    onSuccess: () => {
      toast.success('Usuário criado com sucesso!')
      setOpen(false)
      form.reset()
      onCreated?.()
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao criar usuário', {
        description: errorData?.detail || 'Não foi possível criar o usuário.',
      })
    },
  })

  function onSubmit(values: z.input<typeof formSchema>) {
    return mutateAsync(values)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm">
          <Plus className='size-[0.85rem] mr-2' /> Novo usuário
        </Button>
      </SheetTrigger>
      <SheetContent className='sm:max-w-[520px]'>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col h-full'>
            <SheetHeader>
              <SheetTitle>Novo usuário</SheetTitle>
              <SheetDescription>Adicione um novo usuário ao workspace.</SheetDescription>
            </SheetHeader>
            <div className='flex-1 grid auto-rows-min gap-4 px-4 py-4'>
                <FormField control={form.control} name='name' render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name='email' render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className='grid grid-cols-2 gap-4'>
                 <FormField control={form.control} name='teamId' render={({ field }) => (
                  <FormItem>
                    <FormLabel>Equipe</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange} disabled={isTeamsLoading}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                            {teamsData?.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                            </SelectGroup>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                 <FormField control={form.control} name='profileId' render={({ field }) => (
                  <FormItem>
                    <FormLabel>Perfil</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange} disabled={isProfilesLoading}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                            {profilesData?.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                            </SelectGroup>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                </div>
            </div>
             <div className='mt-auto border-t p-4'>
              <div className='grid grid-cols-2 gap-4'>
                <SheetClose asChild>
                  <Button variant='outline' size="sm" className='w-full'>Cancelar</Button>
                </SheetClose>
                <Button type='submit' size="sm" disabled={isPending} className='w-full'>
                  {isPending ? <Loader className='animate-spin size-[0.85rem]' /> : 'Criar usuário'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
