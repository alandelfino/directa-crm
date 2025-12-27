import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { privateInstance } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Images, RefreshCw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Edit, Trash, Check } from 'lucide-react'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { EditMediaDialog } from './edit-media-dialog'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'
import { MultiUploadSheet } from './multi-upload-sheet'
import { BulkDeleteMediasSheet } from './delete-media-sheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export type ApiMedia = {
  id: number | string
  name?: string
  url?: string | null
  mime?: string | null
  size?: number | null
  created_at?: number | string
  updated_at?: number | string
}

type MediaSelectorDialogProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSelect?: (medias: ApiMedia[]) => void
  multiple?: boolean
  trigger?: React.ReactNode
}

export function MediaSelectorDialog({ open: controlledOpen, onOpenChange: setControlledOpen, onSelect, multiple = false, trigger }: MediaSelectorDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = (value: boolean) => {
    if (!value) setSelectedIds([])
    if (setControlledOpen) setControlledOpen(value)
    else setInternalOpen(value)
  }

  const [selected, setSelected] = useState<ApiMedia | null>(null)
  const [page, setPage] = useState<number>(1)
  const [perPage, setPerPage] = useState<number>(20)
  const [selectedIds, setSelectedIds] = useState<(number | string)[]>([])
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['medias', page, perPage],
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: open,
    queryFn: async () => {
      const res = await privateInstance.get(`/api:qSTOvw0A/medias?page=${page}&per_page=${Math.min(50, perPage)}`)
      if (res.status !== 200) throw new Error('Erro ao carregar mídias')
      return res.data
    },
  })

  const payload = useMemo(() => {
    const d: any = data
    if (!d) {
      return {
        items: [] as ApiMedia[],
        curPage: page,
        pageTotal: 1,
        itemsTotal: 0,
        perPage,
        nextPage: null as number | null,
        prevPage: null as number | null,
      }
    }
    
    const isNewStructure = 'itemsReceived' in d || 'itemsTotal' in d

    if (isNewStructure) {
      const rawItems = Array.isArray(d.items) ? d.items : []
      const items: ApiMedia[] = rawItems.map((it: any) => ({
        id: it.uuid ?? it.id,
        name: it.file_name ?? it.name,
        url: it.url ?? it?.image?.url,
        mime: it.mime_type ?? it.mime,
        size: it.file_size ?? it.size,
        created_at: it.created_at,
        updated_at: it.updated_at
      }))

      const curPage = typeof d.curPage === 'number' ? d.curPage : page
      const pageTotal = typeof d.pageTotal === 'number' ? d.pageTotal : 1
      const itemsTotal = typeof d.itemsTotal === 'number' ? d.itemsTotal : items.length
      const perPageVal = typeof d.perPage === 'number' ? d.perPage : perPage
      const nextPage = typeof d.nextPage === 'number' ? d.nextPage : null
      const prevPage = typeof d.prevPage === 'number' ? d.prevPage : null

      return { items, curPage, pageTotal, itemsTotal, perPage: perPageVal, nextPage, prevPage }
    }

    const mediasObj = d.medias ?? d
    const rawItems: any[] = Array.isArray(mediasObj?.items)
      ? (mediasObj.items as any[])
      : (Array.isArray(d) ? (d as any[]) : [])
    const items: ApiMedia[] = rawItems.map((it) => {
      const img = it?.image ?? {}
      const mime = it?.mime ?? img?.mime ?? img?.type ?? img?.content_type ?? img?.mimetype ?? null
      const size = it?.size ?? img?.size ?? img?.bytes ?? null
      const url = it.url ?? img?.url
      return { ...it, mime, size, url }
    })
    const curPage = typeof mediasObj?.curPage === 'number' ? mediasObj.curPage : page
    const pageTotal = typeof mediasObj?.pageTotal === 'number' ? mediasObj.pageTotal : 1
    const itemsTotal = typeof mediasObj?.itemsTotal === 'number' ? mediasObj.itemsTotal : items.length
    const perPageVal = typeof mediasObj?.perPage === 'number' ? mediasObj.perPage : perPage
    const nextPage = typeof mediasObj?.nextPage === 'number' ? mediasObj.nextPage : (curPage < pageTotal ? curPage + 1 : null)
    const prevPage = typeof mediasObj?.prevPage === 'number' ? mediasObj.prevPage : (curPage > 1 ? curPage - 1 : null)
    return { items, curPage, pageTotal, itemsTotal, perPage: perPageVal, nextPage, prevPage }
  }, [data, page, perPage])

  const medias: ApiMedia[] = payload.items

  const isSelected = (id: number | string) => selectedIds.includes(id)
  
  const toggleSelect = (id: number | string) => {
    if (multiple) {
      setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
    } else {
      setSelectedIds((prev) => prev.includes(id) ? [] : [id])
    }
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

  const handleConfirmSelection = () => {
    const selectedMedias = medias.filter(m => selectedIds.includes(m.id))
    onSelect?.(selectedMedias)
    setOpen(false)
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
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="flex flex-col h-[calc(100vh-20px)] w-[calc(100vw-20px)] max-w-[calc(100vw-20px)] min-w-[calc(100vw-20px)] overflow-hidden p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Galeria de Mídias</DialogTitle>
        </DialogHeader>

        {/* Content */}
        <div className='flex flex-col w-full h-full flex-1 overflow-hidden'>
          {/* Actions */}
          <div className='border-b flex w-full items-center p-2 gap-4 bg-muted/20'>
            <div className='flex items-center gap-2 flex-1'>
               {onSelect && (
                 <Button onClick={handleConfirmSelection} disabled={selectedIds.length === 0} size="sm" className="gap-2">
                    <Check className="size-4" />
                    Selecionar {selectedIds.length > 0 && `(${selectedIds.length})`}
                 </Button>
               )}
            </div>

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
          <div className='flex-1 overflow-auto p-4 bg-muted/10'>
            {medias.length === 0 ? (
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
                  <div 
                    key={m.id} 
                    className={cn(
                      "group relative rounded-lg border border-transparent p-1 bg-background hover:bg-neutral-100 transition-all overflow-hidden",
                      isSelected(m.id) ? 'ring-2 ring-primary border-primary shadow-sm' : 'hover:shadow-sm'
                    )}
                  >
                    <div className='aspect-square w-full bg-muted flex items-center justify-center rounded-md overflow-hidden'>
                      {m.url ? (
                        <img src={m.url} alt={m.name ?? 'media'} className='object-cover w-full h-full' />
                      ) : (
                        <div className='flex flex-col items-center justify-center text-muted-foreground'>
                          <Images className='w-10 h-10' />
                          <span className='text-xs mt-2'>Sem imagem</span>
                        </div>
                      )}
                      <div className='absolute top-2 left-2'>
                        <Checkbox 
                          checked={isSelected(m.id)} 
                          onCheckedChange={() => toggleSelect(m.id)} 
                          aria-label='Selecionar mídia' 
                          className='bg-background' 
                        />
                      </div>
                    </div>
                    <div className='p-2 flex items-center justify-between gap-2'>
                      <div className='flex-1 min-w-0'>
                        <div className='text-xs font-medium truncate' title={m.name ?? ''}>{m.name ?? 'Mídia'}</div>
                        <div className='mt-1 text-xs text-muted-foreground'>
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

          {/* Footer de paginação */}
          {(() => {
            const totalItems = payload.itemsTotal ?? medias.length
            const totalPages = Math.max(1, payload.pageTotal ?? Math.ceil(totalItems / Math.max(perPage, 1)))
            const startIndex = totalItems > 0 ? (payload.curPage - 1) * perPage : 0
            const endIndex = totalItems > 0 ? Math.min(startIndex + medias.length, startIndex + perPage, totalItems) : 0

            return (
              <div className='border-t h-12 w-full p-2 flex items-center bg-background'>
                <span className='text-sm text-muted-foreground ml-2'>
                  {totalItems > 0 ? `${startIndex + 1}-${endIndex} de ${totalItems}` : '0 itens'}
                </span>

                <div className='flex items-center gap-2 flex-1 justify-end'>
                  <Select value={perPage.toString()} onValueChange={(v) => { const next = parseInt(v); if (!Number.isNaN(next)) { setPage(1); setPerPage(next) } }}>
                    <SelectTrigger className='w-[70px] h-8 text-xs'>
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

                  <Separator orientation='vertical' className="h-4" />

                  <span className='text-xs text-muted-foreground'>Pág. {payload.curPage}/{totalPages}</span>

                  <Separator orientation='vertical' className="h-4" />

                  <div className="flex gap-1">
                    <Button variant={'outline'} size={'icon'} className="h-8 w-8" onClick={() => setPage(1)} disabled={payload.curPage === 1}>
                      <ChevronsLeft className="size-3" />
                    </Button>
                    <Button variant={'outline'} size={'icon'} className="h-8 w-8" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={payload.curPage === 1}>
                      <ChevronLeft className="size-3" />
                    </Button>
                    <Button variant={'outline'} size={'icon'} className="h-8 w-8" onClick={() => setPage((p) => p + 1)} disabled={payload.curPage >= totalPages}>
                      <ChevronRight className="size-3" />
                    </Button>
                    <Button variant={'outline'} size={'icon'} className="h-8 w-8" onClick={() => setPage(totalPages)} disabled={payload.curPage >= totalPages}>
                      <ChevronsRight className="size-3" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })()}

          <EditMediaDialog media={selected} onClose={() => setSelected(null)} onSaved={() => refetch()} />
          <BulkDeleteMediasSheet open={bulkDeleteOpen} onOpenChange={(v) => { setBulkDeleteOpen(v); if (!v) { setSelectedIds([]) } }} ids={selectedIds} onDeleted={() => { setSelectedIds([]); refetch() }} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
