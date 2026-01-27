import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { privateInstance } from '@/lib/auth'
import type { MediaItem } from '@/routes/dashboard/media/index'
import { MultiUploadSheet } from '@/routes/dashboard/media/-components/multi-upload-sheet'

interface ImagePickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onInsert: (url: string) => void
}

export function ImagePickerDialog({
  open,
  onOpenChange,
  onInsert,
}: ImagePickerDialogProps) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 20

  const { data, isLoading, isRefetching } = useQuery({
    queryKey: ['medias-picker', page, perPage, open],
    enabled: open,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryFn: async () => {
      const res = await privateInstance.get('/tenant/medias', {
        params: {
          page,
          limit: perPage,
          sortBy: 'createdAt',
          orderBy: 'desc'
        }
      })
      if (res.status !== 200) throw new Error('Erro ao carregar mídias')
      return res.data
    },
  })

  const medias: MediaItem[] = data?.data || []
  const meta = data?.meta || { total: 0, perPage: 20, page: 1, lastPage: 1 }
  const totalPages = meta.lastPage

  const filteredMedias = medias.filter((media) =>
    media.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle>Selecionar Imagem</DialogTitle>
            <MultiUploadSheet />
          </div>
          <div className="relative mt-2">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar imagens..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-6">
          {isLoading || isRefetching ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-lg border bg-muted animate-pulse" />
              ))}
            </div>
          ) : filteredMedias.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground min-h-[300px]">
              <ImageIcon className="h-12 w-12 mb-2 opacity-20" />
              <p>Nenhuma imagem encontrada</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredMedias.map((media) => (
                <div
                  key={media.id}
                  className="group relative aspect-square rounded-lg border bg-background overflow-hidden cursor-pointer hover:border-primary transition-colors"
                  onClick={() => {
                    if (media.url) {
                      onInsert(media.url)
                    }
                  }}
                >
                  {media.url ? (
                    <img
                      src={media.url}
                      alt={media.name || 'Imagem'}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted">
                      <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <p className="text-xs text-white truncate text-center">
                      {media.name || media.fileName}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t flex items-center justify-between sm:justify-between">
            <div className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
            </div>
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || isLoading}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || isLoading}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
