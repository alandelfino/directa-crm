import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { privateInstance } from '@/lib/auth'
import { Image as ImageIcon, ZoomIn, Package, AlertCircle, Info, X, ExternalLink, Plus, Loader2, Trash2, Search, GripVertical } from 'lucide-react'
import { MediaSelectorDialog } from '../../media/-components/media-selector-dialog'
import type { MediaItem } from '../../media/index'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { toast } from 'sonner'

type DerivatedProduct = {
  id: number
  productId: number
  sku?: string
  name?: string
  active?: boolean
}

type DerivatedProductsResponse = {
  items: DerivatedProduct[]
}

function normalizeDerivatedProducts(data: any): { items: DerivatedProduct[] } {
  if (Array.isArray(data)) return { items: data }
  if (data && Array.isArray(data.items)) return { items: data.items }
  return { items: [] }
}

type ImageItem = {
  id: number
  media_id: number
  name: string
  url: string
  original_url: string
}

type APIImageItem = {
  id: number
  productId: number
  derivatedProductId: number
  mediaId: number
  url?: string
  media?: {
    url: string
    name?: string
  }
}

type ImagesResponse = {
  data: APIImageItem[]
  meta: {
    page: number
    limit: number
    total: number
  }
  items?: APIImageItem[]
}

type ProductMediaItem = {
  id: number
  productId: number
  mediaId: number
  url: string
}

type ProductMediasResponse = {
  data: ProductMediaItem[]
  meta: {
    page: number
    limit: number
    total: number
  }
}

function normalizeImages(data: ImagesResponse | APIImageItem[] | any): { items: ImageItem[] } {
  let items: APIImageItem[] = []
  
  if (data && Array.isArray(data.data)) {
    items = data.data
  } else if (data && Array.isArray(data.items)) {
    items = data.items
  } else if (Array.isArray(data)) {
    items = data
  }

  return {
    items: items.map(item => ({
      id: item.id,
      media_id: item.mediaId,
      name: item.media?.name || 'Imagem',
      url: item.url || item.media?.url || '',
      original_url: item.url || item.media?.url || ''
    })).filter((item: ImageItem) => !!item.url)
  }
}

function ImageThumbnail({ img, onDelete }: { img: ImageItem, onDelete: (id: number) => void }) {
  const imageUrl = img.url
  const zoomUrl = img.original_url
  const [isDeleting, setIsDeleting] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  if (!imageUrl) return null

  const handleConfirmDelete = async () => {
    setIsDeleting(true)
    await onDelete(img.id)
    setIsConfirmOpen(false)
    setIsDeleting(false)
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsConfirmOpen(true)
  }

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <div 
            className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg border bg-muted transition-all hover:border-primary/50 hover:shadow-md"
          >
            <img
              src={imageUrl}
              alt={img.name ?? 'Imagem do produto'}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <ZoomIn className="h-6 w-6 text-white drop-shadow-md" />
            </div>
            <Button
              size="icon"
              variant="destructive"
              className="absolute top-1 right-1 h-6 w-6 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              onClick={handleDeleteClick}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            </Button>
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

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Remover imagem</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover esta imagem da derivação? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)} disabled={isDeleting}>Cancelar</Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function SortableImageThumbnail({ img, onDelete, isUpdating }: { img: ImageItem, onDelete: (id: number) => void, isUpdating?: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: img.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative group/sortable">
      <div {...attributes} {...listeners} className="absolute top-1 left-1 z-20 opacity-0 group-hover/sortable:opacity-100 transition-opacity cursor-grab active:cursor-grabbing bg-black/30 hover:bg-black/50 rounded-sm p-0.5 text-white backdrop-blur-sm">
        <GripVertical className="h-4 w-4" />
      </div>
      {isUpdating && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/50 backdrop-blur-[1px] rounded-lg">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}
      <ImageThumbnail img={img} onDelete={onDelete} />
    </div>
  )
}

function DerivationImages({ derivation, isSelected, onToggleSelect }: { derivation: DerivatedProduct, isSelected: boolean, onToggleSelect: (checked: boolean) => void }) {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['derivation-images', derivation.id],
    refetchOnWindowFocus: false,
    refetchOnMount: 'always',
    queryFn: async () => {
      const response = await privateInstance.get(`/tenant/derivated-product-medias`, {
        params: {
          derivatedProductId: derivation.id,
          limit: 100
        }
      })
      if (response.status !== 200) throw new Error('Erro ao carregar imagens')
      return response.data as ImagesResponse
    }
  })

  const handleDeleteImage = async (id: number) => {
    try {
      const response = await privateInstance.delete(`/tenant/derivated-product-medias/${id}`)
      if (response.status === 200 || response.status === 204) {
        toast.success('Imagem removida com sucesso')
        queryClient.invalidateQueries({ queryKey: ['derivation-images', derivation.id] })
      } else {
        throw new Error('Falha ao remover imagem')
      }
    } catch (error: any) {
      const title = error?.response?.data?.message || 'Erro ao remover imagem'
      const description = error?.response?.data?.payload?.title || 'Não foi possível excluir a imagem.'
      toast.error(description, { description: title })
    }
  }

  const rawItems: APIImageItem[] = data 
    ? (Array.isArray(data) 
        ? data 
        : Array.isArray(data.data) 
            ? data.data 
            : Array.isArray(data.items) 
                ? data.items 
                : [])
    : []
  
  const filteredItems = rawItems.filter(item => item.derivatedProductId === derivation.id)
  const images = normalizeImages(filteredItems).items
  const [orderedImages, setOrderedImages] = useState<ImageItem[]>([])

  useEffect(() => {
    setOrderedImages(images)
  }, [JSON.stringify(images)])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const isUpdatingAny = updatingId !== null

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = orderedImages.findIndex((item) => item.id === active.id)
      const newIndex = orderedImages.findIndex((item) => item.id === over.id)
      const previousItems = [...orderedImages]

      // Optimistic update
      setOrderedImages(arrayMove(orderedImages, oldIndex, newIndex))

      const newOrder = newIndex + 1 // base 1
      
      try {
        setUpdatingId(Number(active.id)) // Start updating state for specific item
        await privateInstance.patch(`/tenant/derivated-product-medias/${active.id}/order`, {
          order: newOrder
        })
        toast.success('Ordem atualizada com sucesso')
        
        // Invalidate and refetch to ensure consistency
        await queryClient.invalidateQueries({ queryKey: ['derivation-images', derivation.id] })
        await refetch()

      } catch (error: any) {
         // Revert to previous state
         setOrderedImages(previousItems)
         
         const title = error?.response?.data?.message || 'Erro ao atualizar ordem'
         const description = error?.response?.data?.payload?.title || 'Não foi possível reordenar a imagem.'
         toast.error(description, { description: title })
      } finally {
        setUpdatingId(null) // Stop updating state
      }
    }
  }

  return (
    <Card className={`overflow-hidden shadow-sm transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-primary' : ''}`}>
      <CardHeader className="flex flex-row items-center gap-2 bg-muted/50 px-3 py-2">
        <Checkbox 
          checked={isSelected}
          onCheckedChange={(checked) => onToggleSelect(checked as boolean)}
        />
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
        ) : orderedImages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4 text-center text-muted-foreground animate-in fade-in-50">
            <div className="mb-1.5 rounded-full bg-muted p-2">
              <ImageIcon className="h-5 w-5 opacity-40" />
            </div>
            <p className="text-[10px] font-medium">Sem imagens</p>
          </div>
        ) : (
          <DndContext 
            sensors={sensors} 
            collisionDetection={closestCenter} 
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={orderedImages.map(img => img.id)} strategy={rectSortingStrategy} disabled={isUpdatingAny}>
              <div className="grid grid-cols-5 gap-2 animate-in fade-in-50">
                {orderedImages.map((img) => (
                  <SortableImageThumbnail 
                    key={img.id} 
                    img={img} 
                    onDelete={handleDeleteImage} 
                    isUpdating={updatingId === img.id}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  )
}

function ProductGeneralImages({ productId }: { productId: number }) {
  const queryClient = useQueryClient()
  const [isAdding, setIsAdding] = useState(false)
  const [orderedImages, setOrderedImages] = useState<ImageItem[]>([])
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )
  
  const { data, isLoading, isError, isRefetching, refetch } = useQuery({
    queryKey: ['product-general-images', productId],
    refetchOnWindowFocus: false,
    refetchOnMount: 'always',
    queryFn: async () => {
      const response = await privateInstance.get(`/tenant/product-medias`, {
        params: {
          productId,
          limit: 100
        }
      })
      if (response.status !== 200) throw new Error('Erro ao carregar imagens')
      return response.data as ProductMediasResponse
    }
  })

  const images: ImageItem[] = (data?.data || []).map(item => ({
    id: item.id,
    media_id: item.mediaId,
    name: 'Imagem do Produto',
    url: item.url,
    original_url: item.url
  }))

  useEffect(() => {
    setOrderedImages(images)
  }, [JSON.stringify(images)])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = orderedImages.findIndex((item) => item.id === active.id)
      const newIndex = orderedImages.findIndex((item) => item.id === over.id)
      const previousItems = [...orderedImages]

      // Optimistic update
      setOrderedImages(arrayMove(orderedImages, oldIndex, newIndex))

      const newOrder = newIndex + 1 // base 1
      
      try {
        setUpdatingId(Number(active.id))
        await privateInstance.patch(`/tenant/product-medias/${active.id}/order`, {
          order: newOrder
        })
        toast.success('Ordem atualizada com sucesso')
        
        await queryClient.invalidateQueries({ queryKey: ['product-general-images', productId] })
        await refetch()

      } catch (error: any) {
         setOrderedImages(previousItems)
         const title = error?.response?.data?.message || 'Erro ao atualizar ordem'
         toast.error(title)
      } finally {
        setUpdatingId(null)
      }
    }
  }

  const handleAddMedias = async (medias: MediaItem[]) => {
    if (medias.length === 0) return
    setIsAdding(true)
    try {
      const response = await privateInstance.post('/tenant/product-medias', {
        productId,
        mediaIds: medias.map(m => m.id)
      })
      
      if (response.status === 200 || response.status === 201) {
        toast.success('Imagens adicionadas com sucesso')
        await queryClient.invalidateQueries({ queryKey: ['product-general-images', productId] })
      } else {
        throw new Error('Falha ao adicionar imagens')
      }
    } catch (error: any) {
      const title = error?.response?.data?.message || 'Erro ao adicionar imagens'
      toast.error(title)
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeleteImage = async (id: number) => {
    try {
      const response = await privateInstance.delete(`/tenant/product-medias/${id}`)
      if (response.status === 200 || response.status === 204) {
        toast.success('Imagem removida com sucesso')
        queryClient.invalidateQueries({ queryKey: ['product-general-images', productId] })
      } else {
        throw new Error('Falha ao remover imagem')
      }
    } catch (error: any) {
      const title = error?.response?.data?.message || 'Erro ao remover imagem'
      toast.error(title)
    }
  }

  const isUpdatingAny = updatingId !== null

  return (
    <Card className="overflow-hidden shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between bg-muted/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ImageIcon className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-sm font-semibold">Imagens Gerais</CardTitle>
          </div>
        </div>
        <MediaSelectorDialog
          multiple={true}
          trigger={
            <Button size="sm" variant="outline" className="h-8 gap-2" disabled={isAdding || isLoading || isRefetching}>
              {isAdding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Adicionar
            </Button>
          }
          onSelect={handleAddMedias}
        />
      </CardHeader>
      <Separator />
      <CardContent className="p-4">
        {isLoading || isRefetching ? (
          <div className="grid grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="aspect-square w-full rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="mb-2 rounded-full bg-destructive/10 p-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-destructive">Falha ao carregar imagens</p>
          </div>
        ) : orderedImages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
            <p className="text-sm">Nenhuma imagem geral vinculada.</p>
          </div>
        ) : (
          <DndContext 
            sensors={sensors} 
            collisionDetection={closestCenter} 
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={orderedImages.map(img => img.id)} strategy={rectSortingStrategy} disabled={isUpdatingAny}>
              <div className="grid grid-cols-5 gap-3">
                {orderedImages.map((img) => (
                  <SortableImageThumbnail 
                    key={img.id} 
                    img={img} 
                    onDelete={handleDeleteImage}
                    isUpdating={updatingId === img.id} 
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  )
}

export function ProductImagesSheet({ productId }: { productId: number }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (open) {
      queryClient.invalidateQueries({ queryKey: ['derivated-products', productId] })
      // Optionally invalidate all derivation images related to this product to ensure freshness
      // queryClient.invalidateQueries({ queryKey: ['derivation-images'] }) 
    }
  }, [open, productId, queryClient])

  const { data: derivationsData, isLoading: isLoadingDerivations } = useQuery({
    queryKey: ['derivated-products', productId],
    enabled: open,
    refetchOnWindowFocus: false,
    refetchOnMount: 'always',
    queryFn: async () => {
      const response = await privateInstance.get(`/tenant/derivated-product`, {
        params: {
          productId,
          limit: 100
        }
      })
      if (response.status !== 200) throw new Error('Erro ao carregar derivações')
      return response.data as DerivatedProductsResponse
    }
  })

  const [selectedDerivations, setSelectedDerivations] = useState<number[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [searchOperator, setSearchOperator] = useState<'contains' | 'equals'>('contains')

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      setSelectedDerivations([]) // Clear selection when search term changes (debounced)
    }, 500)

    return () => {
      clearTimeout(handler)
    }
  }, [searchTerm])

  const derivations = derivationsData ? normalizeDerivatedProducts(derivationsData).items : []
  
  const filteredDerivations = derivations.filter(d => {
    if (!debouncedSearchTerm) return true
    const name = d.name?.toLowerCase() || ''
    const term = debouncedSearchTerm.toLowerCase()
    
    if (searchOperator === 'equals') {
      return name === term
    }
    return name.includes(term)
  })

  const handleToggleSelect = (id: number, checked: boolean) => {
    setSelectedDerivations(prev => 
      checked ? [...prev, id] : prev.filter(d => d !== id)
    )
  }

  const handleSelectMedias = async (medias: MediaItem[]) => {
    if (medias.length === 0) return
    if (selectedDerivations.length === 0) {
      toast.error('Selecione pelo menos uma variação')
      return
    }

    setIsProcessing(true)
    try {
      const response = await privateInstance.post('/tenant/derivated-product-medias', {
        mediaIds: medias.map(m => m.id),
        to: selectedDerivations
      })
      
      if (response.status !== 200 && response.status !== 201) { 
         throw new Error('Erro na requisição')
      }

      toast.success('Imagens vinculadas com sucesso')
      
      // Invalidate queries for all affected derivations
      selectedDerivations.forEach(dId => {
        queryClient.invalidateQueries({ queryKey: ['derivation-images', dId] })
      })
      
      setSelectedDerivations([])

    } catch (e: any) {
      const title = e?.response?.data?.message || 'Erro ao vincular imagens'
      toast.error(title)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant={'outline'} size={'sm'} className="gap-2">
          <ImageIcon className="size-[0.85rem]" />
          Imagens
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col h-full sm:max-w-[600px] p-0 gap-0 bg-background/95 backdrop-blur-sm">
        <div className="px-4 py-3 border-b space-y-3">
          <div className="space-y-1">
            <SheetTitle className="text-base font-semibold">Imagens das Variações</SheetTitle>
            <SheetDescription className="flex items-center gap-1.5 text-xs">
              <Info className="size-3.5 shrink-0" />
              Selecione as variações para adicionar imagens.
            </SheetDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={searchOperator} onValueChange={(v: 'contains' | 'equals') => setSearchOperator(v)}>
              <SelectTrigger className="w-[110px] h-8 text-xs">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contains">Contém</SelectItem>
                <SelectItem value="equals">Igual a</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input 
                placeholder="Buscar variação..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 flex flex-col gap-6">
            <ProductGeneralImages productId={productId} />

            <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">Atenção</p>
                  <p>
                    Se as imagens forem iguais para todas as derivações, insira elas somente na sessão acima (Imagens Gerais). As imagens individuais por derivação devem ser inseridas somente se a imagem ou vídeo for diferente para cada derivação.
                  </p>
                </div>
              </div>
            </div>

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
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between px-2">
                   <MediaSelectorDialog
                     multiple={true}
                     trigger={
                       <Button size="sm" className="gap-2" disabled={selectedDerivations.length === 0 || isProcessing}>
                         {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                         Adicionar Mídias
                       </Button>
                     }
                     onSelect={handleSelectMedias}
                   />
                   <div className="flex items-center gap-2">
                     <Button variant="ghost" size="sm" onClick={() => setSelectedDerivations(filteredDerivations.map(d => d.id))}>
                       Selecionar todas
                     </Button>
                     <Button variant="ghost" size="sm" onClick={() => setSelectedDerivations([])} disabled={selectedDerivations.length === 0}>
                       Limpar seleção
                     </Button>
                   </div>
                </div>
                {filteredDerivations.length === 0 ? (
                   <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground">
                     <p className="text-sm">Nenhuma variação encontrada com o termo "{debouncedSearchTerm}".</p>
                   </div>
                ) : (
                  filteredDerivations.map((derivation) => (
                    <DerivationImages 
                      key={derivation.id} 
                      derivation={derivation} 
                      isSelected={selectedDerivations.includes(derivation.id)}
                      onToggleSelect={(checked) => handleToggleSelect(derivation.id, checked)}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
