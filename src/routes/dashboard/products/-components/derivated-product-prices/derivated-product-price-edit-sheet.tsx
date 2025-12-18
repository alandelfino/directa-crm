import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet'
import { Form, FormField, FormItem, FormLabel, FormMessage, FormControl } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { privateInstance } from '@/lib/auth'
import { toast } from 'sonner'
import { Edit, Loader } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { formatMoneyFromCents, maskMoneyInput } from '@/lib/utils'

const formSchema = z.object({
  price_table_id: z.string().min(1, { message: 'Selecione uma tabela de preço' }),
  price: z.string().min(1, { message: 'Preço é obrigatório' }),
  sale_price: z.string().optional(),
}).refine((data) => {
  if (!data.sale_price) return true
  const price = parseInt(data.price.replace(/\D/g, '')) || 0
  const salePrice = parseInt(data.sale_price.replace(/\D/g, '')) || 0
  return salePrice <= price
}, {
  message: 'O preço promocional não pode ser maior que o preço',
  path: ['sale_price'],
})

export function DerivatedProductPriceEditSheet({ item, onUpdated }: { item: any, onUpdated?: () => void }) {
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

  useEffect(() => {
    if (open && item) {
      form.reset({
        price_table_id: String(item.price_table_id),
        price: formatMoneyFromCents(item.price),
        sale_price: item.sale_price ? formatMoneyFromCents(item.sale_price) : 'R$ 0,00'
      })
    }
  }, [open, item, form])

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const priceCents = parseInt(values.price.replace(/\D/g, ''))
      const salePriceCents = values.sale_price ? parseInt(values.sale_price.replace(/\D/g, '')) : undefined
      const payload = {
        price: priceCents,
        sale_price: salePriceCents
      }
      // Note: Endpoint to update only allows updating price usually. 
      // If we want to change price_table_id, we might need to recreate or check if API supports it.
      // Based on provided spec: PUT /derivated_product_price/{id} takes body with price.
      const response = await privateInstance.put(`/api:c3X9fE5j/derivated_product_price/${item.id}`, payload)
      if (response.status !== 200) throw new Error('Erro ao atualizar preço')
      return response.data
    },
    onSuccess: () => {
      toast.success('Preço atualizado com sucesso!')
      setOpen(false)
      onUpdated?.()
    },
    onError: (error: any) => {
      const title = error?.response?.data?.payload?.title
      const message = error?.response?.data?.message ?? 'Erro ao atualizar preço'
      if (title) toast.error(title, { description: message })
      else toast.error(message)
    }
  })

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size='sm' variant='outline'>
          <Edit className='h-4 w-4 mr-2' /> Editar
        </Button>
      </SheetTrigger>
      <SheetContent className='sm:max-w-[420px]'>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(async (v) => await mutateAsync(v))} className='flex flex-col h-full'>
            <SheetHeader>
              <SheetTitle>Editar Preço</SheetTitle>
              <SheetDescription>Atualize o preço para a tabela selecionada.</SheetDescription>
            </SheetHeader>
            
            <div className='flex-1 overflow-y-auto px-4 py-4'>
              <div className='space-y-4'>
                <FormField
                  control={form.control}
                  name="price_table_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tabela de Preço</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled>
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
              </div>
            </div>

            <div className='mt-auto border-t p-4'>
              <div className='grid grid-cols-2 gap-4'>
                <SheetClose asChild>
                  <Button variant="outline" className='w-full'>Cancelar</Button>
                </SheetClose>
                <Button type="submit" disabled={isPending} className='w-full'>
                  {isPending ? <Loader className='animate-spin h-4 w-4' /> : 'Salvar alterações'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
