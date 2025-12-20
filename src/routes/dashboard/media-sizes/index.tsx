import { createFileRoute } from '@tanstack/react-router'
import { Topbar } from '../-components/topbar'
import { Button } from '@/components/ui/button'
import { Edit, Funnel, RefreshCw, Trash, Scan } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { privateInstance } from '@/lib/auth'
import { DataTable, type ColumnDef } from '@/components/data-table'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'
import { NewMediaSizeSheet } from './-components/new-media-size'
import { EditMediaSizeSheet } from './-components/edit-media-size'
import { DeleteMediaSize } from './-components/delete-media-size'

export const Route = createFileRoute('/dashboard/media-sizes/')({
  component: RouteComponent,
})

type MediaSize = {
  id: number
  created_at: number
  updated_at: number
  name: string
  width: number
  height: number
  description?: string
  fit?: string
  quality?: number
  background?: string
  format?: string
  device?: string
}

type MediaSizesResponse = {
  itemsReceived?: number
  curPage?: number
  nextPage?: number | null
  prevPage?: number | null
  itemsTotal?: number
  pageTotal?: number
  items?: MediaSize[]
}

const fitTranslations: Record<string, string> = {
  'scale-down': 'Reduzir',
  contain: 'Conter',
  cover: 'Cobrir',
  crop: 'Cortar',
  pad: 'Preencher',
  squeeze: 'Esticar',
}

function RouteComponent() {
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [selectedItems, setSelectedItems] = useState<number[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const { data, isLoading, isRefetching, isError, refetch } = useQuery({
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryKey: ['media-sizes', currentPage, perPage],
    queryFn: async () => {
      const response = await privateInstance.get(`/api:jJaPcZVn/media_size?page=${currentPage}&per_page=${Math.min(50, perPage)}`)
      if (response.status !== 200) {
        throw new Error('Erro ao carregar tamanhos de mídia')
      }
      return response.data as MediaSizesResponse
    }
  })

  const [items, setItems] = useState<MediaSize[]>([])

  const columns: ColumnDef<MediaSize>[] = [
    {
      id: 'select',
      width: '60px',
      header: (
        <div className='flex justify-center items-center text-xs text-neutral-500'>Sel.</div>
      ),
      cell: (item) => (
        <div className='flex justify-center items-center'>
          <Checkbox
            checked={selectedItems.includes(item.id)}
            onCheckedChange={() => toggleSelectItem(item.id)}
          />
        </div>
      ),
      headerClassName: 'w-[60px] border-r',
      className: 'font-medium border-r p-2!'
    },
    {
      id: 'device',
      header: 'Dispositivo',
      cell: (item) => {
        const map: Record<string, string> = {
          desktop: 'Desktop',
          tablet: 'Tablet',
          mobile: 'Mobile',
          app: 'App'
        }
        return map[item.device ?? ''] ?? item.device ?? '—'
      },
      width: '100px',
      headerClassName: 'w-[100px] min-w-[100px] border-r',
      className: 'w-[100px] min-w-[100px] px-4 py-2!'
    },
    {
      id: 'name',
      header: 'Nome',
      cell: (item) => item.name,
      className: 'border-r px-4 py-2!'
    },
    {
      id: 'dimensions',
      header: 'Dimensões',
      cell: (item) => <div>{`${item.width} x ${item.height}`} <span className='text-xs'>px</span></div>,
      headerClassName: 'w-[150px] border-r',
      className: 'w-[150px] px-4 py-2!'
    },
    {
      id: 'fit',
      header: 'Ajuste',
      cell: (item) => fitTranslations[item.fit ?? ''] ?? item.fit ?? '—',
      width: '120px',
      headerClassName: 'w-[120px] min-w-[120px] border-r',
      className: 'w-[120px] min-w-[120px] px-4 py-2!'
    },
    {
      id: 'quality',
      header: 'Qualidade',
      cell: (item) => item.quality ?? '—',
      width: '100px',
      headerClassName: 'w-[100px] min-w-[100px] border-r',
      className: 'w-[100px] min-w-[100px] px-4 py-2!'
    },
    {
      id: 'background',
      header: 'Bg',
      cell: (item) => (
        <div className='flex items-center'>
          <div
            className='h-4 w-4 rounded border border-neutral-200'
            style={{ backgroundColor: item.background ?? 'transparent' }}
          />
        </div>
      ),
      width: '70px',
      headerClassName: 'w-[70px] min-w-[70px] border-r',
      className: 'w-[70px] min-w-[70px] px-4 py-2!'
    },
    {
      id: 'format',
      header: 'Formato',
      cell: (item) => item.format ?? '—',
      width: '120px',
      headerClassName: 'w-[120px] min-w-[120px] border-r',
      className: 'w-[120px] min-w-[120px] px-4 py-2!'
    },
  ]

  useEffect(() => {
    if (!data) return

    const items = Array.isArray(data.items) ? data.items : []
    setItems(items)

    const itemsTotal = typeof data.itemsTotal === 'number' ? data.itemsTotal : items.length
    setTotalItems(itemsTotal)

    const pageTotal = typeof data.pageTotal === 'number' ? data.pageTotal : Math.max(1, Math.ceil(itemsTotal / perPage))
    setTotalPages(pageTotal)
  }, [data, perPage])

  useEffect(() => {
    if (isError) {
      toast.error('Erro ao carregar tamanhos de mídia')
    }
  }, [isError])

  useEffect(() => {
    setSelectedItems([])
  }, [currentPage, perPage])

  useEffect(() => {
    if (isRefetching) {
      setSelectedItems([])
    }
  }, [isRefetching])

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])

  const toggleSelectItem = (itemId: number) => {
    if (selectedItems.includes(itemId)) {
      setSelectedItems([])
    } else {
      setSelectedItems([itemId])
    }
  }

  return (
    <div className='flex flex-col w-full h-full'>

      <Topbar title="Tamanhos de Mídias" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard', isLast: false }, { label: 'Tamanhos de Mídias', href: '/dashboard/media-sizes', isLast: true }]} />

      <div className='flex flex-col w-full h-full flex-1 overflow-hidden'>

        <div className='border-b flex w-full items-center p-2 gap-4'>

          <div className='flex items-center gap-2 flex-1'>
            <Button variant={'outline'} size="sm">
              <Funnel className="size-[0.85rem]" /> Filtros
            </Button>
          </div>

          <div className='flex items-center gap-2'>
            <Button variant={'ghost'} size="sm" disabled={isLoading || isRefetching} onClick={() => { setSelectedItems([]); refetch() }}>
              {
                (isLoading || isRefetching)
                  ? <RefreshCw className='animate-spin size-[0.85rem]' />
                  : <RefreshCw className="size-[0.85rem]" />
              }
            </Button>

            {selectedItems.length === 1 ? (
              <DeleteMediaSize mediaSizeId={selectedItems[0]} />
            ) : (
              <Button variant={'outline'} disabled size="sm">
                <Trash className="size-[0.85rem]" /> Excluir
              </Button>
            )}

            {selectedItems.length === 1 ? (
              <EditMediaSizeSheet mediaSizeId={selectedItems[0]} />
            ) : (
              <Button variant={'outline'} disabled size="sm">
                <Edit className="size-[0.85rem]" /> Editar
              </Button>
            )}
            <NewMediaSizeSheet />
          </div>

        </div>

        <DataTable
          columns={columns}
          data={items}
          loading={isLoading || isRefetching}
          page={currentPage}
          perPage={perPage}
          totalItems={totalItems}
          emptyMessage='Nenhum tamanho de mídia encontrado'
          emptySlot={(
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Scan className='h-6 w-6' />
                </EmptyMedia>
                <EmptyTitle>Nenhum tamanho de mídia</EmptyTitle>
                <EmptyDescription>
                  Você ainda não cadastrou nenhum tamanho de mídia.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <div className='flex gap-2'>
                  <NewMediaSizeSheet />
                  <Button variant={'ghost'} size="sm" disabled={isLoading || isRefetching} onClick={() => { setSelectedItems([]); refetch() }}>
                    {(isLoading || isRefetching) ? <RefreshCw className='animate-spin size-[0.85rem]' /> : <RefreshCw className="size-[0.85rem]" />}
                  </Button>
                </div>
              </EmptyContent>
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
