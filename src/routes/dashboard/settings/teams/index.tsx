import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { privateInstance } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTable, type ColumnDef } from '@/components/data-table'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'
import { Users, ArrowUpRight, Trash, Edit, RefreshCw } from 'lucide-react'
import { NewTeamSheet } from './-components/new-team'
import { EditTeamSheet } from './-components/edit-team'
import { DeleteTeam } from './-components/delete-team'

export const Route = createFileRoute('/dashboard/settings/teams/')({
  component: RouteComponent,
})

type Team = {
  id: number
  name: string
  created_at?: number | string
  createdAt?: number | string
  updated_at?: number | null
  updatedAt?: number | string | null
  company_id?: number
}

type TeamsResponse = {
  itemsReceived?: number
  curPage?: number
  nextPage?: number | null
  prevPage?: number | null
  offset?: number
  perPage?: number
  itemsTotal?: number
  pageTotal?: number
  items: Team[]
}

function clampPerPage(value: number) {
  return Math.min(50, Math.max(20, value))
}

function RouteComponent() {
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeams, setSelectedTeams] = useState<number[]>([])
  const [totalItems, setTotalItems] = useState(0)

  const { data, isLoading, isRefetching, isError, refetch } = useQuery({
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryKey: ['teams', currentPage, perPage],
    queryFn: async () => {
      const response = await privateInstance.get<TeamsResponse>('/tenant/teams', {
        params: { page: currentPage, limit: clampPerPage(perPage) }
      })
      if (response.status !== 200) {
        throw new Error('Erro ao carregar equipes')
      }
      return response.data
    }
  })



  const columns: ColumnDef<Team>[] = [
    {
      id: 'select',
      width: '3.75rem',
      header: (<div className='flex justify-center items-center' />),
      cell: (team) => (
        <div className='flex justify-center items-center'>
          <Checkbox
            checked={selectedTeams.includes(team.id)}
            onCheckedChange={() => {
              const id = team.id
              setSelectedTeams((prev) => (prev.includes(id) ? [] : [id]))
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
      cell: (team) => team.name,
      headerClassName: 'min-w-[15rem] border-r border-neutral-200 px-4 py-2.5',
      className: 'min-w-[15rem] border-r border-neutral-200 !px-4 py-3'
    },


    {
      id: 'created_at',
      header: 'Criado em',
      cell: (team) => {
        const val = team.created_at ?? team.createdAt
        if (!val) return '-'
        
        let ms: number | undefined
        
        if (typeof val === 'number') {
          const normalizeEpoch = (v: number): number => {
            const abs = Math.abs(v)
            if (abs < 1e11) return Math.round(v * 1000)
            if (abs > 1e14) return Math.round(v / 1000)
            return v
          }
          ms = normalizeEpoch(val)
        } else if (typeof val === 'string') {
          const parsed = Date.parse(val)
          if (!Number.isNaN(parsed)) ms = parsed
        }
        
        if (!ms) return '-'
        return new Intl.DateTimeFormat('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }).format(new Date(ms))
      },
      headerClassName: 'w-[12.5rem] min-w-[12.5rem] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[12.5rem] min-w-[12.5rem] border-r border-neutral-200 !px-4 py-3'
    },
  ]

  useEffect(() => {
    if (!data) return
    const items = Array.isArray(data.items) ? data.items : []
    setTeams(items)
    const itemsTotal = typeof data.itemsTotal === 'number' ? data.itemsTotal : items.length
    setTotalItems(itemsTotal)
  }, [data])

  useEffect(() => {
    if (isError) {
      console.error('Erro ao carregar equipes')
    }
  }, [isError])

  return (
    <div className='flex flex-col w-full h-full'>
      <div className='flex items-center justify-between p-4'>
        <div className='flex flex-col'>
          <h2 className='text-lg font-semibold'>Equipes</h2>
          <p className='text-sm text-muted-foreground'>Gerencie suas equipes e permissões.</p>
        </div>
        <div className='flex items-center gap-2'>
          <Button variant={'ghost'} size="sm" disabled={isLoading || isRefetching} onClick={() => { refetch() }}>
            {(isLoading || isRefetching) ? <RefreshCw className='animate-spin size-[0.85rem]' /> : <RefreshCw className='size-[0.85rem]' />}
          </Button>
          {selectedTeams.length === 1 ? (
            <>
              <DeleteTeam teamId={selectedTeams[0]} onDeleted={() => { setSelectedTeams([]); refetch() }} />
              <EditTeamSheet teamId={selectedTeams[0]} onSaved={() => { refetch() }} />
            </>
          ) : (
            <>
              <Button variant={'outline'} size="sm" disabled> <Trash className='size-[0.85rem]' /> Excluir</Button>
              <Button variant={'outline'} size="sm" disabled> <Edit className='size-[0.85rem]' /> Editar</Button>
            </>
          )}
          <NewTeamSheet onCreated={() => { refetch() }} />
        </div>
      </div>

      <div className='flex flex-col w-full h-full flex-1 overflow-hidden pl-4'>
        <div className='border border-neutral-200 rounded-tl-lg overflow-hidden h-full flex flex-col flex-1 border-r-0 border-b-0'>
          <DataTable
            columns={columns}
            data={teams}
            loading={isLoading || isRefetching}
            rowClassName='h-12'
            skeletonCount={3}
            page={currentPage}
            perPage={perPage}
            totalItems={totalItems}
            onChange={(next) => {
              if (typeof next.page === 'number') setCurrentPage(next.page)
              if (typeof next.perPage === 'number') setPerPage(clampPerPage(next.perPage))
            }}
            emptyMessage='Nenhuma equipe encontrada'
            emptySlot={(
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant='icon'>
                    <Users className='h-6 w-6' />
                  </EmptyMedia>
                  <EmptyTitle>Nenhuma equipe ainda</EmptyTitle>
                  <EmptyDescription>Crie equipes para organizar sua equipe de trabalho.</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <div className='flex gap-2'>
                    <NewTeamSheet onCreated={() => { refetch() }} />
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