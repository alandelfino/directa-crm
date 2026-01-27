import { createFileRoute } from '@tanstack/react-router'
import { Topbar } from '../-components/topbar'
import { Button } from '@/components/ui/button'
import { Edit, Funnel, RefreshCw, Trash, ShieldCheck, ArrowUpDown, ArrowDownAZ, ArrowUpZA } from 'lucide-react'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

export const Route = createFileRoute('/dashboard/warranties/')({
  component: RouteComponent,
})

type Warranty = {
  id: number
  name: string
  storeName: string
  period: string
  amount: number
  price: number
  createdAt: string
  updatedAt: string
}

type WarrantiesResponse = {
  items: Warranty[]
  page: number
  limit: number
  totalPages: number
  total: number
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
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryKey: ['warranties', currentPage, perPage, sortBy, orderBy, filterName, filterNameOperator],
    queryFn: async () => {
      const params: any = {
        page: currentPage,
        limit: perPage,
        sortBy,
        orderBy
      }

      if (filterName) params.name = JSON.stringify({ operator: filterNameOperator, value: filterName })

      const response = await privateInstance.get('/tenant/warranties', { params })
      if (response.status !== 200) {
        throw new Error('Erro ao carregar garantias')
      }
      return response.data as WarrantiesResponse
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
    { id: 'storeName', header: 'Nome na loja', cell: (w) => w.storeName, headerClassName: 'border-r !px-4', className: 'border-r' },
    { 
      id: 'period', 
      header: 'Período', 
      cell: (w) => {
        const map: Record<string, string> = { days: 'Dias', months: 'Meses', years: 'Anos' }
        return map[w.period] || w.period
      }, 
      headerClassName: 'w-[90px] border-r !px-4', 
      className: 'w-[120px] border-r' 
    },
    { id: 'amount', header: 'Qtd.', cell: (w) => w.amount, headerClassName: 'w-[70px] border-r !px-4', className: 'w-[90px] border-r' },
    { id: 'price', header: 'Preço', cell: (w) => formatCurrencyBRL(w.price), headerClassName: 'w-[90px] border-r !px-4', className: 'w-[140px] border-r' },
    { 
      id: 'createdAt', 
      header: 'Criado em', 
      cell: (w) => w.createdAt ? new Date(w.createdAt).toLocaleDateString('pt-BR') : '-',
      width: '120px',
      headerClassName: 'w-[120px] border-r !px-4', 
      className: 'w-[120px] border-r'
    }
  ]

  useEffect(() => {
    if (!data) return

    const itemsArr = Array.isArray(data.items) ? data.items : []
    setItems(itemsArr)

    setTotalItems(data.total || 0)
    setTotalPages(data.totalPages || 1)
  }, [data])

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
                <Button variant={'outline'} size="sm">
                  <Funnel className="size-[0.85rem]" /> Filtros
                  {activeFilterCount > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{activeFilterCount}</Badge>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[340px] p-5" align="start">
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
                            <SelectItem value="storeName">Nome na Loja</SelectItem>
                            <SelectItem value="period">Período</SelectItem>
                            <SelectItem value="amount">Quantidade</SelectItem>
                            <SelectItem value="price">Preço</SelectItem>
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
                      
                      setSortBy('createdAt')
                      setOrderBy('desc')
                      setFilterName('')
                      setFilterNameOperator('cont')
                      setCurrentPage(1)
                      setIsFilterOpen(false)
                    }}>
                      Limpar tudo
                    </Button>
                    <Button size="sm" className="flex-1" onClick={() => {
                      setSortBy(localSortBy)
                      setOrderBy(localOrderBy)
                      setFilterName(localFilterName)
                      setFilterNameOperator(localFilterNameOperator)
                      setCurrentPage(1)
                      setIsFilterOpen(false)
                    }}>
                      Aplicar
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
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
