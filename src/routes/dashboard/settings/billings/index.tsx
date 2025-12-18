import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { privateInstance } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { DataTable, type ColumnDef } from '@/components/data-table'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'
import { RefreshCw, FileText, CreditCard } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { formatarMoeda, fromCents } from '@/lib/format'

export const Route = createFileRoute('/dashboard/settings/billings/')({
  component: RouteComponent,
})

type Billing = {
  id: number
  created_at?: number
  updated_at?: number | null
  company_id?: number
  period_start?: number
  period_end?: number
  due_date?: number
  status?: 'pending' | 'canceled' | 'paid' | 'overdue'
  commission_amount?: number
  fixed_amount?: number
  total_sales?: number
  percentage_applied?: number
  total_orders?: number
  total_amount?: number
}

type BillingsResponse = {
  itemsReceived?: number
  curPage?: number
  nextPage?: number | null
  prevPage?: number | null
  offset?: number
  perPage?: number
  items?: Billing[]
  itemsTotal?: number
  pageTotal?: number
}

function clampPerPage(value: number) {
  return Math.min(50, Math.max(20, value))
}

function RouteComponent() {
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [billings, setBillings] = useState<Billing[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [selectedBillingId, setSelectedBillingId] = useState<number | null>(null)

  const { data, isLoading, isRefetching, refetch } = useQuery({
    refetchOnWindowFocus: false,
    queryKey: ['billings', currentPage, perPage],
    queryFn: async () => {
      const response = await privateInstance.get<BillingsResponse>('/api:KW1Hgkpu/billings', {
        params: { page: currentPage, per_page: clampPerPage(perPage) }
      })
      if (response.status !== 200) {
        throw new Error('Erro ao carregar cobranças')
      }
      return response.data
    }
  })

  const normalizeEpoch = (v?: number): number | undefined => {
    if (typeof v !== 'number' || !Number.isFinite(v)) return undefined
    const abs = Math.abs(v)
    if (abs < 1e11) return Math.round(v * 1000)
    if (abs > 1e14) return Math.round(v / 1000)
    return v
  }
  const fmtCurrency = (v?: number) => formatarMoeda(fromCents(v))
  const fmtDateOnly = (v?: number) => {
    const ms = normalizeEpoch(v)
    if (!ms) return '-'
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      const d = new Date(ms)
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(d)
      const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
      const dd = get('day')
      const MM = get('month')
      const yyyy = get('year')
      return `${dd}/${MM}/${yyyy}`
    } catch {
      return new Date(ms).toLocaleDateString('pt-BR')
    }
  }
  const fmtTimeOnly = (v?: number) => {
    const ms = normalizeEpoch(v)
    if (!ms) return ''
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      const d = new Date(ms)
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).formatToParts(d)
      const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
      return `${get('hour')}:${get('minute')}:${get('second')}`
    } catch {
      return ''
    }
  }
  

  const columns: ColumnDef<Billing>[] = [
    {
      id: 'select',
      header: () => (<div className='flex justify-center items-center' />),
      cell: (i) => (
        <div className='flex justify-center items-center'>
          <Checkbox
            checked={selectedBillingId === i.id}
            onCheckedChange={(checked) => setSelectedBillingId(checked ? i.id : null)}
            aria-label='Selecionar cobrança'
          />
        </div>
      ),
      headerClassName: 'w-[70px] min-w-[70px] border-r',
      className: 'w-[70px] min-w-[70px]'
    },
    {
      id: 'info',
      header: 'Período',
      cell: (i) => {
        const start = fmtDateOnly(i.period_start)
        const end = fmtDateOnly(i.period_end)
        const startT = fmtTimeOnly(i.period_start)
        const endT = fmtTimeOnly(i.period_end)
        return (
          <div className='flex items-center gap-4'>
            <div className='flex items-center'>
              <span className='text-sm'>{start}</span>
              {startT ? <span className='ml-1 text-sm'>{startT}</span> : null}
            </div>
            <span className='text-sm'>até</span>
            <div className='flex items-center'>
              <span className='text-sm'>{end}</span>
              {endT ? <span className='ml-1 text-sm'>{endT}</span> : null}
            </div>
          </div>
        )
      },
      headerClassName: 'min-w-[360px] border-r',
      className: 'min-w-[360px] border-r'
    },
    {
      id: 'due_date',
      header: 'Vencimento',
      cell: (i) => {
        const d = fmtDateOnly(i.due_date)
        const t = fmtTimeOnly(i.due_date)
        return (
          <div className='flex items-center'>
            <span className='text-sm'>{d || '-'}</span>
            {t ? <span className='ml-1 text-sm'>{t}</span> : null}
          </div>
        )
      },
      headerClassName: 'w-[140px] min-w-[140px] border-r',
      className: 'w-[140px] min-w-[140px]'
    },
    {
      id: 'total_amount',
      header: 'Total',
      cell: (i) => fmtCurrency(i.total_amount),
      headerClassName: 'w-[140px] min-w-[140px] border-r',
      className: 'w-[140px] min-w-[140px]'
    },
    {
      id: 'status',
      header: 'Status',
      cell: (i) => {
        const raw = String(i.status ?? '').trim().toLowerCase()
        const status = raw === 'paid' ? 'paid' : raw === 'canceled' ? 'canceled' : raw === 'overdue' ? 'overdue' : 'pending'
        const label = status === 'paid' ? 'Pago' : status === 'canceled' ? 'Cancelado' : status === 'overdue' ? 'Vencido' : 'Pendente'
        return (
          <span
            className={
              status === 'paid'
                ? 'inline-flex items-center gap-1 px-2 py-1 rounded-full border border-green-200 bg-green-100 text-green-700'
                : status === 'canceled'
                ? 'inline-flex items-center gap-1 px-2 py-1 rounded-full border border-gray-200 bg-gray-100 text-gray-700'
                : status === 'overdue'
                ? 'inline-flex items-center gap-1 px-2 py-1 rounded-full border border-red-200 bg-red-100 text-red-700'
                : 'inline-flex items-center gap-1 px-2 py-1 rounded-full border border-amber-200 bg-amber-100 text-amber-700'
            }
          >
            <span className={
              status === 'paid' ? 'h-1.5 w-1.5 rounded-full bg-green-600' :
              status === 'canceled' ? 'h-1.5 w-1.5 rounded-full bg-gray-500' :
              status === 'overdue' ? 'h-1.5 w-1.5 rounded-full bg-red-600' :
              'h-1.5 w-1.5 rounded-full bg-amber-600'
            } />
            {label}
          </span>
        )
      },
      headerClassName: 'w-[120px] min-w-[120px] border-r',
      className: 'w-[120px] min-w-[120px]'
    },
    {
      id: 'created_at',
      header: 'Criado em',
      cell: (i) => {
        const d = fmtDateOnly(i.created_at)
        const t = fmtTimeOnly(i.created_at)
        return (
          <div className='flex items-center'>
            <span className='text-sm'>{d || '-'}</span>
            {t ? <span className='ml-1 text-sm'>{t}</span> : null}
          </div>
        )
      },
      headerClassName: 'w-[200px] min-w-[200px] border-r',
      className: 'w-[200px] min-w-[200px]'
    },
    
  ]

  useEffect(() => {
    if (!data) return
    const items = Array.isArray(data.items) ? data.items : []
    setBillings(items)
    const itemsTotal = typeof data.itemsTotal === 'number' ? data.itemsTotal : items.length
    setTotalItems(itemsTotal)
  }, [data, perPage])

  return (
    <div className='flex flex-col w-full h-full'>
      <div className='flex items-center justify-between p-4'>
        <div className='flex flex-col'>
          <h2 className='text-lg font-semibold'>Cobranças</h2>
          <p className='text-sm text-muted-foreground'>Faturas e períodos de cobrança da conta.</p>
        </div>
        <div className='flex items-center gap-3'>
          <Button
            variant={'ghost'}
            size="sm"
            className='xl:hidden'
            disabled={isLoading || isRefetching}
            aria-disabled={isLoading || isRefetching}
            aria-label='Atualizar cobranças'
            title='Atualizar cobranças'
            onClick={() => { refetch() }}
          >
            <RefreshCw className={`${(isLoading || isRefetching) ? 'animate-spin' : ''} size-[0.85rem]`} />
          </Button>
          <Button
            variant={'outline'}
            size="sm"
            className='xl:hidden'
            aria-label='Detalhes da cobrança'
            title='Detalhes da cobrança'
            disabled={!selectedBillingId}
            aria-disabled={!selectedBillingId}
          >
            <FileText className='size-[0.85rem]' />
          </Button>
          <Button
            variant={'ghost'}
            size="sm"
            className='hidden xl:inline-flex'
            disabled={isLoading || isRefetching}
            aria-disabled={isLoading || isRefetching}
            aria-label='Atualizar cobranças'
            title='Atualizar cobranças'
            onClick={() => { refetch() }}
          >
            {(isLoading || isRefetching) ? <RefreshCw className='animate-spin size-[0.85rem]' /> : <RefreshCw className='size-[0.85rem]' />}
          </Button>
          <Button
            variant={'outline'}
            size="sm"
            className='hidden xl:inline-flex'
            aria-label='Detalhes da cobrança'
            title='Detalhes da cobrança'
            disabled={!selectedBillingId}
            aria-disabled={!selectedBillingId}
          >
            <FileText className='size-[0.85rem]' />
            Detalhes
          </Button>
          <Button
            variant={'outline'}
            size="sm"
            className='hidden xl:inline-flex'
            aria-label='Pagar cobrança'
            title='Pagar cobrança'
            disabled={!selectedBillingId}
            aria-disabled={!selectedBillingId}
          >
            <CreditCard className='size-[0.85rem]' />
            Pagar
          </Button>
        </div>
      </div>

      <div className='flex flex-col w-full h-full flex-1 overflow-hidden pl-4'>
        <div className='border rounded-lg overflow-hidden h-full flex flex-col flex-1 border-r-0 border-b-0 rounded-tr-none! rounded-br-none! rounded-bl-none!'>
          <DataTable
            columns={columns}
            data={billings}
            loading={isLoading || isRefetching}
            page={currentPage}
            perPage={perPage}
            totalItems={totalItems}
            onChange={(next) => {
              if (typeof next.page === 'number') setCurrentPage(next.page)
              if (typeof next.perPage === 'number') setPerPage(next.perPage)
            }}
            emptyMessage='Nenhuma cobrança encontrada'
            emptySlot={(
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant='icon'>
                    <FileText className='h-6 w-6' />
                  </EmptyMedia>
                  <EmptyTitle>Nenhuma cobrança ainda</EmptyTitle>
                  <EmptyDescription>As cobranças aparecerão aqui quando geradas.</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <div className='flex gap-2'>
                    <Button variant={'ghost'} size="sm" disabled={isLoading || isRefetching} onClick={() => { refetch() }}>
                      {(isLoading || isRefetching) ? <RefreshCw className='animate-spin size-[0.85rem]' /> : <RefreshCw className="size-[0.85rem]" />}
                    </Button>
                  </div>
                </EmptyContent>
              </Empty>
            )}
          />
        </div>
      </div>
    </div>
  )
}
