import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { privateInstance } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { DataTable, type ColumnDef } from '@/components/data-table'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowDownAZ, ArrowUpDown, ArrowUpZA, Edit, Funnel, RefreshCw, ShieldCheck, Trash } from 'lucide-react'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { NewPaymentMethodSheet } from './-components/new-payment-integration'
import { EditPaymentMethodSheet } from './-components/edit-payment-integration'
import { DeletePaymentMethodDialog } from './-components/delete-payment-integration'
import { formatMoneyFromCents } from '@/lib/utils'
import { dataTime } from '@/lib/format'
import { PayInsSheet } from './-components/pay-ins-sheet'

export const Route = createFileRoute('/dashboard/settings/payment-methods/')({
  component: RouteComponent,
})

type DiscountType = 'percent' | 'fixed'

type Store = {
  id: number
  name: string
}

type PaymentMethod = {
  id: number
  name: string
  storeId: number
  store?: {
    id: number
    name: string
  }
  paymentGateway: {
    id: number
    name: string
  }
  activeDiscount: boolean
  discountAmount: number
  discountType: DiscountType
  createdAt: string
  updatedAt: string
}

type PaymentMethodsResponse = {
  page: number
  limit: number
  totalPages: number
  total: number
  items: PaymentMethod[]
}

function RouteComponent() {
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [selectedItems, setSelectedItems] = useState<number[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [storeId, setStoreId] = useState<number | null>(null)

  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const [sortBy, setSortBy] = useState('createdAt')
  const [orderBy, setOrderBy] = useState('desc')
  const [search, setSearch] = useState('')

  const [localSortBy, setLocalSortBy] = useState('createdAt')
  const [localOrderBy, setLocalOrderBy] = useState('desc')
  const [localSearch, setLocalSearch] = useState('')
  const [localStoreId, setLocalStoreId] = useState<number | null>(null)
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const activeFilterCount = (search ? 1 : 0) + (typeof storeId === 'number' && storeId > 0 ? 1 : 0)

  const { data: stores, isLoading: isLoadingStores } = useQuery<Store[], unknown>({
    queryKey: ['stores-list-select'],
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await privateInstance.get<{ items?: Store[] } | Store[]>('/tenant/stores', {
        params: { page: 1, limit: 100, sortBy: 'name', orderBy: 'asc' },
      })
      const d = response.data
      if (Array.isArray(d)) return d
      return Array.isArray(d.items) ? d.items : []
    },
  })

  const { data, isLoading, isRefetching, refetch } = useQuery<PaymentMethodsResponse, unknown>({
    queryKey: ['payment-methods', storeId, currentPage, perPage, sortBy, orderBy, search],
    refetchOnWindowFocus: false,
    enabled: true,
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page: currentPage,
        limit: perPage,
        sortBy,
        orderBy,
      }
      if (typeof storeId === 'number' && storeId > 0) params.storeId = storeId

      if (search) params.search = search

      const response = await privateInstance.get<PaymentMethodsResponse>('/tenant/payment-methods', { params })
      return response.data
    }
  })

  useEffect(() => {
    if (!data) return
    setTotalItems(typeof data.total === 'number' ? data.total : 0)
  }, [data])

  useEffect(() => {
    setSelectedItems([])
  }, [storeId, currentPage, perPage, sortBy, orderBy, search])

  const toggleSelect = useCallback((id: number) => {
    if (selectedItems.includes(id)) {
      setSelectedItems([])
    } else {
      setSelectedItems([id])
    }
  }, [selectedItems])

  const _fmtDateIgnore = useCallback((v?: string) => {
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
  }, [])
  if (false) console.log(_fmtDateIgnore)

  const selectedPaymentMethod = useMemo(() => {
    if (selectedItems.length !== 1) return null
    const id = selectedItems[0]
    const items = Array.isArray(data?.items) ? data.items : []
    return items.find((x) => x.id === id) ?? null
  }, [selectedItems, data?.items])

  const storesById = useMemo(() => {
    const map = new Map<number, Store>()
    for (const s of stores ?? []) map.set(s.id, s)
    return map
  }, [stores])

  const formatDiscountValue = useCallback((type: DiscountType, amount: number) => {
    if (type === 'percent') {
      const n = (Number(amount) || 0) / 100
      try {
        const txt = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
        return `${txt}%`
      } catch {
        return `${n.toFixed(2)}%`
      }
    }
    return formatMoneyFromCents(Number(amount) || 0)
  }, [])

  const columns: ColumnDef<PaymentMethod>[] = useMemo(() => [
    {
      id: 'select',
      width: '60px',
      header: () => (<div className='flex justify-center items-center text-xs text-neutral-500'>Sel.</div>),
      cell: (row) => (
        <div className='flex items-center justify-center'>
          <Checkbox
            checked={selectedItems.includes(row.id)}
            onCheckedChange={() => toggleSelect(row.id)}
          />
        </div>
      ),
      headerClassName: 'w-[60px] min-w-[60px] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[60px] min-w-[60px] border-r border-neutral-200 !px-4 py-3'
    },
    {
      id: 'name',
      header: 'Nome',
      cell: (row) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.name}</span>
        </div>
      ),
      headerClassName: 'min-w-[15rem] border-r border-neutral-200 px-4 py-2.5',
      className: 'min-w-[15rem] border-r border-neutral-200 !px-4 py-3'
    },
    {
      id: 'paymentGateway',
      header: 'Gateway',
      cell: (row) => (
        <span className="text-muted-foreground">{row.paymentGateway?.name || '-'}</span>
      ),
      headerClassName: 'w-[12.5rem] min-w-[12.5rem] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[12.5rem] min-w-[12.5rem] border-r border-neutral-200 !px-4 py-3'
    },
    {
      id: 'store',
      header: 'Loja',
      cell: (row) => (
        <span className="text-muted-foreground">
          {storesById.get(row.storeId)?.name ?? row.store?.name ?? '-'}
        </span>
      ),
      headerClassName: 'w-[12.5rem] min-w-[12.5rem] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[12.5rem] min-w-[12.5rem] border-r border-neutral-200 !px-4 py-3'
    },
    {
      id: 'discount',
      header: 'Desconto',
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.activeDiscount ? formatDiscountValue(row.discountType, row.discountAmount) : '-'}
        </span>
      ),
      headerClassName: 'w-[10rem] min-w-[10rem] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[10rem] min-w-[10rem] border-r border-neutral-200 !px-4 py-3'
    },
    {
      id: 'createdAt',
      header: 'Criado em',
      width: '12.5rem',
      cell: (row) => {
        const d = dataTime(row.createdAt)
        return (
          <span className='text-sm text-muted-foreground'>{d || '-'}</span>
        )
      },
      headerClassName: 'w-[12.5rem] min-w-[12.5rem] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[12.5rem] min-w-[12.5rem] border-r border-neutral-200 !px-4 py-3'
    }
  ], [formatDiscountValue, selectedItems, storesById, toggleSelect])

  return (
    <div className='flex flex-col w-full h-full'>
      <div className='flex items-center justify-between p-2'>
        <div className='flex flex-col'>
          <h2 className='text-lg font-semibold'>Métodos de pagamento</h2>
        </div>
        <div className='flex items-center gap-2'>
          <Popover open={isFilterOpen} onOpenChange={(open) => {
            if (open) {
              setLocalSortBy(sortBy)
              setLocalOrderBy(orderBy)
              setLocalSearch(search)
              setLocalStoreId(storeId)
            }
            setIsFilterOpen(open)
          }}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" disabled={isLoading || isRefetching}>
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
                      <Label htmlFor="storeId" className="text-xs font-medium text-muted-foreground">
                        Loja
                      </Label>
                      <Select
                        value={typeof localStoreId === 'number' && localStoreId > 0 ? String(localStoreId) : '__all__'}
                        onValueChange={(val) => {
                          if (val === '__all__') {
                            setLocalStoreId(null)
                            return
                          }
                          const next = Number(val)
                          if (!Number.isFinite(next) || next <= 0) return
                          setLocalStoreId(next)
                        }}
                        disabled={isLoadingStores}
                      >
                        <SelectTrigger id="storeId" className="h-9 w-full">
                          <SelectValue placeholder={isLoadingStores ? 'Carregando lojas...' : 'Selecione a loja'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">Todas as lojas</SelectItem>
                          {(stores ?? []).map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="search" className="text-xs font-medium text-muted-foreground">Busca</Label>
                      <Input
                        id="search"
                        value={localSearch}
                        onChange={(e) => setLocalSearch(e.target.value)}
                        className="h-9"
                        placeholder="Buscar por nome..."
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="default" className="flex-1" onClick={() => {
                    setLocalSortBy('createdAt')
                    setLocalOrderBy('desc')
                    setLocalSearch('')
                    setLocalStoreId(null)
                  }}>
                    Limpar
                  </Button>
                  <Button size="default" className="flex-1" onClick={() => {
                    const nextStoreId = typeof localStoreId === 'number' && localStoreId > 0 ? localStoreId : null
                    if (nextStoreId !== storeId) {
                      setStoreId(nextStoreId)
                      setCurrentPage(1)
                      setSelectedItems([])
                    }
                    setSortBy(localSortBy)
                    setOrderBy(localOrderBy)
                    setSearch(localSearch)
                    setIsFilterOpen(false)
                  }}>
                    Aplicar
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button variant={'ghost'} disabled={isLoading || isRefetching} onClick={() => { setSelectedItems([]); refetch() }} size={'sm'}>
            {(isLoading || isRefetching) ? <RefreshCw className='animate-spin size-[0.85rem]' /> : <RefreshCw className="size-[0.85rem]" />}
          </Button>

          <PayInsSheet
            paymentMethodId={selectedPaymentMethod?.id ?? 0}
            paymentMethodName={selectedPaymentMethod?.name ?? null}
            storeId={selectedPaymentMethod?.storeId ?? storeId ?? 0}
            trigger={(
              <Button variant={'outline'} size="sm" disabled={selectedItems.length !== 1}>
                <ShieldCheck className="size-[0.85rem]" /> Condições de pagamento
              </Button>
            )}
          />

          {selectedItems.length === 1 ? (
            <Button variant={'outline'} size="sm" onClick={() => setDeleteId(selectedItems[0])}>
              <Trash className="size-[0.85rem]" /> Excluir
            </Button>
          ) : (
            <Button variant={'outline'} disabled size="sm">
              <Trash className="size-[0.85rem]" /> Excluir
            </Button>
          )}

          {selectedItems.length === 1 ? (
            <Button variant={'outline'} size="sm" onClick={() => setEditId(selectedItems[0])}>
              <Edit className="size-[0.85rem]" /> Editar
            </Button>
          ) : (
            <Button variant={'outline'} disabled size="sm">
              <Edit className="size-[0.85rem]" /> Editar
            </Button>
          )}

          <NewPaymentMethodSheet />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={Array.isArray(data?.items) ? data.items : []}
        loading={isLoading || isRefetching}
        page={currentPage}
        perPage={perPage}
        totalItems={totalItems}
        emptyMessage='Nenhum método de pagamento encontrado'
        emptySlot={(
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Trash className='h-6 w-6' />
              </EmptyMedia>
              <EmptyTitle>Nenhum método de pagamento ainda</EmptyTitle>
              <EmptyDescription>
                Você ainda não criou nenhum método de pagamento. Comece criando o primeiro.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <div className='flex gap-2'>
                <NewPaymentMethodSheet />
                <Button variant={'ghost'} size="sm" disabled={isLoading || isRefetching} onClick={() => { setSelectedItems([]); refetch() }}>
                  {(isLoading || isRefetching) ? <RefreshCw className='animate-spin size-[0.85rem]' /> : <RefreshCw className="size-[0.85rem]" />}
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
          toggleSelect(row.id)
        }}
        rowIsSelected={(row) => selectedItems.includes(row.id)}
      />

      {editId && (
        <EditPaymentMethodSheet id={editId} onOpenChange={(v) => { if (!v) setEditId(null) }} />
      )}
      {deleteId && (
        <DeletePaymentMethodDialog id={deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null) }} />
      )}
    </div>
  )
}
