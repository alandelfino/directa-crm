import { Button } from '@/components/ui/button'
import { Trash, Loader, Check, AlertCircle, FileIcon } from 'lucide-react'
import { useState, useEffect, useRef, useMemo } from 'react'
import { privateInstance } from '@/lib/auth'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetTrigger, SheetClose } from '@/components/ui/sheet'

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
      toast.error(e?.response?.data?.message ?? 'Erro ao excluir mídia')
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
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Você tem certeza absoluta?</SheetTitle>
          <SheetDescription>
            Essa ação não pode ser desfeita. Isso excluirá permanentemente a mídia
            e removerá seus dados de nossos servidores.
          </SheetDescription>
        </SheetHeader>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant='outline' size={'sm'}>Cancelar</Button>
          </SheetClose>
          <Button variant='destructive' size={'sm'} onClick={submit} disabled={deleting}>
            {deleting ? <Loader className='animate-spin size-[0.85rem]' /> : 'Excluir'}
          </Button>
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
      const ok = queue.filter((q) => q.status === 'done').length
      const fail = queue.filter((q) => q.status === 'error').length
      toast.success(`Exclusão concluída${fail > 0 ? ` (${ok} ok, ${fail} erro)` : ''}`)
      onDeleted?.()
      setHasNotified(true)
    }
  }, [queue, allProcessed, hasNotified, onDeleted, confirmed])

  const handleOpenChange = (v: boolean) => {
    if (!v && isDeleting && confirmed) {
      toast.warning('Aguarde o término da exclusão para fechar')
      return
    }
    onOpenChange(v)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent>
        <div className='flex flex-col h-full'>
          <SheetHeader>
            <SheetTitle>Excluir em lote</SheetTitle>
            <SheetDescription>
              {confirmed 
                ? 'Acompanhe o progresso da exclusão' 
                : 'Você tem certeza que deseja excluir os itens selecionados?'}
            </SheetDescription>
          </SheetHeader>
          
          <div className='flex-1 min-h-0 overflow-auto px-4 mt-6'>
            <div className='flex flex-col gap-2'>
              {queue.map((item) => (
                <div key={item.id} className='rounded-md bg-neutral-50 p-3'>
                  <div className='flex items-center justify-between gap-3'>
                    <div className='flex items-center gap-3 min-w-0 flex-1'>
                      <FileIcon className='h-5 w-5 text-muted-foreground shrink-0' />
                      <div className='flex-1 min-w-0'>
                        <div className='text-sm font-medium truncate'>Mídia ID: {item.id}</div>
                        {item.status === 'deleting' && (
                          <div className='mt-2 h-2 w-full bg-muted rounded overflow-hidden'>
                            <div className='h-full bg-destructive rounded animate-pulse' style={{ width: '100%' }} />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className='flex items-center gap-2 shrink-0'>
                      {item.status === 'done' && <Check className='h-5 w-5 text-green-600' />}
                      {item.status === 'deleting' && <Loader className='h-5 w-5 animate-spin text-muted-foreground' />}
                      {item.status === 'error' && <AlertCircle className='h-5 w-5 text-destructive' />}
                      {item.status === 'pending' && <div className='h-2 w-2 rounded-full bg-neutral-300' />}
                    </div>
                  </div>
                  {item.status === 'error' && (
                    <div className='mt-2 text-xs text-destructive bg-destructive/10 p-2 rounded break-words'>
                      {item.error ?? 'Erro ao excluir mídia'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {!confirmed && queue.length > 0 && (
            <div className='mt-auto pt-4 border-t flex flex-col gap-2'>
              <Button 
                variant='destructive' 
                onClick={() => setConfirmed(true)}
                className='w-full'
              >
                Confirmar Exclusão ({queue.length} itens)
              </Button>
              <Button 
                variant='outline' 
                onClick={() => handleOpenChange(false)}
                className='w-full'
              >
                Cancelar
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
