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
import { Loader, Send } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const formSchema = z.object({
  email: z.string().email({ message: 'Informe um e-mail válido' }),
  team_id: z.string().min(1, { message: 'Selecione a equipe' }),
  user_profile_id: z.string().min(1, { message: 'Selecione o perfil' }),
})

export function NewInvitationSheet({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false)
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', team_id: '', user_profile_id: '' },
  })

  function resetForm() {
    form.reset({ email: '', team_id: '', user_profile_id: '' })
  }

  // Resetar ao fechar o sheet
  // Mantém o comportamento consistente mesmo quando fecha via overlay, esc ou botão Cancelar
  // Sem modificar os valores enquanto estiver aberto
  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) resetForm()
  }

  const { data: teamsData, isLoading: isTeamsLoading } = useQuery({
    queryKey: ['teams'],
    enabled: open,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await privateInstance.get('/api:VPDORr9u/teams')
      if (response.status !== 200) throw new Error('Erro ao carregar equipes')
      return response.data as any
    }
  })

  const { data: profilesData, isLoading: isProfilesLoading } = useQuery({
    queryKey: ['profiles', 'for-invitations'],
    enabled: open,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await privateInstance.get('/api:BXIMsMQ7/user_profile?per_page=50')
      if (response.status !== 200) throw new Error('Erro ao carregar perfis')
      return response.data as any
    }
  })

  const { isPending, mutate } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const payload: any = {
        email: values.email,
        team_id: Number(values.team_id),
        user_profile_id: Number(values.user_profile_id),
      }
      const response = await privateInstance.post('/api:0jQElwax/invitations/invite', payload)
      if (response.status !== 200 && response.status !== 201) throw new Error('Erro ao criar convite')
      return response
    },
    onSuccess: () => {
      toast.success('Convite criado com sucesso!')
      setOpen(false)
      onCreated?.()
      form.reset({ email: '', team_id: '', user_profile_id: '' })
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao criar convite', {
        description: errorData?.detail || 'Não foi possível enviar o convite. Tente novamente.'
      })
    }
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutate(values)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <div className='flex items-center'>
          <Button
            variant={'default'}
            size={'icon'}
            className='xl:hidden'
            aria-label='Novo convite por e-mail'
            title='Enviar convite por e-mail'
          >
            <Send className='h-4 w-4' />
          </Button>
          <Button
            variant={'default'}
            className='hidden xl:inline-flex'
          >
            <Send className='h-4 w-4' /> Enviar convite
          </Button>
        </div>
      </SheetTrigger>
      <SheetContent className='sm:max-w-[520px]'>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col h-full'>
            <SheetHeader>
              <SheetTitle>Novo convite</SheetTitle>
              <SheetDescription>Envie um convite para um usuário participar do workspace.</SheetDescription>
            </SheetHeader>

            <div className='flex-1 grid auto-rows-min gap-6 px-4 py-4'>
              <FormField
                control={form.control}
                name='email'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input type='email' placeholder='usuario@empresa.com' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='team_id'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Equipe</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange} disabled={isTeamsLoading}>
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder={isTeamsLoading ? 'Carregando equipes...' : 'Selecione a equipe'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {Array.isArray((teamsData as any)?.items)
                              ? (teamsData as any).items.map((t: any) => (
                                <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                              ))
                              : Array.isArray(teamsData)
                                ? (teamsData as any).map((t: any) => (
                                  <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                                ))
                                : null}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='user_profile_id'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Perfil</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange} disabled={isProfilesLoading}>
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder={isProfilesLoading ? 'Carregando perfis...' : 'Selecione o perfil'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {Array.isArray((profilesData as any)?.items)
                              ? (profilesData as any).items.map((p: any) => (
                                <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                              ))
                              : Array.isArray(profilesData)
                                ? (profilesData as any).map((p: any) => (
                                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                                ))
                                : null}
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
              <div className='grid grid-cols-2 gap-4'>
                <SheetClose asChild>
                  <Button variant='outline' className='w-full'>Cancelar</Button>
                </SheetClose>
                <Button type='submit' disabled={isPending} className='w-full'>
                  {isPending ? <Loader className='animate-spin' /> : 'Enviar convite'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}