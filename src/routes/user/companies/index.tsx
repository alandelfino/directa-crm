import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { privateInstance, auth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, Building2, Trash, LogIn, MoreVertical, AlertCircle } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { getAvatarAbbrev } from '@/lib/utils'
//

type UserCompany = {
  id: number
  created_at: number
  user_id?: number | null
  name: string
  alias?: string | null
  // New fields from updated API model
  is_me?: boolean
  company_id?: number
  active?: boolean
  users_profile_id?: number
  image?: { url?: string | null } | null
  segment?: string | null
  segment_description?: string | null
  website?: string | null
  country?: string | null
}

export const Route = createFileRoute('/user/companies/')({
  component: UserCompaniesPage,
})

function getSubdomain() {
  const host = window.location.hostname
  if (host === 'localhost' || /^127(\.\d+){0,3}$/.test(host)) return 'localhost'
  const parts = host.split('.')
  return parts[0] ?? host
}

function UserCompaniesPage() {
  const navigate = useNavigate()
  const [loggingCompanyId, setLoggingCompanyId] = useState<number | null>(null)
  const [revokeOpen, setRevokeOpen] = useState(false)
  const [revokingCompany, setRevokingCompany] = useState<UserCompany | null>(null)
  const [revokeConfirmText, setRevokeConfirmText] = useState('')
  const [isEmailVerified, setIsEmailVerified] = useState<boolean | null>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    auth.userGuard()
    
    const checkVerification = () => {
        const subdomain = getSubdomain()
        const storageKey = `${subdomain}-directa-user`
        try {
            const raw = localStorage.getItem(storageKey)
            if (raw) {
                const user = JSON.parse(raw)
                setIsEmailVerified(user.verified_email === true)
            }
        } catch { }
    }
    checkVerification()
    
    const handler = (evt: Event) => {
        const e = evt as CustomEvent<{ verified_email?: boolean }>
        if (e.detail?.verified_email !== undefined) {
            setIsEmailVerified(e.detail.verified_email)
        } else {
            checkVerification()
        }
    }
    window.addEventListener('directa:user-updated', handler)
    return () => window.removeEventListener('directa:user-updated', handler)
  }, [])

  const { data, isLoading, isError, error } = useQuery({
    refetchOnWindowFocus: false,
    queryKey: ['auth', 'companies'],
    enabled: isEmailVerified === true,
    queryFn: async () => {
      // Listar empresas do usuário autenticado via endpoint de auth (escopo de /user)
      const res = await privateInstance.get('/api:eA5lqIuH/auth/companies')
      const rawItems = Array.isArray(res.data) ? res.data : (res.data?.items ?? [])
      const normalized: UserCompany[] = rawItems
        .map((it: any) => {
          const c = it?.company ?? {}
          const rawCompanyId = typeof c?.id === 'number' ? c.id : (typeof it?.company_id === 'number' ? it.company_id : undefined)
          const id = Number(rawCompanyId)
          const name = String(c?.name ?? it?.name ?? '')
          const alias = typeof c?.alias === 'string' ? c.alias : (typeof it?.alias === 'string' ? it.alias : null)
          const imageUrl = c?.image?.url
          const segmentName = typeof c?.segment?.name === 'string' ? c.segment.name : (typeof c?.segment === 'string' ? c.segment : null)
          const segmentDescription = typeof c?.segment?.description === 'string' ? c.segment.description : null
          const website = typeof c?.website === 'string' ? c.website : (typeof it?.website === 'string' ? it.website : null)
          const active = typeof it?.active === 'boolean' ? it.active : (typeof c?.active === 'boolean' ? c.active : undefined)
          return {
            id: Number.isFinite(id) ? id : undefined as any,
            company_id: Number.isFinite(id) ? id : undefined,
            created_at: Number(c?.created_at) || Date.now(),
            user_id: typeof it?.user_id === 'number' ? it.user_id : null,
            name,
            alias,
            is_me: Boolean(it?.is_me),
            active,
            users_profile_id: typeof it?.users_profile_id === 'number' ? it.users_profile_id : undefined,
            image: (imageUrl && typeof imageUrl === 'string') ? { url: imageUrl } : null,
            segment: segmentName,
            segment_description: segmentDescription,
            website,
            country: typeof it?.country === 'string' ? it.country : null,
          }
        })
        .filter((uc: UserCompany) => Number.isFinite(uc.id) && !!uc.name)
      return normalized
    },
  })

  useEffect(() => {
    if (isError) {
      console.warn('Falha ao carregar empresas:', error)
      toast.warning('Não foi possível carregar as empresas. Verifique sua conexão.', {
        description: 'Tentaremos novamente automaticamente.',
      })
    }
  }, [isError, error])

  async function enterCompany(uc: UserCompany) {
    const companyId = uc.company_id ?? uc.id
    setLoggingCompanyId(companyId)
    try {
      // Enviar a propriedade `company_id` da listagem como `company_id` na requisição
      const res = await privateInstance.post('/api:eA5lqIuH/auth/login-company', { company_id: companyId })
      const authToken: string | undefined = res?.data?.authToken
      const user = res?.data?.user
      const company = res?.data?.company ?? { id: companyId, name: uc.name, alias: uc.alias, image: uc.image ?? null }
      const sub = getSubdomain()
      if (authToken) { auth.normalizeTokenStorage(authToken) }
      if (user) {
        localStorage.setItem(`${sub}-directa-user`, JSON.stringify(user))
        try {
          const avatarUrl = user?.image?.url ?? user?.avatar_url ?? null
          window.dispatchEvent(new CustomEvent('directa:user-updated', { detail: { name: user?.name, email: user?.email, avatarUrl } }))
        } catch { }
      }
      localStorage.setItem(`${sub}-directa-company`, JSON.stringify(company))
      window.dispatchEvent(new CustomEvent('directa:company-updated', { detail: company }))
      navigate({ to: '/dashboard' })
    } catch (err) {
      console.error('Falha ao autenticar na empresa:', err)
    } finally {
      setLoggingCompanyId(null)
    }
  }

  const { isPending: isRevoking, mutateAsync: revokeAccess } = useMutation({
    mutationFn: async () => {
      const companyId = revokingCompany?.company_id ?? revokingCompany?.id
      const res = await privateInstance.post('https://server.directacrm.com.br/api:eA5lqIuH/auth/remove-access', { company_id: companyId })
      return res.data
    },
    onSuccess: () => {
      toast.success('Acesso revogado com sucesso')
      setRevokeOpen(false)
      setRevokingCompany(null)
      setRevokeConfirmText('')
      queryClient.invalidateQueries({ queryKey: ['auth', 'companies'] })
    },
    onError: (error: any) => {
      const title = error?.response?.data?.payload?.title
      const message = error?.response?.data?.message ?? 'Falha ao revogar acesso'
      if (title) toast.error(title, { description: message })
      else toast.error(message)
    }
  })

  return (
    <div className='mx-auto p-6'>

      <div className='flex items-center'>
        <div className='flex flex-col gap-2'>
          <div className='flex flex-col text-xl'>
            {(() => { const sub = getSubdomain(); let name = 'Usuário'; try { const raw = localStorage.getItem(`${sub}-directa-user`); const u = raw ? JSON.parse(raw) : null; name = u?.name?.split(' ')[0] || name } catch { } return (<span className='text-md font-medium'>Olá {name},</span>) })()}
            <span className='text-sm text-muted-foreground'>Você tem {data?.length ?? 0} {data?.length === 1 ? 'conta disponível para acesso.' : 'contas disponíveis, qual deseja acessar?'}</span>
          </div>
        </div>

      </div>

      <div className='space-y-3 mt-4'>
        {isEmailVerified === false && (
            <Empty>
                <EmptyHeader>
                    <EmptyMedia variant='icon' className="bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400">
                        <AlertCircle className='h-5 w-5' />
                    </EmptyMedia>
                    <EmptyTitle>Email não verificado</EmptyTitle>
                    <EmptyDescription>
                        Você precisa verificar seu email para acessar suas empresas.
                        Verifique sua caixa de entrada ou solicite um novo email de confirmação no topo da página.
                    </EmptyDescription>
                </EmptyHeader>
            </Empty>
        )}

        {isLoading && isEmailVerified !== false && (
          <div className='space-y-3'>
            {[1, 2, 3].map((i) => (
              <Card key={i}><CardContent className='flex items-center justify-between py-4'>
                <div className='flex items-center gap-3'>
                  <Skeleton className='h-5 w-40' />
                  <Skeleton className='h-5 w-20' />
                </div>
                <Skeleton className='h-11 w-28' />
              </CardContent></Card>
            ))}
          </div>
        )}

        {isError && isEmailVerified !== false && (<div className='text-destructive'>Não foi possível carregar as empresas. Verifique sua autenticação.</div>)}

        {!isLoading && !isError && isEmailVerified !== false && (
          <div className='space-y-3'>
            {(data ?? []).map((uc) => (
              <Card key={uc.id}>

                <CardContent className='p-4 relative'>
                  <div className='grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-4 items-stretch'>
                    <div className='flex flex-col gap-3'>
                      <div className='flex items-center gap-3'>
                        <Avatar className='h-12 w-12 rounded-md border p-1'>
                          <AvatarImage src={uc.image?.url ?? undefined} alt={uc.name} />
                          <AvatarFallback className='rounded-md text-[10px] leading-none font-semibold'>
                            {getAvatarAbbrev(uc.name || 'Empresa')}
                          </AvatarFallback>
                        </Avatar>
                        <div className='flex items-center gap-2'>
                          <CardTitle className='m-0 text-lg font-medium leading-none'>{uc.name}</CardTitle>
                          {uc.is_me ? (
                            <Badge variant={'default'} className='text-xs bg-blue-50 text-blue-500'>proprietário</Badge>
                          ) : null}
                        </div>
                      </div>
                      <div className='gap-x-3 gap-y-2 items-start'>
                        <div className='flex flex-col'>
                          <span className='text-sm font-medium'>{uc.segment ?? '—'}</span>
                          {uc.segment_description ? (
                            <span className='text-xs text-muted-foreground'>{uc.segment_description}</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild className='absolute top-2 right-2'>
                        <Button variant={'ghost'} size={'icon'} className=' w-7 h-7 rounded-md'>
                          <MoreVertical className='h-4 w-4' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end' className='w-44'>
                        <DropdownMenuItem onClick={() => { setRevokingCompany(uc); setRevokeOpen(true) }} className='text-red-600 focus:text-red-600'>
                          <Trash className='mr-2 h-4 w-4' />
                          Revogar Acesso
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <div className='flex items-center justify-center'>
                      <Button variant={'default'} className='h-9 rounded-lg px-5' onClick={() => enterCompany(uc)} disabled={loggingCompanyId === (uc.company_id ?? uc.id)}>
                        {loggingCompanyId === uc.id ? (
                          <>
                            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                            Entrando
                          </>
                        ) : (
                          <>
                            Acessar <LogIn className='ml-1 h-4 w-4' />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Dialog open={revokeOpen} onOpenChange={(o) => { setRevokeOpen(o); if (!o) { setRevokingCompany(null); setRevokeConfirmText('') } }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Revogar acesso</DialogTitle>
                  <DialogDescription>Deseja revogar seu acesso à empresa {revokingCompany?.name}?</DialogDescription>
                </DialogHeader>
                <div className='space-y-2'>
                  <Label htmlFor='revoke-confirm'>Digite "revogar" para confirmar</Label>
                  <Input id='revoke-confirm' value={revokeConfirmText} onChange={(e) => setRevokeConfirmText(e.target.value)} placeholder='revogar' aria-invalid={revokeConfirmText.length > 0 && revokeConfirmText.trim().toLowerCase() !== 'revogar'} />
                </div>
                <DialogFooter>
                  <Button variant={'outline'} onClick={() => setRevokeOpen(false)}>Cancelar</Button>
                  <Button variant={'destructive'} onClick={() => revokeAccess()} disabled={isRevoking || revokeConfirmText.trim().toLowerCase() !== 'revogar'}>
                    {isRevoking ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
                    {isRevoking ? 'Revogando...' : 'Confirmar revogação'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            {(!data || data.length === 0) && (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant='icon'>
                    <Building2 className='h-5 w-5 text-muted-foreground' />
                  </EmptyMedia>
                  <EmptyTitle>Nenhuma empresa disponível</EmptyTitle>
                  <EmptyDescription>Você ainda não possui acesso a empresas. Quando tiver, elas aparecerão aqui.</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button className='h-11 rounded-xl px-5'>Cadastrar uma empresa</Button>
                </EmptyContent>
              </Empty>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
