import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Trash, Loader } from "lucide-react"
import { toast } from "sonner"
import { privateInstance } from "@/lib/auth"
import { useState } from "react"

export function DeleteUserDialog({ userId, onDeleted }: { userId: string, onDeleted?: () => void }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  
  const { isPending, mutateAsync } = useMutation({
    mutationFn: async () => {
      const response = await privateInstance.delete(`/tenant/users/${userId}`)
      if (response.status !== 204 && response.status !== 200) {
         throw new Error('Erro ao excluir usuário')
      }
      return response.data
    },
    onSuccess: () => {
      toast.success('Usuário excluído com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setOpen(false)
      onDeleted?.()
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao excluir usuário', {
        description: errorData?.detail || 'Não foi possível excluir o usuário.',
      })
    },
  })

  async function confirmDelete() {
    await mutateAsync()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={'outline'} size="sm" className="">
          <Trash className="size-[0.85rem]" /> <span className="">Excluir</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir usuário</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir este usuário? Esta ação não poderá ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm">Cancelar</Button>
          </DialogClose>
          <Button variant="destructive" size="sm" onClick={confirmDelete} disabled={isPending}>
            {isPending ? <Loader className="animate-spin size-[0.85rem]" /> : 'Excluir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
