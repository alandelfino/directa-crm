import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Trash, Loader } from "lucide-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { privateInstance } from "@/lib/auth"
import { useState } from "react"
import { toast } from "sonner"

export function DeleteDistributionCenter({ distributionCenterId, disabled = false, onDeleted }: { distributionCenterId: number; disabled?: boolean; onDeleted?: () => void }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const { isPending, mutate } = useMutation({
    mutationFn: async () => {
      return await privateInstance.delete(`/tenant/distribution-centers/${distributionCenterId}`)
    },
    onSuccess: (response) => {
      if (response.status === 200 || response.status === 204) {
        toast.success('Centro de distribuição excluído com sucesso!')
        setOpen(false)
        queryClient.invalidateQueries({ queryKey: ['distribution-centers'] })
        onDeleted?.()
      } else {
        const errorData = (response.data as any)
        toast.error(errorData?.title || 'Erro ao excluir centro de distribuição', {
          description: errorData?.detail || 'Não foi possível excluir o centro de distribuição.'
        })
      }
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao excluir centro de distribuição', {
        description: errorData?.detail || 'Não foi possível excluir o centro de distribuição.'
      })
    }
  })

  const handleConfirmDelete = () => {
    if (!distributionCenterId) {
      toast.error('Erro na seleção', {
        description: 'Selecione um centro de distribuição para excluir'
      })
      return
    }
    mutate()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled || !distributionCenterId}>
          <Trash className="size-[0.85rem]" /> Excluir
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tem certeza absoluta?</DialogTitle>
          <DialogDescription>
            Esta ação não pode ser desfeita. Isso excluirá permanentemente o centro de distribuição selecionado
            e removerá seus dados de nossos servidores.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={isPending}>Cancelar</Button>
          <Button variant="destructive" size="sm" onClick={handleConfirmDelete} disabled={isPending}>{isPending ? <Loader className="animate-spin size-[0.85rem]" /> : 'Sim, tenho certeza'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}