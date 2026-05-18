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
import { useCallback, useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"

const formSchema = z.object({
  name: z.string().min(1, { message: "Nome é obrigatório" }),
})

export function EditOrderStatusSheet({
  orderStatusId,
}: { orderStatusId: number }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: "",
    }
  })

  const closeSheet = useCallback(() => {
    setOpen(false)
    form.reset()
  }, [form])

  const fetchOrderStatus = useCallback(async () => {
    if (!orderStatusId) return
    try {
      setLoading(true)
      const response = await privateInstance.get(`/tenant/order-status/${orderStatusId}`)
      const data = response?.data
      if (!data) {
        throw new Error('Resposta inválida ao buscar status de pedido')
      }
      form.reset({
        name: data.name ?? "",
      })
    } catch (error: any) {
      const errorData = error?.response?.data
      toast.error(errorData?.title || "Erro ao carregar status de pedido", {
        description: errorData?.detail || 'Não foi possível carregar o status de pedido.'
      })
      closeSheet()
    } finally {
      setLoading(false)
    }
  }, [closeSheet, form, orderStatusId])

  useEffect(() => {
    if (open) fetchOrderStatus()
  }, [open, fetchOrderStatus])

  const { isPending, mutate } = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) => {
      return privateInstance.put(`/tenant/order-status/${orderStatusId}`, values)
    },
    onSuccess: (response) => {
      if (response.status === 200) {
        toast.success("Status de pedido atualizado com sucesso!")
        closeSheet()
        queryClient.invalidateQueries({ queryKey: ['order-status'] })
      } else {
        const errorData = response?.data
        toast.error(errorData?.title || "Erro!", {
          description: errorData?.detail || 'Erro ao salvar status de pedido'
        })
      }
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || "Erro!", {
        description: errorData?.detail || 'Erro ao salvar status de pedido'
      })
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutate(values)
  }

  return (
    <Sheet open={open} onOpenChange={(val) => {
      setOpen(val)
      if (!val) form.reset()
    }}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="mr-2 h-4 w-4" /> Editar
        </Button>
      </SheetTrigger>
      <SheetContent>
        <Form {...form}>
          <form onSubmit={(e) => { e.stopPropagation(); form.handleSubmit(onSubmit)(e); }} className="flex flex-col h-full">
            <SheetHeader>
              <SheetTitle>Editar status de pedido</SheetTitle>
              <SheetDescription>
                {loading ? (
                  <span className="flex items-center gap-2"><Loader className="w-4 h-4 animate-spin" />Carregando dados...</span>
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
                      {loading ? (
                        <Skeleton className="h-9 w-full" />
                      ) : (
                        <Input placeholder="Digite o nome do status de pedido..." {...field} disabled={loading || isPending} />
                      )}
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
                <Button type="submit" size="sm" disabled={isPending || loading} className="w-full">
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
