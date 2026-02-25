import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { privateInstance } from '@/lib/auth'
import { toast } from 'sonner'
import { Edit } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { maskMoneyInput } from '@/lib/utils'

const formSchema = z.object({
  update_price: z.boolean().default(false),
  price: z.string().optional(),
  update_sale_price: z.boolean().default(false),
  sale_price: z.string().optional(),
}).refine((data) => {
  if (data.update_price && (!data.price || data.price.trim() === '')) {
    return false
  }
  return true
}, {
  message: 'Preço é obrigatório quando selecionado',
  path: ['price'],
}).refine((data) => {
  if (data.update_price && data.update_sale_price) {
    const price = parseInt((data.price || '').replace(/\D/g, '')) || 0
    const salePrice = parseInt((data.sale_price || '').replace(/\D/g, '')) || 0
    return salePrice <= price
  }
  return true
}, {
  message: 'O preço promocional não pode ser maior que o preço',
  path: ['sale_price'],
})

type PriceItem = {
  id: number
  price: number
  salePrice: number
}

export function ProductPriceMassEditSheet({ selectedItems, onUpdated, trigger }: { selectedItems: PriceItem[], onUpdated?: () => void, trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [progress, setProgress] = useState(0)
  const [processedCount, setProcessedCount] = useState(0)
  const [results, setResults] = useState<{ success: number, errors: { id: number, message: string }[] } | null>(null)
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: { 
      update_price: false,
      price: 'R$ 0,00', 
      update_sale_price: false,
      sale_price: 'R$ 0,00' 
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({ 
        update_price: false,
        price: 'R$ 0,00', 
        update_sale_price: false,
        sale_price: 'R$ 0,00' 
      })
      setProcessedCount(0)
      setProgress(0)
      setResults(null)
    }
  }, [open, form])

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const priceCents = parseInt((values.price || '').replace(/\D/g, ''))
      const salePriceCents = values.sale_price ? parseInt(values.sale_price.replace(/\D/g, '')) : 0
      
      const itemsToUpdate = [...selectedItems]
      const total = itemsToUpdate.length
      const currentResults = { success: 0, errors: [] as { id: number, message: string }[] }
      
      setProgress(0)
      setProcessedCount(0)
      setResults(null)

      for (let i = 0; i < total; i++) {
        const item = itemsToUpdate[i]
        
        // Construct payload: preserve existing values if not updating
        const payload = {
          price: values.update_price ? priceCents : item.price,
          salePrice: values.update_sale_price ? salePriceCents : (item.salePrice ?? 0)
        }
        
        try {
          await privateInstance.put(`/tenant/product-prices/${item.id}`, payload)
          currentResults.success++
        } catch (error: any) {
          const errorData = error?.response?.data
          const message = errorData?.title || errorData?.detail || 'Erro desconhecido'
          currentResults.errors.push({ id: item.id, message })
          console.error(`Error updating price ${item.id}`, error)
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
        toast.success('Todos os preços foram atualizados com sucesso!')
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

  const updatePrice = form.watch('update_price')
  const updateSalePrice = form.watch('update_sale_price')

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
            <Edit className='h-4 w-4 mr-2' /> Editar em Lote ({selectedItems.length})
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className='sm:max-w-[420px]'>
        {results ? (
           <div className='flex flex-col h-full'>
             <SheetHeader>
               <SheetTitle>Relatório de Atualização</SheetTitle>
               <SheetDescription>
                 Resultado da atualização em massa de {selectedItems.length} itens.
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
            <SheetHeader>
              <SheetTitle>Editar {selectedItems.length} Preços</SheetTitle>
              <SheetDescription>
                Selecione os campos que deseja alterar para os itens selecionados.
              </SheetDescription>
            </SheetHeader>
            
            <div className='flex-1 overflow-y-auto px-4 py-4'>
              {isPending && (
                <div className="space-y-4 pb-4 border-b mb-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>Atualizando preços...</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-300 ease-in-out" 
                        style={{ width: `${progress}%` }} 
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-center pt-1">
                      Processando {processedCount} de {selectedItems.length} itens
                    </p>
                  </div>
                </div>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(async (v) => await mutateAsync(v))} className='space-y-4'>
                  <fieldset disabled={isPending} className="grid gap-4 disabled:opacity-50">
                    
                    <div className="space-y-2 border p-3 rounded-md">
                      <FormField
                        control={form.control}
                        name="update_price"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                Atualizar Preço
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      {updatePrice && (
                        <FormField
                          control={form.control}
                          name="price"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  placeholder="R$ 0,00" 
                                  {...field} 
                                  onChange={(e) => {
                                    field.onChange(maskMoneyInput(e.target.value))
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    <div className="space-y-2 border p-3 rounded-md">
                      <FormField
                        control={form.control}
                        name="update_sale_price"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                Atualizar Preço Promocional
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />

                      {updateSalePrice && (
                        <FormField
                          control={form.control}
                          name="sale_price"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  placeholder="R$ 0,00" 
                                  {...field} 
                                  onChange={(e) => {
                                    field.onChange(maskMoneyInput(e.target.value))
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                  </fieldset>
                </form>
              </Form>
            </div>

            <div className='mt-auto border-t p-4'>
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
                  disabled={isPending || (!updatePrice && !updateSalePrice)}
                >
                  {isPending ? 'Atualizando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
