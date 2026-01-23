import { createFileRoute } from '@tanstack/react-router'
import { Topbar } from '../-components/topbar'
import { Button } from '@/components/ui/button'
import { Edit, Funnel, RefreshCw, Trash, ShieldCheck } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { privateInstance } from '@/lib/auth'
import { DataTable } from '@/components/data-table'
import type { ColumnDef } from '@/components/data-table'
import { NewWarrantySheet } from './-components/new-warranty'
import { EditWarrantySheet } from './-components/edit-warranty'
import { DeleteWarranty } from './-components/delete-warranty'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'

export const Route = createFileRoute('/dashboard/warranties/')({
  component: RouteComponent,
})

type Warranty = {
  id: number
  created_at?: number
  updated_at?: number
  name: string
  store_name: string
  period: 'day' | 'month' | 'year'
  amount: number
  price: number
}

type WarrantiesResponse = {
  itemsReceived: number
  curPage: number
  nextPage: number | null
  prevPage: number | null
  offset: number
  perPage: number
  itemsTotal: number
  pageTotal: number
  items: Warranty[]
}

function RouteComponent() {
  const formatCurrencyBRL = (centavos: number) => {
    const value = typeof centavos === 'number' && !isNaN(centavos) ? centavos : 0
    const reais = Math.floor(value / 100)
    const cents = Math.abs(value % 100)
    return `R$ ${reais.toLocaleString('pt-BR')},${cents.toString().padStart(2, '0')}`
  }
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [selected, setSelected] = useState<number[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const { data, isLoading, isRefetching, isError, error, refetch } = useQuery({
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryKey: ['warranties', currentPage, perPage],
    queryFn: async () => {
      const response = await privateInstance.get(`/api:PcyOgAiT/warranties?page=${currentPage}&per_page=${Math.min(50, perPage)}`)
      if (response.status !== 200) {
        throw new Error('Erro ao carregar garantias')
      }
      return await response.data as WarrantiesResponse
    }
  })

  const [items, setItems] = useState<Warranty[]>([])

  const columns: ColumnDef<Warranty>[] = [
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
      headerClassName: 'w-[60px] border-r !px-4',
      className: 'font-medium border-r'
    },
    { id: 'name', header: 'Nome', cell: (w) => w.name, headerClassName: 'border-r !px-4', className: 'border-r' },
    { id: 'store_name', header: 'Nome na loja', cell: (w) => w.store_name, headerClassName: 'border-r !px-4', className: 'border-r' },
    { id: 'period', header: 'Período', cell: (w) => ({ day: 'Dia', month: 'Mês', year: 'Ano' }[w.period]), headerClassName: 'w-[90px] border-r !px-4', className: 'w-[120px] border-r' },
    { id: 'amount', header: 'Qtd.', cell: (w) => w.amount, headerClassName: 'w-[70px] border-r !px-4', className: 'w-[90px] border-r' },
    { id: 'price', header: 'Preço', cell: (w) => formatCurrencyBRL(w.price), headerClassName: 'w-[90px] border-r !px-4', className: 'w-[140px] border-r' },
  ]

  useEffect(() => {
    if (!data) return

    const itemsArr = Array.isArray(data.items) ? data.items : []
    setItems(itemsArr)

    const itemsTotal = typeof data.itemsTotal === 'number' ? data.itemsTotal : itemsArr.length
    setTotalItems(itemsTotal)

    const pageTotal = typeof data.pageTotal === 'number' ? data.pageTotal : Math.max(1, Math.ceil(itemsTotal / perPage))
    setTotalPages(pageTotal)
  }, [data, perPage])

  useEffect(() => {
    if (isError) {
      const errorData = (error as any)?.response?.data
      toast.error(errorData?.title || 'Erro ao carregar garantias', {
        description: errorData?.detail || 'Não foi possível carregar a lista de garantias.'
      })
    }
  }, [isError, error])
  useEffect(() => { setSelected([]) }, [currentPage, perPage])
  useEffect(() => { if (isRefetching) setSelected([]) }, [isRefetching])
  useEffect(() => { if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages) }, [totalPages, currentPage])

  const toggleSelectAll = () => { if (selected.length === items.length) setSelected([]); else setSelected(items.map(i => i.id)) }
  const toggleSelect = (id: number) => { if (selected.includes(id)) setSelected(selected.filter(s => s !== id)); else setSelected([...selected, id]) }

  return (
    <div className='flex flex-col w-full h-full'>
      <Topbar title="Garantias" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard', isLast: false }, { label: 'Garantias', href: '/dashboard/warranties', isLast: true }]} />
      <div className='flex flex-col w-full h-full flex-1 overflow-hidden'>
        <div className='border-b flex w-full items-center p-2 gap-4'>
          <div className='flex items-center gap-2 flex-1'>
            <Button variant={'outline'} size="sm">
              <Funnel className="size-[0.85rem]" /> Filtros
            </Button>
          </div>
          <div className='flex items-center gap-2'>
            <Button variant={'ghost'} size="sm" disabled={isLoading || isRefetching} onClick={() => { setSelected([]); refetch() }}>
              {isLoading || isRefetching ? (<RefreshCw className='animate-spin size-[0.85rem]' />) : (<RefreshCw className="size-[0.85rem]" />)}
            </Button>

            {selected.length === 1 ? (
              <DeleteWarranty warrantyId={selected[0]} />
            ) : (
              <Button variant={'outline'} disabled size="sm">
                <Trash className="size-[0.85rem]" /> Excluir
              </Button>
            )}

            {selected.length === 1 ? (
              <EditWarrantySheet warrantyId={selected[0]} />
            ) : (
              <Button variant={'outline'} disabled size="sm">
                <Edit className="size-[0.85rem]" /> Editar
              </Button>
            )}
            <NewWarrantySheet />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={items}
          loading={isLoading || isRefetching}
          page={currentPage}
          perPage={perPage}
          totalItems={totalItems}
          emptyMessage='Nenhuma garantia encontrada'
          emptySlot={(
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ShieldCheck className='h-6 w-6' />
                </EmptyMedia>
                <EmptyTitle>Nenhuma garantia ainda</EmptyTitle>
                <EmptyDescription>
                  Você ainda não criou nenhuma garantia. Comece criando sua primeira garantia.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <div className='flex gap-2'>
                  <NewWarrantySheet />
                  <Button variant={'ghost'} size="sm" disabled={isLoading || isRefetching} onClick={() => { setSelected([]); refetch() }}>
                    {isLoading || isRefetching ? <RefreshCw className='animate-spin size-[0.85rem]' /> : <RefreshCw className="size-[0.85rem]" />}
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
