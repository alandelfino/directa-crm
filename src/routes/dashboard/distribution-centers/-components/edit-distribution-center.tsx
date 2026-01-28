import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Edit, Loader } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { privateInstance } from "@/lib/auth"
import { useEffect, useState } from "react"

const formSchema = z.object({ name: z.string().min(1, { message: "Nome é obrigatório" }) })

export function EditDistributionCenterSheet({ className, distributionCenterId, onSaved, ...props }: React.ComponentProps<"form"> & { distributionCenterId: number, onSaved?: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm<z.infer<typeof formSchema>>({ resolver: zodResolver(formSchema), defaultValues: { name: "" } })

  const closeSheet = () => { setOpen(false); form.reset() }

  async function fetchItem() {
    try {
      setLoading(true)
      const response = await privateInstance.get(`/tenant/distribution-centers/${distributionCenterId}`)
      const item = response?.data as any
      if (!item) throw new Error('Resposta inválida')
      form.reset({ name: item.name ?? "" })
    } catch (error: any) {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao carregar centro de distribuição', {
        description: errorData?.detail || 'Não foi possível carregar os dados do centro de distribuição.'
      })
    } finally { setLoading(false) }
  }

  useEffect(() => { if (open && distributionCenterId) fetchItem() }, [open, distributionCenterId])

  const { isPending, mutate } = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) => privateInstance.put(`/tenant/distribution-centers/${distributionCenterId}`, values),
    onSuccess: (response) => {
      if (response.status === 200) {
        toast.success("Centro de distribuição atualizado com sucesso!")
        closeSheet()
        queryClient.invalidateQueries({ queryKey: ['distribution-centers'] })
        onSaved?.()
      } else {
        const errorData = (response.data as any)
        toast.error(errorData?.title || 'Erro ao salvar centro de distribuição', {
          description: errorData?.detail || 'Não foi possível atualizar o centro de distribuição.'
        })
      }
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao salvar centro de distribuição', {
        description: errorData?.detail || 'Não foi possível atualizar o centro de distribuição.'
      })
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) { mutate(values) }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm"><Edit className="size-[0.85rem]" /> Editar</Button>
      </SheetTrigger>
      <SheetContent>
        <Form {...form}>
          <form {...props} onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <SheetHeader>
              <SheetTitle>Editar centro de distribuição</SheetTitle>
              <SheetDescription>
                {loading ? (<span className="flex items-center gap-2"><Loader className="animate-spin size-[0.85rem]" /> Carregando dados...</span>) : (<>Atualize os campos abaixo e salve as alterações.</>)}
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 grid auto-rows-min gap-6 px-4 py-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o nome..." {...field} disabled={loading || isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="mt-auto border-t p-4">
              <div className="grid grid-cols-2 gap-4">
                <SheetClose asChild>
                  <Button variant="outline" size="sm" className="w-full">Cancelar</Button>
                </SheetClose>
                <Button type="submit" size="sm" disabled={isPending || loading} className="w-full">{isPending ? <Loader className="animate-spin size-[0.85rem]" /> : "Salvar"}</Button>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}