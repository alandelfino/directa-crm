# Componente de Criação (`New{Resource}Sheet`)

Este componente utiliza um `Sheet` contendo um formulário `react-hook-form` validado com `zod`.

## Características Principais
- **Trigger**: Botão `variant="default" size="sm"` com ícone `Plus`.
- **Formulário**: Ocupa 100% da altura (`h-full flex flex-col`) para posicionar o footer na base.
- **Scroll**: A área de campos (`div className="flex-1 grid..."`) deve ter scroll se necessário.
- **Botões**: Cancelar (`outline`) e Salvar (`submit` com estado de loading).
- **Feedback**: `toast.success` e `queryClient.invalidateQueries` no sucesso.

## Template

```tsx
export function NewResourceSheet({ className, onCreated, ...props }: SheetProps & { onCreated?: () => void }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { ... }
  })

  const { isPending, mutate } = useMutation({
    mutationFn: (values) => privateInstance.post('/endpoint', values),
    onSuccess: () => {
      toast.success("Criado com sucesso!")
      setOpen(false)
      form.reset()
      queryClient.invalidateQueries({ queryKey: ['resource'] })
      onCreated?.()
    },
    onError: (error) => handleApiError(error) // Usar lógica de toast.error
  })

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="default" size="sm">
          <Plus className="size-[0.85rem]" /> Cadastrar
        </Button>
      </SheetTrigger>
      <SheetContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutate(v))} className="flex flex-col h-full">
            <SheetHeader>
              <SheetTitle>Cadastro</SheetTitle>
              <SheetDescription>Preencha os campos abaixo.</SheetDescription>
            </SheetHeader>
            
            <div className="flex-1 grid auto-rows-min gap-6 px-4 py-4 overflow-y-auto">
              {/* Campos do formulário */}
            </div>

            <div className="mt-auto border-t p-4 grid grid-cols-2 gap-4">
              <SheetClose asChild>
                <Button variant="outline" size="sm">Cancelar</Button>
              </SheetClose>
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? <Loader className="animate-spin size-[0.85rem]" /> : "Cadastrar"}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
```
