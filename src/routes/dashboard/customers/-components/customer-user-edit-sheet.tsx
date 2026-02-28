import { useMutation, useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader, Edit } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { privateInstance } from "@/lib/auth"
import { useState, useEffect } from "react"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import type { CustomerUser } from "./customer-user-form-sheet"

const formSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  storeId: z.coerce.number().min(1, 'Loja é obrigatória'),
  priceTableId: z.coerce.number().optional(),
  active: z.boolean().default(true),
})

type UserEditSheetProps = React.ComponentProps<"form"> & {
  trigger?: React.ReactNode
  customerId: number
  user: CustomerUser
  onSuccess: () => void
}

export function UserEditSheet({
    className,
    trigger,
    customerId,
    user,
    onSuccess,
    ...props
}: UserEditSheetProps) {

    const [open, setOpen] = useState(false)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            name: user.name || '',
            email: user.email || '',
            storeId: user.storeId || undefined,
            priceTableId: user.priceTableId || undefined,
            active: user.active ?? true,
        },
    })

    // Fetch Stores
    const { data: stores, isLoading: isLoadingStores } = useQuery({
        queryKey: ['stores-list-select'],
        queryFn: async () => {
            const response = await privateInstance.get('/tenant/stores?limit=100')
            return response.data.items || []
        },
        enabled: open,
        refetchOnWindowFocus: false,
    })

    // Fetch Price Tables
    const { data: priceTables, isLoading: isLoadingPriceTables } = useQuery({
        queryKey: ['price-tables-list-select'],
        queryFn: async () => {
            const response = await privateInstance.get('/tenant/price-tables?limit=100')
            return response.data.items || []
        },
        enabled: open,
        refetchOnWindowFocus: false,
    })

    // Fetch User Details to ensure fresh data
    const { data: userDetails } = useQuery({
        queryKey: ['customer-user-detail', customerId, user.id],
        queryFn: async () => {
            const response = await privateInstance.get(`/tenant/customers/${customerId}/users/${user.id}`)
            return response.data
        },
        enabled: open,
        refetchOnMount: true,
        refetchOnWindowFocus: false,
    })

    useEffect(() => {
        if (userDetails) {
            form.reset({
                name: userDetails.name,
                email: userDetails.email,
                storeId: userDetails.storeId,
                priceTableId: userDetails.priceTableId,
                active: userDetails.active
            })
        }
    }, [userDetails, form])

    const closeSheet = () => {
        setOpen(false)
        form.reset()
    }

    const { isPending, mutate } = useMutation({
        mutationFn: async (values: z.infer<typeof formSchema>) => {
            const payload = {
                active: values.active,
                priceTableId: values.priceTableId,
                storeId: values.storeId
            }
            await privateInstance.put(`/tenant/customers/${customerId}/users/${user.id}`, payload)
        },
        onSuccess: () => {
            toast.success('Usuário atualizado com sucesso!')
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

    function onSubmit(values: z.infer<typeof formSchema>) {
        mutate(values)
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                {trigger ? trigger : (
                    <Button size={'sm'} variant={'outline'}> <Edit className="size-[0.85rem]" /> Editar</Button>
                )}
            </SheetTrigger>
            <SheetContent>
                <Form {...form}>
                    <form {...props} onSubmit={(e) => { e.stopPropagation(); form.handleSubmit(onSubmit)(e); }} className="flex flex-col h-full">
                        <SheetHeader>
                            <SheetTitle>Editar Usuário</SheetTitle>
                            <SheetDescription>
                                Edite os dados do usuário abaixo.
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
                                            {isLoadingStores ? (
                                                <Skeleton className="h-10 w-full" />
                                            ) : (
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
                                            )}
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
                                            {isLoadingPriceTables ? (
                                                <Skeleton className="h-10 w-full" />
                                            ) : (
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
                                            )}
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

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
