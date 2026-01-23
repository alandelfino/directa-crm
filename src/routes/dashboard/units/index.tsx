import { createFileRoute } from '@tanstack/react-router'
import { Topbar } from '../-components/topbar'
import { Button } from '@/components/ui/button'
import { Edit, Funnel, RefreshCw, Trash, Ruler } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { privateInstance } from '@/lib/auth'
import { DataTable, type ColumnDef } from '@/components/data-table'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'
import { NewUnitSheet } from './-components/new-unit'
import { EditUnitSheet } from './-components/edit-unit'
import { DeleteUnit } from './-components/delete-unit'

export const Route = createFileRoute('/dashboard/units/')({
  component: RouteComponent,
})

type Unit = {
  id: number
  created_at: number
  updated_at: number
  type: 'integer' | 'decimal'
  name: string
  company_id?: number
  products?: number
}

type UnitsResponse = {
  itemsReceived?: number
  curPage?: number
  nextPage?: number | null
  prevPage?: number | null
  offset?: number
  perPage?: number
  itemsTotal?: number
  pageTotal?: number
  items?: Unit[]
}

function RouteComponent() {
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [selectedUnits, setSelectedUnits] = useState<number[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const { data, isLoading, isRefetching, isError, error, refetch } = useQuery({
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryKey: ['units', currentPage, perPage],
    queryFn: async () => {
      const response = await privateInstance.get(`/api:-b71x_vk/unit_of_measurement?page=${currentPage}&per_page=${Math.min(50, perPage)}`)
      if (response.status !== 200) {
        throw new Error('Erro ao carregar unidades de medida')
      }
      return response.data as UnitsResponse
    }
  })

  const [units, setUnits] = useState<Unit[]>([])

  const columns: ColumnDef<Unit>[] = [
    {
      id: 'select',
      width: '60px',
      header: (
        <div className='flex justify-center items-center text-xs text-neutral-500'>Sel.</div>
      ),
      cell: (unit) => (
        <div className='flex justify-center items-center'>
          <Checkbox
            checked={selectedUnits.includes(unit.id)}
            onCheckedChange={() => toggleSelectUnit(unit.id)}
          />
        </div>
      ),
      headerClassName: 'w-[60px] border-r',
      className: 'font-medium border-r p-2!'
    },
    {
      id: 'name',
      header: 'Nome',
      cell: (unit) => unit.name,
      className: 'border-r p-2!'
    },
    {
      id: 'type',
      header: 'Tipo',
      cell: (unit) => unit.type,
      headerClassName: 'w-[140px] border-r',
      className: 'w-[140px] p-2!'
    },
    {
      id: 'products',
      header: 'Produtos',
      cell: (unit) => (typeof unit.products === 'number' ? unit.products : 0),
      headerClassName: 'w-[90px] border-r',
      className: 'w-[100px] p-2!'
    },
  ]

  useEffect(() => {
    if (!data) return

    const items = Array.isArray(data.items) ? data.items : []
    setUnits(items)

    const itemsTotal = typeof data.itemsTotal === 'number' ? data.itemsTotal : items.length
    setTotalItems(itemsTotal)

    const pageTotal = typeof data.pageTotal === 'number' ? data.pageTotal : Math.max(1, Math.ceil(itemsTotal / perPage))
    setTotalPages(pageTotal)
  }, [data, perPage])

  useEffect(() => {
    if (isError) {
      const errorData = (error as any)?.response?.data
      toast.error(errorData?.title || 'Erro ao carregar unidades de medida', {
        description: errorData?.detail || 'Não foi possível carregar a lista de unidades de medida.'
      })
    }
  }, [isError, error])

  // Resetar seleção quando mudar de página ou itens por página
  useEffect(() => {
    setSelectedUnits([])
  }, [currentPage, perPage])

  // Limpar seleção ao atualizar/refetch da listagem
  useEffect(() => {
    if (isRefetching) {
      setSelectedUnits([])
    }
  }, [isRefetching])

  // Garantir que a página atual está dentro dos limites
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])

  // Gerenciar seleção de itens
  const toggleSelectUnit = (unitId: number) => {
    if (selectedUnits.includes(unitId)) {
      // Se já estiver selecionado, desmarca para permitir limpar seleção
      setSelectedUnits([])
    } else {
      // Seleção única: sempre mantém apenas um selecionado
      setSelectedUnits([unitId])
    }
  }

  return (
    <div className='flex flex-col w-full h-full'>

      <Topbar title="Unidades de Medida" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard', isLast: false }, { label: 'Unidades de Medida', href: '/dashboard/units', isLast: true }]} />

      {/* Content */}
      <div className='flex flex-col w-full h-full flex-1 overflow-hidden'>

        {/* Actions */}
        <div className='border-b flex w-full items-center p-2 gap-4'>

          {/* Filters */}
          <div className='flex items-center gap-2 flex-1'>

            <Button variant={'outline'} size="sm">
              <Funnel className="size-[0.85rem]" /> Filtros
            </Button>

          </div>

          <div className='flex items-center gap-2'>
            <Button variant={'ghost'} size="sm" disabled={isLoading || isRefetching} onClick={() => { setSelectedUnits([]); refetch() }}>
              {
                (isLoading || isRefetching)
                  ? <RefreshCw className='animate-spin size-[0.85rem]' />
                  : <RefreshCw className="size-[0.85rem]" />
              }
            </Button>

            {selectedUnits.length === 1 ? (
              <DeleteUnit unitId={selectedUnits[0]} />
            ) : (
              <Button variant={'outline'} disabled size="sm">
                <Trash className="size-[0.85rem]" /> Excluir
              </Button>
            )}

            {selectedUnits.length === 1 ? (
              <EditUnitSheet unitId={selectedUnits[0]} />
            ) : (
              <Button variant={'outline'} disabled size="sm">
                <Edit className="size-[0.85rem]" /> Editar
              </Button>
            )}
            <NewUnitSheet />
          </div>

        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={units}
          loading={isLoading || isRefetching}
          page={currentPage}
          perPage={perPage}
          totalItems={totalItems}
          emptyMessage='Nenhuma unidade encontrada'
          emptySlot={(
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Ruler className='h-6 w-6' />
                </EmptyMedia>
                <EmptyTitle>Nenhuma unidade de medida ainda</EmptyTitle>
                <EmptyDescription>
                  Você ainda não criou nenhuma unidade. Comece criando sua primeira unidade de medida.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <div className='flex gap-2'>
                  <NewUnitSheet />
                  <Button variant={'ghost'} size="sm" disabled={isLoading || isRefetching} onClick={() => { setSelectedUnits([]); refetch() }}>
                    {(isLoading || isRefetching) ? <RefreshCw className='animate-spin size-[0.85rem]' /> : <RefreshCw className="size-[0.85rem]" />}
                  </Button>
                </div>
              </EmptyContent>
            </Empty>
          )}
          onChange={({ page, perPage }) => {
            if (typeof page === 'number') setCurrentPage(page)
            if (typeof perPage === 'number') setPerPage(perPage)
            // Disparar refetch quando houver mudança
            refetch()
          }} />

      </div>
    </div>
  )
}
