import { Button } from '@/components/ui/button'
import { Trash, Loader, Check, AlertCircle, FileIcon, AlertTriangle, X } from 'lucide-react'
import { useState, useEffect, useRef, useMemo } from 'react'
import { privateInstance } from '@/lib/auth'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetTrigger, SheetClose } from '@/components/ui/sheet'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

type ApiMedia = { id: number | string, name?: string }

type QueueItem = {
  id: number | string
  status: 'pending' | 'deleting' | 'done' | 'error'
  error?: string
}

export function DeleteMediaSheet({ media, onDeleted }: { media: ApiMedia, onDeleted?: () => void }) {
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const submit = async () => {
    try {
      setDeleting(true)
      const res = await privateInstance.delete(`/api:qSTOvw0A/medias/${media.id}`)
      if (res.status !== 200 && res.status !== 204) throw new Error('Erro ao excluir mídia')
      toast.success('Mídia excluída!')
      setOpen(false)
      onDeleted?.()
    } catch (e: any) {
      const errorData = e?.response?.data
      toast.error(errorData?.title || 'Erro ao excluir mídia', {
        description: errorData?.detail || 'Não foi possível excluir a mídia.'
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size={'sm'} variant={'outline'}>
          <Trash className='size-[0.85rem]' />
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-[400px]">
        <SheetHeader className="sm:text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-100 mb-4">
            <AlertTriangle className="size-6 text-red-600" />
          </div>
          <SheetTitle>Excluir mídia</SheetTitle>
          <SheetDescription>
            Você está prestes a excluir a mídia <span className="font-medium text-foreground">ID: {media.id}</span>.
          </SheetDescription>
        </SheetHeader>

        <div className="py-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Atenção</AlertTitle>
            <AlertDescription>
              Essa ação não pode ser desfeita. A mídia será permanentemente removida dos servidores.
            </AlertDescription>
          </Alert>
        </div>

        <SheetFooter className="gap-2 sm:space-x-0">
          <div className="grid grid-cols-2 gap-2 w-full">
            <SheetClose asChild>
              <Button variant='outline' disabled={deleting}>Cancelar</Button>
            </SheetClose>
            <Button variant='destructive' onClick={submit} disabled={deleting}>
              {deleting ? <Loader className='animate-spin size-4 mr-2' /> : null}
              {deleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function BulkDeleteMediasSheet({ open, onOpenChange, ids, onDeleted }: { open: boolean, onOpenChange: (v: boolean) => void, ids: (number | string)[], onDeleted?: () => void }) {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [hasNotified, setHasNotified] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const deletingRef = useRef(false)

  const allProcessed = useMemo(() => queue.length > 0 && queue.every((q) => q.status === 'done' || q.status === 'error'), [queue])
  const isDeleting = useMemo(() => queue.some((q) => q.status === 'pending' || q.status === 'deleting'), [queue])
  const successCount = useMemo(() => queue.filter(q => q.status === 'done').length, [queue])
  const errorCount = useMemo(() => queue.filter(q => q.status === 'error').length, [queue])

  useEffect(() => {
    if (open && ids.length > 0 && queue.length === 0) {
      setQueue(ids.map(id => ({ id, status: 'pending' })))
      setHasNotified(false)
      setConfirmed(false)
    }
  }, [open, ids])

  useEffect(() => {
    if (!open) {
      setQueue([])
      setHasNotified(false)
      setConfirmed(false)
    }
  }, [open])

  useEffect(() => {
    if (deletingRef.current || !confirmed) return
    const nextIndex = queue.findIndex((q) => q.status === 'pending')

    if (nextIndex >= 0) {
      deletingRef.current = true
      ;(async () => {
        const item = queue[nextIndex]
        try {
          setQueue((prev) => prev.map((q, i) => i === nextIndex ? { ...q, status: 'deleting', error: undefined } : q))
          
          const res = await privateInstance.delete(`/api:qSTOvw0A/medias/${item.id}`)
          
          if (res.status !== 200 && res.status !== 204) throw new Error('Falha ao excluir')
          
          setQueue((prev) => prev.map((q, i) => i === nextIndex ? { ...q, status: 'done' } : q))
        } catch (err: any) {
          const msg = err?.response?.data?.message ?? err?.message ?? 'Erro ao excluir'
          setQueue((prev) => prev.map((q, i) => i === nextIndex ? { ...q, status: 'error', error: msg } : q))
        } finally {
          deletingRef.current = false
        }
      })()
    } else if (queue.length > 0 && allProcessed && !hasNotified) {
      toast.success(`Processo finalizado: ${successCount} excluídos, ${errorCount} erros`)
      onDeleted?.()
      setHasNotified(true)
    }
  }, [queue, allProcessed, hasNotified, onDeleted, confirmed, successCount, errorCount])

  const handleOpenChange = (v: boolean) => {
    if (!v && isDeleting && confirmed) {
      toast.warning('Aguarde o término da exclusão para fechar')
      return
    }
    onOpenChange(v)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="flex flex-col h-full sm:max-w-[450px] p-0 gap-0 bg-background">
        <div className="p-0 border-b">
          <SheetHeader>
            <SheetTitle>Excluir {ids.length} {ids.length === 1 ? 'item selecionado' : 'itens selecionados'}</SheetTitle>
            <SheetDescription>
              {confirmed
                ? 'Aguarde enquanto os itens são processados.'
                : 'Revise a lista abaixo. Esta ação é irreversível.'}
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className='flex-1 min-h-0 overflow-y-auto'>
          <div className="p-6 pt-4">

            {!confirmed && (
              <div className="mb-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Atenção</AlertTitle>
                  <AlertDescription>
                    Os itens selecionados serão permanentemente removidos.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            <div className="border overflow-auto rounded-md divide-y">
              {queue.map((item) => (
                <div key={item.id} className="flex items-start gap-3 p-3 bg-card transition-colors hover:bg-accent/50">
                  <div className="flex items-center justify-center size-8 rounded-md bg-muted text-muted-foreground shrink-0 mt-0.5">
                    <FileIcon className="size-4" />
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">Mídia ID: {item.id}</span>
                      <div className="shrink-0">
                        {item.status === 'pending' && <span className="flex size-2 rounded-full bg-muted-foreground/30" />}
                        {item.status === 'deleting' && <Loader className="size-4 animate-spin text-primary" />}
                        {item.status === 'done' && <Check className="size-4 text-green-600" />}
                        {item.status === 'error' && <X className="size-4 text-destructive" />}
                      </div>
                    </div>

                    {item.status === 'error' && (
                      <p className="text-xs text-destructive mt-1">{item.error}</p>
                    )}

                    {item.status === 'deleting' && (
                      <span className="text-xs text-muted-foreground">Excluindo...</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className='p-6 border-t bg-background mt-auto'>
          {!confirmed ? (
            <div className='grid grid-cols-2 gap-3'>
              <Button
                variant='outline'
                onClick={() => handleOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                variant='destructive'
                onClick={() => setConfirmed(true)}
              >
                Confirmar Exclusão
              </Button>
            </div>
          ) : (
            <Button
              variant='secondary'
              onClick={() => handleOpenChange(false)}
              className='w-full'
              disabled={!allProcessed}
            >
              {allProcessed ? 'Fechar' : 'Processando...'}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
