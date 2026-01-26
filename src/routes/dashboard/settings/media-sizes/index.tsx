import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Edit, RefreshCw, Trash, Scan, ArrowUpRight } from 'lucide-react'
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

export const Route = createFileRoute('/dashboard/settings/media-sizes/')({
  component: RouteComponent,
})

type MediaSize = {
  id: number
  name: string
  width: number
  height: number
  fit: string
  quality: number
  description: string
  background: string
  format: string
  device: string
  createdAt: string
  updatedAt: string
}

type MediaSizesResponse = {
  page: number
  limit: number
  totalPages: number
  total: number
  items: MediaSize[]
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

  const { data, isLoading, isRefetching, isError, error, refetch } = useQuery({
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryKey: ['media-sizes', currentPage, perPage],
    queryFn: async () => {
      const response = await privateInstance.get(`/tenant/media-sizes`, {
        params: {
          page: currentPage,
          limit: Math.min(100, perPage),
          sortBy: 'createdAt',
          orderBy: 'desc'
        }
      })
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
      headerClassName: 'w-[60px] min-w-[60px] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[60px] min-w-[60px] border-r border-neutral-200 !px-4 py-3'
    },
    {
      id: 'device',
      header: 'Dispositivo',
      cell: (item) => {
        const map: Record<string, string> = {
          desktop: 'Desktop',
          tablet: 'Tablet',
          mobile: 'Celular',
          mobile_app: 'Aplicativo',
        }
        return map[item.device ?? ''] ?? item.device ?? '—'
      },
      width: '100px',
      headerClassName: 'w-[100px] min-w-[100px] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[100px] min-w-[100px] border-r border-neutral-200 !px-4 py-3'
    },
    {
      id: 'name',
      header: 'Nome',
      cell: (item) => (
        <div className="flex items-center gap-2">
          <span>{item.name}</span>
        </div>
      ),
      headerClassName: 'border-r border-neutral-200 px-4 py-2.5',
      className: 'border-r border-neutral-200 !px-4 py-3'
    },
    {
      id: 'dimensions',
      header: 'Dimensões',
      cell: (item) => <div>{`${item.width} x ${item.height}`} <span className="text-xs">px</span></div>,
      headerClassName: 'w-[150px] min-w-[150px] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[150px] min-w-[150px] border-r border-neutral-200 !px-4 py-3'
    },
    {
      id: 'fit',
      header: 'Ajuste',
      cell: (item) => fitTranslations[item.fit ?? ''] ?? item.fit ?? '—',
      width: '120px',
      headerClassName: 'w-[120px] min-w-[120px] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[120px] min-w-[120px] border-r border-neutral-200 !px-4 py-3'
    },
    {
      id: 'quality',
      header: 'Qualidade',
      cell: (item) => item.quality ?? '—',
      width: '100px',
      headerClassName: 'w-[100px] min-w-[100px] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[100px] min-w-[100px] border-r border-neutral-200 !px-4 py-3'
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
      headerClassName: 'w-[70px] min-w-[70px] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[70px] min-w-[70px] border-r border-neutral-200 !px-4 py-3'
    },
    {
      id: 'format',
      header: 'Formato',
      cell: (item) => item.format ?? '—',
      width: '120px',
      headerClassName: 'w-[120px] min-w-[120px] border-r border-neutral-200 px-4 py-2.5',
      className: 'w-[120px] min-w-[120px] border-r border-neutral-200 !px-4 py-3'
    },
  ]

  useEffect(() => {
    if (!data) return

    const items = Array.isArray(data.items) ? data.items : []
    setItems(items)

    const itemsTotal = typeof data.total === 'number' ? data.total : items.length
    setTotalItems(itemsTotal)

    const pageTotal = typeof data.totalPages === 'number' ? data.totalPages : Math.max(1, Math.ceil(itemsTotal / perPage))
    setTotalPages(pageTotal)
  }, [data, perPage])

  useEffect(() => {
    if (isError) {
      const errorData = (error as any)?.response?.data
      toast.error(errorData?.title || 'Erro ao carregar tamanhos de mídia', {
        description: errorData?.detail || 'Não foi possível carregar a lista de tamanhos de mídia.'
      })
    }
  }, [isError, error])

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
      <div className='flex items-center justify-between p-4'>
        <div className='flex flex-col'>
          <h2 className='text-lg font-semibold'>Tamanhos de Mídias</h2>
          <p className='text-sm text-muted-foreground'>Gerencie os tamanhos de mídias da conta.</p>
        </div>
        <div className='flex items-center gap-2'>
          <Button variant={'ghost'} disabled={isLoading || isRefetching} onClick={() => { setSelectedItems([]); refetch() }}>
            {(isLoading || isRefetching) ? (<RefreshCw className='animate-spin' />) : (<RefreshCw />)}
          </Button>

          {selectedItems.length === 1 ? (
            <DeleteMediaSize mediaSizeId={selectedItems[0]} />
          ) : (
            <Button variant={'outline'} disabled>
              <Trash /> Excluir
            </Button>
          )}

          {selectedItems.length === 1 ? (
            <EditMediaSizeSheet mediaSizeId={selectedItems[0]} />
          ) : (
            <Button variant={'outline'} disabled>
              <Edit /> Editar
            </Button>
          )}
          <NewMediaSizeSheet />
        </div>
      </div>

      <div className='flex flex-col w-full h-full flex-1 overflow-hidden pl-4'>
        <div className='border-t border-l border-neutral-200 rounded-tl-lg overflow-hidden h-full flex flex-col flex-1'>
          <DataTable
            columns={columns}
            data={items}
            loading={isLoading || isRefetching}
            skeletonCount={3}
            page={currentPage}
            perPage={perPage}
            totalItems={totalItems}
            rowClassName='h-12'
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
                    <Button variant={'ghost'} size='sm' disabled={isLoading || isRefetching} onClick={() => { setSelectedItems([]); refetch() }}>
                      {(isLoading || isRefetching) ? <RefreshCw className='animate-spin size-[0.85rem]' /> : <RefreshCw className='size-[0.85rem]' />}
                    </Button>
                  </div>
                </EmptyContent>
                <Button variant='link' asChild className='text-muted-foreground'>
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
    </div>
  )
}
