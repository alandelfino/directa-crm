import { Button } from "@/components/ui/button";
import { Trash, Loader } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { privateInstance } from "@/lib/auth";
import { toast } from "sonner";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { useState } from "react";

export function DeleteMediaSize({ mediaSizeId }: { mediaSizeId: number }) {
    const [open, setOpen] = useState(false)
    const queryClient = useQueryClient()

    const { isPending, mutate } = useMutation({
        mutationFn: async () => {
            return await privateInstance.delete(`/api:jJaPcZVn/media_size/${mediaSizeId}`)
        },
        onSuccess: (response) => {
            if (response.status === 200 || response.status === 204) {
                toast.success('Tamanho de mídia excluído com sucesso!')
                setOpen(false)
                queryClient.invalidateQueries({ queryKey: ['media-sizes'] })
            } else {
                toast.error('Erro ao excluir tamanho de mídia')
            }
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message ?? 'Erro ao excluir tamanho de mídia')
        }
    })

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant={'outline'} size="sm">
                    <Trash className="size-[0.85rem]" /> Excluir
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Você tem certeza?</DialogTitle>
                    <DialogDescription>
                        Essa ação não pode ser desfeita. Isso excluirá permanentemente o tamanho de mídia.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline" size="sm">Cancelar</Button>
                    </DialogClose>
                    <Button variant="destructive" size="sm" onClick={(e) => {
                        e.preventDefault()
                        mutate()
                    }} disabled={isPending}>
                        {isPending ? <Loader className="animate-spin size-[0.85rem]" /> : 'Excluir'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
