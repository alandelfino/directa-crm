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

type CategoriesResponse = {
  items: ApiCategory[]
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null

const parseCategories = (data: unknown): ApiCategory[] => {
  if (!data) return []
  if (Array.isArray(data)) return data as ApiCategory[]
  if (isRecord(data) && Array.isArray((data as CategoriesResponse).items)) return (data as CategoriesResponse).items
  return []
}

const getApiErrorData = (err: unknown): { title?: string; detail?: string } | null => {
  if (!isRecord(err)) return null
  const response = err.response
  if (!isRecord(response)) return null
  const data = response.data
  if (!isRecord(data)) return null

  const title = typeof data.title === "string" ? data.title : undefined
  const detail = typeof data.detail === "string" ? data.detail : undefined
  return title || detail ? { title, detail } : null
}

const formSchema = z.object({
  name: z.string().min(1, { message: "Nome é obrigatório" }),
  parent_id: z.number().optional().default(0),
})

type FormValues = z.input<typeof formSchema>

type NewCategorySheetProps = React.ComponentProps<"form"> & {
  trigger?: React.ReactNode
}

export function NewCategorySheet({
  className,
  trigger,
  ...props
}: NewCategorySheetProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: categoriesResponse, isLoading: isLoadingCategories } = useQuery<unknown>({
    queryKey: ["categories"],
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 0,
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
    return parseCategories(categoriesResponse)
  }, [categoriesResponse])

  const closeSheet = () => {
    setOpen(false)
    form.reset()
  }

  const { isPending, mutate } = useMutation<unknown, unknown, FormValues>({
    mutationFn: (values: FormValues) => {
      // Garante que parent_id seja número e que 0 representa raiz
      const payload = {
        name: values.name,
        parentId: typeof values.parent_id === "number" ? values.parent_id : 0,
      }
      return privateInstance.post("/tenant/categories", payload)
    },
    onSuccess: (response) => {
      if (isRecord(response) && (response.status === 200 || response.status === 201)) {
        toast.success("Categoria cadastrada com sucesso!")
        closeSheet()
        // Atualiza a listagem de categorias
        queryClient.invalidateQueries({ queryKey: ["categories"] })
      } else {
        const errorData = isRecord(response) && isRecord(response.data) ? response.data : null
        const title = errorData && typeof errorData.title === "string" ? errorData.title : undefined
        const detail = errorData && typeof errorData.detail === "string" ? errorData.detail : undefined
        toast.error(title || "Erro ao cadastrar categoria", {
          description: detail || "Não foi possível criar a categoria."
        })
      }
    },
    onError: (error) => {
      const errorData = getApiErrorData(error)
      toast.error(errorData?.title || "Erro ao cadastrar categoria", {
        description: errorData?.detail || "Não foi possível criar a categoria."
      })
    },
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      parent_id: 0,
    },
  })

  function onSubmit(values: FormValues) {
    mutate(values)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ? trigger : (
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Nova Categoria
          </Button>
        )}
      </SheetTrigger>
      <SheetContent>
        <Form {...form}>
          <form {...props} onSubmit={(e) => { e.stopPropagation(); form.handleSubmit(onSubmit)(e); }} className="flex flex-col h-full">
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
