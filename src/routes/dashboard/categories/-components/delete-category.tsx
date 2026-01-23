import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Loader, Trash } from "lucide-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { privateInstance } from "@/lib/auth"
import { useState } from "react"
import { toast } from "sonner"

export function DeleteCategory({ categoryId, disabled = false }: { categoryId: number | string; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const { isPending, mutate } = useMutation({
    mutationFn: async () => {
      return await privateInstance.delete(`/tenant/categories/${categoryId}`)
    },
    onSuccess: (response) => {
      if (response.status === 200 || response.status === 204) {
        toast.success('Categoria excluída com sucesso!')
        setOpen(false)
        queryClient.invalidateQueries({ queryKey: ['categories'] })
        queryClient.removeQueries({ queryKey: ['category', categoryId] })
      } else {
        const errorData = (response.data as any)
        toast.error(errorData?.title || 'Erro ao excluir categoria', {
          description: errorData?.detail || 'Não foi possível excluir a categoria.'
        })
      }
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao excluir categoria', {
        description: errorData?.detail || 'Não foi possível excluir a categoria.'
      })
    }
  })

  const handleConfirmDelete = () => {
    if (!categoryId) {
      toast.error('Erro na seleção', { description: 'Selecione uma categoria para excluir' })
      return
    }
    mutate()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="font-normal" variant="outline" size="sm" disabled={disabled || !categoryId}>
          <Trash className="size-[0.85rem]" /> Excluir
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tem certeza absoluta?</DialogTitle>
          <DialogDescription>
            Esta ação não pode ser desfeita. Isso excluirá permanentemente a categoria selecionada
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