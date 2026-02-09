import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader, Trash } from 'lucide-react'
import { toast } from 'sonner'
import { privateInstance } from '@/lib/auth'
import { useState } from 'react'

export function DeleteProductDialog({ productId, onDeleted }: { productId: number, onDeleted?: () => void }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const { isPending, mutate } = useMutation({
    mutationFn: async () => {
      const response = await privateInstance.delete(`/tenant/products/${productId}`)
      return response
    },
    onSuccess: (response) => {
      if (response.status === 200 || response.status === 204) {
        toast.success('Produto excluído com sucesso!')
        setOpen(false)
        onDeleted?.()
        queryClient.invalidateQueries({ queryKey: ['products'] })
      } else {
        const errorData = (response.data as any)
        toast.error(errorData?.title || 'Erro ao excluir produto', {
          description: errorData?.detail || 'Não foi possível excluir o produto.'
        })
      }
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao excluir produto', {
        description: errorData?.detail || 'Não foi possível excluir o produto.'
      })
    }
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={'outline'} size={'sm'}>
          <Trash className='size-[0.85rem]' /> Excluir
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir produto</DialogTitle>
          <DialogDescription>
            Esta ação não pode ser desfeita. Tem certeza que deseja excluir este produto?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant={'outline'} size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant={'destructive'} size="sm" onClick={() => mutate()} disabled={isPending}>
            {isPending ? <><Loader className='animate-spin size-[0.85rem]' /> Excluindo...</> : 'Excluir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}