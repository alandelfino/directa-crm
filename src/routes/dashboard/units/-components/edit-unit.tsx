import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Edit, Loader } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { privateInstance } from "@/lib/auth"
import { useEffect, useState } from "react"

const formSchema = z.object({
  name: z.string().min(1, { message: "Nome é obrigatório" }),
  type: z.enum(["integer", "decimal"], { message: "Tipo é obrigatório" }),
})

export function EditUnitSheet({
  className,
  unitId,
  ...props
}: React.ComponentProps<"form"> & { unitId: number }) {
  const [open, setOpen] = useState(false)
  const [unitLoading, setUnitLoading] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema as any),
    defaultValues: {
      name: "",
      type: "integer",
    },
  })

  const closeSheet = () => {
    setOpen(false)
    form.reset()
  }

  async function fetchUnit() {
    try {
      setUnitLoading(true)
      const response = await privateInstance.get(`/api:-b71x_vk/unit_of_measurement/${unitId}`)
      const unit = response?.data
      if (!unit) {
        throw new Error('Resposta inválida ao buscar unidade')
      }
      form.reset({ name: unit.name ?? "", type: unit.type ?? "integer" })
    } catch (error: any) {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao carregar unidade', {
        description: errorData?.detail || 'Não foi possível carregar os dados da unidade.'
      })
    } finally {
      setUnitLoading(false)
    }
  }

  useEffect(() => {
    if (open && unitId) {
      fetchUnit()
    }
  }, [open, unitId])

  const { isPending, mutate } = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) => {
      // Xano especifica PUT com name e type obrigatórios
      return privateInstance.put(`/api:-b71x_vk/unit_of_measurement/${unitId}`, values)
    },
    onSuccess: (response) => {
      if (response.status === 200) {
        toast.success("Unidade atualizada com sucesso!")
        closeSheet()
        queryClient.invalidateQueries({ queryKey: ['units'] })
      } else {
        const errorData = (response.data as any)
        toast.error(errorData?.title || 'Erro ao salvar unidade', {
          description: errorData?.detail || 'Não foi possível atualizar a unidade.'
        })
      }
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao salvar unidade', {
        description: errorData?.detail || 'Não foi possível atualizar a unidade.'
      })
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutate(values)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="size-[0.85rem]" />Editar
        </Button>
      </SheetTrigger>
      <SheetContent>
        <Form {...form}>
          <form {...props} onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <SheetHeader>
              <SheetTitle>Editar unidade</SheetTitle>
              <SheetDescription>
                {unitLoading ? (
                  <span className="flex items-center gap-2"><Loader className="animate-spin size-[0.85rem]" />Carregando dados da unidade...</span>
                ) : (
                  <>Atualize os campos abaixo e salve as alterações.</>
                )}
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
                      <Input placeholder="Digite o nome da unidade..." {...field} disabled={unitLoading || isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value={"integer"}>Inteiro</SelectItem>
                            <SelectItem value={"decimal"}>Decimal</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
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
                <Button type="submit" size="sm" disabled={isPending || unitLoading} className="w-full">
                  {isPending ? <Loader className="animate-spin size-[0.85rem]" /> : "Salvar"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}