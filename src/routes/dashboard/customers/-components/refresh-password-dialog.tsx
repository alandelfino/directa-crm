import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { privateInstance } from "@/lib/auth"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"

interface RefreshPasswordDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    customerId: number
}

export function RefreshPasswordDialog({ open, onOpenChange, customerId }: RefreshPasswordDialogProps) {
    const { mutate, isPending } = useMutation({
        mutationFn: async () => {
            const response = await privateInstance.post(`/tenant/customers/${customerId}/refresh-password`)
            return response.data
        },
        onSuccess: (data: any) => {
            toast.success(data?.title || 'Senha gerada com sucesso!', {
                description: data?.detail || 'A nova senha foi enviada para o email do cliente.'
            })
            onOpenChange(false)
        },
        onError: (error: any) => {
            const errorData = error?.response?.data
            toast.error(errorData?.title || 'Erro ao gerar senha', {
                description: errorData?.detail || 'Não foi possível gerar uma nova senha.'
            })
        }
    })

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Gerar nova senha</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tem certeza que deseja gerar uma nova senha para este cliente? 
                        A senha atual será invalidada e a nova senha será enviada para o email cadastrado.
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
                    >
                        {isPending ? 'Gerando...' : 'Confirmar'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
