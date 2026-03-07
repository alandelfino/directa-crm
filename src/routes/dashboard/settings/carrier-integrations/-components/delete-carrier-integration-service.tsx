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

interface DeleteCarrierIntegrationServiceDialogProps {
  carrierIntegrationId: number
  serviceId: number
  onDeleted?: () => void
  onOpenChange: (open: boolean) => void
}

export function DeleteCarrierIntegrationServiceDialog({ carrierIntegrationId, serviceId, onDeleted, onOpenChange }: DeleteCarrierIntegrationServiceDialogProps) {
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      await privateInstance.delete(`/tenant/carriers-integrations/${carrierIntegrationId}/carrier-integration-services/${serviceId}`)
    },
    onSuccess: () => {
      toast.success("Serviço excluído com sucesso")
      queryClient.invalidateQueries({ queryKey: ['carrier-integration-services', carrierIntegrationId] })
      onDeleted?.()
      onOpenChange(false)
    },
    onError: () => {
      toast.error("Erro ao excluir serviço")
    }
  })

  return (
    <AlertDialog open={true} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Serviço</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita.
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
