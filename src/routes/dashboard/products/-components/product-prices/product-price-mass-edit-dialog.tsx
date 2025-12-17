import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { privateInstance } from '@/lib/auth'
import { toast } from 'sonner'
import { Edit } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { maskMoneyInput } from '@/lib/utils'

const formSchema = z.object({
  price: z.string().min(1, { message: 'Preço é obrigatório' }),
  sale_price: z.string().optional(),
})

export function ProductPriceMassEditDialog({ selectedIds, onUpdated, trigger }: { selectedIds: number[], onUpdated?: () => void, trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [progress, setProgress] = useState(0)
  const [processedCount, setProcessedCount] = useState(0)
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { price: 'R$ 0,00', sale_price: 'R$ 0,00' },
  })

  useEffect(() => {
    if (open) {
      form.reset({ price: 'R$ 0,00', sale_price: 'R$ 0,00' })
      setProcessedCount(0)
      setProgress(0)
    }
  }, [open, form])

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const priceCents = parseInt(values.price.replace(/\D/g, ''))
      const salePriceCents = values.sale_price ? parseInt(values.sale_price.replace(/\D/g, '')) : undefined
      const total = selectedIds.length
      
      setProgress(0)
      setProcessedCount(0)

      for (let i = 0; i < total; i++) {
        const id = selectedIds[i]
        const payload = {
          price: priceCents,
          sale_price: salePriceCents
        }
        
        try {
          await privateInstance.put(`/api:c3X9fE5j/derivated_product_price/${id}`, payload)
          setProcessedCount(prev => prev + 1)
          setProgress(Math.round(((i + 1) / total) * 100))
        } catch (error) {
          console.error(`Error updating price ${id}`, error)
        }
      }
    },
    onSuccess: () => {
      toast.success('Preços atualizados com sucesso!')
      setOpen(false)
      form.reset({ price: 'R$ 0,00', sale_price: 'R$ 0,00' })
      onUpdated?.()
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size='sm' variant='outline'>
            <Edit className='h-4 w-4 mr-2' /> Editar em Massa ({selectedIds.length})
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar {selectedIds.length} Preços</DialogTitle>
          <DialogDescription>
            Defina o novo preço para os {selectedIds.length} itens selecionados.
            Esta ação substituirá os preços atuais.
          </DialogDescription>
        </DialogHeader>
        
        {isPending ? (
          <div className="space-y-4 py-4">
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
                Processando {processedCount} de {selectedIds.length} itens
              </p>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(async (v) => await mutateAsync(v))} className='space-y-4'>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Novo Preço</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="R$ 0,00" 
                          {...field} 
                          onChange={(e) => {
                            field.onChange(maskMoneyInput(e.target.value))
                          }}
                        />
                      </FormControl>
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
              </div>
              <div className='flex justify-end gap-2'>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Salvar Alterações
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
