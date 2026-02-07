import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { privateInstance } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTable, type ColumnDef } from '@/components/data-table'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'
import { Edit, Trash, Users, ArrowUpRight, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { NewProfileSheet } from './-components/new-profile'
import { EditProfileSheet } from './-components/edit-profile'
import { DeleteProfile } from './-components/delete-profile'

export const Route = createFileRoute('/dashboard/settings/profiles/')({
  component: RouteComponent,
})

type Profile = {
  id: number
  created_at?: number
  updated_at?: number
  name: string
  users?: number | any
  company_id?: number
}

type ProfilesResponse = {
  itemsReceived?: number
  curPage?: number
  nextPage?: number | null
  prevPage?: number | null
  offset?: number
  perPage?: number
  itemsTotal?: number
  pageTotal?: number
  items?: Profile[]
}

function RouteComponent() {
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [selectedProfiles, setSelectedProfiles] = useState<number[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const { data, isLoading, isRefetching, isError, error, refetch } = useQuery({
    refetchOnWindowFocus: false,
    queryKey: ['profiles', currentPage, perPage],
    queryFn: async () => {
      const response = await privateInstance.get(`/tenant/user-profiles?page=${currentPage}&limit=${Math.min(100, perPage)}`)
      if (response.status !== 200) {
        throw new Error('Erro ao carregar perfis')
      }
      return response.data as ProfilesResponse
    }
  })

  const [profiles, setProfiles] = useState<Profile[]>([])

  const columns: ColumnDef<Profile>[] = [
    {
      id: 'select',
      width: '3.75rem',
      header: (
        <div className='flex justify-center items-center text-xs text-neutral-500'>Sel.</div>
      ),
      cell: (profile) => (
        <div className='flex justify-center items-center'>
          <Checkbox
            checked={selectedProfiles.includes(profile.id)}
            onCheckedChange={() => toggleSelectProfile(profile.id)}
          />
        </div>
      ),
      headerClassName: 'min-w-[3.75rem] w-[3.75rem] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[3.75rem] min-w-[3.75rem] border-r border-neutral-200 !px-4 py-3'
    },
    {
      id: 'name',
      header: 'Nome',
      cell: (profile) => (
        <span className='inline-flex items-center gap-2'>
          {profile.name}
          {profile.company_id === 0 ? (
            <Badge variant={'secondary'} title='Perfil global'>Global</Badge>
          ) : null}
        </span>
      ),
      headerClassName: 'min-w-[15rem] border-r border-neutral-200 px-4 py-2.5',
      className: 'min-w-[15rem] border-r border-neutral-200 !px-4 py-3'
    },
    {
      id: 'users',
      header: 'Usuários',
      width: '8.75rem',
      cell: (profile) => {
        const users: any = (profile as any).users
        if (typeof users === 'number') return users
        if (Array.isArray(users)) return users.length
        if (users && typeof users === 'object') {
          const items = (users as any).items
          const total = (users as any).total ?? (users as any).count ?? (users as any).itemsTotal
          if (Array.isArray(items)) return items.length
          if (typeof total === 'number') return total
          return '-'
        }
        return '-'
      },
      headerClassName: 'w-[8.75rem] min-w-[8.75rem] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[8.75rem] min-w-[8.75rem] border-r border-neutral-200 !px-4 py-3'
    },
  ]

  useEffect(() => {
    if (!data) return

    const items = Array.isArray(data.items) ? data.items : []
    setProfiles(items)

    const itemsTotal = typeof data.itemsTotal === 'number' ? data.itemsTotal : items.length
    setTotalItems(itemsTotal)

    const pageTotal = typeof data.pageTotal === 'number' ? data.pageTotal : Math.max(1, Math.ceil(itemsTotal / perPage))
    setTotalPages(pageTotal)
  }, [data, perPage])

  useEffect(() => {
    if (isError) {
      const errorData = (error as any)?.response?.data
      toast.error(errorData?.title || 'Erro ao carregar perfis', {
        description: errorData?.detail || 'Não foi possível carregar a lista de perfis.'
      })
    }
  }, [isError, error])

  useEffect(() => {
    setSelectedProfiles([])
  }, [currentPage, perPage])

  useEffect(() => {
    if (isRefetching) {
      setSelectedProfiles([])
    }
  }, [isRefetching])

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])

  const toggleSelectProfile = (profileId: number) => {
    if (selectedProfiles.includes(profileId)) {
      setSelectedProfiles([])
    } else {
      setSelectedProfiles([profileId])
    }
  }

  const selectedProfile = selectedProfiles.length === 1 ? profiles.find((p) => p.id === selectedProfiles[0]) : undefined
  const canEditDelete = !!selectedProfile && selectedProfile.company_id !== 0

  return (
    <div className='flex flex-col w-full h-full'>
      <div className='flex items-center justify-between p-4'>
        <div className='flex flex-col'>
          <h2 className='text-lg font-semibold'>Perfis</h2>
          <p className='text-sm text-muted-foreground'>Gerencie perfis de usuários.</p>
        </div>
        <div className='flex items-center gap-2'>
          <Button variant={'ghost'} size="sm" disabled={isLoading || isRefetching} onClick={() => { setSelectedProfiles([]); refetch() }}>
            {(isLoading || isRefetching) ? <RefreshCw className='animate-spin size-[0.85rem]' /> : <RefreshCw className='size-[0.85rem]' />}
          </Button>

          {canEditDelete ? (
            <DeleteProfile profileId={selectedProfiles[0]} />
          ) : (
            <Button variant={'outline'} size="sm" disabled>
              <Trash className="size-[0.85rem]" /> Excluir
            </Button>
          )}

          {canEditDelete ? (
            <EditProfileSheet profileId={selectedProfiles[0]} />
          ) : (
            <Button variant={'outline'} size="sm" disabled>
              <Edit className="size-[0.85rem]" /> Editar
            </Button>
          )}
          <NewProfileSheet />
        </div>
      </div>

      <div className='flex flex-col w-full h-full flex-1 overflow-hidden pl-4'>
        <div className='border-t border-l border-neutral-200 rounded-tl-lg overflow-hidden h-full flex flex-col flex-1'>
          <DataTable
            columns={columns}
            data={profiles}
            loading={isLoading || isRefetching}
            skeletonCount={3}
            page={currentPage}
            perPage={perPage}
            totalItems={totalItems}
            rowClassName='h-12'
            emptyMessage='Nenhum perfil encontrado'
            emptySlot={(
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Users className='h-6 w-6' />
                  </EmptyMedia>
                  <EmptyTitle>Nenhum perfil ainda</EmptyTitle>
                  <EmptyDescription>
                    Você ainda não criou nenhum perfil. Comece criando seu primeiro perfil.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <div className='flex gap-2'>
                    <NewProfileSheet />
                    <Button variant={'outline'} size="sm" disabled={isLoading || isRefetching} onClick={() => { setSelectedProfiles([]); refetch() }}>
                      {(isLoading || isRefetching) ? <RefreshCw className='animate-spin size-[0.85rem]' /> : <RefreshCw className="size-[0.85rem]" />}
                    </Button>
                  </div>
                </EmptyContent>
                <Button
                  variant='link'
                  asChild
                  className='text-muted-foreground'
                >
                  <a href='#'>
                    Saiba mais <ArrowUpRight className='inline-block ml-1 h-4 w-4' />
                  </a>
                </Button>
              </Empty>
            )}
            onChange={({ page, perPage }) => {
              if (typeof page === 'number') setCurrentPage(page)
              if (typeof perPage === 'number') setPerPage(perPage)
              refetch()
            }}
          />
        </div>
      </div>
    </div>
  )
}