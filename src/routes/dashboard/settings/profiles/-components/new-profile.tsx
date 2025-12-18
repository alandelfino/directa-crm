import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader, Plus } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { privateInstance } from "@/lib/auth"
import { useState } from "react"

const formSchema = z.object({
  name: z.string().min(1, { message: "Nome é obrigatório" }),
})

export function NewProfileSheet({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const closeSheet = () => {
    setOpen(false)
    form.reset()
  }

  const { isPending, mutate } = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) => {
      const payload: any = { name: values.name }
      return privateInstance.post('/api:BXIMsMQ7/user_profile', payload)
    },
    onSuccess: (response) => {
      if (response.status === 200 || response.status === 201) {
        toast.success("Perfil cadastrado com sucesso!")
        closeSheet()
        queryClient.invalidateQueries({ queryKey: ['profiles'] })
      } else {
        toast.error('Erro ao cadastrar perfil')
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? 'Erro ao cadastrar perfil')
    },
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema as any),
    defaultValues: {
      name: "",
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutate(values)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="default" size="sm">
          <Plus className="size-[0.85rem]" />Cadastrar
        </Button>
      </SheetTrigger>
      <SheetContent>
        <Form {...form}>
          <form {...props} onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <SheetHeader>
              <SheetTitle>Cadastro de perfil</SheetTitle>
              <SheetDescription>
                Preencha os campos abaixo para cadastrar.
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 grid auto-rows-min gap-6 px-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite o nome do perfil..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="mt-auto border-t p-4">
              <div className="grid grid-cols-2 gap-4">
                <SheetClose asChild>
                  <Button variant="outline" size="sm" className="w-full">Cancelar</Button>
                </SheetClose>
                <Button type="submit" size="sm" disabled={isPending} className="w-full">
                  {isPending ? <Loader className="animate-spin size-[0.85rem]" /> : "Cadastrar"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}