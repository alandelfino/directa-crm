import { createFileRoute } from '@tanstack/react-router'
import { Topbar } from '../-components/topbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Edit, Funnel, RefreshCw, Trash, Ruler, ArrowUpDown, ArrowDownAZ, ArrowUpZA } from 'lucide-react'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

export const Route = createFileRoute('/dashboard/units/')({
  component: RouteComponent,
})

type Unit = {
  id: number
  createdAt: string
  updatedAt: string
  numberType: 'integer' | 'decimal'
  name: string
  company_id?: number
  products?: number
}

type UnitsResponse = {
  items: Unit[]
  page: number
  limit: number
  totalPages: number
  total: number
}

function RouteComponent() {
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [selectedUnits, setSelectedUnits] = useState<number[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Filtros e Ordenação (Estado Aplicado)
  const [sortBy, setSortBy] = useState('createdAt')
  const [orderBy, setOrderBy] = useState('desc')
  const [filterName, setFilterName] = useState('')
  const [filterNameOperator, setFilterNameOperator] = useState('cont')

  // Filtros e Ordenação (Estado Local do Popover)
  const [localSortBy, setLocalSortBy] = useState('createdAt')
  const [localOrderBy, setLocalOrderBy] = useState('desc')
  const [localFilterName, setLocalFilterName] = useState('')
  const [localFilterNameOperator, setLocalFilterNameOperator] = useState('cont')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  
  const activeFilterCount = (filterName ? 1 : 0)

  const { data, isLoading, isRefetching, isError, error, refetch } = useQuery({
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryKey: ['units', currentPage, perPage, sortBy, orderBy, filterName, filterNameOperator],
    queryFn: async () => {
      const filterParams = new URLSearchParams()
      filterParams.append('page', currentPage.toString())
      filterParams.append('limit', Math.min(50, perPage).toString())
      filterParams.append('sortBy', sortBy)
      filterParams.append('orderBy', orderBy)
      
      if (filterName) {
        filterParams.append('name', JSON.stringify({
          operator: filterNameOperator,
          value: filterName
        }))
      }

      const response = await privateInstance.get(`/tenant/unit-of-measurement?${filterParams.toString()}`)
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
      cell: (unit) => unit.numberType === 'integer' ? 'Inteiro' : 'Decimal',
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

    const itemsArr = Array.isArray(data.items) ? data.items : []
    setUnits(itemsArr)

    setTotalItems(data.total || 0)
    setTotalPages(data.totalPages || 1)
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
            <Popover open={isFilterOpen} onOpenChange={(open) => {
              if (open) {
                setLocalSortBy(sortBy)
                setLocalOrderBy(orderBy)
                setLocalFilterName(filterName)
                setLocalFilterNameOperator(filterNameOperator)
              }
              setIsFilterOpen(open)
            }}>
              <PopoverTrigger asChild>
                <Button variant={'outline'} size="sm">
                  <Funnel className="size-[0.85rem]" /> Filtros
                  {activeFilterCount > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{activeFilterCount}</Badge>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[340px] p-5" align="start">
                <div className="flex flex-col gap-5">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <ArrowUpDown className="h-4 w-4 text-primary" />
                      </div>
                      <h4 className="font-semibold leading-none">Ordenação</h4>
                    </div>
                    <div className="flex gap-2 w-full">
                      <div className="flex-1">
                        <Select value={localSortBy} onValueChange={setLocalSortBy}>
                          <SelectTrigger className="h-9 w-full">
                            <SelectValue placeholder="Campo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="id">ID</SelectItem>
                            <SelectItem value="createdAt">Criado em</SelectItem>
                            <SelectItem value="name">Nome</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => setLocalOrderBy(prev => prev === 'asc' ? 'desc' : 'asc')}
                        title={localOrderBy === 'asc' ? 'Crescente' : 'Decrescente'}
                      >
                        {localOrderBy === 'asc' ? <ArrowDownAZ className="h-4 w-4" /> : <ArrowUpZA className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <Funnel className="h-4 w-4 text-primary" />
                      </div>
                      <h4 className="font-semibold leading-none">Filtros</h4>
                    </div>
                    <div className="grid gap-3">
                      <div className="grid gap-1.5">
                        <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">Nome</Label>
                        <div className="flex gap-2">
                          <Select value={localFilterNameOperator} onValueChange={setLocalFilterNameOperator}>
                            <SelectTrigger className="w-[130px] h-9">
                              <SelectValue placeholder="Op." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cont">Contém</SelectItem>
                              <SelectItem value="eq">Igual</SelectItem>
                              <SelectItem value="ne">Diferente</SelectItem>
                              <SelectItem value="sw">Começa com</SelectItem>
                              <SelectItem value="ew">Termina com</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            id="name"
                            value={localFilterName}
                            onChange={(e) => setLocalFilterName(e.target.value)}
                            className="h-9 flex-1"
                            placeholder="Filtrar por nome..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="default" className="flex-1" onClick={() => {
                      setLocalSortBy('createdAt')
                      setLocalOrderBy('desc')
                      setLocalFilterName('')
                      setLocalFilterNameOperator('cont')
                      
                      setSortBy('createdAt')
                      setOrderBy('desc')
                      setFilterName('')
                      setFilterNameOperator('cont')
                      setCurrentPage(1)
                      setIsFilterOpen(false)
                    }}>
                      Limpar tudo
                    </Button>
                    <Button size="sm" className="flex-1" onClick={() => {
                      setSortBy(localSortBy)
                      setOrderBy(localOrderBy)
                      setFilterName(localFilterName)
                      setFilterNameOperator(localFilterNameOperator)
                      setCurrentPage(1) // Reset page on filter apply
                      setIsFilterOpen(false)
                    }}>
                      Aplicar
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
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
