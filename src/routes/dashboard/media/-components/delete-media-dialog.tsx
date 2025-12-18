import { Button } from '@/components/ui/button'
import { Trash, Loader } from 'lucide-react'
import { useState } from 'react'
import { privateInstance } from '@/lib/auth'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog'

type ApiMedia = { id: number, name?: string }

export function DeleteMediaDialog({ media, onDeleted }: { media: ApiMedia, onDeleted?: () => void }) {
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={'sm'} variant={'outline'}>
          <Trash className='size-[0.85rem]' />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Você tem certeza absoluta?</DialogTitle>
          <DialogDescription>
            Essa ação não pode ser desfeita. Isso excluirá permanentemente a mídia
            e removerá seus dados de nossos servidores.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant='outline' size={'sm'}>Cancelar</Button>
          </DialogClose>
          <Button variant='destructive' size={'sm'} onClick={submit} disabled={deleting}>
            {deleting ? <Loader className='animate-spin size-[0.85rem]' /> : 'Excluir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function BulkDeleteMediasDialog({ open, onOpenChange, ids, onDeleted }: { open: boolean, onOpenChange: (v: boolean) => void, ids: number[], onDeleted?: () => void }) {
  const [deleting, setDeleting] = useState(false)
  const [processed, setProcessed] = useState(0)
  const [errors, setErrors] = useState<{ id: number, message: string }[]>([])

  const total = ids.length
  const progress = total > 0 ? Math.round((processed / total) * 100) : 0

  const submit = async () => {
    if (total === 0) return
    try {
      setDeleting(true)
      setProcessed(0)
      setErrors([])
      let success = 0
      const localErrors: { id: number, message: string }[] = []
      for (const id of ids) {
        try {
          const res = await privateInstance.delete(`/api:qSTOvw0A/medias/${id}`)
          if (res.status === 200 || res.status === 204) {
            success++
          } else {
            localErrors.push({ id, message: 'Falha ao excluir' })
          }
        } catch (e: any) {
          const msg = e?.response?.data?.message ?? 'Erro ao excluir'
          localErrors.push({ id, message: msg })
        } finally {
          setProcessed((p) => p + 1)
        }
      }
      setErrors(localErrors)
      toast.success(`Exclusão concluída${localErrors.length > 0 ? ` (${success} ok, ${localErrors.length} erro)` : ''}`)
      onDeleted?.()
      if (localErrors.length === 0) onOpenChange(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!deleting) onOpenChange(v) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir mídias</DialogTitle>
          <DialogDescription>Esta ação não pode ser desfeita.</DialogDescription>
        </DialogHeader>

        <div className='space-y-3'>
          <div className='text-sm'>Selecionadas: {total}</div>
          {deleting && (
            <div className='space-y-2'>
              <div className='text-sm'>Processadas: {processed}/{total} ({progress}%)</div>
              <div className='h-2 w-full bg-muted rounded'>
                <div className='h-full bg-destructive rounded' style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
          {errors.length > 0 && processed === total && (
            <div className='border rounded p-2'>
              <div className='text-sm font-medium'>Falhas</div>
              <ul className='mt-1 text-sm text-muted-foreground'>
                {errors.map((e) => (
                  <li key={e.id}>ID {e.id}: {e.message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant='outline' disabled={deleting} size={'sm'}>Cancelar</Button>
          </DialogClose>
          <Button variant='destructive' onClick={submit} disabled={deleting || total === 0} size={'sm'}>{deleting ? <Loader className='animate-spin size-[0.85rem]' /> : 'Excluir'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
