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

const formSchema = z.object({
  name: z.string().min(1, { message: "Nome é obrigatório" }),
})

export function EditProfileSheet({
  className,
  profileId,
  ...props
}: React.ComponentProps<"form"> & { profileId: number }) {
  const [open, setOpen] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema as any),
    defaultValues: {
      name: "",
    },
  })

  const closeSheet = () => {
    setOpen(false)
    form.reset()
  }

  async function fetchProfile() {
    try {
      setProfileLoading(true)
      const response = await privateInstance.get(`/api:BXIMsMQ7/user_profile/${profileId}`)
      const profile = response?.data
      if (!profile) {
        throw new Error('Resposta inválida ao buscar perfil')
      }
      form.reset({ name: profile.name ?? "" })
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Erro ao carregar perfil')
    } finally {
      setProfileLoading(false)
    }
  }

  useEffect(() => {
    if (open && profileId) {
      fetchProfile()
    }
  }, [open, profileId])

  const { isPending, mutate } = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) => {
      const payload: any = { name: values.name }
      return privateInstance.put(`/api:BXIMsMQ7/user_profile/${profileId}`, payload)
    },
    onSuccess: (response) => {
      if (response.status === 200) {
        toast.success("Perfil atualizado com sucesso!")
        const updatedProfile = response?.data
        const nextName = updatedProfile?.name ?? form.getValues('name')

        try {
          queryClient.setQueriesData({ queryKey: ['profiles'] }, (oldData: any) => {
            if (!oldData) return oldData
            const items = Array.isArray(oldData.items) ? oldData.items : []
            const updatedItems = items.map((p: any) => p?.id === profileId ? { ...p, ...(updatedProfile ?? {}), name: nextName } : p)
            return { ...oldData, items: updatedItems }
          })
        } catch {
        }

        closeSheet()
      } else {
        toast.error('Erro ao salvar perfil')
      }
    },
    onError: (error: any) => {
      toast.error(error?.message ?? 'Erro ao salvar perfil')
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
              <SheetTitle>Editar perfil</SheetTitle>
              <SheetDescription>
                {profileLoading ? (
                  <span className="flex items-center gap-2"><Loader className="w-4 h-4 animate-spin" />Carregando dados do perfil...</span>
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
                      <Input placeholder="Digite o nome do perfil..." {...field} disabled={profileLoading || isPending} />
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
                <Button type="submit" size="sm" disabled={isPending || profileLoading} className="w-full">
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