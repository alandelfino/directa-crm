import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { privateInstance } from '@/lib/auth'
import { Image as ImageIcon, ZoomIn, Package, AlertCircle, Info, X, ExternalLink, Plus, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { MediaSelectorDialog, type ApiMedia } from '../../media/-components/media-selector-dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog'

type ChildProduct = {
  id: number
  product_id: number
  sku?: string
  name?: string
  active?: boolean
}

type ChildsResponse = {
  items?: ChildProduct[]
} | ChildProduct[]

type ImageItem = {
  media_id: number
  name: string
  url: string
  original_url: string
}

type ImagesResponse = {
  items?: ImageItem[]
} | ImageItem[]

function normalizeChilds(data: ChildsResponse) {
  if (Array.isArray(data)) return { items: data }
  return { items: Array.isArray(data.items) ? data.items : [] }
}

function normalizeImages(data: ImagesResponse) {
  if (Array.isArray(data)) return { items: data }
  return { items: Array.isArray(data.items) ? data.items : [] }
}

function ImageThumbnail({ img }: { img: ImageItem }) {
  const imageUrl = img.url
  const zoomUrl = img.original_url

  if (!imageUrl) return null

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg border bg-muted transition-all hover:border-primary/50 hover:shadow-md">
          <img
            src={imageUrl}
            alt={img.name ?? 'Imagem do produto'}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <ZoomIn className="h-6 w-6 text-white drop-shadow-md" />
          </div>
        </div>
      </DialogTrigger>
      <DialogContent showCloseButton={false} className="max-w-[95vw] max-h-[95vh] w-fit h-fit border-none bg-transparent p-0 shadow-none overflow-visible">
        <DialogHeader className="sr-only">
          <DialogTitle>Visualização da imagem</DialogTitle>
          <DialogDescription>Imagem ampliada do produto: {img.name}</DialogDescription>
        </DialogHeader>

        <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-lg bg-neutral-950 shadow-2xl ring-1 ring-white/10 group/modal">
          <div className="relative flex items-center justify-center bg-neutral-900/50">
            <img
              src={zoomUrl}
              alt={img.name ?? 'Imagem do produto'}
              className="max-h-[85vh] max-w-[90vw] object-contain"
            />
          </div>

          {/* Controls Overlay */}
          <div className="absolute inset-0 flex flex-col justify-between p-4 opacity-0 transition-opacity duration-300 group-hover/modal:opacity-100 pointer-events-none">
            <div className="flex justify-end pointer-events-auto">
              <DialogClose className="rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors backdrop-blur-sm">
                <X className="h-5 w-5" />
                <span className="sr-only">Fechar</span>
              </DialogClose>
            </div>

            <div className="flex items-end justify-between gap-4 pointer-events-auto">
              <div className="rounded-lg bg-black/50 px-3 py-2 text-sm text-white backdrop-blur-sm">
                {img.name ?? 'Imagem sem nome'}
              </div>

              <div className="flex gap-2">
                <Button size="icon" variant="secondary" className="h-9 w-9 rounded-full bg-white/90 text-black hover:bg-white shadow-lg" asChild>
                  <a href={zoomUrl} target="_blank" rel="noopener noreferrer" title="Abrir original">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function DerivationImages({ derivation }: { derivation: ChildProduct }) {
  const queryClient = useQueryClient()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['derivation-images', derivation.id],
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await privateInstance.get(`/api:DqAmjbHy/derivated_product_images/${derivation.id}`)
      if (response.status !== 200) throw new Error('Erro ao carregar imagens')
      return response.data as ImagesResponse
    }
  })

  type QueueItem = {
    media: ApiMedia
    status: 'idle' | 'processing' | 'success' | 'error'
    errorMessage?: string
  }

  const [uploadQueue, setUploadQueue] = useState<QueueItem[]>([])
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const processQueue = async (initialQueue: QueueItem[]) => {
    setIsProcessing(true)
    for (let i = 0; i < initialQueue.length; i++) {
      setUploadQueue(prev => {
        const next = [...prev]
        if (next[i]) next[i] = { ...next[i], status: 'processing' }
        return next
      })

      try {
        await privateInstance.post('/api:DqAmjbHy/derivated_product_images', {
          derivated_product_id: derivation.id,
          media_id: initialQueue[i].media.id
        })
        setUploadQueue(prev => {
          const next = [...prev]
          if (next[i]) next[i] = { ...next[i], status: 'success' }
          return next
        })
      } catch (e: any) {
        const title = e?.response?.data?.message || 'Erro ao vincular'
        setUploadQueue(prev => {
          const next = [...prev]
          if (next[i]) next[i] = { ...next[i], status: 'error', errorMessage: title }
          return next
        })
      }
    }
    setIsProcessing(false)
    queryClient.invalidateQueries({ queryKey: ['derivation-images', derivation.id] })
  }

  const handleSelect = (medias: ApiMedia[]) => {
    if (medias.length === 0) return
    const queue = medias.map(m => ({ media: m, status: 'idle' } as QueueItem))
    setUploadQueue(queue)
    setIsUploadDialogOpen(true)
    processQueue(queue)
  }

  const images = data ? normalizeImages(data).items : []

  return (
    <Card className="overflow-hidden border-neutral-200 shadow-sm transition-all hover:shadow-md dark:border-neutral-800">
      <CardHeader className="flex flex-row items-center gap-2 bg-neutral-50/50 px-3 py-2 dark:bg-neutral-900/50">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Package className="h-3 w-3" />
        </div>
        <div className="flex flex-col min-w-0">
          <CardTitle className="text-sm font-semibold text-foreground truncate" title={derivation.name}>
            {derivation.name || 'Variação sem nome'}
          </CardTitle>
          {derivation.sku && (
            <span className="text-[10px] text-muted-foreground font-mono truncate" title={derivation.sku}>SKU: {derivation.sku}</span>
          )}
        </div>
        <div className="ml-auto">
          <MediaSelectorDialog
            multiple={true}
            trigger={
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary">
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Plus className="h-4 w-4" />}
                <span className="sr-only">Adicionar imagens</span>
              </Button>
            }
            onSelect={handleSelect}
          />
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="p-3">
        {isLoading ? (
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="aspect-square w-full rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-4 text-center animate-in fade-in-50">
            <div className="mb-2 rounded-full bg-destructive/10 p-1.5 text-destructive">
              <AlertCircle className="h-4 w-4" />
            </div>
            <p className="text-xs font-medium text-destructive">Falha ao carregar</p>
          </div>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4 text-center text-muted-foreground animate-in fade-in-50">
            <div className="mb-1.5 rounded-full bg-muted p-2">
              <ImageIcon className="h-5 w-5 opacity-40" />
            </div>
            <p className="text-[10px] font-medium">Sem imagens</p>
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-2 animate-in fade-in-50">
            {images.map((img) => (
              <ImageThumbnail key={img.media_id} img={img} />
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Vinculando Imagens</DialogTitle>
            <DialogDescription>
              {isProcessing ? 'Aguarde enquanto as imagens são vinculadas...' : 'Processo finalizado.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-2 max-h-[60vh] overflow-y-auto py-2">
            {uploadQueue.map((item, idx) => (
              <div key={idx} className="relative aspect-square rounded-md overflow-hidden border bg-muted" title={item.errorMessage}>
                {item.media.url ? (
                   <img src={item.media.url} alt="preview" className="w-full h-full object-cover" />
                ) : (
                   <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="w-6 h-6" />
                   </div>
                )}
                
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  {item.status === 'processing' && <Loader2 className="animate-spin text-white w-6 h-6" />}
                  {item.status === 'success' && <CheckCircle className="text-green-500 w-6 h-6 bg-white rounded-full" />}
                  {item.status === 'error' && <XCircle className="text-red-500 w-6 h-6 bg-white rounded-full" />}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
             <Button onClick={() => setIsUploadDialogOpen(false)} disabled={isProcessing}>
                {isProcessing ? 'Processando...' : 'Concluir'}
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export function ProductImagesSheet({ productId }: { productId: number }) {
  const [open, setOpen] = useState(false)

  const { data: derivationsData, isLoading: isLoadingDerivations } = useQuery({
    queryKey: ['product-derivations', productId],
    enabled: open,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await privateInstance.get(`/api:d9ly3uzj/derivated_products?product_id=${productId}`)
      if (response.status !== 200) throw new Error('Erro ao carregar derivações')
      return response.data as ChildsResponse
    }
  })

  const derivations = derivationsData ? normalizeChilds(derivationsData).items : []

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant={'outline'} size={'sm'} className="gap-2">
          <ImageIcon className="size-[0.85rem]" />
          Imagens
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col h-full sm:max-w-[600px] p-0 gap-0 bg-background/95 backdrop-blur-sm">
        <div className="px-4 py-3 border-b">
          <SheetHeader className="space-y-1">
            <SheetTitle className="text-base font-semibold">Imagens das Variações</SheetTitle>
            <SheetDescription className="flex items-center gap-1.5 text-xs">
              <Info className="size-3.5 shrink-0" />
              Visualize as imagens cadastradas para cada variação.
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 flex flex-col gap-6">
            {isLoadingDerivations ? (
              <div className="flex flex-col gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-xl border p-4 space-y-4">
                    <div className="flex items-center gap-4">
                      <Skeleton className="size-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-3">
                      {[1, 2, 3, 4, 5].map((j) => (
                        <Skeleton key={j} className="aspect-square rounded-lg" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : derivations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Package className="size-8 opacity-50" />
                </div>
                <h3 className="font-medium text-lg mb-1">Sem variações</h3>
                <p className="text-sm max-w-[250px]">Este produto não possui variações cadastradas ou disponíveis.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-6 pb-6">
                {derivations.map((d) => (
                  <DerivationImages key={d.id} derivation={d} />
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
