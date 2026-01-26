import { createFileRoute } from '@tanstack/react-router'
import { Topbar } from '../-components/topbar'
import { Button } from '@/components/ui/button'
import { Edit, RefreshCw, Trash, BadgeDollarSign, ArrowUpDown, ArrowDownAZ, ArrowUpZA, Funnel } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { privateInstance } from '@/lib/auth'
import { DataTable } from '@/components/data-table'
import type { ColumnDef } from '@/components/data-table'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'
import { NewPriceTableSheet } from './-components/new-price-table'
import { EditPriceTableSheet } from './-components/edit-price-table'
import { DeletePriceTable } from './-components/delete-price-table'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

export const Route = createFileRoute('/dashboard/price-tables/')({
  component: RouteComponent,
})

type PriceTable = {
  id: number
  name: string
  active: boolean
  createdAt: string
  updatedAt: string
}

type PriceTablesResponse = {
  page: number
  limit: number
  totalPages: number
  total: number
  items: PriceTable[]
}

function RouteComponent() {
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [selected, setSelected] = useState<number[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [, setTotalPages] = useState(1)

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
    queryKey: ['price-tables', currentPage, perPage, sortBy, orderBy, filterName, filterNameOperator],
    queryFn: async () => {
      const params: any = {
        page: currentPage,
        limit: Math.min(100, perPage),
        sortBy,
        orderBy
      }

      if (filterName) {
        params.name = JSON.stringify({ operator: filterNameOperator, value: filterName })
      }

      const response = await privateInstance.get('/tenant/price-tables', { params })
      if (response.status !== 200) throw new Error('Erro ao carregar tabelas de preço')
      return response.data as PriceTablesResponse
    }
  })

  const [items, setItems] = useState<PriceTable[]>([])
  
  const canManageSelected = useMemo(() => selected.length > 0, [selected])

  const fmtDate = (v?: string) => {
    if (!v) return '-'
    try {
      const d = new Date(v)
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(d)
    } catch {
      return v
    }
  }

  const columns: ColumnDef<PriceTable>[] = useMemo(() => [
    {
      id: 'select',
      width: '40px',
      header: () => (<div className='flex justify-center items-center text-xs text-neutral-500'>Sel.</div>),
      cell: (row) => (
        <div className='flex justify-center items-center'>
          <Checkbox checked={selected.includes(row.id)} onCheckedChange={() => toggleSelect(row.id)} />
        </div>
      ),
      headerClassName: 'w-[40px] min-w-[40px] border-r',
      className: 'w-[40px] min-w-[40px] font-medium border-r p-2!'
    },
    { 
      id: 'name', 
      header: 'Nome', 
      cell: (p) => p.name ?? '—', 
      className: 'border-r p-2!' 
    },
    {
      id: 'active',
      header: 'Status',
      width: '100px',
      cell: (p) => (
        <Badge variant={p.active ? 'default' : 'secondary'} className="text-xs">
          {p.active ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
      headerClassName: 'w-[100px] min-w-[100px] border-r',
      className: 'w-[100px] min-w-[100px] p-2!'
    },
    {
      id: 'createdAt',
      header: 'Criado em',
      cell: (p) => (<span className='text-sm text-muted-foreground'>{fmtDate(p.createdAt)}</span>),
      width: '150px',
      headerClassName: 'w-[150px] min-w-[150px] border-r',
      className: 'w-[150px] min-w-[150px] p-2!'
    },
    {
      id: 'updatedAt',
      header: 'Atualizado em',
      cell: (p) => (<span className='text-sm text-muted-foreground'>{fmtDate(p.updatedAt)}</span>),
      width: '150px',
      headerClassName: 'w-[150px] min-w-[150px] border-r',
      className: 'w-[150px] min-w-[150px] p-2!'
    },
  ], [items, selected])

  useEffect(() => {
    if (!data) return
    setItems(data.items || [])
    setTotalItems(data.total || 0)
    setTotalPages(data.totalPages || 1)
  }, [data])

  useEffect(() => {
    if (isError) {
      const errorData = (error as any)?.response?.data
      toast.error(errorData?.title || 'Erro ao carregar tabelas de preço', {
        description: errorData?.detail || 'Não foi possível carregar a lista de tabelas de preço.'
      })
    }
  }, [isError, error])

  useEffect(() => { setSelected([]) }, [currentPage, perPage, sortBy, orderBy, filterName, filterNameOperator])
  useEffect(() => { if (isRefetching) setSelected([]) }, [isRefetching])

  const toggleSelect = (id: number) => { if (selected.includes(id)) setSelected([]); else setSelected([id]) }

  return (
    <div className='flex flex-col w-full h-full'>
      <Topbar title='Tabelas de preço' breadcrumbs={[{ label: 'Dashboard', href: '/dashboard', isLast: false }, { label: 'Tabelas de preço', href: '/dashboard/price-tables', isLast: true }]} />
      <div className='flex flex-col w-full h-full flex-1 overflow-hidden'>
        <div className='border-b flex w-full items-center p-2 gap-4'>
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
              <Button variant="outline" size="sm">
                <Funnel className="mr-2 size-3.5" />
                Filtros
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                    {activeFilterCount}
                  </Badge>
                )}
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
                          <SelectItem value="updatedAt">Atualizado em</SelectItem>
                          <SelectItem value="name">Nome</SelectItem>
                          <SelectItem value="active">Status</SelectItem>
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
                    setCurrentPage(1)
                    setIsFilterOpen(false)
                  }}>
                    Aplicar
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <div className='flex items-center gap-2 flex-1'></div>
          <div className='flex items-center gap-2'>
            <Button variant={'ghost'} size="sm" disabled={isLoading || isRefetching} onClick={() => { setSelected([]); refetch() }}>
              {(isLoading || isRefetching) ? (<RefreshCw className='animate-spin size-[0.85rem]' />) : (<RefreshCw className="size-[0.85rem]" />)}
            </Button>
            {selected.length === 1 ? (<DeletePriceTable priceTableId={selected[0]} disabled={!canManageSelected} />) : (<Button variant={'outline'} size="sm" disabled><Trash className="size-[0.85rem]" /> Excluir</Button>)}
            {selected.length === 1 ? (<EditPriceTableSheet priceTableId={selected[0]} disabled={!canManageSelected} />) : (<Button variant={'outline'} size="sm" disabled><Edit className="size-[0.85rem]" /> Editar</Button>)}
            <NewPriceTableSheet />
          </div>
        </div>
        <DataTable
          columns={columns}
          data={items}
          loading={isLoading || isRefetching}
          page={currentPage}
          perPage={perPage}
          totalItems={totalItems}
          emptyMessage='Nenhuma tabela de preço encontrada'
          emptySlot={(
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant='icon'>
                  <BadgeDollarSign className='h-6 w-6' />
                </EmptyMedia>
                <EmptyTitle>Nenhuma tabela de preço ainda</EmptyTitle>
                <EmptyDescription>Você ainda não criou nenhuma tabela de preço. Comece criando a primeira.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <div className='flex gap-2'>
                  <NewPriceTableSheet />
                  <Button variant={'ghost'} size="sm" disabled={isLoading || isRefetching} onClick={() => { setSelected([]); refetch() }}>
                    {(isLoading || isRefetching) ? <RefreshCw className='animate-spin size-[0.85rem]' /> : <RefreshCw className="size-[0.85rem]" />}
                  </Button>
                </div>
              </EmptyContent>
            </Empty>
          )}
          onChange={({ page, perPage }) => { if (typeof page === 'number') setCurrentPage(page); if (typeof perPage === 'number') setPerPage(perPage); }}
        />
      </div>
    </div>
  )
}
