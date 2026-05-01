import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { privateInstance } from "@/lib/auth"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Loader } from "lucide-react"

export function DeletePaymentIntegrationDialog({ id, onOpenChange }: { id: number, onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient()

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async () => {
      await privateInstance.delete(`/tenant/payment-integrations/${id}`)
    },
    onSuccess: () => {
      toast.success('Integração excluída com sucesso')
      queryClient.invalidateQueries({ queryKey: ['payment-integrations'] })
      onOpenChange(false)
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao excluir integração', {
        description: errorData?.detail || 'Não foi possível excluir a integração.'
      })
    }
  })

  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Excluir integração</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir esta integração? Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isPending}>Cancelar</Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={(e) => { e.preventDefault(); mutateAsync() }}
            disabled={isPending}
          >
            {isPending ? <Loader className="animate-spin size-4" /> : 'Excluir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
