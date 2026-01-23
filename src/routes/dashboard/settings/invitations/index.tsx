import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { privateInstance } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { DataTable, type ColumnDef } from '@/components/data-table'
import { Checkbox } from '@/components/ui/checkbox'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'
import { Users, RefreshCw, ArrowUpRight, Loader, CircleX } from 'lucide-react'
import { NewInvitationSheet } from './-components/new-invitation'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
 

export const Route = createFileRoute('/dashboard/settings/invitations/')({
  component: RouteComponent,
})

type Invitation = {
  id: number
  email: string
  role?: 'admin' | 'member' | 'viewer'
  status?: 'pending' | 'canceled' | 'accepted'
  active?: boolean
  accepted?: boolean
  company_id?: number
  workspace_id?: number
  team_id?: number
  user_profile_id?: number
  token?: string
  created_at?: string
  expires_at?: string
}

type InvitationsResponse = {
  items: Invitation[]
  itemsTotal?: number
  page?: number
  per_page?: number
}

function RouteComponent() {
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [totalItems, setTotalItems] = useState(0)
  
  const [selectedInvites, setSelectedInvites] = useState<number[]>([])
  const [openCancelDialog, setOpenCancelDialog] = useState(false)

  const { isPending: isCancelling, mutateAsync: cancelSelectedInvite } = useMutation({
    mutationFn: async () => {
      const id = selectedInvites[0]
      const url = `/api:0jQElwax/invitations/${id}/cancel`
      const response = await privateInstance.post(url, {})
      if (response.status < 200 || response.status >= 300) throw new Error('Falha ao cancelar convite')
      return response.data
    },
    onSuccess: () => {
      toast.success('Convite cancelado')
      setOpenCancelDialog(false)
      setSelectedInvites([])
      refetch()
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.title ?? 'Erro ao cancelar convite', {
        description: error?.response?.data?.detail ?? 'Não foi possível cancelar o convite. Tente novamente.'
      })
    }
  })

  const { data, isLoading, isRefetching, isError, refetch } = useQuery({
    refetchOnWindowFocus: false,
    queryKey: ['invitations', currentPage, perPage],
    queryFn: async () => {
      const response = await privateInstance.get<InvitationsResponse>(`/api:0jQElwax/invitations?page=${currentPage}&per_page=${Math.min(50, perPage)}`)
      if (response.status !== 200) {
        throw new Error('Erro ao carregar convites')
      }
      return response.data
    }
  })

  const [invitations, setInvitations] = useState<Invitation[]>([])

  const { data: teamsData } = useQuery({
    queryKey: ['teams', 'for-invitations'],
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await privateInstance.get('/api:VPDORr9u/teams?per_page=50')
      if (response.status !== 200) throw new Error('Erro ao carregar equipes')
      return response.data as unknown
    }
  })

  const { data: profilesData } = useQuery({
    queryKey: ['profiles', 'for-invitations'],
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await privateInstance.get('/api:BXIMsMQ7/user_profile?per_page=50')
      if (response.status !== 200) throw new Error('Erro ao carregar perfis')
      return response.data as unknown
    }
  })

  type NamedItem = { id: number, name: string }
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
  function findNameById(id: number | undefined, source: unknown): string {
    if (!id || typeof id !== 'number') return '-'
    const list = asNamedList(source)
    const found = list.find((i) => i.id === id)
    return found?.name ?? `#${id}`
  }

  const columns: ColumnDef<Invitation>[] = [
    {
      id: 'select',
      width: '70px',
      header: () => (<div className='flex justify-center items-center' />),
      cell: (i) => (
        <div className='flex justify-center items-center'>
          <Checkbox
            aria-label='Selecionar convite'
            checked={selectedInvites.includes(i.id)}
            onCheckedChange={(checked) => {
              const id = i.id
              setSelectedInvites((prev) => {
                const exists = prev.includes(id)
                if (checked && !exists) return [id]
                if (!checked && exists) return []
                return prev.length === 1 && prev[0] === id ? prev : [id]
              })
            }}
          />
        </div>
      ),
      headerClassName: 'w-[70px] min-w-[70px] border-r',
      className: 'w-[70px] min-w-[70px] border-r !px-2'
    },
    {
      id: 'email',
      header: 'E-mail',
      cell: (i) => i.email,
      headerClassName: 'min-w-[280px] border-r',
      className: 'min-w-[280px] border-r'
    },
    {
      id: 'team',
      header: 'Equipe',
      cell: (i) => findNameById(i.team_id, teamsData),
      headerClassName: 'w-[160px] min-w-[160px] border-r',
      className: 'w-[160px] min-w-[160px]'
    },
    {
      id: 'profile',
      header: 'Perfil',
      cell: (i) => findNameById(i.user_profile_id, profilesData),
      headerClassName: 'w-[160px] min-w-[160px] border-r',
      className: 'w-[160px] min-w-[160px]'
    },
    {
      id: 'status',
      header: 'Status',
      cell: (i) => {
        const raw = String(i.status ?? '')
        const normalized = raw.trim().toLowerCase()
        const isAccepted = i.accepted === true || normalized === 'accepted'
        const isCanceled = normalized === 'canceled' || normalized === 'cancelled'
        const status = isAccepted ? 'accepted' : isCanceled ? 'canceled' : 'pending'
        const label = status === 'accepted' ? 'Aceito' : status === 'canceled' ? 'Cancelado' : 'Pendente'
        return (
          <span
            className={
              status === 'accepted'
                ? 'inline-flex items-center gap-1 px-2 py-1 rounded-full border border-green-200 bg-green-100 text-green-700'
                : status === 'canceled'
                ? 'inline-flex items-center gap-1 px-2 py-1 rounded-full border border-gray-200 bg-gray-100 text-gray-700'
                : 'inline-flex items-center gap-1 px-2 py-1 rounded-full border border-amber-200 bg-amber-100 text-amber-700'
            }
          >
            <span className={status === 'accepted' ? 'h-1.5 w-1.5 rounded-full bg-green-600' : status === 'canceled' ? 'h-1.5 w-1.5 rounded-full bg-gray-500' : 'h-1.5 w-1.5 rounded-full bg-amber-600'} />
            {label}
          </span>
        )
      },
      headerClassName: 'w-[120px] min-w-[120px] border-r',
      className: 'w-[120px] min-w-[120px]'
    },
    {
      id: 'created_at',
      header: 'Enviado em',
      cell: (i) => {
        const raw = i.created_at
        if (!raw) return '-'
        function normalizeToMs(v: string | number | undefined): number | undefined {
          if (v == null) return undefined
          if (typeof v === 'number') {
            const abs = Math.abs(v)
            if (abs < 1e11) return Math.round(v * 1000)
            if (abs > 1e14) return Math.round(v / 1000)
            return v
          }
          const s = String(v).trim()
          if (/^\d+$/.test(s)) {
            const n = Number(s)
            const abs = Math.abs(n)
            if (abs < 1e11) return Math.round(n * 1000)
            if (abs > 1e14) return Math.round(n / 1000)
            return n
          }
          const t = Date.parse(s)
          return Number.isFinite(t) ? t : undefined
        }
        const ms = normalizeToMs(raw)
        if (!ms) return String(raw)
        try {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
          const d = new Date(ms)
          const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            hour12: false,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }).formatToParts(d)
          const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
          const dd = get('day')
          const MM = get('month')
          const yyyy = get('year')
          const HH = get('hour')
          const mm = get('minute')
          const ss = get('second')
          const date = `${dd}/${MM}/${yyyy}`
          return `${date} ${HH}:${mm}:${ss}`
        } catch {
          return new Date(ms).toLocaleString('pt-BR')
        }
      },
      headerClassName: 'w-[200px] min-w-[200px] border-r',
      className: 'w-[200px] min-w-[200px]'
    },
  ]

  useEffect(() => {
    if (!data) return
    const items = Array.isArray(data.items) ? data.items : []
    setInvitations(items)
    const itemsTotal = typeof data.itemsTotal === 'number' ? data.itemsTotal : items.length
    setTotalItems(itemsTotal)
  }, [data, perPage])

  useEffect(() => {
    if (isError) {
      console.error('Erro ao carregar convites')
    }
  }, [isError])

  return (
    <div className='flex flex-col w-full h-full'>
      <div className='flex items-center justify-between p-4'>
        <div className='flex flex-col'>
          <h2 className='text-lg font-semibold'>Convites</h2>
          <p className='text-sm text-muted-foreground'>Convites para novos usuários.</p>
        </div>
        <div className='flex items-center gap-3'>
          <Button 
          variant={'ghost'} 
          disabled={isLoading || isRefetching} 
          onClick={() => { refetch() }} 
          size="sm"
          title='Atualizar convites'
          aria-label='Atualizar convites'>
            {(isLoading || isRefetching) ? <RefreshCw className='animate-spin size-[0.85rem]' /> : <RefreshCw className='size-[0.85rem]' />}
          </Button>
          <div className='flex items-center'>
            <Button
              variant={'outline'}
              size="sm"
              className='xl:hidden'
              disabled={selectedInvites.length !== 1}
              aria-disabled={selectedInvites.length !== 1}
              aria-label='Cancelar convite selecionado'
              title='Cancelar convite'
              onClick={() => setOpenCancelDialog(true)}
            >
              <CircleX className='size-[0.85rem]' />
            </Button>
            <Button
              variant={'outline'}
              size="sm"
              className='hidden xl:inline-flex'
              disabled={selectedInvites.length !== 1}
              aria-disabled={selectedInvites.length !== 1}
              aria-label='Cancelar convite selecionado'
              title='Cancelar convite'
              onClick={() => setOpenCancelDialog(true)}
            >
              <CircleX className='size-[0.85rem]' /> Cancelar
            </Button>
          </div>
          <NewInvitationSheet onCreated={() => { refetch() }} />
        </div>
      </div>

      <div className='flex flex-col w-full h-full flex-1 overflow-hidden pl-4'>
        <div className='border rounded-lg overflow-hidden h-full flex flex-col flex-1 border-r-0 border-b-0 rounded-tr-none! rounded-br-none! rounded-bl-none!'>
          <DataTable
            columns={columns}
            data={invitations}
            loading={isLoading || isRefetching}
            page={currentPage}
            perPage={perPage}
            totalItems={totalItems}
            onChange={(next) => {
              if (typeof next.page === 'number') setCurrentPage(next.page)
              if (typeof next.perPage === 'number') setPerPage(next.perPage)
            }}
            emptyMessage='Nenhum convite encontrado'
            emptySlot={(
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant='icon'>
                    <Users className='h-6 w-6' />
                  </EmptyMedia>
                  <EmptyTitle>Nenhum convite ainda</EmptyTitle>
                  <EmptyDescription>Envie convites para usuários participarem do workspace.</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <div className='flex gap-2'>
                    <NewInvitationSheet onCreated={() => { refetch() }} />
                    <Button variant={'ghost'} size="sm" disabled={isLoading || isRefetching} onClick={() => { refetch() }}>
                      {(isLoading || isRefetching) ? <RefreshCw className='animate-spin size-[0.85rem]' /> : <RefreshCw className="size-[0.85rem]" />}
                    </Button>
                  </div>
                </EmptyContent>
                <Button variant='link' size="sm" asChild className='text-muted-foreground'>
                  <a href='#'>Saiba mais <ArrowUpRight className='inline-block ml-1 size-[0.85rem]' /></a>
                </Button>
              </Empty>
            )}
          />
        </div>
      </div>
      
      <Dialog open={openCancelDialog} onOpenChange={setOpenCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Convite</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja cancelar este convite?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className='flex gap-2'>
            <Button variant={'outline'} size="sm" onClick={() => setOpenCancelDialog(false)}>Cancelar</Button>
            <Button size="sm" onClick={() => cancelSelectedInvite()} disabled={isCancelling}>
              {isCancelling ? <Loader className='animate-spin size-[0.85rem]' aria-label='Carregando' /> : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}