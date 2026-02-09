import { createFileRoute } from '@tanstack/react-router'
import { Topbar } from '../-components/topbar'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Edit, Trash, Package, GitFork, RefreshCw, BadgeDollarSign, Image as ImageIcon } from 'lucide-react'
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
import { ChildProductsSheet } from './-components/child-products'
import { DerivatedProductPricesSheet } from './-components/derivated-product-prices/derivated-product-prices-sheet'
import { SimpleProductPricesSheet } from './-components/simple-product-prices/simple-product-prices-sheet'
import { ProductImagesSheet as DerivatedProductImagesSheet } from './-components/derivated-product-images-sheet'
import { ProductImagesSheet as SimpleProductImagesSheet } from './-components/product-images-sheet'

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
  const [sortBy] = useState('createdAt')
  const [orderBy] = useState('desc')

  const [filterName] = useState('')
  const [filterNameOperator] = useState('cont')
  const [filterSku] = useState('')
  const [filterSkuOperator] = useState('cont')
  const [filterActive] = useState('all')
  const [filterActiveOperator] = useState('eq')
  const [filterType] = useState('all')
  const [filterTypeOperator] = useState('eq')

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
        <div className='border-b flex w-full items-center p-2 gap-4 max-w-full overflow-hidden justify-end'>
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
              <ChildProductsSheet productId={selected[0]} />
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