import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { privateInstance } from "@/lib/auth"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

interface DeleteCarrierIntegrationPostalCodeRangeDialogProps {
  carrierIntegrationId: number
  serviceId: number
  rangeId: number
  onDeleted?: () => void
  onOpenChange: (open: boolean) => void
}

export function DeleteCarrierIntegrationPostalCodeRangeDialog({ carrierIntegrationId, serviceId, rangeId, onDeleted, onOpenChange }: DeleteCarrierIntegrationPostalCodeRangeDialogProps) {
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      await privateInstance.delete(`/tenant/carriers-integrations/${carrierIntegrationId}/carrier-integration-services/${serviceId}/postal-code-range/${rangeId}`)
    },
    onSuccess: () => {
      toast.success("Faixa de CEP excluída com sucesso")
      queryClient.invalidateQueries({ queryKey: ['carrier-integration-postal-code-ranges', serviceId] })
      onDeleted?.()
      onOpenChange(false)
    },
    onError: () => {
      toast.error("Erro ao excluir faixa de CEP")
    }
  })

  return (
    <AlertDialog open={true} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Faixa de CEP</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir esta faixa de CEP? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              mutate()
            }}
            disabled={isPending}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isPending ? "Excluindo..." : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
