import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { privateInstance, auth } from '@/lib/auth'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Mail, Check, Loader2, X, AlertCircle, Calendar } from 'lucide-react'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getAvatarAbbrev } from '@/lib/utils'

type Company = { id: number; name: string; alias?: string | null }
type Invite = { created_at: number; status: 'pending' | 'accepted' | 'rejected' | 'canceled'; uuid: string; company: Company }

const getStatusBadge = (status: Invite['status']) => {
    switch (status) {
        case 'pending':
            return {
                label: 'Pendente',
                className: 'bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:border-yellow-800 dark:text-yellow-400'
            }
        case 'accepted':
            return {
                label: 'Aceito',
                className: 'bg-green-500/10 text-green-600 border-green-200 dark:border-green-800 dark:text-green-400'
            }
        case 'rejected':
            return {
                label: 'Rejeitado',
                className: 'bg-red-500/10 text-red-600 border-red-200 dark:border-red-800 dark:text-red-400'
            }
        case 'canceled':
            return {
                label: 'Cancelado',
                className: 'bg-muted text-muted-foreground border-border'
            }
        default:
            return {
                label: status,
                className: 'bg-muted text-muted-foreground border-border'
            }
    }
}

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
        <div className='max-w-5xl mx-auto p-6 space-y-8'>
          <div className='flex flex-col gap-1'>
            <h1 className='text-2xl font-bold tracking-tight'>Convites</h1>
            <p className='text-muted-foreground'>
                Gerencie seus convites para participar de outras empresas.
            </p>
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

  const formatDate = (ts: number) => {
    try {
        return new Date(ts).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
    } catch {
        return 'Data desconhecida'
    }
  }

  return (
    <div className='max-w-5xl mx-auto p-6 space-y-8'>
      <div className='flex flex-col gap-1'>
        <h1 className='text-2xl font-bold tracking-tight'>Convites</h1>
        <p className='text-muted-foreground'>
            Gerencie seus convites para participar de outras empresas.
        </p>
      </div>
      
      {isLoading && (
        <div className='space-y-4'>
          {[1,2,3].map((i) => (
             <div key={i} className="flex items-center justify-between p-4 border rounded-xl bg-card">
                 <div className="flex items-center gap-4">
                     <Skeleton className="h-12 w-12 rounded-full" />
                     <div className="space-y-2">
                         <Skeleton className="h-4 w-48" />
                         <Skeleton className="h-3 w-24" />
                     </div>
                 </div>
                 <Skeleton className="h-9 w-24" />
             </div>
          ))}
        </div>
      )}

      {isError && (<div className='text-destructive bg-destructive/10 p-4 rounded-md'>Não foi possível carregar os convites. Verifique sua autenticação.</div>)}

      {!isLoading && !isError && (
        <div className='space-y-4'>
          {(invites ?? []).map((inv) => (
            <div 
                key={inv.uuid} 
                className='group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border rounded-xl bg-card hover:bg-accent/5 transition-colors shadow-sm hover:shadow-md hover:border-primary/20'
            >
              <div className='flex items-start sm:items-center gap-4'>
                <Avatar className="h-12 w-12 rounded-lg border-2 border-background shadow-sm">
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {getAvatarAbbrev(inv.company?.name ?? 'Empresa')}
                    </AvatarFallback>
                </Avatar>
                
                <div className='space-y-1'>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className='font-semibold text-lg'>{inv.company?.name ?? 'Empresa'}</span>
                        {inv.company?.alias && <Badge variant={'secondary'} className="text-xs font-normal">{inv.company.alias}</Badge>}
                        <Badge variant={'outline'} className={`text-xs font-normal ${getStatusBadge(inv.status).className}`}>
                            {getStatusBadge(inv.status).label}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Recebido em {formatDate(inv.created_at)}</span>
                    </div>
                </div>
              </div>

              {inv.status === 'pending' && (
              <div className='flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0'>
                <Button 
                  size="sm" 
                  variant="ghost"
                  className="flex-1 sm:flex-none text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  disabled={isAccepting || isRejecting}
                  onClick={() => rejectInvite(inv.uuid || String(inv.company.id))}
                >
                  {isRejecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                  Recusar
                </Button>
                <Button 
                  size="sm" 
                  className="flex-1 sm:flex-none shadow-sm"
                  disabled={isAccepting || isRejecting}
                  onClick={() => acceptInvite(inv.uuid || String(inv.company.id))}
                >
                  {isAccepting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  Aceitar
                </Button>
              </div>
              )}
            </div>
          ))}
          {(!invites || invites.length === 0) && (
            <div className="py-12">
                <Empty>
                <EmptyHeader>
                    <EmptyMedia variant='icon' className="bg-muted/50">
                    <Mail className='h-6 w-6 text-muted-foreground' />
                    </EmptyMedia>
                    <EmptyTitle>Nenhum convite pendente</EmptyTitle>
                    <EmptyDescription className="max-w-sm mx-auto">
                        Você não possui convites pendentes no momento. Quando uma empresa te convidar, o convite aparecerá aqui.
                    </EmptyDescription>
                </EmptyHeader>
                </Empty>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
