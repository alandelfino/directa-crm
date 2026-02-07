# Componente de Exclusão (`Delete{Resource}`)

Utiliza um `Dialog` para confirmação de ações destrutivas.

## Características Principais
- **Trigger**: Botão `variant="outline" size="sm"` com ícone `Trash`.
- **Botão de Confirmação**: `variant="destructive"`.
- **Feedback**: Mensagem clara sobre a irreversibilidade da ação.

## Template

```tsx
export function DeleteResource({ resourceId, onDeleted }: { resourceId: number, onDeleted?: () => void }) {
  const [open, setOpen] = useState(false)
  
  const { isPending, mutate } = useMutation({
    mutationFn: () => privateInstance.delete(`/endpoint/${resourceId}`),
    onSuccess: () => {
      toast.success("Excluído com sucesso!")
      setOpen(false)
      onDeleted?.()
    }
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Trash className="size-[0.85rem]" /> Excluir
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tem certeza absoluta?</DialogTitle>
          <DialogDescription>
            Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="destructive" size="sm" onClick={() => mutate()} disabled={isPending}>
            {isPending ? <Loader className="animate-spin size-[0.85rem]" /> : 'Sim, excluir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```
