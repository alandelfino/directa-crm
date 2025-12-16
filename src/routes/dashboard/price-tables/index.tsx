import { createFileRoute } from '@tanstack/react-router'
import { Topbar } from '../-components/topbar'
import { Button } from '@/components/ui/button'
import { Edit, RefreshCcw, Trash, BadgeDollarSign } from 'lucide-react'
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

export const Route = createFileRoute('/dashboard/price-tables/')({
  component: RouteComponent,
})

type PriceTable = { id: number; created_at?: number; updated_at?: number; name?: string; company_id?: number }

type PriceTablesResponse = { itemsReceived?: number; curPage?: number; nextPage?: number | null; prevPage?: number | null; offset?: number; perPage?: number; itemsTotal?: number; pageTotal?: number; items?: PriceTable[] } | PriceTable[]

function normalizeResponse(data: PriceTablesResponse) {
  if (Array.isArray(data)) { return { items: data, itemsTotal: data.length, pageTotal: 1 } }
  const items = Array.isArray(data.items) ? data.items : []
  const itemsTotal = typeof data.itemsTotal === 'number' ? data.itemsTotal : items.length
  const pageTotal = typeof data.pageTotal === 'number' ? data.pageTotal : 1
  return { items, itemsTotal, pageTotal }
}

function RouteComponent() {
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [selected, setSelected] = useState<number[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const { data, isLoading, isRefetching, isError, refetch } = useQuery({
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryKey: ['price-tables', currentPage, perPage],
    queryFn: async () => {
      const url = `/api:m3u66HYX/price_tables?page=${currentPage}&per_page=${Math.min(50, perPage)}`
      const response = await privateInstance.get(url)
      if (response.status !== 200) throw new Error('Erro ao carregar tabelas de preço')
      return response.data as PriceTablesResponse
    }
  })

  const [items, setItems] = useState<PriceTable[]>([])
  const selectedItem = useMemo(() => items.find((i) => i.id === selected[0]), [items, selected])
  const canManageSelected = useMemo(() => {
    const cid = selectedItem?.company_id
    return typeof cid === 'number' && cid > 0
  }, [selectedItem])

  const normalizeEpoch = (v?: number): number | undefined => {
    if (typeof v !== 'number' || !Number.isFinite(v)) return undefined
    const abs = Math.abs(v)
    if (abs < 1e11) return Math.round(v * 1000)
    if (abs > 1e14) return Math.round(v / 1000)
    return v
  }
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

  const columns: ColumnDef<PriceTable>[] = useMemo(() => [
    {
      id: 'select',
      width: '60px',
      header: () => (<div className='flex justify-center items-center text-xs text-neutral-500'>Sel.</div>),
      cell: (row) => (
        <div className='flex justify-center items-center'>
          <Checkbox checked={selected.includes(row.id)} onCheckedChange={() => toggleSelect(row.id)} />
        </div>
      ),
      headerClassName: 'w-[60px] min-w-[60px] border-r',
      className: 'w-[60px] min-w-[60px] font-medium border-r p-2!'
    },
    { id: 'name', header: 'Nome', cell: (p) => p.name ?? '—', className: 'border-r p-2!' },
    {
      id: 'created_at',
      header: 'Data de criação',
      cell: (p) => (<span className='text-sm'>{fmtDateOnly(p.created_at)}</span>),
      width: '180px',
      headerClassName: 'w-[180px] min-w-[180px] border-r',
      className: 'w-[180px] min-w-[180px] p-2!'
    },
  ], [items, selected])

  useEffect(() => {
    if (!data) return
    const normalized = normalizeResponse(data)
    const itemsArr = Array.isArray(normalized.items) ? normalized.items : []
    setItems(itemsArr)
    const itemsTotal = typeof normalized.itemsTotal === 'number' ? normalized.itemsTotal : itemsArr.length
    setTotalItems(itemsTotal)
    const pageTotal = typeof normalized.pageTotal === 'number' ? normalized.pageTotal : Math.max(1, Math.ceil(itemsTotal / perPage))
    setTotalPages(pageTotal)
  }, [data, perPage])

  useEffect(() => { if (isError) toast.error('Erro ao carregar tabelas de preço') }, [isError])
  useEffect(() => { setSelected([]) }, [currentPage, perPage])
  useEffect(() => { if (isRefetching) setSelected([]) }, [isRefetching])
  useEffect(() => { if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages) }, [totalPages, currentPage])

  const toggleSelect = (id: number) => { if (selected.includes(id)) setSelected([]); else setSelected([id]) }

  return (
    <div className='flex flex-col w-full h-full'>
      <Topbar title='Tabelas de preço' breadcrumbs={[{ label: 'Dashboard', href: '/dashboard', isLast: false }, { label: 'Tabelas de preço', href: '/dashboard/price-tables', isLast: true }]} />
      <div className='flex flex-col w-full h-full flex-1 overflow-hidden'>
        <div className='border-b flex w-full items-center p-2 gap-4'>
          <div className='flex items-center gap-2 flex-1'></div>
          <div className='flex items-center gap-2'>
            <Button variant={'ghost'} disabled={isLoading || isRefetching} onClick={() => { setSelected([]); refetch() }}>
              {(isLoading || isRefetching) ? (<><RefreshCcw className='animate-spin' /> Atualizando...</>) : (<><RefreshCcw /> Atualizar</>)}
            </Button>
            {selected.length === 1 ? (<DeletePriceTable priceTableId={selected[0]} disabled={!canManageSelected} />) : (<Button variant={'outline'} disabled><Trash /> Excluir</Button>)}
            {selected.length === 1 ? (<EditPriceTableSheet priceTableId={selected[0]} disabled={!canManageSelected} />) : (<Button variant={'outline'} disabled><Edit /> Editar</Button>)}
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
                  <Button variant={'ghost'} disabled={isLoading || isRefetching} onClick={() => { setSelected([]); refetch() }}>
                    {(isLoading || isRefetching) ? <><RefreshCcw className='animate-spin' /> Atualizando...</> : <><RefreshCcw /> Atualizar</>}
                  </Button>
                </div>
              </EmptyContent>
            </Empty>
          )}
          onChange={({ page, perPage }) => { if (typeof page === 'number') setCurrentPage(page); if (typeof perPage === 'number') setPerPage(perPage); refetch() }}
        />
      </div>
    </div>
  )
}
