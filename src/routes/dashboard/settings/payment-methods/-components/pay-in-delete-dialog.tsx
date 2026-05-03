import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Loader, Trash } from 'lucide-react'

export function PayInDeleteDialog({
  open,
  onOpenChange,
  payInId,
  disabled,
  isDeleting,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  payInId: number | null
  disabled: boolean
  isDeleting: boolean
  onConfirm: (payInId: number) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || !payInId || isDeleting}
          onClick={() => {
            if (!payInId) return
            onOpenChange(true)
          }}
        >
          <Trash className="size-[0.85rem]" /> Excluir
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir condição?</DialogTitle>
          <DialogDescription>Essa ação não pode ser desfeita.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" size="sm" disabled={isDeleting} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={disabled || !payInId || isDeleting}
            onClick={() => {
              if (!payInId) return
              onConfirm(payInId)
            }}
          >
            {isDeleting ? <Loader className="animate-spin size-[0.85rem]" /> : 'Excluir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

