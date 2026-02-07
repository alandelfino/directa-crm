import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Form, FormField, FormItem, FormLabel, FormMessage, FormControl } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { privateInstance } from '@/lib/auth'
import { toast } from 'sonner'
import { Edit, Loader } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

type User = {
  id: string
  name: string
  email: string
  profileId: number
  teamId: number
}

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.email({ message: 'Email inválido' }),
  teamId: z.string().optional(),
  profileId: z.string().optional(),
})

export function EditUserSheet({ user, onSaved }: { user: User, onSaved?: () => void }) {
  const [open, setOpen] = useState(false)
  const form = useForm<z.input<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
      teamId: user.teamId ? String(user.teamId) : '',
      profileId: user.profileId ? String(user.profileId) : '',
    },
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      name: user.name,
      email: user.email,
      teamId: user.teamId ? String(user.teamId) : '',
      profileId: user.profileId ? String(user.profileId) : '',
    })
  }, [open, form, user])

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
      const response = await privateInstance.put(`/tenant/users/${user.id}`, payload)
      if (response.status !== 200) throw new Error('Erro ao atualizar usuário')
      return response.data
    },
    onSuccess: () => {
      toast.success('Usuário atualizado com sucesso!')
      setOpen(false)
      onSaved?.()
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao atualizar usuário', {
        description: errorData?.detail || 'Não foi possível atualizar as informações do usuário.',
      })
    },
  })

  function onSubmit(values: z.input<typeof formSchema>) {
    return mutateAsync(values)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant={'outline'} size="sm" title={'Editar usuário'}>
          <Edit className='size-[0.85rem]' /> <span>Editar</span>
        </Button>
      </SheetTrigger>
      <SheetContent className='sm:max-w-[520px]'>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col h-full'>
            <SheetHeader>
              <SheetTitle>Editar usuário</SheetTitle>
              <SheetDescription>Atualize as informações do usuário.</SheetDescription>
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
                  {isPending ? <Loader className='animate-spin size-[0.85rem]' /> : 'Salvar alterações'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
