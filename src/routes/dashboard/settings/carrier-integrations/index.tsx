import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { privateInstance } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { DataTable, type ColumnDef } from '@/components/data-table'
import { Checkbox } from '@/components/ui/checkbox'
import { RefreshCw, Edit, Trash, ArrowUpDown, ArrowDownAZ, ArrowUpZA, Funnel } from 'lucide-react'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'
import { NewCarrierIntegrationSheet } from './-components/new-carrier-integration'
import { EditCarrierIntegrationSheet } from './-components/edit-carrier-integration'
import { DeleteCarrierIntegrationDialog } from './-components/delete-carrier-integration'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

export const Route = createFileRoute('/dashboard/settings/carrier-integrations/')({
  component: RouteComponent,
})

type CarrierIntegration = {
  id: number
  name: string
  carrier?: {
    id: number
    name: string
  }
  carrierName?: string // Keeping for backward compatibility if needed, though nested is preferred now
  createdAt: string
  updatedAt: string
}

function RouteComponent() {
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [selectedItems, setSelectedItems] = useState<number[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

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

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['carrier-integrations', currentPage, perPage, sortBy, orderBy, filterName, filterNameOperator],
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const params: any = {
        page: currentPage,
        limit: perPage,
        sortBy,
        orderBy
      }

      if (filterName) {
        params.name = JSON.stringify({ operator: filterNameOperator, value: filterName })
      }

      const response = await privateInstance.get('/tenant/carriers-integrations', { params })
      return response.data
    }
  })

  useEffect(() => {
    if (data) {
      setTotalItems(data.total || 0)
      setTotalPages(data.totalPages || 1)
    }
  }, [data])

  useEffect(() => {
    setSelectedItems([])
  }, [currentPage, perPage, sortBy, orderBy, filterName, filterNameOperator])

  const toggleSelect = (id: number) => {
    if (selectedItems.includes(id)) {
      setSelectedItems([])
    } else {
      setSelectedItems([id])
    }
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
        minute: '2-digit'
      }).format(d)
    } catch {
      return v
    }
  }

  const columns: ColumnDef<CarrierIntegration>[] = useMemo(() => [
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
      id: 'carrierName',
      header: 'Transportadora',
      cell: (row) => (
        <span className="text-muted-foreground">{row.carrier?.name || row.carrierName}</span>
      ),
      headerClassName: 'w-[12.5rem] min-w-[12.5rem] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[12.5rem] min-w-[12.5rem] border-r border-neutral-200 !px-4 py-3'
    },
    {
      id: 'createdAt',
      header: 'Criado em',
      width: '12.5rem',
      cell: (row) => {
        const d = fmtDate(row.createdAt)
        return (
          <span className='text-sm text-muted-foreground'>{d || '-'}</span>
        )
      },
      headerClassName: 'w-[12.5rem] min-w-[12.5rem] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[12.5rem] min-w-[12.5rem] border-r border-neutral-200 !px-4 py-3'
    }
  ], [selectedItems])

  return (
    <div className='flex flex-col w-full h-full'>
      <div className='flex items-center justify-between p-4'>
        <div className='flex flex-col'>
          <h2 className='text-lg font-semibold'>Integrações de Transportadoras</h2>
          <p className='text-sm text-muted-foreground'>Gerencie suas integrações com transportadoras.</p>
        </div>
        <div className='flex items-center gap-2'>
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
                            <SelectItem value="updatedAt">Atualizado em</SelectItem>
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
                    }}>
                      Limpar
                    </Button>
                    <Button size="default" className="flex-1" onClick={() => {
                      setSortBy(localSortBy)
                      setOrderBy(localOrderBy)
                      setFilterName(localFilterName)
                      setFilterNameOperator(localFilterNameOperator)
                      setIsFilterOpen(false)
                    }}>
                      Aplicar
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Button variant='ghost' size='sm' onClick={() => { setSelectedItems([]); refetch() }} disabled={isLoading || isRefetching}>
              <RefreshCw className={`size-[0.85rem] ${isRefetching ? 'animate-spin' : ''}`} />
            </Button>
            
            <Button 
              variant='outline' 
              size='sm' 
              className={`text-destructive hover:text-destructive ${selectedItems.length !== 1 ? 'opacity-50 pointer-events-none' : ''}`}
              onClick={() => setDeleteId(selectedItems[0])}
              disabled={selectedItems.length !== 1}
            >
              <Trash className="size-[0.85rem] mr-2" /> Excluir
            </Button>

            <Button 
                variant='outline' 
                size='sm' 
                onClick={() => setEditId(selectedItems[0])} 
                disabled={selectedItems.length !== 1}
            >
              <Edit className="size-[0.85rem] mr-2" /> Editar
            </Button>
            
            <NewCarrierIntegrationSheet />
        </div>
      </div>

      <div className='flex flex-col w-full h-full flex-1 overflow-hidden pl-4'>
        <div className=' rounded-tl-lg overflow-hidden h-full flex flex-col flex-1'>
          <DataTable
            columns={columns}
            data={data?.items || []}
            loading={isLoading || isRefetching}
            page={currentPage}
            totalItems={totalItems}
            perPage={perPage}
            onChange={(vals) => {
              if (vals.page) setCurrentPage(vals.page)
              if (vals.perPage) setPerPage(vals.perPage)
            }}
            onRowClick={(row) => toggleSelect(row.id)}
            emptySlot={
              <Empty>
                <EmptyHeader>
                  <EmptyMedia><RefreshCw className="size-10" /></EmptyMedia>
                  <EmptyTitle>Nenhuma integração encontrada</EmptyTitle>
                  <EmptyDescription>Crie uma nova integração para começar.</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <NewCarrierIntegrationSheet />
                </EmptyContent>
              </Empty>
            }
          />
        </div>
      </div>

      {editId && (
        <EditCarrierIntegrationSheet 
            id={editId} 
            onOpenChange={(open) => !open && setEditId(null)} 
        />
      )}

      {deleteId && (
        <DeleteCarrierIntegrationDialog 
            id={deleteId} 
            onOpenChange={(open) => !open && setDeleteId(null)} 
        />
      )}
    </div>
  )
}
