import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Trash2, Loader } from "lucide-react"
import { toast } from "sonner"
import { privateInstance } from "@/lib/auth"

export function DeleteCustomerDialog({ customerId }: { customerId: number }) {
  const queryClient = useQueryClient()
  const { isPending, mutate } = useMutation({
    mutationFn: async () => {
      const res = await privateInstance.delete(`/api:Th9UjqzY/customers/${customerId}`)
      return res
    },
    onSuccess: (response) => {
      if (response.status === 200) {
        toast.success('Cliente excluído!')
        queryClient.invalidateQueries({ queryKey: ['customers'] })
      } else {
        const errorData = (response.data as any)
        toast.error(errorData?.title || 'Erro ao excluir cliente', {
          description: errorData?.detail || 'Não foi possível excluir o cliente.'
        })
      }
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao excluir cliente', {
        description: errorData?.detail || 'Não foi possível excluir o cliente.'
      })
    }
  })

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive">
          <Trash2 className="size-[0.85rem]" />Excluir
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir cliente</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir este cliente? Esta ação não poderá ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm">Cancelar</Button>
          </DialogClose>
          <Button onClick={() => mutate()} size="sm" disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {isPending ? <Loader className="animate-spin size-[0.85rem]" /> : 'Excluir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}