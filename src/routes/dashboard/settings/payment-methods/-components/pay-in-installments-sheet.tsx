import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { DataTable, type ColumnDef } from '@/components/data-table'
import { privateInstance } from '@/lib/auth'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowDownAZ, ArrowUpDown, ArrowUpZA, Funnel, RefreshCw } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { PayInInstallmentEditSheet } from './pay-in-installment-edit-sheet'

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

const getApiErrorData = (err: unknown): { title?: string; detail?: string } | null => {
  if (!isRecord(err)) return null
  const response = err.response
  if (!isRecord(response)) return null
  const data = response.data
  if (!isRecord(data)) return null

  const title = typeof data.title === 'string' ? data.title : undefined
  const detail = typeof data.detail === 'string' ? data.detail : undefined
  return title || detail ? { title, detail } : null
}

type PayInInstallment = {
  id: number
  payInId: number
  label: string
  interestRate: number
  intervalInDays: number
  order: number
  createdAt: string
  updatedAt: string
}

type SortBy = 'id' | 'createdAt' | 'order' | 'label'

type PayInInstallmentsResponse = {
  page: number
  limit: number
  totalPages: number
  total: number
  payIn?: { id: number; name: string }
  items: PayInInstallment[]
}

export function PayInInstallmentsSheet({
  payInId,
  payInName,
  storeId,
  trigger,
}: {
  payInId: number
  payInName?: string | null
  storeId: number
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [sortBy, setSortBy] = useState<SortBy>('order')
  const [orderBy, setOrderBy] = useState<'asc' | 'desc'>('asc')
  const [search, setSearch] = useState('')

  const [localSortBy, setLocalSortBy] = useState<SortBy>('order')
  const [localOrderBy, setLocalOrderBy] = useState<'asc' | 'desc'>('asc')
  const [localSearch, setLocalSearch] = useState('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [totalItems, setTotalItems] = useState(0)

  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null
  const activeFilterCount = (search ? 1 : 0) + (sortBy !== 'order' ? 1 : 0) + (orderBy !== 'asc' ? 1 : 0)

  const { data, isLoading, isRefetching, refetch, isError, error } = useQuery<PayInInstallmentsResponse, unknown>({
    queryKey: ['pay-in-installments', storeId, payInId, currentPage, perPage, sortBy, orderBy, search],
    enabled: open && Number(payInId) > 0 && Number(storeId) > 0,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page: currentPage,
        limit: perPage,
        payInId,
        sortBy,
        orderBy,
        storeId,
      }
      if (search) params.search = search
      const response = await privateInstance.get<PayInInstallmentsResponse>('/tenant/pay-in-installments', { params })
      return response.data
    },
  })

  useEffect(() => {
    if (!data) return
    setTotalItems(typeof data.total === 'number' ? data.total : 0)
  }, [data])

  useEffect(() => {
    if (!open) {
      setSelectedIds([])
      setCurrentPage(1)
      setPerPage(20)
      setSortBy('order')
      setOrderBy('asc')
      setSearch('')
      setLocalSortBy('order')
      setLocalOrderBy('asc')
      setLocalSearch('')
      setIsFilterOpen(false)
      setTotalItems(0)
    }
  }, [open])

  useEffect(() => {
    if (isError) {
      const errorData = getApiErrorData(error)
      toast.error(errorData?.title || 'Erro ao carregar parcelas', {
        description: errorData?.detail || 'Não foi possível carregar as parcelas.',
      })
    }
  }, [isError, error])

  const items = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data?.items])

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) setSelectedIds([])
    else setSelectedIds([id])
  }

  const fmtDate = (v?: string) => {
    if (!v) return '-'
    try {
      const d = new Date(v)
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d)
    } catch {
      return v
    }
  }

  const columns: ColumnDef<PayInInstallment>[] = [
    {
      id: 'select',
      width: '60px',
      header: () => (<div className="flex justify-center items-center text-xs text-neutral-500">Sel.</div>),
      cell: (row) => (
        <div className="flex items-center justify-center">
          <Checkbox checked={selectedIds.includes(row.id)} onCheckedChange={() => toggleSelect(row.id)} />
        </div>
      ),
      headerClassName: 'w-[60px] min-w-[60px] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[60px] min-w-[60px] border-r border-neutral-200 !px-4 py-3',
    },
    {
      id: 'label',
      header: 'Label',
      cell: (row) => <span className="font-medium">{row.label}</span>,
      headerClassName: 'border-r border-neutral-200 px-4 py-2.5 min-w-fit w-fit',
      className: 'border-r border-neutral-200 !px-4 py-3 min-w-fit w-fit whitespace-nowrap',
    },
    {
      id: 'interestRate',
      header: 'Juros',
      cell: (row) => <span className="tabular-nums text-muted-foreground">{row.interestRate ?? '-'}</span>,
      headerClassName: 'w-[10rem] min-w-[10rem] border-r border-neutral-200 px-4 py-2.5 text-right',
      className: 'w-[10rem] min-w-[10rem] border-r border-neutral-200 !px-4 py-3 text-right',
    },
    {
      id: 'intervalInDays',
      header: 'Intervalo (dias)',
      cell: (row) => <span className="tabular-nums text-muted-foreground">{row.intervalInDays ?? '-'}</span>,
      headerClassName: 'w-[12rem] min-w-[12rem] border-r border-neutral-200 px-4 py-2.5 text-right',
      className: 'w-[12rem] min-w-[12rem] border-r border-neutral-200 !px-4 py-3 text-right',
    },
    {
      id: 'createdAt',
      header: 'Criado em',
      cell: (row) => <span className="text-sm text-muted-foreground">{fmtDate(row.createdAt)}</span>,
      headerClassName: 'w-[12.5rem] min-w-[12.5rem] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[12.5rem] min-w-[12.5rem] border-r border-neutral-200 !px-4 py-3',
    },
  ]

  const disabled = Number(payInId) <= 0
  const headerName = (payInName ?? data?.payIn?.name ?? '').trim()

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button variant="outline" size="sm" disabled={disabled}>
            Parcelas
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="flex flex-col overflow-hidden w-full min-w-3xl">
        <SheetHeader>
          <SheetTitle>Parcelas</SheetTitle>
          <SheetDescription>{headerName ? `Condição: ${headerName}.` : 'Gerencie as parcelas.'}</SheetDescription>
        </SheetHeader>

        <div className="flex items-center px-4 py-3 border-b">
          <div className="ml-auto flex items-center gap-2">
            <Popover
              open={isFilterOpen}
              onOpenChange={(next) => {
                if (next) {
                  setLocalSortBy(sortBy)
                  setLocalOrderBy(orderBy)
                  setLocalSearch(search)
                }
                setIsFilterOpen(next)
              }}
            >
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
                        <Select value={localSortBy} onValueChange={(v) => setLocalSortBy(v as SortBy)}>
                          <SelectTrigger className="h-9 w-full">
                            <SelectValue placeholder="Campo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="id">ID</SelectItem>
                            <SelectItem value="createdAt">Criado em</SelectItem>
                            <SelectItem value="order">Ordem</SelectItem>
                            <SelectItem value="label">Label</SelectItem>
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
                        <Label htmlFor="pay-in-installments-search" className="text-xs font-medium text-muted-foreground">
                          Busca
                        </Label>
                        <Input
                          id="pay-in-installments-search"
                          value={localSearch}
                          onChange={(e) => setLocalSearch(e.target.value)}
                          className="h-9"
                          placeholder="Buscar por label..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="default"
                      className="flex-1"
                      onClick={() => {
                        setLocalSortBy('order')
                        setLocalOrderBy('asc')
                        setLocalSearch('')
                      }}
                    >
                      Limpar
                    </Button>
                    <Button
                      size="default"
                      className="flex-1"
                      onClick={() => {
                        setSortBy(localSortBy)
                        setOrderBy(localOrderBy)
                        setSearch(localSearch)
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

            <Button
              variant="ghost"
              size="sm"
              disabled={isLoading || isRefetching}
              onClick={() => {
                setSelectedIds([])
                refetch()
              }}
            >
              {(isLoading || isRefetching) ? <RefreshCw className="animate-spin size-[0.85rem]" /> : <RefreshCw className="size-[0.85rem]" />}
            </Button>

            <PayInInstallmentEditSheet
              payInId={payInId}
              payInName={headerName || null}
              payInInstallmentId={selectedId}
              storeId={storeId}
              disabled={!selectedId}
              onSaved={() => setSelectedIds([])}
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 p-4">
          <DataTable
            columns={columns}
            data={items}
            loading={isLoading || isRefetching}
            page={currentPage}
            perPage={perPage}
            totalItems={totalItems}
            emptyMessage="Nenhuma parcela encontrada"
            onChange={(params) => {
              if (params.page) setCurrentPage(params.page)
              if (params.perPage) setPerPage(params.perPage)
            }}
            onRowClick={(row) => toggleSelect(row.id)}
            rowIsSelected={(row) => selectedIds.includes(row.id)}
          />
        </div>

      </SheetContent>
    </Sheet>
  )
}
