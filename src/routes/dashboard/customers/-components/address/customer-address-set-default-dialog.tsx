import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader, Star } from 'lucide-react'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { privateInstance } from '@/lib/auth'

export function CustomerAddressSetDefaultDialog({ customerId, addressId, onUpdated }: { customerId: number, addressId: number, onUpdated?: () => void }) {
  const [open, setOpen] = useState(false)
  const { isPending: loading, mutate: setDefault } = useMutation({
    mutationFn: async () => {
      const response = await privateInstance.post(`/tenant/customers/${customerId}/address/${addressId}/default`)
      if (response.status !== 200 && response.status !== 204) throw new Error('Erro ao definir endereço como padrão')
      return response
    },
    onSuccess: () => {
      toast.success('Endereço definido como padrão com sucesso!')
      setOpen(false)
      onUpdated?.()
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao definir endereço como padrão', {
        description: errorData?.detail || 'Não foi possível realizar a ação.'
      })
    }
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={'sm'} variant={'outline'}><Star className="size-[0.85rem] mr-2" /> Definir como padrão</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Definir como padrão</DialogTitle>
          <DialogDescription>Deseja definir este endereço como o padrão para o cliente?</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant='outline' size="sm">Cancelar</Button>
          </DialogClose>
          <Button size="sm" onClick={() => setDefault()} disabled={loading}>{loading ? <Loader className='animate-spin size-[0.85rem]' /> : 'Confirmar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
