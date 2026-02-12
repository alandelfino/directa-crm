import React, { useEffect, useState } from 'react'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { privateInstance } from '@/lib/auth'
import { toast } from 'sonner'
import { Edit, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'

type DerivatedProduct = {
  id: number
  productId: number
  name?: string
  active?: boolean
  width?: number
  height?: number
  weight?: number
  length?: number
}

const formSchema = z.object({
  update_active: z.boolean().default(false),
  active: z.boolean().default(true),
  
  update_dimensions: z.boolean().default(false),
  width: z.coerce.number().min(0).optional(),
  height: z.coerce.number().min(0).optional(),
  length: z.coerce.number().min(0).optional(),
  
  update_weight: z.boolean().default(false),
  weight: z.coerce.number().min(0).optional(),
})

type FormValues = z.infer<typeof formSchema>

export function DerivatedProductMassEditSheet({ items, onUpdated, trigger }: { items: DerivatedProduct[], onUpdated?: () => void, trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [progress, setProgress] = useState(0)
  const [processedCount, setProcessedCount] = useState(0)
  const [results, setResults] = useState<{ success: number, errors: { id: number, message: string }[] } | null>(null)
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      update_active: false,
      active: true,
      update_dimensions: false,
      update_weight: false,
    },
  })

  const watchUpdateActive = form.watch('update_active')
  const watchUpdateDimensions = form.watch('update_dimensions')
  const watchUpdateWeight = form.watch('update_weight')

  useEffect(() => {
    if (open) {
      form.reset({
        update_active: false,
        active: true,
        update_dimensions: false,
        width: undefined,
        height: undefined,
        length: undefined,
        update_weight: false,
        weight: undefined,
      })
      setProcessedCount(0)
      setProgress(0)
      setResults(null)
    }
  }, [open, form])

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async (values: FormValues) => {
      const itemsToUpdate = [...items]
      const total = itemsToUpdate.length
      const currentResults = { success: 0, errors: [] as { id: number, message: string }[] }
      
      setProgress(0)
      setProcessedCount(0)
      setResults(null)

      for (let i = 0; i < total; i++) {
        const item = itemsToUpdate[i]
        
        // Construct payload based on what fields are selected for update
        // We need to preserve existing values for fields NOT being updated
        // But since we are doing a PUT, we might need to send all fields?
        // Usually PUT requires full resource. If PATCH is not available, we need to merge.
        // Let's assume we need to merge with existing item data.
        
        const payload: any = {
          name: item.name, // Name is not editable in mass edit, so keep existing
          active: values.update_active ? values.active : item.active,
          width: values.update_dimensions && values.width !== undefined ? Math.round(values.width * 10) : item.width,
          height: values.update_dimensions && values.height !== undefined ? Math.round(values.height * 10) : item.height,
          length: values.update_dimensions && values.length !== undefined ? Math.round(values.length * 10) : item.length,
          weight: values.update_weight && values.weight !== undefined ? Math.round(values.weight * 1000) : item.weight,
        }
        
        try {
          await privateInstance.put(`/tenant/derivated-product/${item.id}`, payload)
          currentResults.success++
        } catch (error: any) {
          const errorData = error?.response?.data
          const message = errorData?.title || errorData?.detail || 'Erro desconhecido'
          currentResults.errors.push({ id: item.id, message })
          console.error(`Error updating derivation ${item.id}`, error)
        } finally {
          const current = i + 1
          setProcessedCount(current)
          setProgress(Math.round((current / total) * 100))
        }
      }
      return currentResults
    },
    onSuccess: (data) => {
      setResults(data)
      if (data.errors.length === 0) {
        toast.success('Todas as derivações foram atualizadas com sucesso!')
      } else {
        toast.warning('A atualização foi concluída com alguns erros.')
      }
    },
  })

  const handleClose = () => {
    setOpen(false)
    if (results) {
      onUpdated?.()
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => {
      if (!o && results) {
        onUpdated?.()
      }
      setOpen(o)
    }}>
      <SheetTrigger asChild>
        {trigger || (
          <Button size='sm' variant='outline'>
            <Edit className='h-4 w-4 mr-2' /> Editar em Lote ({items.length})
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className='sm:max-w-[500px] flex flex-col h-full bg-background/95 backdrop-blur-sm'>
        {results ? (
           <div className='flex flex-col h-full'>
             <SheetHeader>
               <SheetTitle>Relatório de Atualização</SheetTitle>
               <SheetDescription>
                 Resultado da atualização em massa de {items.length} itens.
               </SheetDescription>
             </SheetHeader>
             
             <div className='flex-1 overflow-y-auto px-4 py-4 space-y-4'>
               <div className="bg-green-50 text-green-700 p-4 rounded-md border border-green-200">
                 <p className="font-medium">Sucessos: {results.success}</p>
               </div>
               
               {results.errors.length > 0 && (
                 <div className="space-y-2">
                   <div className="bg-red-50 text-red-700 p-4 rounded-md border border-red-200">
                     <p className="font-medium">Erros: {results.errors.length}</p>
                   </div>
                   <div className="space-y-2">
                     <p className="text-sm font-medium">Detalhes dos erros:</p>
                     {results.errors.map((err, idx) => (
                       <div key={idx} className="text-sm bg-muted p-2 rounded border">
                         <span className="font-semibold text-xs text-muted-foreground block mb-1">ID: {err.id}</span>
                         {err.message}
                       </div>
                     ))}
                   </div>
                 </div>
               )}
             </div>

             <div className='mt-auto border-t p-4'>
              <Button onClick={handleClose} className='w-full'>
                Concluir
              </Button>
            </div>
           </div>
        ) : (
          <div className='flex flex-col h-full'>
            <SheetHeader className='p-4 border-b'>
              <SheetTitle>Editar {items.length} Derivações</SheetTitle>
              <SheetDescription>
                Selecione os campos que deseja atualizar para os itens selecionados.
              </SheetDescription>
            </SheetHeader>
            
            <div className='flex-1 overflow-y-auto px-4 py-4'>
              {isPending && (
                <div className="space-y-4 pb-4 border-b mb-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>Atualizando...</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-300 ease-in-out" 
                        style={{ width: `${progress}%` }} 
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-center pt-1">
                      Processando {processedCount} de {items.length} itens
                    </p>
                  </div>
                </div>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(async (v) => await mutateAsync(v))} className='space-y-6'>
                  <fieldset disabled={isPending} className="space-y-6 disabled:opacity-50">
                    
                    {/* Status Section */}
                    <div className="space-y-4 rounded-lg border p-4">
                      <FormField
                        control={form.control}
                        name="update_active"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="font-semibold cursor-pointer">
                              Atualizar Status
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                      
                      {watchUpdateActive && (
                        <FormField
                          control={form.control}
                          name="active"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 bg-muted/50 ml-6">
                              <div className="space-y-0.5">
                                <FormLabel className="text-sm">Ativo</FormLabel>
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

                    {/* Dimensions Section */}
                    <div className="space-y-4 rounded-lg border p-4">
                      <FormField
                        control={form.control}
                        name="update_dimensions"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="font-semibold cursor-pointer">
                              Atualizar Dimensões
                            </FormLabel>
                          </FormItem>
                        )}
                      />

                      {watchUpdateDimensions && (
                        <div className="grid grid-cols-3 gap-4 ml-6">
                          <FormField
                            control={form.control}
                            name="width"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Largura (cm)</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} value={field.value ?? ''} />
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
                                <FormLabel className="text-xs">Altura (cm)</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} value={field.value ?? ''} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="length"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Comprimento (cm)</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} value={field.value ?? ''} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>

                    {/* Weight Section */}
                    <div className="space-y-4 rounded-lg border p-4">
                      <FormField
                        control={form.control}
                        name="update_weight"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="font-semibold cursor-pointer">
                              Atualizar Peso
                            </FormLabel>
                          </FormItem>
                        )}
                      />

                      {watchUpdateWeight && (
                        <div className="ml-6">
                          <FormField
                            control={form.control}
                            name="weight"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Peso (kg)</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.001" min="0" placeholder="0.000" {...field} value={field.value ?? ''} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>

                  </fieldset>
                </form>
              </Form>
            </div>

            <div className='mt-auto border-t p-4 bg-background'>
              <div className='grid grid-cols-2 gap-4'>
                <SheetClose asChild>
                  <Button variant="outline" className='w-full' disabled={isPending}>
                    Cancelar
                  </Button>
                </SheetClose>
                <Button 
                  type="button" 
                  onClick={form.handleSubmit(async (v) => await mutateAsync(v))} 
                  className='w-full'
                  disabled={isPending || (!watchUpdateActive && !watchUpdateDimensions && !watchUpdateWeight)}
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar Alterações'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
