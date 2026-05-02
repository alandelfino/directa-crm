import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Topbar } from '../-components/topbar'
import { privateInstance } from '@/lib/auth'
import { DataTable, type ColumnDef } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { formatMoneyFromCents } from '@/lib/utils'
import { NewCouponSheet } from './-components/new-coupon'
import { EditCouponSheet } from './-components/edit-coupon'
import { DeleteCoupon } from './-components/delete-coupon'
import { CouponRulesSheet } from './-components/coupon-rules-sheet'
import {
  ArrowDownAZ,
  ArrowUpDown,
  ArrowUpZA,
  Edit,
  Funnel,
  RefreshCw,
  ShieldCheck,
  TicketPercent,
  Trash,
} from 'lucide-react'

export const Route = createFileRoute('/dashboard/cupons/')({
  component: RouteComponent,
})

type CouponType =
  | 'fixed_in_total_value'
  | 'percent_in_total_value'
  | 'fixed_in_product_value'
  | 'percent_in_product_value'
  | 'fixed_in_shipping_value'
  | 'percent_in_shipping_value'

type Coupon = {
  id: number
  code: string
  description: string
  customerMessage: string
  type: CouponType | string
  value: number
  storeId: number
  createdAt: string
  updatedAt: string
}

type CouponsResponse = {
  page: number
  limit: number
  totalPages: number
  total: number
  items: Coupon[]
}

type Store = { id: number; name: string }

const couponTypes: Array<{ value: CouponType; label: string; kind: 'fixed' | 'percent' }> = [
  { value: 'fixed_in_total_value', label: 'Fixo no valor total', kind: 'fixed' },
  { value: 'percent_in_total_value', label: 'Percentual no valor total', kind: 'percent' },
  { value: 'fixed_in_product_value', label: 'Fixo no valor produto', kind: 'fixed' },
  { value: 'percent_in_product_value', label: '% no produto', kind: 'percent' },
  { value: 'fixed_in_shipping_value', label: 'Fixo no frete', kind: 'fixed' },
  { value: 'percent_in_shipping_value', label: '% no frete', kind: 'percent' },
]

function getCouponTypeLabel(type: string) {
  return couponTypes.find((t) => t.value === type)?.label ?? type
}

function formatCouponValue(type: string, value: number) {
  const kind = couponTypes.find((t) => t.value === type)?.kind
  if (kind === 'percent') {
    const v = Number(value) || 0
    const n = v / 100
    try {
      const txt = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
      return `${txt}%`
    } catch {
      return `${n.toFixed(2)}%`
    }
  }
  return formatMoneyFromCents(Number(value) || 0)
}

function RouteComponent() {
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const [sortBy, setSortBy] = useState('createdAt')
  const [orderBy, setOrderBy] = useState('desc')
  const [filterCode, setFilterCode] = useState('')
  const [filterCodeOperator, setFilterCodeOperator] = useState('cont')
  const [filterCustomerMessage, setFilterCustomerMessage] = useState('')
  const [filterCustomerMessageOperator, setFilterCustomerMessageOperator] = useState('cont')
  const [filterType, setFilterType] = useState('')
  const [filterStoreId, setFilterStoreId] = useState('')

  const [localSortBy, setLocalSortBy] = useState('createdAt')
  const [localOrderBy, setLocalOrderBy] = useState('desc')
  const [localFilterCode, setLocalFilterCode] = useState('')
  const [localFilterCodeOperator, setLocalFilterCodeOperator] = useState('cont')
  const [localFilterCustomerMessage, setLocalFilterCustomerMessage] = useState('')
  const [localFilterCustomerMessageOperator, setLocalFilterCustomerMessageOperator] = useState('cont')
  const [localFilterType, setLocalFilterType] = useState('')
  const [localFilterStoreId, setLocalFilterStoreId] = useState('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const activeFilterCount =
    (filterCode ? 1 : 0) + (filterCustomerMessage ? 1 : 0) + (filterType ? 1 : 0) + (filterStoreId ? 1 : 0)

  const { data: stores } = useQuery({
    queryKey: ['stores-list-select'],
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await privateInstance.get('/tenant/stores', {
        params: { page: 1, limit: 100, sortBy: 'name', orderBy: 'asc' },
      })
      const items = response.data?.items ?? response.data
      return Array.isArray(items) ? (items as Store[]) : []
    },
  })

  const storesById = useMemo(() => {
    const map = new Map<number, Store>()
    for (const s of stores ?? []) map.set(Number(s.id), s)
    return map
  }, [stores])

  const { data, isLoading, isRefetching, isError, error, refetch } = useQuery({
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    queryKey: [
      'cupons',
      currentPage,
      perPage,
      sortBy,
      orderBy,
      filterCode,
      filterCodeOperator,
      filterCustomerMessage,
      filterCustomerMessageOperator,
      filterType,
      filterStoreId,
    ],
    queryFn: async () => {
      const params: any = {
        page: currentPage,
        limit: perPage,
        sortBy,
        orderBy,
      }

      if (filterCode) params.code = JSON.stringify({ operator: filterCodeOperator, value: filterCode })
      if (filterCustomerMessage) params.customerMessage = JSON.stringify({ operator: filterCustomerMessageOperator, value: filterCustomerMessage })
      if (filterType) params.type = JSON.stringify({ operator: 'eq', value: filterType })
      if (filterStoreId) params.storeId = JSON.stringify({ operator: 'eq', value: Number(filterStoreId) })

      const response = await privateInstance.get('/tenant/cupons', { params })
      if (response.status !== 200) throw new Error('Erro ao carregar cupons')
      return response.data as CouponsResponse
    },
  })

  const [items, setItems] = useState<Coupon[]>([])

  const columns: ColumnDef<Coupon>[] = [
    {
      id: 'select',
      width: '60px',
      header: () => (
        <div className="flex justify-center items-center">
          <Checkbox checked={items.length > 0 && selectedIds.length === items.length} onCheckedChange={toggleSelectAll} />
        </div>
      ),
      cell: (row) => (
        <div className="flex justify-center items-center">
          <Checkbox checked={selectedIds.includes(row.id)} onCheckedChange={() => toggleSelectItem(row.id)} />
        </div>
      ),
      headerClassName: 'w-[60px] min-w-[60px] border-r',
      className: 'w-[60px] min-w-[60px] font-medium border-r',
    },
    {
      id: 'code',
      header: 'Código',
      cell: (row) => <span className="block truncate min-w-0" title={row.code}>{row.code}</span>,
      headerClassName: 'min-w-[180px] border-r',
      className: 'min-w-[180px]',
    },
    {
      id: 'name',
      header: 'Nome',
      cell: (row) => <span className="block truncate min-w-0" title={row.customerMessage}>{row.customerMessage}</span>,
      headerClassName: 'min-w-[240px] border-r',
      className: 'min-w-[240px]',
    },
    {
      id: 'type',
      header: 'Tipo',
      cell: (row) => (
        <Badge variant="secondary" className="font-normal">
          {getCouponTypeLabel(row.type)}
        </Badge>
      ),
      headerClassName: 'min-w-[200px] border-r',
      className: 'min-w-[200px]',
    },
    {
      id: 'value',
      header: 'Valor',
      cell: (row) => <span className="tabular-nums">{formatCouponValue(row.type, row.value)}</span>,
      headerClassName: 'w-[170px] min-w-[170px] border-r text-right',
      className: 'w-[170px] min-w-[170px] text-right',
    },
    {
      id: 'store',
      header: 'Loja',
      cell: (row) => {
        const store = storesById.get(Number(row.storeId))
        const label = store?.name ?? `#${row.storeId}`
        return <span className="block truncate min-w-0" title={label}>{label}</span>
      },
      headerClassName: 'min-w-[220px] border-r',
      className: 'min-w-[220px]',
    },
    {
      id: 'createdAt',
      header: 'Criado em',
      cell: (row) => <span className="text-sm">{row.createdAt ? new Date(row.createdAt).toLocaleDateString('pt-BR') : '-'}</span>,
      width: '180px',
      headerClassName: 'w-[180px] min-w-[180px] border-r',
      className: 'w-[180px] min-w-[180px]',
    },
    {
      id: 'updatedAt',
      header: 'Atualizado em',
      cell: (row) => <span className="text-sm">{row.updatedAt ? new Date(row.updatedAt).toLocaleDateString('pt-BR') : '-'}</span>,
      width: '180px',
      headerClassName: 'w-[180px] min-w-[180px] border-r',
      className: 'w-[180px] min-w-[180px]',
    },
  ]

  useEffect(() => {
    if (!data) return
    const nextItems = Array.isArray(data.items) ? data.items : []
    setItems(nextItems)
    setTotalItems(data.total || 0)
    setTotalPages(data.totalPages || 1)
  }, [data])

  useEffect(() => {
    if (!isError) return
    const errorData = (error as any)?.response?.data
    toast.error(errorData?.title || 'Erro ao carregar cupons', {
      description: errorData?.detail || 'Não foi possível carregar a lista de cupons.',
    })
  }, [isError, error])

  useEffect(() => {
    setSelectedIds([])
  }, [currentPage, perPage])

  useEffect(() => {
    if (isRefetching) setSelectedIds([])
  }, [isRefetching])

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages)
  }, [totalPages, currentPage])

  function toggleSelectAll() {
    if (selectedIds.length === items.length) setSelectedIds([])
    else setSelectedIds(items.map((i) => i.id))
  }

  function toggleSelectItem(id: number) {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter((i) => i !== id))
    else setSelectedIds([...selectedIds, id])
  }

  return (
    <div className="flex flex-col w-full h-full">
      <Topbar
        title="Cupons"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard', isLast: false },
          { label: 'Cupons', href: '/dashboard/cupons', isLast: true },
        ]}
      />

      <div className="flex flex-col w-full h-full flex-1 overflow-hidden">
        <div className="flex w-full items-center p-2 gap-4">
          <div className="flex items-center gap-2 flex-1">
            <Popover
              open={isFilterOpen}
              onOpenChange={(open) => {
                if (open) {
                  setLocalSortBy(sortBy)
                  setLocalOrderBy(orderBy)
                  setLocalFilterCode(filterCode)
                  setLocalFilterCodeOperator(filterCodeOperator)
                  setLocalFilterCustomerMessage(filterCustomerMessage)
                  setLocalFilterCustomerMessageOperator(filterCustomerMessageOperator)
                  setLocalFilterType(filterType)
                  setLocalFilterStoreId(filterStoreId)
                }
                setIsFilterOpen(open)
              }}
            >
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Funnel className="size-[0.85rem]" /> Filtros
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[380px] p-5" align="start">
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
                            <SelectItem value="code">Código</SelectItem>
                            <SelectItem value="customerMessage">Nome</SelectItem>
                            <SelectItem value="type">Tipo</SelectItem>
                            <SelectItem value="value">Valor</SelectItem>
                            <SelectItem value="storeId">Loja</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => setLocalOrderBy((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
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
                        <Label htmlFor="code" className="text-xs font-medium text-muted-foreground">
                          Código
                        </Label>
                        <div className="flex gap-2">
                          <Select value={localFilterCodeOperator} onValueChange={setLocalFilterCodeOperator}>
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
                            id="code"
                            value={localFilterCode}
                            onChange={(e) => setLocalFilterCode(e.target.value)}
                            className="h-9 flex-1"
                            placeholder="Filtrar por código..."
                          />
                        </div>
                      </div>

                      <div className="grid gap-1.5">
                        <Label htmlFor="customerMessage" className="text-xs font-medium text-muted-foreground">
                          Nome
                        </Label>
                        <div className="flex gap-2">
                          <Select value={localFilterCustomerMessageOperator} onValueChange={setLocalFilterCustomerMessageOperator}>
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
                            id="customerMessage"
                            value={localFilterCustomerMessage}
                            onChange={(e) => setLocalFilterCustomerMessage(e.target.value)}
                            className="h-9 flex-1"
                            placeholder="Filtrar por nome..."
                          />
                        </div>
                      </div>

                      <div className="grid gap-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Tipo</Label>
                        <Select value={localFilterType} onValueChange={setLocalFilterType}>
                          <SelectTrigger className="h-9 w-full">
                            <SelectValue placeholder="Todos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Todos</SelectItem>
                            {couponTypes.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Loja</Label>
                        <Select value={localFilterStoreId} onValueChange={setLocalFilterStoreId}>
                          <SelectTrigger className="h-9 w-full">
                            <SelectValue placeholder="Todas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Todas</SelectItem>
                            {(stores ?? []).map((s) => (
                              <SelectItem key={s.id} value={String(s.id)}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="default"
                      className="flex-1"
                      onClick={() => {
                        setLocalSortBy('createdAt')
                        setLocalOrderBy('desc')
                        setLocalFilterCode('')
                        setLocalFilterCodeOperator('cont')
                        setLocalFilterCustomerMessage('')
                        setLocalFilterCustomerMessageOperator('cont')
                        setLocalFilterType('')
                        setLocalFilterStoreId('')

                        setSortBy('createdAt')
                        setOrderBy('desc')
                        setFilterCode('')
                        setFilterCodeOperator('cont')
                        setFilterCustomerMessage('')
                        setFilterCustomerMessageOperator('cont')
                        setFilterType('')
                        setFilterStoreId('')
                        setCurrentPage(1)
                        setIsFilterOpen(false)
                      }}
                    >
                      Limpar tudo
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setSortBy(localSortBy)
                        setOrderBy(localOrderBy)
                        setFilterCode(localFilterCode)
                        setFilterCodeOperator(localFilterCodeOperator)
                        setFilterCustomerMessage(localFilterCustomerMessage)
                        setFilterCustomerMessageOperator(localFilterCustomerMessageOperator)
                        setFilterType(localFilterType)
                        setFilterStoreId(localFilterStoreId)
                        setCurrentPage(1)
                        setIsFilterOpen(false)
                      }}
                    >
                      Aplicar
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={isLoading || isRefetching}
              onClick={() => {
                setSelectedIds([])
                refetch()
              }}
            >
              {(isLoading || isRefetching) ? (
                <RefreshCw className="animate-spin size-[0.85rem]" />
              ) : (
                <RefreshCw className="size-[0.85rem]" />
              )}
            </Button>

            {selectedIds.length === 1 ? (
              <CouponRulesSheet cuponId={selectedIds[0]} />
            ) : (
              <Button variant="outline" disabled size="sm">
                <ShieldCheck className="size-[0.85rem]" /> Regras de aplicação
              </Button>
            )}

            {selectedIds.length === 1 ? (
              <DeleteCoupon couponId={selectedIds[0]} />
            ) : (
              <Button variant="outline" disabled size="sm">
                <Trash className="size-[0.85rem]" /> Excluir
              </Button>
            )}

            {selectedIds.length === 1 ? (
              <EditCouponSheet couponId={selectedIds[0]} />
            ) : (
              <Button variant="outline" disabled size="sm">
                <Edit className="size-[0.85rem]" /> Editar
              </Button>
            )}

            <NewCouponSheet />
          </div>
        </div>

        <div className="px-2 h-full">
          <DataTable
            columns={columns}
            data={items}
            loading={isLoading || isRefetching}
            page={currentPage}
            perPage={perPage}
            totalItems={totalItems}
            emptyMessage="Nenhum cupom encontrado"
            emptySlot={
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <TicketPercent className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyTitle>Nenhum cupom ainda</EmptyTitle>
                  <EmptyDescription>Você ainda não criou nenhum cupom. Comece criando seu primeiro cupom.</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <div className="flex gap-2">
                    <NewCouponSheet />
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isLoading || isRefetching}
                      onClick={() => {
                        setSelectedIds([])
                        refetch()
                      }}
                    >
                      {(isLoading || isRefetching) ? (
                        <RefreshCw className="animate-spin size-[0.85rem]" />
                      ) : (
                        <RefreshCw className="size-[0.85rem]" />
                      )}
                    </Button>
                  </div>
                </EmptyContent>
              </Empty>
            }
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
