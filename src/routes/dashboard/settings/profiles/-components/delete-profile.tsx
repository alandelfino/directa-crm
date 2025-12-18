import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Trash } from "lucide-react"
import { toast } from "sonner"
import { privateInstance } from "@/lib/auth"

export function DeleteProfile({ profileId }: { profileId: number }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async () => {
      const response = await privateInstance.delete(`/api:BXIMsMQ7/user_profile/${profileId}`)
      if (response.status !== 200) {
        throw new Error('Erro ao excluir perfil')
      }
      return response.data
    },
    onSuccess: () => {
      toast.success('Perfil excluído com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
    },
    onError: (error: any) => {
      const apiMessage = error?.response?.data?.message ?? 'Erro ao excluir perfil'
      const apiCode = error?.response?.data?.code
      if (apiCode === 'ERROR_CODE_ACCESS_DENIED') {
        toast.error('Não permitido!', {
          description: apiMessage
        })
      } else {
        toast.error(apiMessage)
      }
    }
  })

  async function confirmDelete() {
    try {
      await mutateAsync()
      setOpen(false)
    } catch {
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={'outline'} size="sm" disabled={isPending}>
          <Trash className="size-[0.85rem]" /> Excluir
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir perfil</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir este perfil? Esta ação é irreversível e removerá o registro definitivamente.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2">
          <Button variant={'outline'} size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant={'destructive'} size="sm" onClick={confirmDelete} disabled={isPending}>
            Excluir definitivamente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}