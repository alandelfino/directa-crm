import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { privateInstance } from '@/lib/auth'
import { toast } from 'sonner'
import { Loader, Trash } from 'lucide-react'

export function DeleteStore({ storeId, onDeleted }: { storeId: number, onDeleted?: () => void }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { isPending, mutateAsync } = useMutation({
    mutationFn: async () => {
      const response = await privateInstance.delete(`/tenant/stores/${storeId}`)
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
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao excluir loja', {
        description: errorData?.detail || 'Não foi possível excluir a loja.'
      })
    }
  })

  async function confirmDelete() { await mutateAsync() }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={'outline'} size="sm">
          <Trash className="size-[0.85rem]" /> Excluir
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir loja</DialogTitle>
          <DialogDescription>Esta ação não pode ser desfeita.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm">Cancelar</Button>
          </DialogClose>
          <Button variant="destructive" size="sm" onClick={(e) => {
            e.preventDefault()
            confirmDelete()
          }} disabled={isPending}>
            {isPending ? <Loader className="animate-spin size-[0.85rem]" /> : 'Excluir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}