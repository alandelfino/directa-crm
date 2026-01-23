import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { privateInstance } from '@/lib/auth'
import { toast } from 'sonner'
import { Edit } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { maskMoneyInput } from '@/lib/utils'

type SimpleProductPriceItem = {
  id: number
  price: number
  sale_price?: number
  product_id: number
  price_table_id: number
  price_table_name?: string
  company_id?: number
}

const formSchema = z.object({
  price: z.string().min(1, { message: 'Informe o preço' }),
  sale_price: z.string().optional(),
}).superRefine((data, ctx) => {
  const price = parseInt(data.price.replace(/\D/g, '')) || 0
  const salePrice = data.sale_price ? parseInt(data.sale_price.replace(/\D/g, '')) : 0

  if (price < 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'O preço deve ser maior ou igual a zero',
      path: ['price']
    })
  }

  if (salePrice < 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'O preço promocional deve ser maior ou igual a zero',
      path: ['sale_price']
    })
  }

  if (data.sale_price && salePrice > price) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'O preço promocional deve ser menor ou igual ao preço',
      path: ['sale_price']
    })
  }
})

export function SimpleProductPriceMassEditSheet({ items, onUpdated, trigger }: { items: SimpleProductPriceItem[], onUpdated?: () => void, trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [progress, setProgress] = useState(0)
  const [processedCount, setProcessedCount] = useState(0)
  const [results, setResults] = useState<{ success: number, errors: { id: number, message: string }[] } | null>(null)
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { price: 'R$ 0,00', sale_price: 'R$ 0,00' },
  })

  useEffect(() => {
    if (open) {
      form.reset({ price: 'R$ 0,00', sale_price: 'R$ 0,00' })
      setProcessedCount(0)
      setProgress(0)
      setResults(null)
    }
  }, [open, form])

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const priceCents = parseInt(values.price.replace(/\D/g, ''))
      const salePriceCents = values.sale_price ? parseInt(values.sale_price.replace(/\D/g, '')) : undefined
      
      const itemsToUpdate = [...items]
      const total = itemsToUpdate.length
      const currentResults = { success: 0, errors: [] as { id: number, message: string }[] }
      
      setProgress(0)
      setProcessedCount(0)
      setResults(null)

      for (let i = 0; i < total; i++) {
        const item = itemsToUpdate[i]
        const payload = {
          product_id: item.product_id,
          price_table_id: item.price_table_id,
          price: priceCents,
          sale_price: salePriceCents
        }
        
        try {
          await privateInstance.put(`/api:c3X9fE5j/product_prices`, payload)
          currentResults.success++
        } catch (error: any) {
          const errorData = error?.response?.data
          const message = errorData?.title || errorData?.detail || 'Erro desconhecido'
          currentResults.errors.push({ id: item.id, message })
          console.error(`Error updating price for item ${item.id}`, error)
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
      <SheetContent className='sm:max-w-[420px]'>
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
            <SheetHeader>
              <SheetTitle>Editar {items.length} Preços</SheetTitle>
              <SheetDescription>
                Defina o novo preço para os {items.length} itens selecionados.
                Esta ação substituirá os preços atuais.
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
                      Processando {processedCount} de {items.length} itens
                    </p>
                  </div>
                </div>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(async (v) => await mutateAsync(v))} className='space-y-4'>
                  <fieldset disabled={isPending} className="grid grid-cols-2 gap-4 disabled:opacity-50">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preço</FormLabel>
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
                    <FormField
                      control={form.control}
                      name="sale_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preço Promocional</FormLabel>
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
                  disabled={isPending}
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
