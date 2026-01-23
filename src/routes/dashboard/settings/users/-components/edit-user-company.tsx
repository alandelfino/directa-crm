import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Form, FormField, FormItem, FormLabel, FormMessage, FormControl } from '@/components/ui/form'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { privateInstance } from '@/lib/auth'
import { toast } from 'sonner'
import { Edit, Loader } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

type NamedItem = { id: number, name: string }
type UserCompany = {
  id: number
  user_profile?: { id: number, name: string } | null
  team?: { id: number, name: string } | null
  active?: boolean | null
  observation?: string | null
}

const formSchema = z.object({
  active: z.boolean().default(true),
  team_id: z.string().min(1, { message: 'Selecione a equipe' }),
  profile_id: z.string().min(1, { message: 'Selecione o perfil' }),
  observation: z.string().optional().or(z.literal('')),
})

export function EditUserCompanySheet({ uc, onSaved }: { uc: UserCompany, onSaved?: () => void }) {
  const [open, setOpen] = useState(false)
  const form = useForm<z.input<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      active: uc.active === true,
      team_id: uc.team?.id ? String(uc.team.id) : '',
      profile_id: uc.user_profile?.id ? String(uc.user_profile.id) : '',
      observation: uc.observation ?? '',
    },
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      active: uc.active === true,
      team_id: uc.team?.id ? String(uc.team.id) : '',
      profile_id: uc.user_profile?.id ? String(uc.user_profile.id) : '',
      observation: uc.observation ?? '',
    })
  }, [open, form, uc.team?.id, uc.user_profile?.id, uc.active, uc.observation])

  const { data: teamsData, isLoading: isTeamsLoading } = useQuery({
    queryKey: ['teams', 'for-user-edit'],
    enabled: open,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryFn: async () => {
      const response = await privateInstance.get('/api:VPDORr9u/teams?per_page=50')
      if (response.status !== 200) throw new Error('Erro ao carregar equipes')
      return response.data as unknown
    },
  })

  const { data: profilesData, isLoading: isProfilesLoading } = useQuery({
    queryKey: ['profiles', 'for-user-edit'],
    enabled: open,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryFn: async () => {
      const response = await privateInstance.get('/api:BXIMsMQ7/user_profile?per_page=50')
      if (response.status !== 200) throw new Error('Erro ao carregar perfis')
      return response.data as unknown
    },
  })

  function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null
  }
  function asNamedList(raw: unknown): NamedItem[] {
    if (Array.isArray(raw)) {
      return raw.filter((v): v is NamedItem => isRecord(v) && typeof v.id === 'number' && typeof v.name === 'string')
    }
    if (isRecord(raw)) {
      const items = (raw as { items?: unknown }).items
      if (Array.isArray(items)) {
        return items.filter((v): v is NamedItem => isRecord(v) && typeof v.id === 'number' && typeof v.name === 'string')
      }
    }
    return []
  }

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async (values: z.input<typeof formSchema>) => {
      const payload = {
        active: values.active === true,
        team_id: Number(values.team_id),
        profile_id: Number(values.profile_id),
        observation: values.observation ?? '',
      }
      const response = await privateInstance.put(`/api:jO41sdEd/users_companies/${uc.id}`, payload)
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
        <Button variant={'outline'} size="sm" title={'Editar usuário'} aria-label={'Editar usuário'}>
          <Edit className='size-[0.85rem]' /> <span>Editar</span>
        </Button>
      </SheetTrigger>
      <SheetContent className='sm:max-w-[520px]'>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col h-full'>
            <SheetHeader>
              <SheetTitle>Editar usuário</SheetTitle>
              <SheetDescription>Atualize equipe e perfil do usuário.</SheetDescription>
            </SheetHeader>
            <div className='flex-1 grid auto-rows-min gap-6 px-4 py-4'>
              <FormField
                control={form.control}
                name='active'
                render={({ field }) => (
                  <div className='bg-neutral-50 p-4 flex items-center justify-between'>
                    <div className='flex flex-col'>
                      <FormLabel>Ativo</FormLabel>
                      <span className='text-sm text-muted-foreground'>Controla o acesso do usuário ao workspace.</span>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} aria-label='Alternar status do usuário' />
                    </FormControl>
                  </div>
                )}
              />
              <FormField
                control={form.control}
                name='observation'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observação</FormLabel>
                    <FormControl>
                      <textarea placeholder='Opcional' {...field}
                        className='file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm h-28 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive'
                      />
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
                            {asNamedList(teamsData).map((t) => (
                              <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                            ))}
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
                name='profile_id'
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
                            {asNamedList(profilesData).map((p) => (
                              <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                            ))}
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