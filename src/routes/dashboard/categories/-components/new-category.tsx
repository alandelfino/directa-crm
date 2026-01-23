import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader, Plus } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { privateInstance } from "@/lib/auth"
import { useMemo, useState } from "react"

// Tipos básicos da API de categorias
type ApiCategory = {
  id: number | string
  name: string
  parent_id?: number | string | null
}

const formSchema = z.object({
  name: z.string().min(1, { message: "Nome é obrigatório" }),
  parent_id: z.number().optional().default(0),
})

export function NewCategorySheet({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: categoriesResponse, isLoading: isLoadingCategories } = useQuery({
    queryKey: ["categories"],
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryFn: async () => {
      const res = await privateInstance.get("/tenant/categories", {
        params: {
          page: 1,
          limit: 100, // Fetch more to populate select
          sortBy: 'name',
          orderBy: 'asc'
        }
      })
      if (res.status !== 200) {
        throw new Error("Erro ao carregar categorias")
      }
      return res.data
    },
  })

  const categories: ApiCategory[] = useMemo(() => {
    const data = categoriesResponse
    if (!data) return []
    if (Array.isArray(data)) return data as ApiCategory[]
    if (Array.isArray((data as any).items)) return (data as any).items as ApiCategory[]
    return []
  }, [categoriesResponse])

  const closeSheet = () => {
    setOpen(false)
    form.reset()
  }

  const { isPending, mutate } = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) => {
      // Garante que parent_id seja número e que 0 representa raiz
      const payload = {
        name: values.name,
        parentId: Number(values.parent_id ?? 0),
      }
      return privateInstance.post("/tenant/categories", payload)
    },
    onSuccess: (response) => {
      if (response.status === 200 || response.status === 201) {
        toast.success("Categoria cadastrada com sucesso!")
        closeSheet()
        // Atualiza a listagem de categorias
        queryClient.invalidateQueries({ queryKey: ["categories"] })
      } else {
        const errorData = (response.data as any)
        toast.error(errorData?.title || "Erro ao cadastrar categoria", {
          description: errorData?.detail || "Não foi possível criar a categoria."
        })
      }
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || "Erro ao cadastrar categoria", {
        description: errorData?.detail || "Não foi possível criar a categoria."
      })
    },
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema as any),
    defaultValues: {
      name: "",
      parent_id: 0,
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutate(values)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="default" size="sm">
          <Plus className="size-[0.85rem]" /> Adicionar Categoria
        </Button>
      </SheetTrigger>
      <SheetContent>
        <Form {...form}>
          <form {...props} onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <SheetHeader>
              <SheetTitle>Cadastro de categoria</SheetTitle>
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
                      <Input placeholder="Digite o nome da categoria..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parent_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subcategoria de</FormLabel>
                    <FormControl>
                      <Select
                        value={String(field.value ?? 0)}
                        onValueChange={(val) => field.onChange(parseInt(val))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione a categoria pai" />
                        </SelectTrigger>
                        <SelectContent
                          position="popper"
                          className="max-h-64 z-[60] overscroll-y-contain"
                          onWheel={(e) => { e.stopPropagation(); const el = e.currentTarget as HTMLElement; el.scrollTop += e.deltaY; e.preventDefault(); }}
                          onWheelCapture={(e) => { e.stopPropagation(); const el = e.currentTarget as HTMLElement; el.scrollTop += e.deltaY; e.preventDefault(); }}
                        >
                          <SelectGroup>
                            <SelectItem value={"0"}>Nenhuma</SelectItem>
                            {isLoadingCategories ? (
                              <SelectItem value={"loading"} disabled>Carregando...</SelectItem>
                            ) : (
                              categories.map((cat) => (
                                <SelectItem key={String(cat.id)} value={String(cat.id)}>
                                  {cat.name}
                                </SelectItem>
                              ))
                            )}
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
