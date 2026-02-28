import { useMutation, useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader, Plus, Edit } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { privateInstance } from "@/lib/auth"
import { useState } from "react"
import { Switch } from "@/components/ui/switch"

export type CustomerUser = {
  id: string
  name: string
  email: string
  type: string
  storeId?: number
  priceTableId?: number
  active?: boolean
  createdAt: string
  updatedAt: string
  store?: {
    id: number
    name: string
  }
}

const formSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  storeId: z.coerce.number().min(1, 'Loja é obrigatória'),
  priceTableId: z.coerce.number().optional(),
  active: z.boolean().optional(),
})

type UserFormSheetProps = React.ComponentProps<"form"> & {
  trigger?: React.ReactNode
  customerId: number
  user?: CustomerUser | null
  onSuccess: () => void
}

export function UserFormSheet({
    className,
    trigger,
    customerId,
    user,
    onSuccess,
    ...props
}: UserFormSheetProps) {

    const [open, setOpen] = useState(false)

    // Fetch Stores
    const { data: stores } = useQuery({
        queryKey: ['stores-list-select'],
        queryFn: async () => {
            const response = await privateInstance.get('/tenant/stores?limit=100')
            return response.data.items || []
        },
        enabled: open
    })

    // Fetch Price Tables
    const { data: priceTables } = useQuery({
        queryKey: ['price-tables-list-select'],
        queryFn: async () => {
            const response = await privateInstance.get('/tenant/price-tables?limit=100')
            return response.data.items || []
        },
        enabled: open
    })

    // Fetch customer data to pre-fill name/email
    useQuery({
        queryKey: ['customer-detail', customerId],
        queryFn: async () => {
            const response = await privateInstance.get(`/tenant/customers/${customerId}`)
            const customer = response.data
            
            if (!user && customer) {
                form.setValue('name', customer.nameOrTradeName)
                form.setValue('email', customer.email)
            }
            return customer
        },
        enabled: open && !user
    })

    const closeSheet = () => {
        setOpen(false)
        if (!user) form.reset()
    }

    const { isPending, mutate } = useMutation({
        mutationFn: async (values: z.infer<typeof formSchema>) => {
            if (user) {
                // Edit
                const payload = {
                    active: values.active,
                    priceTableId: values.priceTableId,
                    storeId: values.storeId
                }
                await privateInstance.put(`/tenant/customers/${customerId}/users/${user.id}`, payload)
            } else {
                // Create
                const payload = {
                    storeId: values.storeId,
                    priceTableId: values.priceTableId
                }
                await privateInstance.post(`/tenant/customers/${customerId}/users`, payload)
            }
        },
        onSuccess: () => {
            toast.success(user ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!')
            closeSheet()
            onSuccess()
        },
        onError: (error: any) => {
            const errorData = error?.response?.data
            toast.error(errorData?.title || 'Erro ao salvar usuário', {
                description: errorData?.detail || 'Não foi possível salvar o usuário.'
            })
        },
    })

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            name: user?.name || '',
            email: user?.email || '',
            storeId: user?.storeId || undefined,
            priceTableId: user?.priceTableId || undefined,
            active: user?.active ?? true,
        },
    })

    function onSubmit(values: z.infer<typeof formSchema>) {
        mutate(values)
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                {trigger ? trigger : (
                    user ? (
                        <Button size={'sm'} variant={'outline'}> <Edit className="size-[0.85rem]" /> Editar</Button>
                    ) : (
                        <Button size="sm"><Plus className="size-4 mr-2" /> Novo Usuário</Button>
                    )
                )}
            </SheetTrigger>
            <SheetContent>
                <Form {...form}>
                    <form {...props} onSubmit={(e) => { e.stopPropagation(); form.handleSubmit(onSubmit)(e); }} className="flex flex-col h-full">
                        <SheetHeader>
                            <SheetTitle>{user ? 'Editar Usuário' : 'Novo Usuário'}</SheetTitle>
                            <SheetDescription>
                                {user ? 'Edite os dados do usuário abaixo.' : 'Preencha os dados para criar um novo usuário.'}
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
                                            <Input placeholder="Nome do usuário" {...field} disabled={true} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input placeholder="email@exemplo.com" {...field} disabled={true} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="storeId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Loja</FormLabel>
                                            <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? String(field.value) : undefined}>
                                                <FormControl>
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Selecione..." />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {stores?.map((store: any) => (
                                                        <SelectItem key={store.id} value={String(store.id)}>
                                                            {store.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="priceTableId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tabela de Preço</FormLabel>
                                            <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? String(field.value) : undefined}>
                                                <FormControl>
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Selecione..." />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {priceTables?.map((pt: any) => (
                                                        <SelectItem key={pt.id} value={String(pt.id)}>
                                                            {pt.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {user && (
                                <FormField
                                    control={form.control}
                                    name="active"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                            <div className="space-y-0.5">
                                                <FormLabel>Ativo</FormLabel>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>
                        <div className="mt-auto border-t p-4">
                            <div className="grid grid-cols-2 gap-4">
                                <SheetClose asChild>
                                    <Button variant="outline" size="sm" className="w-full">Cancelar</Button>
                                </SheetClose>
                                <Button type="submit" size="sm" disabled={isPending} className="w-full">
                                    {isPending ? <Loader className="animate-spin size-[0.85rem]" /> : (user ? "Salvar" : "Cadastrar")}
                                </Button>
                            </div>
                        </div>
                    </form>
                </Form>
            </SheetContent>
        </Sheet>
    )
}
