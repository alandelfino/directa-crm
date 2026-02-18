import { createFileRoute } from '@tanstack/react-router'
import { Topbar } from '../-components/topbar'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Edit, Trash, Package, GitFork, RefreshCw, BadgeDollarSign, Image as ImageIcon, Funnel, ArrowUpDown, ArrowDownAZ, ArrowUpZA } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { privateInstance } from '@/lib/auth'
import { DataTable } from '@/components/data-table'
import type { ColumnDef } from '@/components/data-table'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'
import { NewProductSheet } from './-components/new-product'
import { EditProductSheet } from './-components/edit-product'
import { DeleteProductDialog } from './-components/delete-product'
import { DerivatedProductsSheet } from './-components/derivated-products'
import { DerivatedProductPricesSheet } from './-components/derivated-product-prices/derivated-product-prices-sheet'
import { SimpleProductPricesSheet } from './-components/simple-product-prices/simple-product-prices-sheet'
import { ProductImagesSheet as DerivatedProductImagesSheet } from './-components/derivated-product-images-sheet'
import { ProductImagesSheet as SimpleProductImagesSheet } from './-components/product-images-sheet'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

export const Route = createFileRoute('/dashboard/products/')({
  component: RouteComponent,
})

type Product = {
  id: number
  sku: string
  name: string
  active: boolean
  brandId: number
  description: string
  type: 'simple' | 'with_derivations'
  unitId: number
  managedInventory: boolean
  mainMediaId: number | null
  createdAt: string
  updatedAt: string
  // Helper properties for UI compatibility
  derivations?: any[]
  derivation_ids?: number[]
  warranties?: any[]
  warranty_ids?: number[]
  stores?: any[]
  store_ids?: number[]
  categories?: any[]
  category_ids?: number[]
}

type ProductsResponse = {
  page: number
  limit: number
  totalPages: number
  total: number
  items: Product[]
}

function normalizeResponse(data: ProductsResponse) {
  return { items: data.items, itemsTotal: data.total, pageTotal: data.totalPages }
}

 

function RouteComponent() {
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [selected, setSelected] = useState<number[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [sortBy, setSortBy] = useState('createdAt')
  const [orderBy, setOrderBy] = useState('desc')

  const [filterName, setFilterName] = useState('')
  const [filterNameOperator, setFilterNameOperator] = useState('cont')
  const [filterSku, setFilterSku] = useState('')
  const [filterSkuOperator, setFilterSkuOperator] = useState('cont')
  const [filterActive, setFilterActive] = useState('all')
  const [filterActiveOperator, setFilterActiveOperator] = useState('eq')
  const [filterType, setFilterType] = useState('all')
  const [filterTypeOperator, setFilterTypeOperator] = useState('eq')

  // Local Filter State (Popover)
  const [localSortBy, setLocalSortBy] = useState('createdAt')
  const [localOrderBy, setLocalOrderBy] = useState('desc')
  const [localFilterName, setLocalFilterName] = useState('')
  const [localFilterNameOperator, setLocalFilterNameOperator] = useState('cont')
  const [localFilterSku, setLocalFilterSku] = useState('')
  const [localFilterSkuOperator, setLocalFilterSkuOperator] = useState('cont')
  const [localFilterActive, setLocalFilterActive] = useState('all')
  const [localFilterActiveOperator, setLocalFilterActiveOperator] = useState('eq')
  const [localFilterType, setLocalFilterType] = useState('all')
  const [localFilterTypeOperator, setLocalFilterTypeOperator] = useState('eq')
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // Calculate active filters count
  const activeFilterCount = (filterName ? 1 : 0) + (filterSku ? 1 : 0) + (filterActive !== 'all' ? 1 : 0) + (filterType !== 'all' ? 1 : 0)

  const { data, isLoading, isRefetching, isError, error, refetch } = useQuery({
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryKey: ['products', currentPage, perPage, filterName, filterNameOperator, filterSku, filterSkuOperator, filterActive, filterActiveOperator, filterType, filterTypeOperator, sortBy, orderBy],
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      searchParams.append('page', currentPage.toString())
      searchParams.append('limit', Math.min(100, perPage).toString())
      searchParams.append('sortBy', sortBy)
      searchParams.append('orderBy', orderBy)

      if (filterName) {
        searchParams.append('name', JSON.stringify({
          operator: filterNameOperator,
          value: filterName
        }))
      }
      if (filterSku) {
        searchParams.append('sku', JSON.stringify({
          operator: filterSkuOperator,
          value: filterSku
        }))
      }
      if (filterActive !== 'all') {
        searchParams.append('active', JSON.stringify({
          operator: filterActiveOperator,
          value: filterActive === 'true'
        }))
      }
      if (filterType !== 'all') {
        searchParams.append('type', JSON.stringify({
          operator: filterTypeOperator,
          value: filterType
        }))
      }

      const response = await privateInstance.get(`/tenant/products?${searchParams.toString()}`)
      if (response.status !== 200) {
        throw new Error('Erro ao carregar produtos')
      }
      return response.data as ProductsResponse
    }
  })

  const [items, setItems] = useState<Product[]>([])
  const [createdProductId, setCreatedProductId] = useState<number | null>(null)

  

  const selectedProduct = useMemo(() => items.find((i) => i.id === selected[0]), [items, selected])
  const canManageChilds = useMemo(() => {
    const p: any = selectedProduct as any
    if (!p) return false
    const byType = p?.type === 'with_derivations'
    const hasArray = Array.isArray(p?.derivations) && (p?.derivations?.length ?? 0) > 0
    const hasItems = Array.isArray(p?.derivations?.items) && (p?.derivations?.items?.length ?? 0) > 0
    return byType || hasArray || hasItems
  }, [selectedProduct])

  const columns: ColumnDef<Product>[] = useMemo(() => [
    {
      id: 'select',
      width: '60px',
      header: () => (
        <div className='flex justify-center items-center text-xs text-neutral-500'>Sel.</div>
      ),
      cell: (row) => (
        <div className='flex justify-center items-center'>
          <Checkbox
            checked={selected.includes(row.id)}
            onCheckedChange={() => toggleSelect(row.id)}
          />
        </div>
      ),
      headerClassName: 'w-[60px] min-w-[60px] border-r',
      className: 'w-[60px] min-w-[60px] font-medium border-r p-2!'
    },
    { id: 'sku', header: 'SKU', width: '160px', cell: (p) => (<span className='block truncate' title={p.sku ?? '—'}>{p.sku ?? '—'}</span>), headerClassName: 'w-[160px] min-w-[160px] border-r', className: 'w-[160px] min-w-[160px] p-2! min-w-0' },
    { id: 'name', header: 'Nome', width: '280px', cell: (p) => (<span className='block truncate' title={p.name ?? '—'}>{p.name ?? '—'}</span>), headerClassName: 'w-[280px] min-w-[280px] border-r', className: 'w-[280px] min-w-[280px] p-2! min-w-0' },
    { id: 'type', header: 'Tipo', width: '180px', cell: (p) => (<span className='block truncate' title={p.type === 'with_derivations' ? 'Com variações' : 'Simples'}>{p.type === 'with_derivations' ? 'Com variações' : 'Simples'}</span>), headerClassName: 'w-[180px] min-w-[180px] border-r', className: 'w-[180px] min-w-[180px] p-2! min-w-0' },
    
    { id: 'managedInventory', header: 'Gerenciar estoque', width: '160px', cell: (p) => (<span className='block truncate' title={p.managedInventory ? 'Sim' : 'Não'}>{p.managedInventory ? 'Sim' : 'Não'}</span>), headerClassName: 'w-[160px] min-w-[160px] border-r', className: 'w-[160px] min-w-[160px] p-2! min-w-0' },
    { id: 'active', header: 'Status', width: '120px', cell: (p) => {
      const active = p.active === true
      return (
        <span
          className={
            active
              ? 'inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-green-50 text-green-600'
              : 'inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 text-gray-700'
          }
        >
          <span className={active ? 'h-1.5 w-1.5 rounded-full bg-green-600' : 'h-1.5 w-1.5 rounded-full bg-gray-500'} />
          {active ? 'Ativo' : 'Inativo'}
        </span>
      )
    }, headerClassName: 'w-[120px] min-w-[120px] border-r', className: 'w-[120px] min-w-[120px] p-2!' },
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

  useEffect(() => {
    if (isError) {
      const errorData = (error as any)?.response?.data
      toast.error(errorData?.title || 'Erro ao carregar produtos', {
        description: errorData?.detail || 'Não foi possível carregar a lista de produtos.'
      })
    }
  }, [isError, error])
  useEffect(() => { setSelected([]) }, [currentPage, perPage])
  useEffect(() => { if (isRefetching) setSelected([]) }, [isRefetching])
  useEffect(() => { if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages) }, [totalPages, currentPage])

  const toggleSelect = (id: number) => { if (selected.includes(id)) setSelected([]); else setSelected([id]) }

  return (
    <div className='flex flex-col w-full h-full overflow-x-hidden'>
      <Topbar title="Produtos" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard', isLast: false }, { label: 'Produtos', href: '/dashboard/products', isLast: true }]} />
      <div className='flex flex-col w-full h-full flex-1 overflow-hidden min-w-0'>
        <div className='border-b flex w-full items-center p-2 gap-4 max-w-full overflow-hidden'>
          <div className='flex items-center gap-2 flex-1'>
            <Popover open={isFilterOpen} onOpenChange={(open) => {
              if (open) {
                setLocalSortBy(sortBy)
                setLocalOrderBy(orderBy)
                setLocalFilterName(filterName)
                setLocalFilterNameOperator(filterNameOperator)
                setLocalFilterSku(filterSku)
                setLocalFilterSkuOperator(filterSkuOperator)
                setLocalFilterActive(filterActive)
                setLocalFilterActiveOperator(filterActiveOperator)
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
                            <SelectItem value="createdAt">Criado em</SelectItem>
                            <SelectItem value="id">ID</SelectItem>
                            <SelectItem value="name">Nome</SelectItem>
                            <SelectItem value="sku">SKU</SelectItem>
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
                        <Label htmlFor="sku" className="text-xs font-medium text-muted-foreground">SKU</Label>
                        <div className="flex gap-2">
                          <Select value={localFilterSkuOperator} onValueChange={setLocalFilterSkuOperator}>
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
                            id="sku"
                            value={localFilterSku}
                            onChange={(e) => setLocalFilterSku(e.target.value)}
                            className="h-9 flex-1"
                            placeholder="Filtrar por SKU..."
                          />
                        </div>
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor="active" className="text-xs font-medium text-muted-foreground">Status</Label>
                        <div className="flex gap-2">
                           <Select value={localFilterActiveOperator} onValueChange={setLocalFilterActiveOperator} disabled>
                            <SelectTrigger className="w-[130px] h-9">
                              <SelectValue placeholder="Op." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="eq">Igual</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select value={localFilterActive} onValueChange={setLocalFilterActive}>
                            <SelectTrigger id="active" className="h-9 w-full flex-1">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos</SelectItem>
                              <SelectItem value="true">Ativo</SelectItem>
                              <SelectItem value="false">Inativo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor="type" className="text-xs font-medium text-muted-foreground">Tipo</Label>
                        <div className="flex gap-2">
                          <Select value={localFilterTypeOperator} onValueChange={setLocalFilterTypeOperator} disabled>
                            <SelectTrigger className="w-[130px] h-9">
                              <SelectValue placeholder="Op." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="eq">Igual</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select value={localFilterType} onValueChange={setLocalFilterType}>
                            <SelectTrigger id="type" className="h-9 w-full flex-1">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos</SelectItem>
                              <SelectItem value="simple">Simples</SelectItem>
                              <SelectItem value="with_derivations">Com Variações</SelectItem>
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
                      setLocalFilterName('')
                      setLocalFilterNameOperator('cont')
                      setLocalFilterSku('')
                      setLocalFilterSkuOperator('cont')
                      setLocalFilterActive('all')
                      setLocalFilterActiveOperator('eq')
                      setLocalFilterType('all')
                      setLocalFilterTypeOperator('eq')
                      
                      setSortBy('createdAt')
                      setOrderBy('desc')
                      setFilterName('')
                      setFilterNameOperator('cont')
                      setFilterSku('')
                      setFilterSkuOperator('cont')
                      setFilterActive('all')
                      setFilterActiveOperator('eq')
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
                      setFilterSku(localFilterSku)
                      setFilterSkuOperator(localFilterSkuOperator)
                      setFilterActive(localFilterActive)
                      setFilterActiveOperator(localFilterActiveOperator)
                      setFilterType(localFilterType)
                      setFilterTypeOperator(localFilterTypeOperator)
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
            <Button variant={'ghost'} disabled={isLoading || isRefetching} onClick={() => { setSelected([]); refetch() }} size={'sm'}>
              {(isLoading || isRefetching) ? (<RefreshCw className='animate-spin size-[0.85rem]' />) : (<RefreshCw className="size-[0.85rem]" />)}
            </Button>

            {selected.length === 1 ? (
              selectedProduct?.type === 'with_derivations' ? (
                <DerivatedProductImagesSheet productId={selected[0]} />
              ) : (
                <SimpleProductImagesSheet productId={selected[0]} />
              )
            ) : (
              <Button variant={'outline'} disabled size={'sm'}>
                <ImageIcon className="size-[0.85rem]" /> Imagens
              </Button>
            )}

            {selected.length === 1 ? (
              selectedProduct?.type === 'with_derivations' ? (
                <DerivatedProductPricesSheet productId={selected[0]} />
              ) : (
                <SimpleProductPricesSheet productId={selected[0]} />
              )
            ) : (
              <Button variant={'outline'} disabled size={'sm'}>
                <BadgeDollarSign className="size-[0.85rem]" /> Preços
              </Button>
            )}

            {selected.length === 1 ? (
              <DeleteProductDialog productId={selected[0]} onDeleted={() => { setSelected([]); refetch() }} />
            ) : (
              <Button variant={'outline'} disabled size={'sm'}>
                <Trash className="size-[0.85rem]" /> Excluir
              </Button>
            )}

            {selected.length === 1 ? (
              <EditProductSheet productId={selected[0]} onSaved={() => { refetch() }} />
            ) : (
              <Button variant={'outline'} disabled size={'sm'}>
                <Edit className="size-[0.85rem]" /> Editar
              </Button>
            )}
            {selected.length === 1 && canManageChilds ? (
              <DerivatedProductsSheet productId={selected[0]} />
            ) : (
              <Button variant={'outline'} disabled size={'sm'}>
                <GitFork className="size-[0.85rem]" /> Derivações
              </Button>
            )}
            <NewProductSheet onCreated={(p) => { refetch(); if(p?.id) setCreatedProductId(p.id) }} />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={items}
          loading={isLoading || isRefetching}
          rowClassName='h-9'
          page={currentPage}
          perPage={perPage}
          totalItems={totalItems}
          emptyMessage='Nenhum produto encontrado'
          emptySlot={(
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Package className='h-6 w-6' />
                </EmptyMedia>
                <EmptyTitle>Nenhum produto ainda</EmptyTitle>
                <EmptyDescription>
                  Você ainda não cadastrou produtos. Comece criando seu primeiro produto.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <div className='flex gap-2'>
                  <NewProductSheet onCreated={(p) => { refetch(); if(p?.id) setCreatedProductId(p.id) }} />
                  <Button variant={'ghost'} size="sm" disabled={isLoading || isRefetching} onClick={() => { setSelected([]); refetch() }}>
                    {(isLoading || isRefetching) ? <RefreshCw className='animate-spin size-[0.85rem]' /> : <RefreshCw className="size-[0.85rem]" />}
                  </Button>
                </div>
              </EmptyContent>
            </Empty>
          )}
          onChange={({ page, perPage }) => { if (typeof page === 'number') setCurrentPage(page); if (typeof perPage === 'number') setPerPage(perPage); refetch() }}
        />
      </div>
      {createdProductId && (
        <EditProductSheet
          productId={createdProductId}
          open={true}
          onOpenChange={(open) => { if (!open) setCreatedProductId(null) }}
          trigger={null}
          onSaved={() => { refetch() }}
        />
      )}
    </div>
  )
}