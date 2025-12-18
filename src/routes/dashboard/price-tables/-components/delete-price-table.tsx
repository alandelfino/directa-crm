import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Trash, Loader } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { privateInstance } from '@/lib/auth'
import { useState } from 'react'
import { toast } from 'sonner'

export function DeletePriceTable({ priceTableId, disabled = false }: { priceTableId: number; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async () => {
      const response = await privateInstance.delete(`/api:m3u66HYX/price_tables/${priceTableId}`)
      if (response.status !== 200 && response.status !== 204) throw new Error('Erro ao excluir tabela de preço')
      return response.data
    },
    onSuccess: () => { toast.success('Tabela de preço excluída com sucesso!'); setOpen(false); queryClient.invalidateQueries({ queryKey: ['price-tables'] }) },
    onError: (error: any) => { toast.error(error?.response?.data?.message ?? 'Erro ao excluir tabela de preço') },
  })

  const handleConfirmDelete = async () => { if (!priceTableId) { toast.error('Selecione a tabela de preço'); return } await mutateAsync() }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant='outline' size='sm' disabled={disabled || !priceTableId}>
          <Trash className="size-[0.85rem]" /> Excluir
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tem certeza absoluta?</DialogTitle>
          <DialogDescription>Esta ação não pode ser desfeita. Isso excluirá permanentemente a tabela de preço selecionada.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant='outline' size="sm" onClick={() => setOpen(false)} disabled={isPending}>Cancelar</Button>
          <Button variant='destructive' size="sm" onClick={handleConfirmDelete} disabled={isPending}>
            {isPending ? <Loader className='animate-spin size-[0.85rem]' /> : 'Sim, tenho certeza'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}