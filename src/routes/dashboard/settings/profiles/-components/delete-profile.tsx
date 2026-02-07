import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Trash, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { privateInstance } from "@/lib/auth"

export function DeleteProfile({ profileId }: { profileId: number }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async () => {
      const response = await privateInstance.delete(`/tenant/user-profiles/${profileId}`)
      if (response.status !== 200 && response.status !== 204) {
        throw new Error('Erro ao excluir perfil')
      }
      return { status: response.status, data: response.data }
    },
    onSuccess: (result) => {
      if (result.status === 200 || result.status === 204) {
        toast.success('Perfil excluído com sucesso!')
        queryClient.invalidateQueries({ queryKey: ['profiles'] })
      } else {
        const errorData = (result.data as any)
        toast.error(errorData?.title || 'Erro ao excluir perfil', {
          description: errorData?.detail || 'Não foi possível excluir o perfil.'
        })
      }
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao excluir perfil', {
        description: errorData?.detail || 'Não foi possível excluir o perfil.'
      })
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
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Excluir definitivamente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}