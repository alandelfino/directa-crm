import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader, Trash } from 'lucide-react'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { privateInstance } from '@/lib/auth'

export function CustomerAddressDeleteDialog({ customerId, addressId, onDeleted }: { customerId: number, addressId: number, onDeleted?: () => void }) {
  const [open, setOpen] = useState(false)
  const { isPending: deleting, mutate: deleteItem } = useMutation({
    mutationFn: async () => {
      const response = await privateInstance.delete(`/tenant/customers/${customerId}/address/${addressId}`)
      if (response.status !== 200 && response.status !== 204) throw new Error('Erro ao excluir endereço')
      return response
    },
    onSuccess: () => {
      toast.success('Endereço excluído com sucesso!')
      setOpen(false)
      onDeleted?.()
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao excluir endereço', {
        description: errorData?.detail || 'Não foi possível excluir o endereço.'
      })
    }
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={'sm'} variant={'destructive'}><Trash className="size-[0.85rem]" /> Excluir</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir endereço</DialogTitle>
          <DialogDescription>Esta ação não pode ser desfeita.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant='outline' size="sm">Cancelar</Button>
          </DialogClose>
          <Button size="sm" variant="destructive" onClick={() => deleteItem()} disabled={deleting}>{deleting ? <Loader className='animate-spin size-[0.85rem]' /> : 'Confirmar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
