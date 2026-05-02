import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Loader, Trash } from 'lucide-react'

export function CouponRuleDeleteDialog({
  open,
  onOpenChange,
  ruleId,
  disabled,
  isDeleting,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  ruleId: number | null
  disabled: boolean
  isDeleting: boolean
  onConfirm: (ruleId: number) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || !ruleId || isDeleting}
          onClick={() => {
            if (!ruleId) return
            onOpenChange(true)
          }}
        >
          <Trash className="size-[0.85rem]" /> Excluir
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir regra?</DialogTitle>
          <DialogDescription>Essa ação não pode ser desfeita.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" size="sm" disabled={isDeleting} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={disabled || !ruleId || isDeleting}
            onClick={() => {
              if (!ruleId) return
              onConfirm(ruleId)
            }}
          >
            {isDeleting ? <Loader className="animate-spin size-[0.85rem]" /> : 'Excluir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

