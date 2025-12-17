import { useState } from 'react'
import { z } from 'zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormField, FormItem, FormLabel, FormMessage, FormControl } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { privateInstance } from '@/lib/auth'
import { toast } from 'sonner'
import { Loader, Plus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { maskMoneyInput } from '@/lib/utils'

const formSchema = z.object({
  price_table_id: z.string().min(1, { message: 'Selecione uma tabela de preço' }),
  price: z.string().min(1, { message: 'Preço é obrigatório' }),
  sale_price: z.string().optional(),
})

export function ProductPriceCreateDialog({ productId, onCreated }: { productId: number, onCreated?: () => void }) {
  const [open, setOpen] = useState(false)
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { price_table_id: '', price: 'R$ 0,00', sale_price: 'R$ 0,00' },
  })

  // Fetch price tables
  const { data: priceTablesData } = useQuery({
    queryKey: ['price-tables', 'select'],
    queryFn: async () => {
      const response = await privateInstance.get('/api:m3u66HYX/price_tables?page=1&per_page=100')
      return response.data
    },
    enabled: open
  })

  const priceTables = Array.isArray(priceTablesData) ? priceTablesData : 
                      (priceTablesData as any)?.items ? (priceTablesData as any).items : []

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const priceCents = parseInt(values.price.replace(/\D/g, ''))
      const salePriceCents = values.sale_price ? parseInt(values.sale_price.replace(/\D/g, '')) : undefined
      const payload = {
        product_id: productId,
        price_table_id: Number(values.price_table_id),
        price: priceCents,
        sale_price: salePriceCents
      }
      const response = await privateInstance.post('/api:c3X9fE5j/derivated_product_price', payload)
      if (response.status !== 200 && response.status !== 201) throw new Error('Erro ao adicionar preço')
      return response.data
    },
    onSuccess: () => {
      toast.success('Preço adicionado com sucesso!')
      setOpen(false)
      form.reset({ price_table_id: '', price: 'R$ 0,00', sale_price: 'R$ 0,00' })
      onCreated?.()
    },
    onError: (error: any) => {
      const title = error?.response?.data?.payload?.title
      const message = error?.response?.data?.message ?? 'Erro ao adicionar preço'
      if (title) toast.error(title, { description: message })
      else toast.error(message)
    }
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size='sm' variant='outline'>
          <Plus className='mr-2 h-4 w-4' /> Adicionar preço
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Preço</DialogTitle>
          <DialogDescription>Defina o preço deste produto para uma tabela específica.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(async (v) => await mutateAsync(v))} className='space-y-4'>
            <FormField
              control={form.control}
              name="price_table_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tabela de Preço</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {priceTables.map((pt: any) => (
                        <SelectItem key={pt.id} value={String(pt.id)}>{pt.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço</FormLabel>
                    <FormControl>
                      <Input 
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
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Cancelar</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader className='animate-spin h-4 w-4' /> : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
