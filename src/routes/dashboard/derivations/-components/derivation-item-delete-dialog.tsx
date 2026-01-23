import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader } from 'lucide-react'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { privateInstance } from '@/lib/auth'
import { IconTrash } from '@tabler/icons-react'

export function DerivationItemDeleteDialog({ itemId, onDeleted }: { itemId: number, onDeleted?: () => void }) {
  const [open, setOpen] = useState(false)
  const { isPending: deleting, mutate: deleteItem } = useMutation({
    mutationFn: async () => {
      const response = await privateInstance.delete(`/tenant/derivation-items/${itemId}`)
      if (response.status !== 200 && response.status !== 204) throw new Error('Erro ao excluir item')
      return response
    },
    onSuccess: () => {
      toast.success('Item excluído com sucesso!')
      setOpen(false)
      onDeleted?.()
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao excluir item', {
        description: errorData?.detail || 'Não foi possível excluir o item.'
      })
    }
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={'sm'} variant={'outline'}><IconTrash className="size-[0.85rem]" /> Excluir</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir item</DialogTitle>
          <DialogDescription>Esta ação não pode ser desfeita.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant='outline' size="sm">Cancelar</Button>
          </DialogClose>
          <Button size="sm" onClick={() => deleteItem()} disabled={deleting}>{deleting ? <Loader className='animate-spin size-[0.85rem]' /> : 'Confirmar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}