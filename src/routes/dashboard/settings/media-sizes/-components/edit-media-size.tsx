import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Edit, Loader } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { privateInstance } from "@/lib/auth"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

const formSchema = z.object({
  name: z.string().min(1, { message: "Nome é obrigatório" }),
  width: z.preprocess((val) => Number(val), z.number({ error: "Largura é obrigatória" }).int().positive({ message: "Largura deve ser um número positivo" })),
  height: z.preprocess((val) => Number(val), z.number({ error: "Altura é obrigatória" }).int().positive({ message: "Altura deve ser um número positivo" })),
  device: z.enum(['desktop', 'tablet', 'mobile', 'mobile_app']).refine(val => val !== undefined, { message: "Dispositivo é obrigatório" }),
  fit: z.enum(['scale-down', 'contain', 'cover', 'crop', 'pad', 'squeeze']).refine(val => val !== undefined, { message: "Ajuste é obrigatório" }),
  quality: z.preprocess((val) => Number(val), z.number({ error: "Qualidade é obrigatória" }).int().min(70, "Mínimo de 70").max(100, "Máximo de 100")),
  background: z.string({ error: "Background é obrigatório" }).min(1, "Background é obrigatório"),
  format: z.enum(['jpeg', 'auto'], { error: "Formato é obrigatório" }),
  description: z.string().optional(),
})

export function EditMediaSizeSheet({
  mediaSizeId,
}: { mediaSizeId: number }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: "",
      width: 0,
      height: 0,
      fit: undefined,
      quality: undefined,
      device: undefined,
      background: "",
      format: undefined,
      description: "",
    }
  })

  const closeSheet = () => {
    setOpen(false)
    form.reset()
  }

  async function fetchMediaSize() {
    try {
      setLoading(true)
      const response = await privateInstance.get(`/api:jJaPcZVn/media_size/${mediaSizeId}`)
      const data = response?.data
      if (!data) {
        throw new Error('Resposta inválida ao buscar tamanho de mídia')
      }
      form.reset({
        name: data.name ?? "",
        width: data.width ?? 0,
        height: data.height ?? 0,
        fit: data.fit,
        quality: data.quality ?? 85,
        device: data.device ?? "desktop",
        background: data.background ?? "#ffffff",
        format: data.format ?? "auto",
        description: data.description ?? "",
      })
    } catch (error: any) {
      const errorData = error?.response?.data
      toast.error(errorData?.title || "Erro ao carregar tamanho de mídia", {
        description: errorData?.detail || 'Não foi possível carregar o tamanho de mídia.'
      })
      closeSheet()
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && mediaSizeId) {
      fetchMediaSize()
    }
  }, [open, mediaSizeId])

  const { isPending, mutate } = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) => {
      return privateInstance.put(`/api:jJaPcZVn/media_size/${mediaSizeId}`, values)
    },
    onSuccess: (response) => {
      if (response.status === 200) {
        toast.success("Tamanho de mídia atualizado com sucesso!")
        closeSheet()
        queryClient.invalidateQueries({ queryKey: ['media-sizes'] })
      } else {
        const errorData = response?.data
        toast.error(errorData?.title || "Erro!", {
          description: errorData?.detail || 'Erro ao salvar tamanho de mídia'
        })
      }
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || "Erro!", {
        description: errorData?.detail || 'Erro ao salvar tamanho de mídia'
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
          <Edit className="size-[0.85rem]" />Editar
        </Button>
      </SheetTrigger>
      <SheetContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <SheetHeader>
              <SheetTitle>Editar Tamanho de Mídia</SheetTitle>
              <SheetDescription>
                {loading ? (
                  <span className="flex items-center gap-2"><Loader className="w-4 h-4 animate-spin" />Carregando dados...</span>
                ) : (
                  <>Atualize os campos abaixo e salve as alterações.</>
                )}
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 grid auto-rows-min gap-6 px-4 py-4 overflow-y-auto">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Banner Principal" {...field} disabled={loading || isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="width"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Largura (px)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="1920" {...field} disabled={loading || isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="height"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Altura (px)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="1080" {...field} disabled={loading || isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="device"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dispositivo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="desktop">Desktop</SelectItem>
                        <SelectItem value="tablet">Tablet</SelectItem>
                        <SelectItem value="mobile">Celular</SelectItem>
                        <SelectItem value="mobile_app">Aplicativo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ajuste (Fit)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="scale-down">Reduzir</SelectItem>
                          <SelectItem value="contain">Conter</SelectItem>
                          <SelectItem value="cover">Cobrir</SelectItem>
                          <SelectItem value="crop">Cortar</SelectItem>
                          <SelectItem value="pad">Preencher</SelectItem>
                          <SelectItem value="squeeze">Esticar</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Qualidade (70-100)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="85" min={70} max={100} {...field} value={field.value ?? ''} disabled={loading || isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="background"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Background</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input placeholder="Ex: #ffffff" {...field} disabled={loading || isPending} />
                          <input
                            type="color"
                            className="h-10 w-12 rounded-md border border-input bg-background p-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            value={field.value && /^#[0-9A-F]{6}$/i.test(field.value) ? field.value : '#ffffff'}
                            onChange={(e) => field.onChange(e.target.value)}
                            disabled={loading || isPending}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="format"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Formato</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full" disabled={loading || isPending}>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="auto">Auto</SelectItem>
                          <SelectItem value="jpeg">JPEG</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <textarea
                        className={cn(
                          "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        )}
                        placeholder="Descrição opcional..."
                        {...field}
                        disabled={loading || isPending}
                      />
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
                  {isPending ? <Loader className="animate-spin h-4 w-4" /> : "Salvar"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
