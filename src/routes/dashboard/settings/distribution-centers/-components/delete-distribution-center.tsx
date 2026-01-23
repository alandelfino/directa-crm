import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { useMutation } from '@tanstack/react-query'
import { privateInstance } from '@/lib/auth'
import { toast } from 'sonner'
import { Loader, Trash } from 'lucide-react'

export function DeleteDistributionCenter({ distributionCenterId, onDeleted }: { distributionCenterId: number, onDeleted?: () => void }) {
  const [open, setOpen] = useState(false)

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async () => {
      const response = await privateInstance.delete(`/api:k-mANdpH/distribution_centers/${distributionCenterId}`)
      if (response.status !== 200) throw new Error('Erro ao excluir centro')
      return response.data as boolean
    },
    onSuccess: () => {
      toast.success('Centro excluído com sucesso!')
      onDeleted?.()
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao excluir centro', {
        description: errorData?.detail || 'Não foi possível excluir o centro de distribuição.'
      })
    }
  })

  async function confirmDelete() { await mutateAsync(); setOpen(false) }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={'outline'} disabled={isPending}>
          <Trash /> Excluir
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir centro</DialogTitle>
          <DialogDescription>Tem certeza que deseja excluir este centro de distribuição?</DialogDescription>
        </DialogHeader>
        <DialogFooter className='flex gap-2'>
          <Button variant={'outline'} onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant={'destructive'} onClick={confirmDelete} disabled={isPending}>
            {isPending ? <Loader className='animate-spin' /> : null}
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}