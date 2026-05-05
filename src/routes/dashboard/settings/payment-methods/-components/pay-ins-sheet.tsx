import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { DataTable, type ColumnDef } from '@/components/data-table'
import { privateInstance } from '@/lib/auth'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowDownAZ, ArrowUpDown, ArrowUpZA, Funnel, ListOrdered, RefreshCw, ShieldCheck } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { PayInCreateSheet } from './pay-in-create-sheet'
import { PayInEditSheet } from './pay-in-edit-sheet'
import { PayInDeleteDialog } from './pay-in-delete-dialog'
import { PayInInstallmentsSheet } from './pay-in-installments-sheet'

type PayIn = {
  id: number
  name: string
  numberOfInstallments: number
  active: boolean
  paymentMethodId: number
  paymentMethod: { id: number; name: string }
  createdAt: string
  updatedAt: string
}

type SortBy = 'id' | 'createdAt' | 'name' | 'numberOfInstallments'

export function PayInsSheet({
  paymentMethodId,
  paymentMethodName,
  trigger,
}: {
  paymentMethodId: number
  paymentMethodName?: string | null
  trigger?: React.ReactNode
}) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [sortBy, setSortBy] = useState<SortBy>('createdAt')
  const [orderBy, setOrderBy] = useState<'asc' | 'desc'>('desc')
  const [search, setSearch] = useState('')

  const [localSortBy, setLocalSortBy] = useState<SortBy>('createdAt')
  const [localOrderBy, setLocalOrderBy] = useState<'asc' | 'desc'>('desc')
  const [localSearch, setLocalSearch] = useState('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [totalItems, setTotalItems] = useState(0)

  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null
  const activeFilterCount = (search ? 1 : 0) + (sortBy !== 'createdAt' ? 1 : 0) + (orderBy !== 'desc' ? 1 : 0)

  const { data, isLoading, isRefetching, refetch, isError, error } = useQuery({
    queryKey: ['pay-ins', paymentMethodId, currentPage, perPage, sortBy, orderBy, search],
    enabled: open,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const params: any = {
        page: currentPage,
        limit: perPage,
        sortBy,
        orderBy,
      }
      if (search) params.search = search
      if (Number(paymentMethodId) > 0) params.paymentMethodId = paymentMethodId
      const response = await privateInstance.get('/tenant/pay-ins', { params })
      return response.data as {
        page: number
        limit: number
        totalPages: number
        total: number
        items: PayIn[]
      }
    },
  })

  useEffect(() => {
    if (data) setTotalItems(Number((data as any)?.total) || 0)
  }, [data])

  useEffect(() => {
    if (!open) {
      setSelectedIds([])
      setDeleteOpen(false)
      setCurrentPage(1)
      setPerPage(20)
      setSortBy('createdAt')
      setOrderBy('desc')
      setSearch('')
      setLocalSortBy('createdAt')
      setLocalOrderBy('desc')
      setLocalSearch('')
      setIsFilterOpen(false)
      setTotalItems(0)
    }
  }, [open])

  useEffect(() => {
    if (isError) {
      const errorData = (error as any)?.response?.data
      toast.error(errorData?.title || 'Erro ao carregar condições de pagamento', {
        description: errorData?.detail || 'Não foi possível carregar as condições de pagamento.',
      })
    }
  }, [isError, error])

  const items = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data?.items])
  const selectedPayIn = useMemo(() => {
    if (!selectedId) return null
    return items.find((x) => x.id === selectedId) ?? null
  }, [items, selectedId])

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

  const columns: ColumnDef<PayIn>[] = [
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
      id: 'name',
      header: 'Nome',
      cell: (row) => <span className="font-medium">{row.name}</span>,
      headerClassName: 'min-w-[18rem] border-r border-neutral-200 px-4 py-2.5',
      className: 'min-w-[18rem] border-r border-neutral-200 !px-4 py-3',
    },
    {
      id: 'numberOfInstallments',
      header: 'Parcelas',
      cell: (row) => <span className="tabular-nums text-muted-foreground">{row.numberOfInstallments ?? '-'}</span>,
      headerClassName: 'w-[9rem] min-w-[9rem] border-r border-neutral-200 px-4 py-2.5 text-right',
      className: 'w-[9rem] min-w-[9rem] border-r border-neutral-200 !px-4 py-3 text-right',
    },
    {
      id: 'active',
      header: 'Status',
      cell: (row) => (
        <Badge variant={row.active ? 'default' : 'secondary'} className="text-xs">
          {row.active ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
      headerClassName: 'w-[9rem] min-w-[9rem] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[9rem] min-w-[9rem] border-r border-neutral-200 !px-4 py-3',
    },
    {
      id: 'createdAt',
      header: 'Criado em',
      cell: (row) => <span className="text-sm text-muted-foreground">{fmtDate(row.createdAt)}</span>,
      headerClassName: 'w-[12.5rem] min-w-[12.5rem] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[12.5rem] min-w-[12.5rem] border-r border-neutral-200 !px-4 py-3',
    },
  ]

  const { isPending: isDeleting, mutate: deletePayIn } = useMutation({
    mutationFn: async (payInId: number) => {
      const response = await privateInstance.delete(`/tenant/pay-ins/${payInId}`)
      if (response.status !== 200 && response.status !== 204) throw new Error('Erro ao excluir pay in')
      return true
    },
    onSuccess: () => {
      toast.success('Condição de pagamento excluída com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['pay-ins', paymentMethodId] })
      setSelectedIds([])
      setDeleteOpen(false)
    },
    onError: (err: any) => {
      const errorData = err?.response?.data
      toast.error(errorData?.title || 'Erro ao excluir condição de pagamento', {
        description: errorData?.detail || 'Não foi possível excluir a condição de pagamento.',
      })
    },
  })

  const disabled = Number(paymentMethodId) <= 0
  const headerName = (paymentMethodName ?? '').trim()

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button variant="outline" size="sm" disabled={disabled}>
            <ShieldCheck className="size-[0.85rem]" /> Condições de pagamento
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="flex flex-col overflow-hidden w-full min-w-4xl">
        <SheetHeader>
          <SheetTitle>Condições de pagamento</SheetTitle>
          <SheetDescription>
            {headerName ? `Gerencie as condições para: ${headerName}.` : 'Gerencie as condições de pagamento.'}
          </SheetDescription>
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
                            <SelectItem value="name">Nome</SelectItem>
                            <SelectItem value="numberOfInstallments">Parcelas</SelectItem>
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
                        <Label htmlFor="pay-ins-search" className="text-xs font-medium text-muted-foreground">
                          Busca
                        </Label>
                        <Input
                          id="pay-ins-search"
                          value={localSearch}
                          onChange={(e) => setLocalSearch(e.target.value)}
                          className="h-9"
                          placeholder="Buscar por nome..."
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
                        setLocalSortBy('createdAt')
                        setLocalOrderBy('desc')
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

            <PayInInstallmentsSheet
              payInId={selectedId ?? 0}
              payInName={selectedPayIn?.name ?? null}
              trigger={(
                <Button variant="outline" size="sm" disabled={!selectedId}>
                  <ListOrdered className="size-[0.85rem]" /> Parcelas
                </Button>
              )}
            />

            <PayInDeleteDialog
              open={deleteOpen}
              onOpenChange={(next) => {
                setDeleteOpen(next)
                if (!next) setSelectedIds([])
              }}
              payInId={selectedId}
              disabled={!selectedId}
              isDeleting={isDeleting}
              onConfirm={(id) => deletePayIn(id)}
            />

            <PayInEditSheet
              paymentMethodId={paymentMethodId}
              paymentMethodName={paymentMethodName}
              payInId={selectedId}
              disabled={!selectedId}
              onSaved={() => setSelectedIds([])}
            />

            <PayInCreateSheet
              paymentMethodId={paymentMethodId}
              paymentMethodName={paymentMethodName}
              disabled={disabled}
              onCreated={() => setSelectedIds([])}
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
            emptyMessage="Nenhuma condição encontrada"
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
