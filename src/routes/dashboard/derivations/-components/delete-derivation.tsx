import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useMutation } from '@tanstack/react-query'
import { Trash, Loader } from 'lucide-react'
import { toast } from 'sonner'
import { privateInstance } from '@/lib/auth'

export function DeleteDerivation({ derivationId, onDeleted }: { derivationId: number, onDeleted?: () => void }) {
  const { isPending, mutate } = useMutation({
    mutationFn: async () => {
      const response = await privateInstance.delete(`/api:JOs6IYNo/derivations/${derivationId}`)
      if (response.status !== 200 && response.status !== 204) {
        throw new Error('Erro ao excluir derivação')
      }
      return response
    },
    onSuccess: () => {
      toast.success('Derivação excluída com sucesso!')
      onDeleted?.()
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.code == 'ERROR_CODE_ACCESS_DENIED' ? 'Não permitido!' : 'Erro ao excluir derivação!', {
        description: error?.response?.data?.message ?? 'Erro ao excluir derivação',
      })
    },
  })

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size={'sm'} variant={'outline'}>
          <Trash className="size-[0.85rem]" /> Excluir
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir derivação</DialogTitle>
          <DialogDescription>
            Esta ação não pode ser desfeita. Isso irá excluir permanentemente a derivação selecionada.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant='outline' size="sm">Cancelar</Button>
          </DialogClose>
          <Button size="sm" onClick={() => mutate()} disabled={isPending}>
            {isPending ? <Loader className='animate-spin size-[0.85rem]' /> : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}