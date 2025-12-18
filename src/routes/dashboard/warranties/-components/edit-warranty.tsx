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
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const formSchema = z.object({
  name: z.string().min(1, { message: "Nome é obrigatório" }),
  store_name: z.string().min(1, { message: "Loja é obrigatória" }),
  period: z.enum(["day", "month", "year"] as const, { message: "Período é obrigatório" }),
  amount: z.coerce.number().int().min(1, { message: "Quantidade deve ser pelo menos 1" }),
  price: z.coerce.number().int().min(0, { message: "Preço deve ser >= 0" }),
})

export function EditWarrantySheet({ className, warrantyId, ...props }: React.ComponentProps<"form"> & { warrantyId: number }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()
  const formatCurrencyBRL = (centavos: number) => {
    const value = typeof centavos === 'number' && !isNaN(centavos) ? centavos : 0
    const reais = Math.floor(value / 100)
    const cents = Math.abs(value % 100)
    return `R$ ${reais.toLocaleString('pt-BR')},${cents.toString().padStart(2, '0')}`
  }
  const [priceDisplay, setPriceDisplay] = useState<string>(formatCurrencyBRL(0))

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: "",
      store_name: "",
      period: "month",
      amount: 12,
      price: 0,
    },
  })

  const closeSheet = () => {
    setOpen(false)
    form.reset()
    setPriceDisplay(formatCurrencyBRL(0))
  }

  async function fetchWarranty() {
    try {
      setLoading(true)
      const response = await privateInstance.get(`/api:PcyOgAiT/warranties/${warrantyId}`)
      const warranty = response?.data
      if (!warranty) throw new Error('Resposta inválida ao buscar garantia')
      form.reset({
        name: warranty.name ?? "",
        store_name: warranty.store_name ?? "",
        period: warranty.period ?? "month",
        amount: warranty.amount ?? 12,
        price: warranty.price ?? 0,
      })
      setPriceDisplay(formatCurrencyBRL(warranty.price ?? 0))
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Erro ao carregar garantia')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && warrantyId) {
      fetchWarranty()
    }
  }, [open, warrantyId])

  const { isPending, mutate } = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) => privateInstance.put(`/api:PcyOgAiT/warranties/${warrantyId}`, values),
    onSuccess: (response) => {
      if (response.status === 200) {
        toast.success('Garantia atualizada com sucesso!')
        closeSheet()
        queryClient.invalidateQueries({ queryKey: ['warranties'] })
      } else {
        toast.error('Erro ao salvar garantia')
      }
    },
    onError: (error: any) => {
      toast.error(error?.message ?? 'Erro ao atualizar garantia')
    }
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
              <SheetTitle>Editar garantia</SheetTitle>
              <SheetDescription>
                {loading ? (
                  <span className="flex items-center gap-2"><Loader className="animate-spin size-[0.85rem]" />Carregando dados da garantia...</span>
                ) : (
                  <>Atualize os campos abaixo e salve as alterações.</>
                )}
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 grid auto-rows-min gap-6 px-4 py-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o nome da garantia..." {...field} disabled={loading || isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="store_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Loja</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o nome da loja..." {...field} disabled={loading || isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="period" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Período</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um período" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="day">Dia</SelectItem>
                            <SelectItem value="month">Mês</SelectItem>
                            <SelectItem value="year">Ano</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} step={1} placeholder="Ex.: 12" {...field} disabled={loading || isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="price" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço</FormLabel>
                    <FormControl>
                      <Input
                        inputMode="numeric"
                        placeholder="R$ 0,00"
                        value={priceDisplay}
                        onChange={(e) => {
                          const onlyDigits = e.target.value.replace(/\D/g, '')
                          const centavos = onlyDigits ? parseInt(onlyDigits, 10) : 0
                          setPriceDisplay(formatCurrencyBRL(centavos))
                          field.onChange(centavos)
                        }}
                        disabled={loading || isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
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