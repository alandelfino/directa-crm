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

const states = [
  "Acre","Alagoas","Amapá","Amazonas","Bahia","Ceará","Distrito Federal","Espírito Santo","Goiás","Maranhão","Mato Grosso","Mato Grosso do Sul","Minas Gerais","Pará","Paraíba","Paraná","Pernambuco","Piauí","Rio de Janeiro","Rio Grande do Norte","Rio Grande do Sul","Rondônia","Roraima","Santa Catarina","São Paulo","Sergipe","Tocantins"
] as const

const formSchema = z.object({
  name_or_company_name: z.string().min(1, { message: "Campo obrigatório" }),
  last_name_or_trade_name: z.string().min(1, { message: "Campo obrigatório" }),
  person_type: z.enum(["individuals","legal_entities"] as const, { message: "Campo obrigatório" }),
  cpf_or_cnpj: z.string().min(1, { message: "Campo obrigatório" }),
  rg_or_ie: z.string().min(1, { message: "Campo obrigatório" }),
  email: z.string().email({ message: "Email inválido" }).min(1, { message: "Campo obrigatório" }),
  website: z.string().url({ message: "URL inválida" }).optional().or(z.literal("")),
  address_street: z.string().min(1, { message: "Campo obrigatório" }),
  address_number: z.coerce.number().int().optional(),
  neighborhood: z.string().min(1, { message: "Campo obrigatório" }),
  address_supplement: z.string().optional().or(z.literal("")),
  address_city: z.string().min(1, { message: "Campo obrigatório" }),
  address_state: z.enum(states as any, { message: "Campo obrigatório" }),
  postal_code: z.string().min(1, { message: "Campo obrigatório" }),
})

export function EditCustomerSheet({ className, customerId, ...props }: React.ComponentProps<"form"> & { customerId: number }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name_or_company_name: "",
      last_name_or_trade_name: "",
      person_type: "individuals",
      cpf_or_cnpj: "",
      rg_or_ie: "",
      email: "",
      website: "",
      address_street: "",
      address_number: undefined,
      neighborhood: "",
      address_supplement: "",
      address_city: "",
      address_state: undefined,
      postal_code: "",
    },
  })

  // Assistir o tipo de pessoa para ajustar labels dinamicamente
  const personType = form.watch('person_type')

  // Funções de máscara CPF/CNPJ
  const onlyDigits = (v: string) => (v ?? '').replace(/\D/g, '')
  const formatCpf = (v: string) => {
    let d = onlyDigits(v).slice(0, 11)
    d = d.replace(/^(\d{3})(\d)/, '$1.$2')
    d = d.replace(/^(\d{3}\.\d{3})(\d)/, '$1.$2')
    d = d.replace(/^(\d{3}\.\d{3}\.\d{3})(\d)/, '$1-$2')
    return d
  }
  const formatCnpj = (v: string) => {
    let d = onlyDigits(v).slice(0, 14)
    d = d.replace(/^(\d{2})(\d)/, '$1.$2')
    d = d.replace(/^(\d{2}\.\d{3})(\d)/, '$1.$2')
    d = d.replace(/^(\d{2}\.\d{3}\.\d{3})(\d)/, '$1/$2')
    d = d.replace(/^(\d{2}\.\d{3}\.\d{3}\/\d{4})(\d)/, '$1-$2')
    return d
  }

  const closeSheet = () => {
    setOpen(false)
    form.reset()
  }

  async function fetchCustomer() {
    try {
      setLoading(true)
      const response = await privateInstance.get(`/api:Th9UjqzY/customers/${customerId}`)
      const c = response?.data
      if (!c) throw new Error('Resposta inválida ao buscar cliente')
      form.reset({
        name_or_company_name: c.name_or_company_name ?? "",
        last_name_or_trade_name: c.last_name_or_trade_name ?? "",
        person_type: c.person_type ?? "legal_entities",
        cpf_or_cnpj: c.cpf_or_cnpj ?? "",
        rg_or_ie: c.rg_or_ie ?? "",
        email: c.email ?? "",
        website: c.website ?? "",
        address_street: c.address_street ?? "",
        address_number: c.address_number ?? undefined,
        neighborhood: c.neighborhood ?? "",
        address_supplement: c.address_supplement ?? "",
        address_city: c.address_city ?? "",
        address_state: c.address_state ?? undefined,
        postal_code: c.postal_code ?? "",
      })
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Erro ao carregar cliente')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && customerId) {
      fetchCustomer()
    }
  }, [open, customerId])

  // Ajustar o tamanho do valor quando o tipo muda
  useEffect(() => {
    const current = onlyDigits(form.getValues('cpf_or_cnpj'))
    const maxLen = personType === 'legal_entities' ? 14 : 11
    form.setValue('cpf_or_cnpj', current.slice(0, maxLen))
  }, [personType])

  const { isPending, mutate } = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) => privateInstance.put(`/api:Th9UjqzY/customers/${customerId}`, values),
    onSuccess: (response) => {
      if (response.status === 200) {
        toast.success('Cliente atualizado com sucesso!')
        closeSheet()
        queryClient.invalidateQueries({ queryKey: ['customers'] })
      } else {
        toast.error('Erro ao salvar cliente')
      }
    },
    onError: (error: any) => {
      toast.error(error?.message ?? 'Erro ao atualizar cliente')
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
      <SheetContent className="sm:max-w-lg md:max-w-2xl lg:max-w-xl w-full">
        <Form {...form}>
          <form {...props} onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <SheetHeader>
              <SheetTitle>Editar cliente</SheetTitle>
              <SheetDescription>
                {loading ? (
                  <span className="flex items-center gap-2"><Loader className="animate-spin size-[0.85rem]" />Carregando dados do cliente...</span>
                ) : (
                  <>Atualize os campos abaixo e salve as alterações.</>
                )}
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 min-h-0 overflow-y-auto grid auto-rows-min gap-6 px-4 py-4">
              {/* Tipo de pessoa no topo */}
              <FormField control={form.control} name="person_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="max-w-[150px]">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="individuals">Pessoa Física</SelectItem>
                          <SelectItem value="legal_entities">Pessoa Jurídica</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="name_or_company_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>{personType === 'legal_entities' ? 'Razão Social' : 'Nome'}</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o nome do cliente..." {...field} disabled={loading || isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="last_name_or_trade_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>{personType === 'legal_entities' ? 'Nome Fantasia' : 'Sobrenome'}</FormLabel>
                  <FormControl>
                    <Input placeholder="Opcional" {...field} disabled={loading || isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="cpf_or_cnpj" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{personType === 'legal_entities' ? 'CNPJ' : 'CPF'}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={personType === 'legal_entities' ? '00.000.000/0000-00' : '000.000.000-00'}
                        value={personType === 'legal_entities' ? formatCnpj(field.value ?? '') : formatCpf(field.value ?? '')}
                        onChange={(e) => {
                          const digits = onlyDigits(e.target.value)
                          const maxLen = personType === 'legal_entities' ? 14 : 11
                          field.onChange(digits.slice(0, maxLen))
                        }}
                        disabled={loading || isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="rg_or_ie" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{personType === 'legal_entities' ? 'Inscrição Estadual (IE)' : 'RG'}</FormLabel>
                    <FormControl>
                      <Input placeholder="Opcional" {...field} disabled={loading || isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="email@exemplo.com" {...field} disabled={loading || isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="website" render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input placeholder="https://exemplo.com" {...field} disabled={loading || isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="address_street" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rua</FormLabel>
                    <FormControl>
                      <Input placeholder="Rua" {...field} disabled={loading || isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="address_number" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step={1} placeholder="Número" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value, 10) : undefined)} disabled={loading || isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="neighborhood" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bairro</FormLabel>
                    <FormControl>
                      <Input placeholder="Bairro" {...field} disabled={loading || isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="address_supplement" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Complemento</FormLabel>
                    <FormControl>
                      <Input placeholder="Complemento" {...field} disabled={loading || isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="address_city" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade</FormLabel>
                    <FormControl>
                      <Input placeholder="Cidade" {...field} disabled={loading || isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="address_state" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione o estado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {states.map((uf) => (
                              <SelectItem value={uf} key={uf}>{uf}</SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="postal_code" render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEP</FormLabel>
                    <FormControl>
                      <Input placeholder="00000-000" {...field} disabled={loading || isPending} />
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
