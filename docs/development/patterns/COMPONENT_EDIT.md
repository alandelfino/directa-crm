# Componente de Edição (`Edit{Resource}Sheet`)

Similar ao de criação, mas busca os dados do recurso ao abrir.

## Características Principais
- **Trigger**: Botão `variant="outline" size="sm"` com ícone `Edit`.
- **Fetching**: Busca dados no `useEffect` quando `open && id` são verdadeiros.
- **Loading**: Mostra estado de carregamento na descrição ou bloqueia inputs.
- **Reset**: Reseta o formulário com os dados buscados.

## Template

```tsx
export function EditResourceSheet({ resourceId, onSaved }: { resourceId: number, onSaved?: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Fetch data logic
  useEffect(() => {
    if (open && resourceId) {
      setLoading(true)
      privateInstance.get(`/endpoint/${resourceId}`)
        .then(res => form.reset(res.data))
        .finally(() => setLoading(false))
    }
  }, [open, resourceId])

  // Mutation logic (PUT)
  const { mutate } = useMutation({
    mutationFn: (values) => privateInstance.put(`/endpoint/${resourceId}`, values),
    onSuccess: () => {
      toast.success("Atualizado com sucesso!")
      setOpen(false)
      onSaved?.()
    }
  })

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="size-[0.85rem]" /> Editar
        </Button>
      </SheetTrigger>
      <SheetContent>
        {/* Estrutura similar ao NewResourceSheet */}
        {/* Usar disabled={loading || isPending} nos inputs */}
      </SheetContent>
    </Sheet>
  )
}
```
