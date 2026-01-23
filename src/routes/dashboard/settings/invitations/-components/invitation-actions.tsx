import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { useMutation } from '@tanstack/react-query'
import { privateInstance } from '@/lib/auth'
import { toast } from 'sonner'
import { Loader, Power, XCircle } from 'lucide-react'

type InvitationLike = {
  id: number
  active?: boolean
  accepted?: boolean
  status?: 'pending' | 'accepted' | 'canceled' | 'revoked'
  email?: string
}

export function InvitationActionsCell({ invitation, onChanged }: { invitation: InvitationLike, onChanged?: () => void }) {
  const [open, setOpen] = useState(false)
  const [openCancel, setOpenCancel] = useState(false)
  const isActive = invitation.active === true
  const rawStatus = ((invitation as any)?.status ?? '').toString().trim().toLowerCase()
  const isCanceled = rawStatus === 'canceled' || rawStatus === 'cancelled' || rawStatus === 'revoked'

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async (nextActive: boolean) => {
      const url = `/api:0jQElwax/invitations/${invitation.id}/status`
      const response = await privateInstance.put(url, { active: nextActive })
      if (response.status !== 200) throw new Error('Falha ao atualizar status do convite')
      return response.data
    },
    onSuccess: () => {
      toast.success('Status do convite atualizado')
      onChanged?.()
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao atualizar convite', {
        description: errorData?.detail || 'Não foi possível atualizar o status do convite.'
      })
    }
  })

  async function confirm() {
    await mutateAsync(false)
    setOpen(false)
  }

  const { isPending: isCancelling, mutateAsync: cancelInvite } = useMutation({
    mutationFn: async () => {
      const url = `/api:0jQElwax/invitations/${invitation.id}/cancel`
      const response = await privateInstance.post(url, {})
      if (response.status < 200 || response.status >= 300) throw new Error('Falha ao cancelar convite')
      return response.data
    },
    onSuccess: () => {
      toast.success('Convite cancelado')
      onChanged?.()
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.title ?? 'Erro ao cancelar convite', {
        description: error?.response?.data?.detail ?? 'Não foi possível cancelar o convite. Tente novamente.'
      })
    }
  })

  async function confirmCancel() {
    await cancelInvite()
    setOpenCancel(false)
  }

  if (isCanceled) {
    return null
  }

  return (
    <div className='space-y-2'>
      {isActive && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant={'destructive'} className='w-full' disabled={isPending}>
              {isPending ? <Loader className='animate-spin' /> : <Power />} Desativar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Desativar convite</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja desativar este convite? O usuário não poderá utilizá-lo.
              </DialogDescription>
            </DialogHeader>
            <div className='space-y-2 py-2'></div>
            <DialogFooter className='flex gap-2'>
              <Button variant={'outline'} onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={confirm} disabled={isPending} variant={'destructive'}>
                {isPending ? <Loader className='animate-spin' /> : null}
                Desativar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {rawStatus === 'pending' && (
        <Dialog open={openCancel} onOpenChange={setOpenCancel}>
          <DialogTrigger asChild>
            <Button variant={'destructive'} className='w-full' disabled={isCancelling} title={'Cancelar'} aria-label={'Cancelar'}>
              {isCancelling ? <Loader className='animate-spin' /> : <XCircle />}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancelar convite</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja cancelar este convite? O usuário não poderá utilizá-lo e não poderá ser reativado.
              </DialogDescription>
            </DialogHeader>
            <div className='space-y-2 py-2'></div>
            <DialogFooter className='flex gap-2'>
              <Button variant={'outline'} onClick={() => setOpenCancel(false)}>Voltar</Button>
              <Button onClick={confirmCancel} disabled={isCancelling} variant={'destructive'}>
                {isCancelling ? <Loader className='animate-spin' /> : null}
                Cancelar convite
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}