import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { privateInstance } from '@/lib/auth'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader, Trash } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export function DeletePageDialog({ pageId, onDeleted }: { pageId: number, onDeleted?: () => void }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const { isPending, mutate } = useMutation({
    mutationFn: async () => {
      const response = await privateInstance.delete(`/tenant/pages/${pageId}`)
      if (response.status !== 204) throw new Error('Erro ao excluir página')
      return response
    },
    onSuccess: () => {
      toast.success('Página excluída com sucesso!')
      setOpen(false)
      onDeleted?.()
      queryClient.invalidateQueries({ queryKey: ['pages'] })
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao excluir página', {
        description: errorData?.detail || 'Não foi possível excluir a página.',
      })
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={!pageId}>
          <Trash className="size-[0.85rem] mr-2" /> Excluir
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir página</DialogTitle>
          <DialogDescription>Tem certeza que deseja excluir esta página? Essa ação não poderá ser desfeita.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm" disabled={isPending}>Cancelar</Button>
          </DialogClose>
          <Button variant="destructive" size="sm" disabled={isPending} onClick={() => mutate()}>
            {isPending ? <Loader className="animate-spin size-[0.85rem]" /> : 'Excluir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

