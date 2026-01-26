import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { DataTable, type ColumnDef } from '@/components/data-table'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'
import { RefreshCw, Store as StoreIcon, ArrowUpDown, ArrowDownAZ, ArrowUpZA, Funnel, Loader, Trash, Edit as EditStoreIcon } from 'lucide-react'
import { privateInstance } from '@/lib/auth'
import { Checkbox } from '@/components/ui/checkbox'
import { EditStoreSheet } from './-components/edit-store'
import { NewStoreSheet } from './-components/new-store'
import { DeleteStore } from './-components/delete-store'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

type StoreItem = {
  id: number
  name: string
  description: string
  priceTableId: number
  active: boolean
  companyId: number
  desktopProductMediaSizeId: number
  tabletProductMediaSizeId: number
  mobileProductMediaSizeId: number
  mobileAppProductMediaSizeId: number
  createdAt: string
  updatedAt: string
}

type StoresResponse = {
  page: number
  limit: number
  totalPages: number
  total: number
  items: StoreItem[]
}

export const Route = createFileRoute('/dashboard/settings/stores/')({
  component: RouteComponent,
})

function RouteComponent() {
  const [selected, setSelected] = useState<number[]>([])
  const [items, setItems] = useState<StoreItem[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
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
    queryKey: ['stores', currentPage, perPage, sortBy, orderBy, filterName, filterNameOperator],
    refetchOnWindowFocus: false,
    refetchOnMount: false,
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

      const response = await privateInstance.get('/tenant/stores', { params })
      if (response.status !== 200) throw new Error('Erro ao carregar lojas')
      return response.data as StoresResponse
    }
  })

  useEffect(() => {
    if (!data) {
      setItems([])
      setTotalItems(0)
      return
    }
    setItems(data.items || [])
    setTotalItems(data.total || 0)
    setTotalPages(data.totalPages || 1)
  }, [data])

  useEffect(() => {
    if (isError) {
      const errorData = (error as any)?.response?.data
      toast.error(errorData?.title || 'Erro ao carregar lojas', {
        description: errorData?.detail || 'Não foi possível carregar a lista de lojas.'
      })
    }
  }, [isError, error])

  useEffect(() => {
    setSelected([])
  }, [currentPage, perPage, sortBy, orderBy, filterName, filterNameOperator])

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])

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

  const columns: ColumnDef<StoreItem>[] = useMemo(() => [
    {
      id: 'select',
      width: '60px',
      header: () => (<div className='flex justify-center items-center text-xs text-neutral-500'>Sel.</div>),
      cell: (row) => (
        <div className='flex justify-center items-center'>
          <Checkbox checked={selected.includes(row.id)} onCheckedChange={() => { if (selected.includes(row.id)) setSelected([]); else setSelected([row.id]) }} />
        </div>
      ),
      headerClassName: 'w-[60px] min-w-[60px] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[60px] min-w-[60px] border-r border-neutral-200 !px-4 py-3'
    },
    {
      id: 'name',
      header: 'Nome',
      cell: (s) => (
        <div className="flex flex-col">
          <span className="font-medium">{s.name ?? '—'}</span>
          {s.description && <span className="text-xs text-muted-foreground truncate max-w-[200px]">{s.description}</span>}
        </div>
      ),
      headerClassName: 'min-w-[15rem] border-r border-neutral-200 px-4 py-2.5',
      className: 'min-w-[15rem] border-r border-neutral-200 !px-4 py-3'
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
      headerClassName: 'w-[100px] min-w-[100px] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[100px] min-w-[100px] border-r border-neutral-200 !px-4 py-3'
    },
    {
      id: 'created_at',
      header: 'Criado em',
      width: '12.5rem',
      cell: (s) => {
        const d = fmtDate(s.createdAt)
        return (
          <span className='text-sm text-muted-foreground'>{d || '-'}</span>
        )
      },
      headerClassName: 'w-[12.5rem] min-w-[12.5rem] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[12.5rem] min-w-[12.5rem] border-r border-neutral-200 !px-4 py-3'
    },
    {
      id: 'updated_at',
      header: 'Atualizado em',
      width: '12.5rem',
      cell: (s) => {
        const d = fmtDate(s.updatedAt)
        return (
          <span className='text-sm text-muted-foreground'>{d || '-'}</span>
        )
      },
      headerClassName: 'w-[12.5rem] min-w-[12.5rem] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[12.5rem] min-w-[12.5rem] border-r border-neutral-200 !px-4 py-3'
    },
  ], [selected])

  return (
    <div className='flex flex-col w-full h-full'>
      <div className='flex items-center justify-between p-4'>
        <div className='flex flex-col'>
          <h2 className='text-lg font-semibold'>Lojas</h2>
          <p className='text-sm text-muted-foreground'>Gerencie as lojas da conta.</p>
        </div>
          <div className='flex items-center gap-2'>
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
                <Button variant="ghost" disabled={isLoading || isRefetching}>
                  <Funnel className={`size-4 ${activeFilterCount > 0 ? 'text-primary' : ''}`} />
                  {activeFilterCount > 0 && (
                    <span className="absolute top-2 right-2 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[340px] p-5" align="end">
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
                    }}>
                      Limpar
                    </Button>
                    <Button size="default" className="flex-1" onClick={() => {
                      setSortBy(localSortBy)
                      setOrderBy(localOrderBy)
                      setFilterName(localFilterName)
                      setFilterNameOperator(localFilterNameOperator)
                      setIsFilterOpen(false)
                    }}>
                      Aplicar
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Button variant='ghost' onClick={() => { setSelected([]); refetch() }} disabled={isLoading || isRefetching}>
              {(isLoading || isRefetching) ? (<RefreshCw className='animate-spin' />) : (<RefreshCw />)}
            </Button>

            {selected.length === 1 ? (
              <DeleteStore storeId={selected[0]} onDeleted={() => { setSelected([]); refetch(); }} />
            ) : (
              <Button variant={'outline'} size="sm" disabled>
                <Trash className="size-[0.85rem]" /> Excluir
              </Button>
            )}

            {selected.length === 1 ? (
              <EditStoreSheet storeId={selected[0]} onSaved={() => { setSelected([]); refetch(); }} />
            ) : (
              <Button variant={'outline'} size="sm" disabled>
                <EditStoreIcon className="size-[0.85rem]" /> Editar
              </Button>
            )}
            <NewStoreSheet onCreated={() => refetch()} />
          </div>
      </div>
      
      <div className='flex flex-col w-full h-full flex-1 overflow-hidden pl-4'>
        <div className='border-t border-l border-neutral-200 rounded-tl-lg overflow-hidden h-full flex flex-col flex-1'>
          <DataTable
            columns={columns}
            data={items}
            loading={isLoading || isRefetching}
            skeletonCount={3}
            page={currentPage}
            totalItems={totalItems}
            perPage={perPage}
            rowClassName='h-12'
            emptyMessage='Nenhuma loja encontrada'
            emptySlot={(
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <StoreIcon className="size-6" />
                  </EmptyMedia>
                  <EmptyTitle>Nenhuma loja encontrada</EmptyTitle>
                  <EmptyDescription>
                    {activeFilterCount > 0 
                      ? "Nenhuma loja corresponde aos filtros selecionados." 
                      : "Comece criando sua primeira loja para gerenciar."}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <div className='flex gap-2'>
                    <NewStoreSheet onCreated={() => refetch()} />
                    <Button variant={'ghost'} size='sm' disabled={isLoading || isRefetching} onClick={() => { setSelected([]); refetch() }}>
                      {(isLoading || isRefetching) ? <RefreshCw className='animate-spin size-[0.85rem]' /> : <RefreshCw className='size-[0.85rem]' />}
                    </Button>
                  </div>
                </EmptyContent>
              </Empty>
            )}
            onChange={(params) => {
              if (params.page) setCurrentPage(params.page)
              if (params.perPage) setPerPage(params.perPage)
            }}
          />
        </div>
      </div>
    </div>
  )
}
