import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { privateInstance } from "@/lib/auth"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Loader } from "lucide-react"

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null

const getApiErrorData = (err: unknown): { title?: string; detail?: string } | null => {
  if (!isRecord(err)) return null
  const response = err.response
  if (!isRecord(response)) return null
  const data = response.data
  if (!isRecord(data)) return null

  const title = typeof data.title === "string" ? data.title : undefined
  const detail = typeof data.detail === "string" ? data.detail : undefined
  return title || detail ? { title, detail } : null
}

export function DeletePaymentIntegrationDialog({ id, onOpenChange }: { id: number, onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient()

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async () => {
      await privateInstance.delete(`/tenant/payment-methods/${id}`)
    },
    onSuccess: () => {
      toast.success('Método de pagamento excluído com sucesso')
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] })
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      const errorData = getApiErrorData(error)
      toast.error(errorData?.title || 'Erro ao excluir método de pagamento', {
        description: errorData?.detail || 'Não foi possível excluir o método de pagamento.',
      })
    }
  })

  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Excluir método de pagamento</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir este método de pagamento? Esta ação não pode ser desfeita.
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

export function DeletePaymentMethodDialog({ id, onOpenChange }: { id: number, onOpenChange: (open: boolean) => void }) {
  return <DeletePaymentIntegrationDialog id={id} onOpenChange={onOpenChange} />
}
