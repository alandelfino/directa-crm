import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { privateInstance } from '@/lib/auth'
import { Topbar } from '../-components/topbar'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTable, type ColumnDef } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { Edit, Funnel, GitFork, Trash, Type as TypeIcon, Palette, Image as ImageIcon, List, ArrowUpRight, RefreshCw,
  ArrowUpDown,
  ArrowDownAZ,
  ArrowUpZA
} from 'lucide-react'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'
import { NewDerivationSheet } from './-components/new-derivation'
import { EditDerivationSheet } from './-components/edit-derivation'
import { DeleteDerivation } from './-components/delete-derivation'
import { DerivationItemsSheet } from './-components/derivation-items'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

export const Route = createFileRoute('/dashboard/derivations/')({
  component: RouteComponent,
})

type Derivation = {
  id: number
  name: string
  storeName: string
  type: string
  createdAt: string
  updatedAt: string
}

function RouteComponent() {
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [selectedDerivations, setSelectedDerivations] = useState<number[]>([])
  const [totalItems, setTotalItems] = useState(0)

  // Filtros e Ordenação (Estado Aplicado)
  const [sortBy, setSortBy] = useState('createdAt')
  const [orderBy, setOrderBy] = useState('desc')
  const [filterName, setFilterName] = useState('')
  const [filterNameOperator, setFilterNameOperator] = useState('cont')
  const [filterStoreName, setFilterStoreName] = useState('')
  const [filterStoreNameOperator, setFilterStoreNameOperator] = useState('cont')
  const [filterType, setFilterType] = useState('all')
  const [filterTypeOperator, setFilterTypeOperator] = useState('eq')

  // Filtros e Ordenação (Estado Local do Popover)
  const [localSortBy, setLocalSortBy] = useState('createdAt')
  const [localOrderBy, setLocalOrderBy] = useState('desc')
  const [localFilterName, setLocalFilterName] = useState('')
  const [localFilterNameOperator, setLocalFilterNameOperator] = useState('cont')
  const [localFilterStoreName, setLocalFilterStoreName] = useState('')
  const [localFilterStoreNameOperator, setLocalFilterStoreNameOperator] = useState('cont')
  const [localFilterType, setLocalFilterType] = useState('all')
  const [localFilterTypeOperator, setLocalFilterTypeOperator] = useState('eq')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const activeFilterCount = (filterName ? 1 : 0) + (filterStoreName ? 1 : 0) + (filterType !== 'all' ? 1 : 0)

  const { data, isLoading, isRefetching, isError, refetch } = useQuery({
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryKey: ['derivations', currentPage, perPage, sortBy, orderBy, filterName, filterNameOperator, filterStoreName, filterStoreNameOperator, filterType, filterTypeOperator],
    queryFn: async () => {
      const params: any = {
        page: currentPage,
        limit: perPage,
        sortBy,
        orderBy
      }

      if (filterName) params.name = JSON.stringify({ operator: filterNameOperator, value: filterName })
      if (filterStoreName) params.storeName = JSON.stringify({ operator: filterStoreNameOperator, value: filterStoreName })
      if (filterType && filterType !== 'all') params.type = JSON.stringify({ operator: filterTypeOperator, value: filterType })

      const response = await privateInstance.get('/tenant/derivations', { params })
      if (response.status !== 200) {
        throw new Error('Erro ao carregar derivações')
      }
      return response.data
    }
  })

  const [derivations, setDerivations] = useState<Derivation[]>([])
  const selectedDerivation = useMemo(() => derivations.find(d => d.id === selectedDerivations[0]), [derivations, selectedDerivations])
  const selectedDerivationType: 'text' | 'color' | 'image' | undefined = useMemo(() => {
    const d = selectedDerivation
    if (!d) return undefined
    return d.type as any
  }, [selectedDerivation])

  const columns: ColumnDef<Derivation>[] = [
    {
      id: 'select',
      width: '60px',
      header: (
        <div className='flex items-center justify-center text-xs text-muted-foreground'>Sel.</div>
      ),
      cell: (derivation) => (
        <div className='flex items-center justify-center'>
          <Checkbox
            checked={selectedDerivations.includes(derivation.id)}
            onCheckedChange={() => toggleSelect(derivation.id)}
          />
        </div>
      ),
      headerClassName: 'w-[60px] border-r',
      className: 'font-medium border-r'
    },
    {
      id: 'name',
      header: 'Nome',
      cell: (d) => d.name,
      className: 'border-r'
    },
    {
      id: 'catalog',
      header: 'Nome no catálogo',
      cell: (d) => d.storeName,
      className: 'border-r'
    },
    {
      id: 'type',
      header: 'Tipo',
      cell: (d) => {
        const t = d.type
        const label = t === 'color' ? 'Cor' : t === 'text' ? 'Texto' : t === 'image' ? 'Imagem' : '-'
        const Icon = t === 'color' ? Palette : t === 'text' ? TypeIcon : t === 'image' ? ImageIcon : null
        return (
          <Badge variant='outline' className='flex items-center gap-1'>
            {Icon ? <Icon className='h-3.5 w-3.5' /> : null}
            <span>{label}</span>
          </Badge>
        )
      },
      headerClassName: 'w-[120px] border-r',
      className: 'w-[120px]'
    },
    {
      id: 'items',
      header: 'Criado em',
      cell: (d) => d.createdAt ? new Date(d.createdAt).toLocaleDateString('pt-BR') : '-',
      headerClassName: 'w-[120px] border-r',
      className: 'w-[120px]'
    },
  ]

  useEffect(() => {
    if (!data) return

    const items = data.items || []
    setDerivations(items)
    setTotalItems(data.total || 0)
  }, [data])

  useEffect(() => {
    if (isError) {
      // Opcional: exibir toast
      console.error('Erro ao carregar derivações')
    }
  }, [isError])

  // Resetar seleção quando mudar de página ou itens por página
  useEffect(() => {
    setSelectedDerivations([])
  }, [currentPage, perPage])

  // Limpar seleção ao atualizar/refetch da listagem
  useEffect(() => {
    if (isRefetching) {
      setSelectedDerivations([])
    }
  }, [isRefetching])

  const toggleSelect = (id: number) => {
    // Seleção única: se já estiver selecionado, desmarca; caso contrário, seleciona somente ele
    if (selectedDerivations.includes(id)) {
      setSelectedDerivations([])
    } else {
      setSelectedDerivations([id])
    }
  }

  return (
    <div className='flex flex-col w-full h-full'>

      <Topbar title="Derivações" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard', isLast: false }, { label: 'Derivações', href: '/dashboard/derivations', isLast: true }]} />

      {/* Content */}
      <div className='flex flex-col w-full h-full flex-1 overflow-hidden'>

        {/* Actions */}
        <div className='border-b flex w-full items-center p-2 gap-4'>

          {/* Filters */}
          <div className='flex items-center gap-2 flex-1'>
            <Popover open={isFilterOpen} onOpenChange={(open) => {
              if (open) {
                setLocalSortBy(sortBy)
                setLocalOrderBy(orderBy)
                setLocalFilterName(filterName)
                setLocalFilterNameOperator(filterNameOperator)
                setLocalFilterStoreName(filterStoreName)
                setLocalFilterStoreNameOperator(filterStoreNameOperator)
                setLocalFilterType(filterType)
                setLocalFilterTypeOperator(filterTypeOperator)
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
                            <SelectItem value="name">Nome</SelectItem>
                            <SelectItem value="storeName">Nome Loja</SelectItem>
                            <SelectItem value="type">Tipo</SelectItem>
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
                      <div className="grid gap-1.5">
                        <Label htmlFor="storeName" className="text-xs font-medium text-muted-foreground">Nome no Catálogo</Label>
                        <div className="flex gap-2">
                          <Select value={localFilterStoreNameOperator} onValueChange={setLocalFilterStoreNameOperator}>
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
                            id="storeName"
                            value={localFilterStoreName}
                            onChange={(e) => setLocalFilterStoreName(e.target.value)}
                            className="h-9 flex-1"
                            placeholder="Filtrar por nome na loja..."
                          />
                        </div>
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor="type" className="text-xs font-medium text-muted-foreground">Tipo</Label>
                        <div className="flex gap-2">
                          <Select value={localFilterTypeOperator} onValueChange={setLocalFilterTypeOperator}>
                            <SelectTrigger className="w-[130px] h-9">
                              <SelectValue placeholder="Op." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="eq">Igual</SelectItem>
                              <SelectItem value="ne">Diferente</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select value={localFilterType} onValueChange={setLocalFilterType}>
                            <SelectTrigger id="type" className="h-9 w-full flex-1">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos</SelectItem>
                              <SelectItem value="text">Texto</SelectItem>
                              <SelectItem value="color">Cor</SelectItem>
                              <SelectItem value="image">Imagem</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="default" className="flex-1" onClick={() => {
                      setLocalSortBy('createdAt')
                      setLocalOrderBy('desc')
                      setLocalFilterNameOperator('cont')
                      setLocalFilterStoreName('')
                      setLocalFilterStoreNameOperator('cont')
                      setLocalFilterType('all')
                      setLocalFilterTypeOperator('eq')
                      
                      setSortBy('createdAt')
                      setOrderBy('desc')
                      setFilterName('')
                      setFilterNameOperator('cont')
                      setFilterStoreName('')
                      setFilterStoreNameOperator('cont')
                      setFilterType('all')
                      setFilterTypeOperator('eq')
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
                      setFilterStoreName(localFilterStoreName)
                      setFilterStoreNameOperator(localFilterStoreNameOperator)
                      setFilterType(localFilterType)
                      setFilterTypeOperator(localFilterTypeOperator)
                      setCurrentPage(1) // Reset page on filter apply
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
            <Button variant={'ghost'} size="sm" disabled={isLoading || isRefetching} onClick={() => { setSelectedDerivations([]); refetch() }}>
              {
                (isLoading || isRefetching)
                  ? <RefreshCw className='animate-spin size-[0.85rem]' />
                  : <RefreshCw className="size-[0.85rem]" />
              }
            </Button>

            {selectedDerivations.length === 1 ? (
              <DeleteDerivation derivationId={selectedDerivations[0]} onDeleted={() => { setSelectedDerivations([]); refetch() }} />
            ) : (
              <Button variant={'outline'} size="sm" disabled>
                <Trash className="size-[0.85rem]" /> Excluir
              </Button>
            )}

            {selectedDerivations.length === 1 && selectedDerivationType ? (
              <DerivationItemsSheet derivationId={selectedDerivations[0]} derivationType={selectedDerivationType} />
            ) : (
              <Button variant={'outline'} size="sm" disabled>
                <List className="size-[0.85rem]" /> Items
              </Button>
            )}

            {selectedDerivations.length === 1 ? (
              <EditDerivationSheet derivationId={selectedDerivations[0]} />
            ) : (
              <Button variant={'outline'} size="sm" disabled>
                <Edit className="size-[0.85rem]" /> Editar
              </Button>
            )}
            <NewDerivationSheet onCreated={() => { setSelectedDerivations([]); refetch() }} />
          </div>

        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={derivations}
          loading={isLoading || isRefetching}
          page={currentPage}
          perPage={perPage}
          totalItems={totalItems}
          emptyMessage='Nenhuma derivação encontrada'
          emptySlot={(
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <GitFork className='h-6 w-6' />
                </EmptyMedia>
                <EmptyTitle>Nenhuma derivação ainda</EmptyTitle>
                <EmptyDescription>
                  Você ainda não criou nenhuma derivação. Comece criando sua primeira derivação.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <div className='flex gap-2'>
                  <NewDerivationSheet onCreated={() => { setSelectedDerivations([]); refetch() }} />
                  <Button variant={'outline'} size="sm" disabled={isLoading || isRefetching} onClick={() => { setSelectedDerivations([]); refetch() }}>
                    {(isLoading || isRefetching) ? <><RefreshCw className='animate-spin size-[0.85rem]' /></> : <><RefreshCw className="size-[0.85rem]" /></>}
                  </Button>
                </div>
              </EmptyContent>
              <Button
                variant='link'
                asChild
                className='text-muted-foreground'
              >
                <a href='#'>
                  Saiba mais <ArrowUpRight className='inline-block ml-1 h-4 w-4' />
                </a>
              </Button>
            </Empty>
          )}
          onChange={({ page, perPage }) => {
            if (typeof page === 'number') setCurrentPage(page)
            if (typeof perPage === 'number') setPerPage(perPage)
            refetch()
          }} />

      </div>
    </div>
  )
}
