import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { privateInstance } from '@/lib/auth'
import { toast } from 'sonner'
import { Loader, Trash } from 'lucide-react'

export function DeleteStore({ storeId, onDeleted }: { storeId: number, onDeleted?: () => void }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { isPending, mutateAsync } = useMutation({
    mutationFn: async () => {
      const response = await privateInstance.delete(`/api:gI4qBCGQ/stores/${storeId}`)
      if (response.status !== 200) throw new Error('Erro ao excluir loja')
      return response.data
    },
    onSuccess: () => {
      toast.success('Loja excluída com sucesso!')
      setOpen(false)
      onDeleted?.()
      queryClient.invalidateQueries({ queryKey: ['stores'] })
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? 'Erro ao excluir loja')
    }
  })

  async function confirmDelete() { await mutateAsync() }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={'outline'}>
          <Trash /> Excluir
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir loja</DialogTitle>
          <DialogDescription>Esta ação não pode ser desfeita.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant={'outline'} size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant={'destructive'} size="sm" onClick={confirmDelete} disabled={isPending}>
            {isPending ? <Loader className='animate-spin' /> : 'Confirmar exclusão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}