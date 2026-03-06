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

interface DeleteCarrierIntegrationDialogProps {
  id: number
  onOpenChange: (open: boolean) => void
}

export function DeleteCarrierIntegrationDialog({ id, onOpenChange }: DeleteCarrierIntegrationDialogProps) {
  const queryClient = useQueryClient()

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async () => {
      await privateInstance.delete(`/tenant/carriers-integrations/${id}`)
    },
    onSuccess: () => {
      toast.success('Integração excluída com sucesso')
      queryClient.invalidateQueries({ queryKey: ['carrier-integrations'] })
      onOpenChange(false)
    },
    onError: () => {
      toast.error('Erro ao excluir integração')
    }
  })

  return (
    <AlertDialog open={true} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Integração</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir esta integração? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => {
              e.preventDefault()
              mutateAsync()
            }}
            disabled={isPending}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isPending ? 'Excluindo...' : 'Excluir'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
