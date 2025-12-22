import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { privateInstance, auth } from '@/lib/auth'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Mail, Check, Loader2, X, AlertCircle } from 'lucide-react'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { Button } from '@/components/ui/button'

type Company = { id: number; name: string; alias?: string | null }
type Invite = { created_at: number; status: 'pending'; uuid: string; company: Company }

export const Route = createFileRoute('/user/invites/')({
  component: InvitesPage,
})

function InvitesPage() {
  const [isEmailVerified, setIsEmailVerified] = useState<boolean | null>(null)
  
  useEffect(() => { 
    auth.userGuard() 
    
    const checkVerification = () => {
        const subdomain = window.location.hostname.split('.')[0]
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
  
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data: invites, isLoading, isError, error } = useQuery({
    queryKey: ['auth', 'invites'],
    refetchOnWindowFocus: false,
    enabled: isEmailVerified === true,
    queryFn: async () => {
      const res = await privateInstance.get('/api:eA5lqIuH/auth/invites')
      const items: Invite[] = Array.isArray(res.data) ? res.data : (res.data?.items ?? [])
      return items.filter((inv: any) => inv && typeof inv.uuid === 'string' && inv.company && typeof inv.company.id === 'number') as Invite[]
    },
  })

  const { mutate: acceptInvite, isPending: isAccepting } = useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await privateInstance.post('/api:eA5lqIuH/auth/accept-invite', {
        invitation_id: invitationId
      })
      return response.data
    },
    onSuccess: () => {
      toast.success('Convite aceito com sucesso!', {
        description: 'Você já pode acessar a empresa.'
      })
      // Invalida a lista de convites para atualizar a interface
      queryClient.invalidateQueries({ queryKey: ['auth', 'invites'] })
      
      // Opcional: Redirecionar para a lista de empresas ou dashboard
      navigate({ to: '/user/companies' })
    },
    onError: (error: any) => {
      console.error('Erro ao aceitar convite:', error)
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao aceitar convite', {
        description: errorData?.message || 'Não foi possível processar sua solicitação.'
      })
    }
  })

  const { mutate: rejectInvite, isPending: isRejecting } = useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await privateInstance.post('/api:eA5lqIuH/auth/reject-invite', {
        invitation_id: invitationId
      })
      return response.data
    },
    onSuccess: () => {
      toast.success('Convite rejeitado.', {
        description: 'O convite foi removido da sua lista.'
      })
      queryClient.invalidateQueries({ queryKey: ['auth', 'invites'] })
    },
    onError: (error: any) => {
      console.error('Erro ao rejeitar convite:', error)
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao rejeitar convite', {
        description: errorData?.message || 'Não foi possível processar sua solicitação.'
      })
    }
  })

  useEffect(() => {
    if (isError) {
      console.warn('Falha ao carregar convites:', error)
      toast.warning('Não foi possível carregar seus convites. Verifique sua conexão.', {
        description: 'Tentaremos novamente automaticamente.',
      })
    }
  }, [isError, error])

  if (isEmailVerified === false) {
    return (
        <div className='container mx-auto p-6'>
          <div className='flex items-center gap-2 mb-4'>
            <Mail className='h-5 w-5 text-muted-foreground' />
            <span className='text-base font-semibold'>Convites</span>
          </div>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant='icon' className="bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400">
                <AlertCircle className='h-5 w-5' />
              </EmptyMedia>
              <EmptyTitle>Email não verificado</EmptyTitle>
              <EmptyDescription>
                Você precisa verificar seu email para visualizar e aceitar convites.
                Verifique sua caixa de entrada ou solicite um novo email de confirmação no topo da página.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
    )
  }

  return (
    <div className='container mx-auto p-6'>
      <div className='flex items-center gap-2 mb-4'>
        <Mail className='h-5 w-5 text-muted-foreground' />
        <span className='text-base font-semibold'>Convites</span>
      </div>
      {isLoading && (
        <div className='space-y-3'>
          {[1,2].map((i) => (
            <Card key={i}><CardContent className='flex items-center justify-between py-4'>
              <div className='flex items-center gap-3'>
                <Skeleton className='h-5 w-48' />
                <Skeleton className='h-5 w-20' />
              </div>
              <Skeleton className='h-11 w-28' />
            </CardContent></Card>
          ))}
        </div>
      )}

      {isError && (<div className='text-destructive'>Não foi possível carregar os convites. Verifique sua autenticação.</div>)}

      {!isLoading && !isError && (
        <div className='space-y-3'>
          {(invites ?? []).map((inv) => (
            <Card key={inv.uuid}>
              <CardContent className='flex items-center justify-between py-4'>
                <div className='flex items-center gap-3'>
                  <Mail className='h-4 w-4 text-muted-foreground' />
                  <span className='font-medium'>{inv.company?.name ?? 'Empresa'}</span>
                  {inv.company?.alias ? <Badge variant={'secondary'}>{inv.company.alias}</Badge> : null}
                  <Badge variant={'outline'} className='ml-2'>Pendente</Badge>
                </div>
                <div className='flex items-center gap-2'>
                  <span className='text-xs text-muted-foreground hidden sm:inline'>Convite: {inv.uuid}</span>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    disabled={isAccepting || isRejecting}
                    onClick={() => rejectInvite(inv.uuid || String(inv.company.id))}
                  >
                    {isRejecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                    Rejeitar
                  </Button>
                  <Button 
                    size="sm" 
                    className="gap-2"
                    disabled={isAccepting || isRejecting}
                    onClick={() => acceptInvite(inv.uuid || String(inv.company.id))}
                  >
                    {isAccepting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Aceitar
                  </Button>
                </div>
              </CardContent>
              <CardFooter className='pt-0 pb-4' />
            </Card>
          ))}
          {(!invites || invites.length === 0) && (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant='icon'>
                  <Mail className='h-5 w-5 text-muted-foreground' />
                </EmptyMedia>
                <EmptyTitle>Nenhum convite pendente</EmptyTitle>
                <EmptyDescription>Você ainda não possui convites. Quando tiver, eles aparecerão aqui.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
      )}
    </div>
  )
}
