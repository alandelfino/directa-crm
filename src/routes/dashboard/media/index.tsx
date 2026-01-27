import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { privateInstance } from '@/lib/auth'
import { Topbar } from '../-components/topbar'
import { Button } from '@/components/ui/button'
import { Images, RefreshCw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Edit, Trash } from 'lucide-react'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { EditMediaDialog } from './-components/edit-media-dialog'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'
import { MultiUploadSheet } from './-components/multi-upload-sheet'
import { BulkDeleteMediasSheet } from './-components/delete-media-sheet'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/dashboard/media/')({
  component: RouteComponent,
})

export type MediaItem = {
  id: number
  name: string
  fileName: string
  uuid: string
  size: number
  mime: string
  key: string
  url: string
  createdAt: string
  updatedAt: string
}

function RouteComponent() {
  const [selected, setSelected] = useState<MediaItem | null>(null)
  const [page, setPage] = useState<number>(1)
  const [perPage, setPerPage] = useState<number>(20)
  const [selectedIds, setSelectedIds] = useState<(number)[]>([])
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['medias', page, perPage],
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryFn: async () => {
      const res = await privateInstance.get(`/tenant/medias`, {
        params: {
          page,
          limit: Math.min(100, perPage),
          sortBy: 'createdAt',
          orderBy: 'desc'
        }
      })
      if (res.status !== 200) throw new Error('Erro ao carregar mídias')
      return res.data
    },
  })

  const payload = useMemo(() => {
    const d: any = data
    if (!d) {
      return {
        items: [] as MediaItem[],
        page: 1,
        limit: 20,
        totalPages: 1,
        total: 0,
      }
    }
    
    return {
      items: (d.items || []) as MediaItem[],
      page: d.page || 1,
      limit: d.limit || 20,
      totalPages: d.totalPages || 1,
      total: d.total || 0,
    }
  }, [data])

  const medias: MediaItem[] = payload.items

  const isSelected = (id: number) => selectedIds.includes(id)
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  const handleBulkEdit = () => {
    if (selectedIds.length !== 1) return
    const media = medias.find((m) => m.id === selectedIds[0]) || null
    if (media) setSelected(media)
  }

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return
    setBulkDeleteOpen(true)
  }

  const formatBytes = (bytes?: number | null) => {
    if (!bytes || typeof bytes !== 'number' || bytes < 0) return '—'
    const kb = bytes / 1024
    if (kb < 1024) return `${Math.round(kb)} KB`
    const mb = kb / 1024
    if (mb < 1024) return `${mb.toFixed(1)} MB`
    const gb = mb / 1024
    return `${gb.toFixed(2)} GB`
  }

  const getExtension = (name?: string | null, mime?: string | null) => {
    const fromName = typeof name === 'string' && name.includes('.') ? name.split('.').pop() : null
    if (fromName) return (fromName ?? '').toUpperCase()
    const fromMime = typeof mime === 'string' && mime.includes('/') ? mime.split('/').pop() : null
    return fromMime ? (fromMime ?? '').toUpperCase() : '—'
  }



  return (
    <div className='flex flex-col w-full h-full'>
      <Topbar title="Midias" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard', isLast: false }, { label: 'Midias', href: '/dashboard/media', isLast: true }]} />

      {/* Content */}
      <div className='flex flex-col w-full h-full flex-1 overflow-hidden'>

        {/* Actions */}
        <div className='border-b flex w-full items-center p-2 gap-4'>

          <div className='flex items-center gap-2 flex-1' />

          <div className='flex items-center gap-2'>
            <Button variant={'ghost'} disabled={isLoading || isRefetching} onClick={() => refetch()} size={'sm'}>
              {(isLoading || isRefetching) ? <RefreshCw className='animate-spin size-[0.85rem]' /> : <RefreshCw className="size-[0.85rem]" />}
            </Button>
            <Button variant={'outline'} onClick={handleBulkEdit} disabled={selectedIds.length !== 1} size={'sm'}>
              <Edit className='size-[0.85rem]' /> Editar
            </Button>
            <Button variant={'outline'} onClick={handleBulkDelete} disabled={selectedIds.length === 0} size={'sm'}>
              <Trash className='size-[0.85rem]' /> Excluir
            </Button>
            <MultiUploadSheet />
          </div>

        </div>

        {/* Grid de arquivos */}
        <div className='flex-1 overflow-auto p-4'>
          {isLoading || isRefetching ? (
            <div className='grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-4'>
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-transparent p-1 bg-background">
                  <Skeleton className="aspect-square w-full rounded-lg bg-muted" />
                  <div className="p-2 space-y-2">
                    <Skeleton className="h-3 w-full bg-muted" />
                    <Skeleton className="h-3 w-1/2 bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : medias.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Images className='h-6 w-6' />
                </EmptyMedia>
                <EmptyTitle>Nenhuma mídia ainda</EmptyTitle>
                <EmptyDescription>
                  Você ainda não adicionou nenhuma mídia. Faça upload da sua primeira mídia.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <div className='flex gap-2'>
                  <MultiUploadSheet />
                  <Button variant={'ghost'} disabled={isLoading || isRefetching} onClick={() => refetch()} size="sm">
                    {(isLoading || isRefetching) ? <RefreshCw className='animate-spin size-[0.85rem]' /> : <RefreshCw className="size-[0.85rem]" />}
                  </Button>
                </div>
              </EmptyContent>
            </Empty>
          ) : (
            <div className='grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-4'>
              {medias.map((m) => (
                <div key={m.id} className={`group relative rounded-lg border border-transparent p-1 bg-background hover:bg-neutral-100 transition-shadow overflow-hidden ${isSelected(m.id) ? 'ring-2 ring-primary' : ''}`}>
                  <div className='aspect-square w-full bg-muted flex items-center justify-center'>
                    {m.url ? (
                      <img src={m.url} alt={m.name ?? 'media'} className='object-cover w-full h-full rounded-lg' />
                    ) : (
                      <div className='flex flex-col items-center justify-center text-muted-foreground'>
                        <Images className='w-10 h-10' />
                        <span className='text-xs mt-2'>Sem imagem</span>
                      </div>
                    )}
                    <div className='absolute top-2 left-2'>
                      <Checkbox checked={isSelected(m.id)} onCheckedChange={() => toggleSelect(m.id)} aria-label='Selecionar mídia' className='bg-background' />
                    </div>
                  </div>
                  <div className='p-2 flex items-center justify-between gap-2'>
                    <div className='flex-1 min-w-0'>
                      <div className='text-xs font-medium truncate' title={m.name ?? ''}>{m.name ?? 'Mídia'}</div>
                      <div className='mt-1 text-xs 2xl:text-sm text-muted-foreground'>
                        <span>{m.mime ?? getExtension(m.name, null)}</span>
                        <span> • {formatBytes(m.size ?? null)}</span>
                      </div>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer de paginação (estilo Brands) */}
        {(() => {
          const totalItems = payload.total
          const totalPages = payload.totalPages
          const startIndex = totalItems > 0 ? (payload.page - 1) * perPage : 0
          const endIndex = totalItems > 0 ? Math.min(startIndex + medias.length, startIndex + perPage, totalItems) : 0

          return (
            <div className='border-t h-12 w-full p-2 flex items-center'>
              <span className='text-sm'>
                Mostrando do {totalItems > 0 ? startIndex + 1 : 0} ao {endIndex} de {totalItems} itens.
              </span>

              <div className='flex items-center gap-2 flex-1 justify-end'>
                <span className='text-sm'>Itens por página</span>
                <Select value={perPage.toString()} onValueChange={(v) => { const next = parseInt(v); if (!Number.isNaN(next)) { setPage(1); setPerPage(next) } }}>
                  <SelectTrigger className='w-[90px]'>
                    <SelectValue placeholder={perPage.toString()} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value='20'>20</SelectItem>
                      <SelectItem value='30'>30</SelectItem>
                      <SelectItem value='50'>50</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>

                <Separator orientation='vertical' />

                <span className='text-sm'>Página {payload.page} de {totalPages}</span>

                <Separator orientation='vertical' />

                <Button variant={'outline'} size={'sm'} onClick={() => setPage(1)} disabled={payload.page === 1}>
                  <ChevronsLeft className="size-[0.85rem]" />
                </Button>
                <Button variant={'outline'} size={'sm'} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={payload.page === 1}>
                  <ChevronLeft className="size-[0.85rem]" />
                </Button>
                <Button variant={'outline'} size={'sm'} onClick={() => setPage((p) => p + 1)} disabled={payload.page >= totalPages}>
                  <ChevronRight className="size-[0.85rem]" />
                </Button>
                <Button variant={'outline'} size={'sm'} onClick={() => setPage(totalPages)} disabled={payload.page >= totalPages}>
                  <ChevronsRight className="size-[0.85rem]" />
                </Button>
              </div>
            </div>
          )
        })()}

        {/* Dialog de edição / detalhes */}
        <EditMediaDialog media={selected} onClose={() => setSelected(null)} onSaved={() => refetch()} />
        <BulkDeleteMediasSheet open={bulkDeleteOpen} onOpenChange={(v) => { setBulkDeleteOpen(v); if (!v) { setSelectedIds([]) } }} ids={selectedIds} onDeleted={() => { setSelectedIds([]); refetch() }} />

      </div>
    </div>
  )
}