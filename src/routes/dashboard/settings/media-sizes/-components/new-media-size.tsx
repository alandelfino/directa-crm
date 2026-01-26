import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader, Plus } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { privateInstance } from "@/lib/auth"
import { useState } from "react"
import { cn } from "@/lib/utils"

const formSchema = z.object({
  name: z.string({ error: "Nome é obrigatório" }).min(1, { message: "Nome é obrigatório" }),
  width: z.preprocess((val) => Number(val), z.number({ error: "Largura é obrigatória" }).int().positive({ message: "Largura deve ser um número positivo" })),
  height: z.preprocess((val) => Number(val), z.number({ error: "Altura é obrigatória" }).int().positive({ message: "Altura deve ser um número positivo" })),
  device: z.enum(['desktop', 'tablet', 'mobile', 'mobile_app'], { error: "Dispositivo é obrigatório" }),
  fit: z.enum(['scale-down', 'contain', 'cover', 'crop', 'pad', 'squeeze'], { error: "Ajuste é obrigatório" }),
  quality: z.preprocess((val) => Number(val), z.number({ error: "Qualidade é obrigatória" }).int().min(1, "Mínimo de 1").max(100, "Máximo de 100")),
  background: z.string({ error: "Background é obrigatório" }).min(1, "Background é obrigatório"),
  format: z.enum(['jpeg', 'auto']).refine(val => val !== undefined, { message: "Formato é obrigatório" }),
  description: z.string().optional(),
})

export function NewMediaSizeSheet() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: "",
      width: 0,
      height: 0,
      device: undefined,
      fit: undefined,
      quality: 85,
      background: "#ffffff",
      format: "auto",
      description: "",
    },
  })

  const closeSheet = () => {
    setOpen(false)
    form.reset()
  }

  const { isPending, mutate } = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) => {
      return privateInstance.post('/tenant/media-sizes', values)
    },
    onSuccess: (response) => {
      if (response.status === 200 || response.status === 201) {
        toast.success("Tamanho de mídia cadastrado com sucesso!")
        closeSheet()
        queryClient.invalidateQueries({ queryKey: ['media-sizes'] })
      } else {
        const errorData = (response.data as any)
        toast.error(errorData?.title || "Erro ao cadastrar tamanho de mídia", {
          description: errorData?.detail || 'Não foi possível cadastrar o tamanho de mídia.'
        })
      }
    },
    onError: (error: any) => {
      const errorData = error?.response?.data
      toast.error(errorData?.title || "Erro ao cadastrar tamanho de mídia", {
        description: errorData?.detail || 'Não foi possível cadastrar o tamanho de mídia.'
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
        <Button variant="default">
          <Plus className="w-4 h-4 mr-2" />Cadastrar
        </Button>
      </SheetTrigger>
      <SheetContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <SheetHeader>
              <SheetTitle>Cadastro de Tamanho de Mídia</SheetTitle>
              <SheetDescription>
                Preencha os campos abaixo para cadastrar.
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
                      <Input placeholder="Ex: Banner Principal" {...field} />
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
                        <Input type="number" placeholder="1920" {...field} />
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
                        <Input type="number" placeholder="1080" {...field} />
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
                        <FormLabel>Qualidade (1-100)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="85" min={1} max={100} {...field} value={field.value ?? ''} />
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
                          <Input placeholder="Ex: #ffffff" {...field} />
                          <input
                            type="color"
                            className="h-10 w-12 rounded-md border border-input bg-background p-1 cursor-pointer"
                            value={field.value && /^#[0-9A-F]{6}$/i.test(field.value) ? field.value : '#ffffff'}
                            onChange={(e) => field.onChange(e.target.value)}
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
                          <SelectTrigger className="w-full">
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
                <Button type="submit" size="sm" disabled={isPending} className="w-full">
                  {isPending ? <Loader className="animate-spin h-4 w-4" /> : "Cadastrar"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
