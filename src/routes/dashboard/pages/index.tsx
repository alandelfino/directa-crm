import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { DataTable, type ColumnDef } from '@/components/data-table'
import { RefreshCw, FileText, Funnel, ArrowUpDown, ArrowDownAZ, ArrowUpZA, Trash, Edit as EditIcon } from 'lucide-react'
import { privateInstance } from '@/lib/auth'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { NewPageSheet } from './-components/new-page'
import { EditPageSheet } from './-components/edit-page'
import { DeletePageDialog } from './-components/delete-page'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'

type PageType = 'landingpage' | 'search' | 'product' | 'cart' | 'checkout' | 'login' | 'register' | 'my_account'

type PageItem = {
  id: number
  name: string
  path: string
  active: boolean
  storeId: number
  type: PageType
  createdAt: string
  updatedAt: string
}

type PagesResponse = {
  page: number
  limit: number
  totalPages: number
  total: number
  items: PageItem[]
}

const pageTypes: Array<{ value: PageType; label: string }> = [
  { value: 'landingpage', label: 'Landing Page' },
  { value: 'search', label: 'Busca' },
  { value: 'product', label: 'Produto' },
  { value: 'cart', label: 'Carrinho' },
  { value: 'checkout', label: 'Checkout' },
  { value: 'login', label: 'Login' },
  { value: 'register', label: 'Cadastro' },
  { value: 'my_account', label: 'Minha conta' },
]

export const Route = createFileRoute('/dashboard/pages/')({
  component: RouteComponent,
})

function RouteComponent() {
  const [selected, setSelected] = useState<number[]>([])
  const [items, setItems] = useState<PageItem[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const [sortBy, setSortBy] = useState('createdAt')
  const [orderBy, setOrderBy] = useState('desc')
  const [filterName, setFilterName] = useState('')
  const [filterNameOperator, setFilterNameOperator] = useState('cont')
  const [filterPath, setFilterPath] = useState('')
  const [filterPathOperator, setFilterPathOperator] = useState('cont')
  const [filterActive, setFilterActive] = useState<'all' | 'true' | 'false'>('all')
  const [filterStoreId, setFilterStoreId] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')

  const [localSortBy, setLocalSortBy] = useState('createdAt')
  const [localOrderBy, setLocalOrderBy] = useState('desc')
  const [localFilterName, setLocalFilterName] = useState('')
  const [localFilterNameOperator, setLocalFilterNameOperator] = useState('cont')
  const [localFilterPath, setLocalFilterPath] = useState('')
  const [localFilterPathOperator, setLocalFilterPathOperator] = useState('cont')
  const [localFilterActive, setLocalFilterActive] = useState<'all' | 'true' | 'false'>('all')
  const [localFilterStoreId, setLocalFilterStoreId] = useState<string>('all')
  const [localFilterType, setLocalFilterType] = useState<string>('all')
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const activeFilterCount =
    (filterName ? 1 : 0) +
    (filterPath ? 1 : 0) +
    (filterActive !== 'all' ? 1 : 0) +
    (filterStoreId !== 'all' ? 1 : 0) +
    (filterType !== 'all' ? 1 : 0)

  const { data: stores } = useQuery({
    queryKey: ['stores-list-select-pages'],
    enabled: isFilterOpen,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 0,
    queryFn: async () => {
      const response = await privateInstance.get('/tenant/stores', { params: { page: 1, limit: 100, sortBy: 'name', orderBy: 'asc' } })
      const items = response.data?.items ?? response.data
      return Array.isArray(items) ? items : []
    },
  })

  const { data, isLoading, isRefetching, isError, error, refetch } = useQuery({
    queryKey: ['pages', currentPage, perPage, sortBy, orderBy, filterName, filterNameOperator, filterPath, filterPathOperator, filterActive, filterStoreId, filterType],
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    queryFn: async () => {
      const params: any = {
        page: currentPage,
        limit: Math.min(100, perPage),
        sortBy,
        orderBy,
      }

      if (filterName) params.name = JSON.stringify({ operator: filterNameOperator, value: filterName })
      if (filterPath) params.path = JSON.stringify({ operator: filterPathOperator, value: filterPath })
      if (filterActive !== 'all') params.active = JSON.stringify({ operator: 'eq', value: filterActive === 'true' })
      if (filterStoreId !== 'all') params.storeId = JSON.stringify({ operator: 'eq', value: Number(filterStoreId) })
      if (filterType !== 'all') params.type = JSON.stringify({ operator: 'eq', value: filterType })

      const response = await privateInstance.get('/tenant/pages', { params })
      if (response.status !== 200) throw new Error('Erro ao carregar páginas')
      return response.data as PagesResponse
    },
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
      toast.error(errorData?.title || 'Erro ao carregar páginas', {
        description: errorData?.detail || 'Não foi possível carregar a lista de páginas.',
      })
    }
  }, [isError, error])

  useEffect(() => {
    setSelected([])
  }, [currentPage, perPage, sortBy, orderBy, filterName, filterNameOperator, filterPath, filterPathOperator, filterActive, filterStoreId, filterType])

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages)
  }, [totalPages, currentPage])

  const columns: ColumnDef<PageItem>[] = useMemo(() => [
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
      className: 'w-[60px] min-w-[60px] border-r border-neutral-200 !px-4 py-3',
    },
    {
      id: 'name',
      header: 'Página',
      cell: (p) => (
        <div className="flex flex-col min-w-0">
          <span className="font-medium truncate">{p.name ?? '—'}</span>
          <span className="text-xs text-muted-foreground truncate">{p.path ?? '—'}</span>
        </div>
      ),
      headerClassName: 'min-w-[18rem] border-r border-neutral-200 px-4 py-2.5',
      className: 'min-w-[18rem] border-r border-neutral-200 !px-4 py-3',
    },
    {
      id: 'type',
      header: 'Tipo',
      width: 'fit',
      cell: (p) => (
        <span className="text-sm">{pageTypes.find((t) => t.value === p.type)?.label ?? p.type}</span>
      ),
      headerClassName: 'border-r border-neutral-200 px-4 py-2.5 min-w-fit w-fit',
      className: 'border-r border-neutral-200 !px-4 py-3 min-w-fit w-fit',
    },
    {
      id: 'storeId',
      header: 'Loja',
      width: '120px',
      cell: (p) => (
        <span className="text-sm">#{p.storeId}</span>
      ),
      headerClassName: 'w-[120px] min-w-[120px] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[120px] min-w-[120px] border-r border-neutral-200 !px-4 py-3',
    },
    {
      id: 'active',
      header: 'Status',
      width: '110px',
      cell: (p) => (
        <Badge variant={p.active ? 'default' : 'secondary'} className="text-xs">
          {p.active ? 'Ativa' : 'Inativa'}
        </Badge>
      ),
      headerClassName: 'w-[110px] min-w-[110px] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[110px] min-w-[110px] border-r border-neutral-200 !px-4 py-3',
    },
  ], [selected])

  return (
    <div className='flex flex-col w-full h-full'>
      <div className='flex items-center justify-between p-4'>
        <div className='flex flex-col'>
          <h2 className='text-lg font-semibold'>Páginas</h2>
          <p className='text-sm text-muted-foreground'>Gerencie as páginas da loja.</p>
        </div>
        <div className='flex items-center gap-2'>
          <Popover open={isFilterOpen} onOpenChange={(open) => {
            if (open) {
              setLocalSortBy(sortBy)
              setLocalOrderBy(orderBy)
              setLocalFilterName(filterName)
              setLocalFilterNameOperator(filterNameOperator)
              setLocalFilterPath(filterPath)
              setLocalFilterPathOperator(filterPathOperator)
              setLocalFilterActive(filterActive)
              setLocalFilterStoreId(filterStoreId)
              setLocalFilterType(filterType)
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
            <PopoverContent className="w-[380px] p-5" align="end">
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
                          <SelectItem value="path">Path</SelectItem>
                          <SelectItem value="active">Status</SelectItem>
                          <SelectItem value="storeId">Loja</SelectItem>
                          <SelectItem value="type">Tipo</SelectItem>
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
                      <Label className="text-xs font-medium text-muted-foreground">Nome</Label>
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
                        <Input value={localFilterName} onChange={(e) => setLocalFilterName(e.target.value)} className="h-9 flex-1" placeholder="Filtrar..." />
                      </div>
                    </div>

                    <div className="grid gap-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Path</Label>
                      <div className="flex gap-2">
                        <Select value={localFilterPathOperator} onValueChange={setLocalFilterPathOperator}>
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
                        <Input value={localFilterPath} onChange={(e) => setLocalFilterPath(e.target.value)} className="h-9 flex-1" placeholder="/home" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                        <Select value={localFilterActive} onValueChange={(v: any) => setLocalFilterActive(v)}>
                          <SelectTrigger className="h-9 w-full">
                            <SelectValue placeholder="Todos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="true">Ativa</SelectItem>
                            <SelectItem value="false">Inativa</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Tipo</Label>
                        <Select value={localFilterType} onValueChange={setLocalFilterType}>
                          <SelectTrigger className="h-9 w-full">
                            <SelectValue placeholder="Todos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {pageTypes.map((t) => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid gap-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Loja</Label>
                      <Select value={localFilterStoreId} onValueChange={setLocalFilterStoreId}>
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          {(stores ?? []).map((s: any) => (
                            <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="default" className="flex-1" onClick={() => {
                    setLocalSortBy('createdAt')
                    setLocalOrderBy('desc')
                    setLocalFilterName('')
                    setLocalFilterNameOperator('cont')
                    setLocalFilterPath('')
                    setLocalFilterPathOperator('cont')
                    setLocalFilterActive('all')
                    setLocalFilterStoreId('all')
                    setLocalFilterType('all')
                  }}>
                    Limpar
                  </Button>
                  <Button size="default" className="flex-1" onClick={() => {
                    setSortBy(localSortBy)
                    setOrderBy(localOrderBy)
                    setFilterName(localFilterName)
                    setFilterNameOperator(localFilterNameOperator)
                    setFilterPath(localFilterPath)
                    setFilterPathOperator(localFilterPathOperator)
                    setFilterActive(localFilterActive)
                    setFilterStoreId(localFilterStoreId)
                    setFilterType(localFilterType)
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
            <DeletePageDialog pageId={selected[0]} onDeleted={() => { setSelected([]); refetch() }} />
          ) : (
            <Button variant={'outline'} size="sm" disabled>
              <Trash className="size-[0.85rem] mr-2" /> Excluir
            </Button>
          )}

          {selected.length === 1 ? (
            <EditPageSheet pageId={selected[0]} onSaved={() => { setSelected([]); refetch() }} />
          ) : (
            <Button variant={'outline'} size="sm" disabled>
              <EditIcon className="size-[0.85rem]" /> Editar
            </Button>
          )}

          <NewPageSheet onCreated={() => refetch()} />
        </div>
      </div>

      <div className='flex flex-col w-full h-full flex-1 overflow-hidden pl-4'>
        <div className='rounded-tl-lg overflow-hidden h-full flex flex-col flex-1'>
          <DataTable
            columns={columns}
            data={items}
            loading={isLoading || isRefetching}
            skeletonCount={3}
            page={currentPage}
            totalItems={totalItems}
            perPage={perPage}
            rowClassName='h-12'
            emptyMessage='Nenhuma página encontrada'
            emptySlot={(
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FileText className="size-6" />
                  </EmptyMedia>
                  <EmptyTitle>Nenhuma página encontrada</EmptyTitle>
                  <EmptyDescription>
                    {activeFilterCount > 0 ? 'Nenhuma página corresponde aos filtros selecionados.' : 'Crie a primeira página para começar.'}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <div className='flex gap-2'>
                    <NewPageSheet onCreated={() => refetch()} />
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
            onRowClick={(row) => {
              setSelected(selected.includes(row.id) ? [] : [row.id])
            }}
            rowIsSelected={(row) => selected.includes(row.id)}
          />
        </div>
      </div>
    </div>
  )
}

