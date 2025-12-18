import { useState } from 'react'
import { z } from 'zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet'
import { Form, FormField, FormItem, FormLabel, FormMessage, FormControl } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { privateInstance } from '@/lib/auth'
import { toast } from 'sonner'
import { Loader, Plus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { maskMoneyInput } from '@/lib/utils'

const formSchema = z.object({
  price_table_id: z.string().min(1, { message: 'Selecione uma tabela de preço' }),
  price: z.string().min(1, { message: 'Informe o preço' }),
  sale_price: z.string().min(1, { message: 'Informe o preço promocional' })
}).superRefine((data, ctx) => {
  const price = parseInt(data.price.replace(/\D/g, '')) || 0
  const salePrice = parseInt(data.sale_price.replace(/\D/g, '')) || 0

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

  if (salePrice > price) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'O preço promocional deve ser menor ou igual ao preço',
      path: ['sale_price']
    })
  }
})

export function SimpleProductPriceCreateSheet({ productId, onCreated }: { productId: number, onCreated?: () => void }) {
  const [open, setOpen] = useState(false)
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { 
      price_table_id: '',
      price: 'R$ 0,00',
      sale_price: 'R$ 0,00'
    },
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
      const salePriceCents = parseInt(values.sale_price.replace(/\D/g, ''))

      const payload = {
        product_id: productId,
        price: priceCents,
        sale_price: salePriceCents,
        price_table_id: Number(values.price_table_id)
      }
      const response = await privateInstance.post('/api:c3X9fE5j/product_prices', payload)
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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size='sm' variant='outline'>
          <Plus className='mr-2 h-4 w-4' /> Adicionar tabela
        </Button>
      </SheetTrigger>
      <SheetContent className='sm:max-w-[420px]'>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(async (v) => await mutateAsync(v))} className='flex flex-col h-full'>
            <SheetHeader>
              <SheetTitle>Inserir tabela no produto</SheetTitle>
              <SheetDescription>Vincule uma tabela de preço e defina os valores.</SheetDescription>
            </SheetHeader>
            
            <div className='flex-1 overflow-y-auto px-4 py-4'>
              <div className='space-y-4'>
                <FormField
                  control={form.control}
                  name="price_table_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tabela de Preço</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
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

                <div className='grid grid-cols-2 gap-4'>
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço</FormLabel>
                        <FormControl>
                          <Input 
                            {...field}
                            onChange={(e) => field.onChange(maskMoneyInput(e.target.value))}
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
                            {...field}
                            onChange={(e) => field.onChange(maskMoneyInput(e.target.value))}
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
                  {isPending ? <Loader className='animate-spin h-4 w-4' /> : 'Salvar'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
