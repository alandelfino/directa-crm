import { createFileRoute } from '@tanstack/react-router'
import { Topbar } from '../-components/topbar'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTable } from '@/components/data-table'
import type { ColumnDef } from '@/components/data-table'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'
import { Factory, Edit, RefreshCw, Trash } from 'lucide-react'
 
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { privateInstance } from '@/lib/auth'
import { toast } from 'sonner'
import { NewDistributionCenterSheet } from './-components/new-distribution-center'
import { EditDistributionCenterSheet } from './-components/edit-distribution-center'
import { DeleteDistributionCenter } from './-components/delete-distribution-center'

export const Route = createFileRoute('/dashboard/distribution-centers/')({
  component: RouteComponent,
})

type DistributionCenter = {
  id: number
  name?: string
  company_id?: number
  created_at?: number
  updated_at?: number | string | null
}

type DistributionCentersResponse = {
  itemsReceived?: number
  curPage?: number
  nextPage?: number | null
  prevPage?: number | null
  offset?: number
  perPage?: number
  itemsTotal?: number
  pageTotal?: number
  items?: DistributionCenter[]
} | DistributionCenter[]

function normalizeResponse(data: DistributionCentersResponse) {
  if (Array.isArray(data)) {
    return { items: data, itemsTotal: data.length, pageTotal: 1 }
  }
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
    queryKey: ['distribution-centers', currentPage, perPage],
    queryFn: async () => {
      const url = `/api:k-mANdpH/distribution_centers?page=${currentPage}&per_page=${Math.min(50, perPage)}`
      const response = await privateInstance.get(url)
      if (response.status !== 200) throw new Error('Erro ao carregar centros de distribuição')
      return response.data as DistributionCentersResponse
    }
  })

  const [items, setItems] = useState<DistributionCenter[]>([])

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
      const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d)
      const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
      const dd = get('day'); const MM = get('month'); const yyyy = get('year')
      return `${dd}/${MM}/${yyyy}`
    } catch {
      const d = new Date(ms)
      return d.toLocaleDateString('pt-BR')
    }
  }

  useEffect(() => {
    if (!data) return
    const normalized = normalizeResponse(data)
    const arr = Array.isArray(normalized.items) ? normalized.items : []
    setItems(arr)
    const itemsTotal = typeof normalized.itemsTotal === 'number' ? normalized.itemsTotal : arr.length
    setTotalItems(itemsTotal)
    const pageTotal = typeof normalized.pageTotal === 'number' ? normalized.pageTotal : Math.max(1, Math.ceil(itemsTotal / Math.max(1, perPage)))
    setTotalPages(pageTotal)
  }, [data, perPage])

  useEffect(() => { if (isError) toast.error('Erro ao carregar centros de distribuição') }, [isError])
  useEffect(() => { setSelected([]) }, [currentPage, perPage])
  useEffect(() => { if (isRefetching) setSelected([]) }, [isRefetching])
  useEffect(() => { if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages) }, [totalPages, currentPage])

  const toggleSelectAll = () => { if (selected.length === items.length) setSelected([]); else setSelected(items.map(i => i.id)) }
  const toggleSelect = (id: number) => { if (selected.includes(id)) setSelected(selected.filter(s => s !== id)); else setSelected([...selected, id]) }

  const columns: ColumnDef<DistributionCenter>[] = [
    {
      id: 'select',
      width: '60px',
      header: () => (
        <div className='flex justify-center items-center'>
          <Checkbox
            checked={items.length > 0 && selected.length === items.length}
            onCheckedChange={toggleSelectAll}
          />
        </div>
      ),
      cell: (row) => (
        <div className='flex justify-center items-center'>
          <Checkbox
            checked={selected.includes(row.id)}
            onCheckedChange={() => toggleSelect(row.id)}
          />
        </div>
      ),
      headerClassName: 'w-[60px] border-r',
      className: 'font-medium border-r p-2!'
    },
    { id: 'name', header: 'Nome', cell: (i) => i.name ?? '—', className: 'border-r p-2!' },
    {
      id: 'created_at',
      header: 'Criado em',
      width: '12.5rem',
      cell: (i) => {
        const d = fmtDateOnly(i.created_at)
        return (<span className='text-sm'>{d || '-'}</span>)
      },
      headerClassName: 'w-[12.5rem] min-w-[12.5rem] border-r',
      className: 'w-[12.5rem] min-w-[12.5rem] border-r p-2!'
    },
  ]

  return (
    <div className='flex flex-col w-full h-full'>
      <Topbar title='Centros de distribuição' breadcrumbs={[{ label: 'Dashboard', href: '/dashboard', isLast: false }, { label: 'Centros de distribuição', href: '/dashboard/distribution-centers', isLast: true }]} />
      <div className='flex flex-col w-full h-full flex-1 overflow-hidden'>
        <div className='border-b flex w-full items-center p-2 gap-4'>
          <div className='flex items-center gap-2 flex-1'></div>
          <div className='flex items-center gap-2'>
            <Button variant={'ghost'} size="sm" disabled={isLoading || isRefetching} onClick={() => { setSelected([]); refetch() }}>
              {(isLoading || isRefetching) ? (<RefreshCw className='animate-spin size-[0.85rem]' />) : (<RefreshCw className="size-[0.85rem]" />)}
            </Button>
            {selected.length === 1 ? (
              <DeleteDistributionCenter distributionCenterId={selected[0]} onDeleted={() => { setSelected([]); refetch() }} />
            ) : (
              <Button variant={'outline'} size="sm" disabled><Trash className="size-[0.85rem]" /> Excluir</Button>
            )}
            {selected.length === 1 ? (
              <EditDistributionCenterSheet distributionCenterId={selected[0]} onSaved={() => { refetch() }} />
            ) : (
              <Button variant={'outline'} size="sm" disabled><Edit className="size-[0.85rem]" /> Editar</Button>
            )}
            <NewDistributionCenterSheet onCreated={() => { refetch() }} />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={items}
          loading={isLoading || isRefetching}
          page={currentPage}
          perPage={perPage}
          totalItems={totalItems}
          emptyMessage='Nenhum centro de distribuição encontrado'
          emptySlot={(
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant='icon'>
                  <Factory className='h-6 w-6' />
                </EmptyMedia>
                <EmptyTitle>Nenhum centro de distribuição ainda</EmptyTitle>
                <EmptyDescription>Crie centros de distribuição para organizar sua operação.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <div className='flex gap-2'>
                  <NewDistributionCenterSheet onCreated={() => { refetch() }} />
                  <Button variant={'ghost'} size="sm" disabled={isLoading || isRefetching} onClick={() => { refetch() }}>
                    {(isLoading || isRefetching) ? <RefreshCw className='animate-spin size-[0.85rem]' /> : <RefreshCw className="size-[0.85rem]" />}
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
