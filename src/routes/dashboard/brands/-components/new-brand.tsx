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

export function NewBrandSheet({
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
      return privateInstance.post('/tenant/brands', values)
        },
        onSuccess: (response) => {
            if (response.status === 200 || response.status === 201) {
                toast.success("Marca cadastrada com sucesso!")
                closeSheet()
                // Atualiza a listagem de marcas
                queryClient.invalidateQueries({ queryKey: ['brands'] })
            } else {
                const errorData = (response.data as any)
                toast.error(errorData?.title || 'Erro ao cadastrar marca', {
                    description: errorData?.detail || 'Não foi possível cadastrar a marca.'
                })
            }
        },
        onError: (error: any) => {
            const errorData = error?.response?.data
            toast.error(errorData?.title || 'Erro ao cadastrar marca', {
                description: errorData?.detail || 'Não foi possível cadastrar a marca.'
            })
        },
    })

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: ""
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
                            <SheetTitle>Cadastro de marca</SheetTitle>
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
                                            <Input placeholder="Digite o nome da marca..." {...field} />
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
