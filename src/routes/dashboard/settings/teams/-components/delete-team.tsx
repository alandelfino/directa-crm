import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { useMutation } from '@tanstack/react-query'
import { privateInstance } from '@/lib/auth'
import { toast } from 'sonner'
import { Loader, Trash } from 'lucide-react'

export function DeleteTeam({ teamId, onDeleted }: { teamId: number, onDeleted?: () => void }) {
  const [open, setOpen] = useState(false)

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async () => {
      const response = await privateInstance.delete(`/tenant/teams/${teamId}`)
      if (response.status !== 200 && response.status !== 204) throw new Error('Erro ao excluir equipe')
      return response.data as boolean
    },
    onSuccess: () => {
      toast.success('Equipe excluída com sucesso!')
      onDeleted?.()
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao excluir equipe', {
        description: errorData?.detail || 'Não foi possível excluir a equipe.'
      })
    }
  })

  async function confirmDelete() {
    await mutateAsync()
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={'outline'} disabled={isPending}>
          <Trash /> Excluir
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir equipe</DialogTitle>
          <DialogDescription>Tem certeza que deseja excluir esta equipe?</DialogDescription>
        </DialogHeader>
        <DialogFooter className='flex gap-2'>
          <Button variant={'outline'} size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant={'destructive'} size="sm" onClick={confirmDelete} disabled={isPending}>
            {isPending ? <Loader className='animate-spin' /> : null}
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}