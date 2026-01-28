import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Loader } from "lucide-react"
import { useForm } from "react-hook-form"
import { useEffect, useState } from "react"
import { z } from "zod"
import { toast } from "sonner"
import { privateInstance } from "@/lib/auth"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const formSchema = z.object({
  nameOrCompanyName: z.string().min(1, { message: "Campo obrigatório" }),
  lastNameOrTradeName: z.string().min(1, { message: "Campo obrigatório" }),
  personType: z.enum(["natural","entity"] as const, { message: "Campo obrigatório" }),
  cpfOrCnpj: z.string().min(1, { message: "Campo obrigatório" }),
  rgOrIe: z.string().min(1, { message: "Campo obrigatório" }),
  phone: z.string().min(1, { message: "Campo obrigatório" }),
  email: z.string().email({ message: "Email inválido" }).min(1, { message: "Campo obrigatório" }),
})

export function NewCustomerSheet({ className, onOpenChange, onCreated, ...props }: React.ComponentProps<"form"> & { onOpenChange?: (open: boolean) => void, onCreated?: () => void }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      nameOrCompanyName: "",
      lastNameOrTradeName: "",
      personType: "natural",
      cpfOrCnpj: "",
      rgOrIe: "",
      phone: "",
      email: "",
    },
  })

  // Assistir o tipo de pessoa para ajustar labels dinamicamente
  const personType = form.watch('personType')

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
  
  const formatPhone = (v: string) => {
    let d = onlyDigits(v).slice(0, 11)
    d = d.replace(/^(\d{2})(\d)/, '($1) $2')
    d = d.replace(/(\d)(\d{4})$/, '$1-$2')
    return d
  }

  // Ajustar o tamanho do valor quando o tipo muda
  useEffect(() => {
    const current = onlyDigits(form.getValues('cpfOrCnpj'))
    const maxLen = personType === 'entity' ? 14 : 11
    form.setValue('cpfOrCnpj', current.slice(0, maxLen))
  }, [personType])

  const closeSheet = () => {
    setOpen(false)
    if (onOpenChange) onOpenChange(false)
    form.reset()
  }
  
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (onOpenChange) onOpenChange(newOpen)
    if (!newOpen) form.reset()
  }

  const { isPending, mutate } = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) => privateInstance.post(`/tenant/customers`, values),
    onSuccess: (response) => {
      if (response.status === 200 || response.status === 201) {
        toast.success('Cliente criado com sucesso!')
        queryClient.invalidateQueries({ queryKey: ['customers'] })
        if (onCreated) onCreated()
        closeSheet()
      } else {
        const errorData = response?.data as any
        toast.error(errorData?.title || 'Erro ao salvar cliente', {
            description: errorData?.detail || 'Não foi possível cadastrar o cliente.'
        })
      }
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || 'Erro ao criar cliente', {
          description: errorData?.detail || 'Não foi possível cadastrar o cliente.'
      })
    }
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutate(values)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button size="sm">
          <Plus className="size-[0.85rem]" /> Novo cliente
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-lg md:max-w-2xl lg:max-w-xl w-full">
        <Form {...form}>
          <form {...props} onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <SheetHeader>
              <SheetTitle>Novo cliente</SheetTitle>
              <SheetDescription>Preencha os campos abaixo para cadastrar um novo cliente.</SheetDescription>
            </SheetHeader>
            <div className="flex-1 min-h-0 overflow-y-auto grid auto-rows-min gap-6 px-4 py-4">
              {/* Tipo de pessoa no topo */}
              <FormField control={form.control} name="personType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="max-w-[150px]">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="natural">Pessoa Física</SelectItem>
                          <SelectItem value="entity">Pessoa Jurídica</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="nameOrCompanyName" render={({ field }) => (
                <FormItem>
                  <FormLabel>{personType === 'entity' ? 'Razão Social' : 'Nome'}</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o nome do cliente..." {...field} disabled={isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="lastNameOrTradeName" render={({ field }) => (
                <FormItem>
                  <FormLabel>{personType === 'entity' ? 'Nome Fantasia' : 'Sobrenome'}</FormLabel>
                  <FormControl>
                    <Input placeholder="Opcional" {...field} disabled={isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="cpfOrCnpj" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{personType === 'entity' ? 'CNPJ' : 'CPF'}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={personType === 'entity' ? '00.000.000/0000-00' : '000.000.000-00'}
                        value={personType === 'entity' ? formatCnpj(field.value ?? '') : formatCpf(field.value ?? '')}
                        onChange={(e) => {
                          const digits = onlyDigits(e.target.value)
                          const maxLen = personType === 'entity' ? 14 : 11
                          field.onChange(digits.slice(0, maxLen))
                        }}
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="rgOrIe" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{personType === 'entity' ? 'Inscrição Estadual (IE)' : 'RG'}</FormLabel>
                    <FormControl>
                      <Input placeholder="Opcional" {...field} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="email@exemplo.com" {...field} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="(00) 00000-0000" 
                        value={formatPhone(field.value ?? '')}
                        onChange={(e) => {
                           const digits = onlyDigits(e.target.value)
                           field.onChange(digits.slice(0, 11))
                        }}
                        disabled={isPending} 
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
                <Button type="submit" size="sm" disabled={isPending} className="w-full">
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
