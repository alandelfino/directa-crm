import { Button } from "@/components/ui/button";
import { Trash, Loader } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { privateInstance } from "@/lib/auth";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { useState } from "react";

export function DeleteOrderStatus({ orderStatusId, disabled = false }: { orderStatusId: number; disabled?: boolean }) {
    const [open, setOpen] = useState(false)
    const queryClient = useQueryClient()

    const { isPending, mutate } = useMutation({
        mutationFn: async () => {
            return await privateInstance.delete(`/tenant/order-status/${orderStatusId}`)
        },
        onSuccess: (response) => {
            if (response.status === 200 || response.status === 204) {
                toast.success('Status de pedido excluído com sucesso!')
                setOpen(false)
                queryClient.invalidateQueries({ queryKey: ['order-status'] })
            } else {
                const errorData = (response.data as any)
                toast.error(errorData?.title || "Erro ao excluir status de pedido", {
                    description: errorData?.detail || 'Não foi possível excluir o status de pedido.'
                })
            }
        },
        onError: (error: any) => {
            const errorData = error?.response?.data
            toast.error(errorData?.title || "Erro ao excluir status de pedido", {
                description: errorData?.detail || 'Não foi possível excluir o status de pedido.'
            })
        }
    })

    const handleConfirmDelete = () => {
        if (!orderStatusId) {
            toast.error('Erro na seleção', { description: 'Selecione um status de pedido para excluir' })
            return
        }
        mutate()
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={disabled || !orderStatusId}>
                    <Trash className="size-[0.85rem]" /> Excluir
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Tem certeza absoluta?</DialogTitle>
                    <DialogDescription>
                        Esta ação não pode ser desfeita. Isso excluirá permanentemente o status de pedido selecionado
                        e removerá seus dados de nossos servidores.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={isPending}>Cancelar</Button>
                    <Button variant="destructive" size="sm" onClick={handleConfirmDelete} disabled={isPending}>
                        {isPending ? <Loader className="animate-spin size-[0.85rem]" /> : 'Sim, tenho certeza'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
