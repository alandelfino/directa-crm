import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { privateInstance } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTable, type ColumnDef } from '@/components/data-table'
import { RefreshCw, Edit } from 'lucide-react'
 


import { EditUserCompanySheet } from './-components/edit-user-company'

export const Route = createFileRoute('/dashboard/settings/users/')({
  component: RouteComponent,
})

type UserCompany = {
  id: number
  created_at?: number
  company_id: number
  active?: boolean
  user_id?: number
  owner_user?: number
  user: {
    id: number
    created_at?: number
    updated_at?: number
    name: string
    email: string
  }
  user_profile?: {
    id: number
    name: string
    created_at?: number
    updated_at?: number
    company_id?: number
  }
  team?: {
    id: number
    name: string
    created_at?: number
    updated_at?: number | null
    company_id?: number
  } | null
}

type UsersCompaniesResponse = {
  itemsReceived: number
  curPage: number
  nextPage: number | null
  prevPage: number | null
  offset: number
  perPage: number
  itemsTotal: number
  pageTotal: number
  items: UserCompany[]
}

function clampPerPage(value: number) {
  return Math.min(50, Math.max(20, value))
}

function RouteComponent() {
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [usersCompanies, setUsersCompanies] = useState<UserCompany[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [selectedUsers, setSelectedUsers] = useState<Array<number | string>>([])


  const { data, isLoading, isRefetching, isError, refetch } = useQuery({
    refetchOnWindowFocus: false,
    queryKey: ['users_companies', currentPage, perPage],
    queryFn: async () => {
      const response = await privateInstance.get('/api:jO41sdEd/users_companies', {
        params: { page: currentPage, per_page: clampPerPage(perPage) }
      })
      if (response.status !== 200) {
        throw new Error('Erro ao carregar usuários')
      }
      return response.data as UsersCompaniesResponse
    }
  })

  function getProp(obj: unknown, key: string): unknown {
    if (typeof obj === 'object' && obj !== null) {
      return (obj as Record<string, unknown>)[key]
    }
    return undefined
  }
  function coerceActive(v: unknown): boolean | undefined {
    if (v === true) return true
    if (v === false) return false
    if (v === 1 || v === '1') return true
    if (v === 0 || v === '0') return false
    if (v === 'true' || v === 'active') return true
    if (v === 'false' || v === 'inactive') return false
    return undefined
  }
  useEffect(() => {
    if (!data) return
    const items = Array.isArray(data.items) ? data.items : []
    const normalized = items.map((it) => {
      const candidates: unknown[] = [
        it.active,
        getProp(it.user, 'active'),
        getProp(it, 'status'),
        getProp(it.user, 'status'),
      ]
      const active = candidates.map(coerceActive).find((v) => typeof v === 'boolean')
      return { ...it, active: active ?? it.active }
    })
    setUsersCompanies(normalized)
    const itemsTotal = typeof data.itemsTotal === 'number' ? data.itemsTotal : items.length
    setTotalItems(itemsTotal)
  }, [data])

  useEffect(() => {
    if (isError) {
      console.error('Erro ao carregar usuários da empresa')
    }
  }, [isError])

  const selectedUc = selectedUsers.length === 1 ? usersCompanies.find((it) => it.user?.id === selectedUsers[0]) : undefined

  const isOwner = !!selectedUc && selectedUc.user_id != null && selectedUc.owner_user != null && selectedUc.user_id === selectedUc.owner_user
  const canEdit = !!selectedUc && !isOwner





  const columns: ColumnDef<UserCompany>[] = [
    {
      id: 'select',
      width: '60px',
      header: () => (<div className="flex justify-center items-center" />),
      cell: (uc) => (
        <div className="flex justify-center items-center">
          <Checkbox
            checked={!!uc.user && selectedUsers.includes(uc.user.id)}
            onCheckedChange={() => {
              const id = uc.user?.id
              if (id == null) return
              setSelectedUsers((prev) => (prev.includes(id) ? [] : [id]))
            }}
          />
        </div>
      ),
      headerClassName: 'min-w-[60px] w-[60px] border-r',
      className: 'w-[60px] min-w-[60px] font-medium border-r p-2!'
    },

    {
      id: 'name',
      header: 'Nome',
      cell: (uc) => (
        <span className="inline-flex items-center gap-2">
          {uc.user?.name ?? '-'}
          {uc.user_id != null && uc.owner_user != null && uc.user_id === uc.owner_user ? (
            <Badge variant={'secondary'} title="Usuário proprietário">Proprietário</Badge>
          ) : null}
        </span>
      ),
      headerClassName: 'min-w-[240px] border-r',
      className: 'min-w-[240px] border-r'
    },
    {
      id: 'email',
      header: 'E-mail',
      cell: (uc) => uc.user?.email ?? '-',
      headerClassName: 'min-w-[280px] border-r',
      className: 'min-w-[280px] border-r'
    },
    {
      id: 'user_profile',
      header: 'Perfil',
      cell: (uc) => uc.user_profile?.name ?? '-',
      headerClassName: 'w-[150px] min-w-[150px] border-r',
      className: 'w-[150px] min-w-[150px]'
    },
    {
      id: 'team',
      header: 'Equipe',
      cell: (uc) => uc.team?.name ?? '-',
      headerClassName: 'w-[150px] min-w-[150px] border-r',
      className: 'w-[150px] min-w-[150px]'
    },
    {
      id: 'created_at',
      header: 'Criado em',
      cell: (uc) => {
        const ts = uc.user?.created_at ?? uc.created_at
        const d = fmtDateOnly(ts)
        const t = fmtTimeOnly(ts)
        return (
          <span className='inline-flex items-center'>
            <span className='text-sm'>{d || '-'}</span>
            {t ? <span className='ml-1 text-sm'>{t}</span> : null}
          </span>
        )
      },
      headerClassName: 'w-[200px] min-w-[200px] border-r',
      className: 'w-[200px] min-w-[200px]'
    },
    {
      id: 'status',
      header: 'Status',
      cell: (uc) => {
        const active = uc.active === true
        return (
          <span
            className={
              active
                ? 'inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-green-50 text-green-600'
                : 'inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 text-gray-700'
            }
          >
            <span className={active ? 'h-1.5 w-1.5 rounded-full bg-green-600' : 'h-1.5 w-1.5 rounded-full bg-gray-500'} />
            {active ? 'Ativo' : 'Inativo'}
          </span>
        )
      },
      headerClassName: 'w-[100px] min-w-[100px] border-r',
      className: 'w-[100px] min-w-[100px]'
    },
  ]

  return (
    <div className='flex flex-col w-full h-full'>
      <div className='flex items-center justify-between p-4'>
        <div className='flex flex-col'>
          <h2 className='text-lg font-semibold'>Usuários</h2>
          <p className='text-sm text-muted-foreground'>Gerencie usuários vinculados à sua conta.</p>
        </div>
        <div className='flex items-center gap-2 ml-auto'>
          <Button
            variant={'ghost'}
            size="sm"
            title='Atualizar lista de usuários'
            aria-label='Atualizar lista de usuários'
            disabled={isLoading || isRefetching}
            onClick={() => { refetch() }}>
            {(isLoading || isRefetching) ? <RefreshCw className='animate-spin size-[0.85rem]' /> : <RefreshCw className='size-[0.85rem]' />}
          </Button>
          {canEdit ? (
            <EditUserCompanySheet uc={selectedUc!} onSaved={() => refetch()} />
          ) : (
            <Button
              variant={'outline'}
              size="sm"
              disabled
              title='Editar usuário'
              aria-label='Editar usuário'
            >
              <Edit className='size-[0.85rem]' /> <span>Editar</span>
            </Button>
          )}
        </div>
      </div>
      <div className='flex flex-col w-full h-full flex-1 overflow-hidden pl-4'>

        <div className='border rounded-lg overflow-hidden h-full flex flex-col flex-1 rounded-tr-none! rounded-br-none! rounded-bl-none! border-r-0 border-b-0'>

          <DataTable
            columns={columns}
            data={usersCompanies}
            loading={isLoading || isRefetching}
            skeletonCount={3}
            page={currentPage}
            perPage={perPage}
            totalItems={totalItems}
            onChange={(next) => {
              if (typeof next.page === 'number') setCurrentPage(next.page)
              if (typeof next.perPage === 'number') setPerPage(clampPerPage(next.perPage))
            }}
            emptyMessage='Nenhum usuário encontrado'
          />

        </div>

      </div>
    </div>
  )
}
  const normalizeEpoch = (v?: number): number | undefined => {
    if (typeof v !== 'number' || !Number.isFinite(v)) return undefined
    const abs = Math.abs(v)
    if (abs < 1e11) return Math.round(v * 1000)
    if (abs > 1e14) return Math.round(v / 1000)
    return v
  }
  const fmtDateOnly = (v?: number) => {
    const ms = normalizeEpoch(v)
    if (!ms) return '-'
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      const d = new Date(ms)
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(d)
      const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
      const dd = get('day')
      const MM = get('month')
      const yyyy = get('year')
      return `${dd}/${MM}/${yyyy}`
    } catch {
      return new Date(ms).toLocaleDateString('pt-BR')
    }
  }
  const fmtTimeOnly = (v?: number) => {
    const ms = normalizeEpoch(v)
    if (!ms) return ''
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      const d = new Date(ms)
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).formatToParts(d)
      const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
      return `${get('hour')}:${get('minute')}:${get('second')}`
    } catch {
      return ''
    }
  }