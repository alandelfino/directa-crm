import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { privateInstance } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTable, type ColumnDef } from '@/components/data-table'
import { RefreshCw, Edit, Users, ArrowUpRight, Trash } from 'lucide-react'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'
import { EditUserSheet } from './-components/edit-user'
import { NewUserSheet } from './-components/new-user'
import { DeleteUserDialog } from './-components/delete-user'

export const Route = createFileRoute('/dashboard/settings/users/')({
  component: RouteComponent,
})

type User = {
  id: string
  name: string
  email: string
  profileId: number
  teamId: number
  createdAt: string
  updatedAt: string
}

type UsersResponse = {
  page: number
  limit: number
  totalPages: number
  total: number
  items: User[]
}

function clampPerPage(value: number) {
  return Math.min(100, Math.max(20, value))
}

function RouteComponent() {
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [users, setUsers] = useState<User[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])

  const { data, isLoading, isRefetching, isError, refetch } = useQuery({
    refetchOnWindowFocus: false,
    queryKey: ['users', currentPage, perPage],
    queryFn: async () => {
      const response = await privateInstance.get<UsersResponse>('/tenant/users', {
        params: { page: currentPage, limit: clampPerPage(perPage) }
      })
      if (response.status !== 200) {
        throw new Error('Erro ao carregar usuários')
      }
      return response.data
    }
  })

  const { data: profilesData } = useQuery({
    queryKey: ['profiles', 'lookup'],
    queryFn: async () => {
       const response = await privateInstance.get('/tenant/user-profiles?limit=100')
       return response.data?.items as { id: number, name: string }[] | undefined
    }
  })

  const { data: teamsData } = useQuery({
    queryKey: ['teams', 'lookup'],
    queryFn: async () => {
       const response = await privateInstance.get('/tenant/teams?limit=100')
       return response.data?.items as { id: number, name: string }[] | undefined
    }
  })

  const profilesMap = useMemo(() => {
    if (!profilesData) return new Map<number, string>()
    return new Map(profilesData.map(p => [p.id, p.name]))
  }, [profilesData])

  const teamsMap = useMemo(() => {
    if (!teamsData) return new Map<number, string>()
    return new Map(teamsData.map(t => [t.id, t.name]))
  }, [teamsData])

  useEffect(() => {
    if (!data) return
    setUsers(data.items || [])
    setTotalItems(data.total || 0)
  }, [data])

  useEffect(() => {
    if (isError) {
      console.error('Erro ao carregar usuários')
    }
  }, [isError])

  const selectedUser = selectedUsers.length === 1 ? users.find((u) => u.id === selectedUsers[0]) : undefined

  const columns: ColumnDef<User>[] = [
    {
      id: 'select',
      width: '3.75rem',
      header: () => (<div className="flex justify-center items-center" />),
      cell: (row) => (
        <div className="flex justify-center items-center">
          <Checkbox
            checked={selectedUsers.includes(row.id)}
            onCheckedChange={() => {
              const id = row.id
              setSelectedUsers((prev) => (prev.includes(id) ? [] : [id]))
            }}
          />
        </div>
      ),
      headerClassName: 'min-w-[3.75rem] w-[3.75rem] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[3.75rem] min-w-[3.75rem] border-r border-neutral-200 !px-4 py-3'
    },
    {
      id: 'name',
      header: 'Nome',
      cell: (row) => row.name,
      headerClassName: 'min-w-[15rem] border-r border-neutral-200 px-4 py-2.5',
      className: 'min-w-[15rem] border-r border-neutral-200 !px-4 py-3'
    },
    {
      id: 'email',
      header: 'E-mail',
      cell: (row) => row.email,
      headerClassName: 'min-w-[17.5rem] border-r border-neutral-200 px-4 py-2.5',
      className: 'min-w-[17.5rem] border-r border-neutral-200 !px-4 py-3'
    },
    {
      id: 'profile',
      header: 'Perfil',
      cell: (row) => profilesMap.get(row.profileId) ?? '-',
      headerClassName: 'w-[9.375rem] min-w-[9.375rem] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[9.375rem] min-w-[9.375rem] border-r border-neutral-200 !px-4 py-3'
    },
    {
      id: 'team',
      header: 'Equipe',
      cell: (row) => teamsMap.get(row.teamId) ?? '-',
      headerClassName: 'w-[9.375rem] min-w-[9.375rem] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[9.375rem] min-w-[9.375rem] border-r border-neutral-200 !px-4 py-3'
    },
    {
      id: 'created_at',
      header: 'Criado em',
      cell: (row) => {
        if (!row.createdAt) return '-'
        return new Intl.DateTimeFormat('pt-BR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        }).format(new Date(row.createdAt))
      },
      headerClassName: 'w-[12.5rem] min-w-[12.5rem] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[12.5rem] min-w-[12.5rem] border-r border-neutral-200 !px-4 py-3'
    }
  ]

  return (
    <div className='flex flex-col w-full h-full'>
      <div className='flex items-center justify-between p-4'>
        <div className='flex flex-col'>
          <h2 className='text-lg font-semibold'>Usuários</h2>
          <p className='text-sm text-muted-foreground'>Gerencie usuários vinculados à sua conta.</p>
        </div>
        <div className='flex items-center gap-2 ml-auto'>
          <Button variant={'ghost'} size="sm" disabled={isLoading || isRefetching} onClick={() => { refetch() }}>
             {(isLoading || isRefetching) ? <RefreshCw className='animate-spin size-[0.85rem]' /> : <RefreshCw className='size-[0.85rem]' />}
          </Button>
          {selectedUser ? (
            <>
             <DeleteUserDialog userId={selectedUser.id} onDeleted={() => { setSelectedUsers([]); refetch() }} />
             <EditUserSheet user={selectedUser} onSaved={() => refetch()} />
            </>
          ) : (
            <>
              <Button variant={'outline'} size="sm" disabled>
                <Trash className='size-[0.85rem]' /> Excluir
              </Button>
              <Button variant={'outline'} size="sm" disabled>
                <Edit className='size-[0.85rem]' /> Editar
              </Button>
            </>
          )}
          <NewUserSheet onCreated={() => { refetch() }} />
        </div>
      </div>
      <div className='flex flex-col w-full h-full flex-1 overflow-hidden pl-4'>
        <div className='border border-neutral-200 rounded-tl-lg overflow-hidden h-full flex flex-col flex-1 border-r-0 border-b-0'>
          <DataTable
            columns={columns}
            data={users}
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
             emptySlot={(
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant='icon'>
                    <Users className='h-6 w-6' />
                  </EmptyMedia>
                  <EmptyTitle>Nenhum usuário ainda</EmptyTitle>
                  <EmptyDescription>Você pode adicionar novos usuários ao workspace.</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                   <div className='flex gap-2'>
                    <NewUserSheet onCreated={() => { refetch() }} />
                    <Button variant={'ghost'} size="sm" disabled={isLoading || isRefetching} onClick={() => { refetch() }}>
                      {(isLoading || isRefetching) ? <RefreshCw className='animate-spin size-[0.85rem]' /> : <RefreshCw className='size-[0.85rem]' />}
                    </Button>
                   </div>
                </EmptyContent>
                 <Button variant='link' asChild className='text-muted-foreground'>
                  <a href='#'>Saiba mais <ArrowUpRight className='inline-block ml-1 h-4 w-4' /></a>
                </Button>
              </Empty>
            )}
          />
        </div>
      </div>
    </div>
  )
}
